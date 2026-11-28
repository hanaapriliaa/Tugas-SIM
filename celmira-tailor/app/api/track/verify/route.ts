import { evaluateDpOverdueForReview, verifyOrderTrackingAccess } from "@/lib/order-tracking";
import { issueAdditionalCustomerSessionCookie } from "@/lib/server/auth";
import { getChatEnv } from "@/lib/server/cf-env";
import {
  getOrderByCode,
  getOrInitPaymentConfigInDb,
  grantTrackingAccessCookie,
  saveOrderInDb,
} from "@/lib/server/order-repo";
import {
  TRACK_VERIFY_RATE_LIMIT,
  buildRateLimitKey,
  checkRateLimit,
  clearRateLimit,
  extractClientIp,
  recordRateLimitFailure,
} from "@/lib/server/rate-limit";
import { ensureStudioSchema } from "@/lib/server/studio-schema";

export async function POST(request: Request) {
  const env = getChatEnv();

  let body: { orderCode?: string; verifier?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Payload JSON tidak valid." }, { status: 400 });
  }

  const orderCode = (body.orderCode ?? "").trim().toUpperCase();
  const verifier = (body.verifier ?? "").trim();

  if (!orderCode || !verifier) {
    return Response.json(
      { error: "Masukkan nomor pesanan serta nomor WhatsApp terdaftar atau Kode Akses Tracking." },
      { status: 400 }
    );
  }

  const rateKey = await buildRateLimitKey("track_verify", extractClientIp(request), orderCode);
  const rateCheck = await checkRateLimit(env.DB, rateKey, TRACK_VERIFY_RATE_LIMIT);
  if (!rateCheck.allowed) {
    const minutes = Math.max(1, Math.ceil(rateCheck.retryAfterSeconds / 60));
    return Response.json(
      {
        error: `Terlalu banyak percobaan verifikasi gagal untuk nomor pesanan ini. Coba kembali dalam ${minutes} menit.`,
        retryAfterSeconds: rateCheck.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          "cache-control": "no-store",
          "retry-after": String(rateCheck.retryAfterSeconds),
        },
      }
    );
  }

  const found = await getOrderByCode(env.DB, orderCode);
  if (!found) {
    await recordRateLimitFailure(env.DB, rateKey, TRACK_VERIFY_RATE_LIMIT);
    return Response.json(
      {
        error:
          "Kombinasi nomor pesanan dan identitas verifikasi tidak cocok dengan data pesanan yang tersimpan.",
      },
      { status: 404 }
    );
  }

  let currentOrder = found.order;
  const overdueEval = evaluateDpOverdueForReview(currentOrder, new Date());
  if (overdueEval.ok && overdueEval.order.status !== currentOrder.status) {
    currentOrder = await saveOrderInDb(env.DB, overdueEval.order);
  }

  const verification = verifyOrderTrackingAccess([currentOrder], orderCode, verifier);
  if (!verification.ok) {
    await recordRateLimitFailure(env.DB, rateKey, TRACK_VERIFY_RATE_LIMIT);
    return Response.json({ error: verification.error }, { status: 403 });
  }

  await clearRateLimit(env.DB, rateKey);

  const [trackingCookie, paymentConfig] = await Promise.all([
    grantTrackingAccessCookie(request, env.DB, verification.order.orderCode),
    getOrInitPaymentConfigInDb(env.DB),
  ]);

  // Pemulihan sesi guest studio otomatis melalui verifikasi pesanan 2FA yang sah
  let studioRecoveryCookie: string | null = null;
  if (found.customerSessionId) {
    await ensureStudioSchema(env.DB);
    studioRecoveryCookie = await issueAdditionalCustomerSessionCookie(
      request,
      env.DB,
      found.customerSessionId
    );
  }

  const headers = new Headers({
    "content-type": "application/json",
    "cache-control": "no-store",
  });
  if (trackingCookie) {
    headers.append("set-cookie", trackingCookie);
  }
  if (studioRecoveryCookie) {
    headers.append("set-cookie", studioRecoveryCookie);
  }

  return new Response(
    JSON.stringify({
      order: verification.order,
      paymentConfig,
      studioSessionRecovered: Boolean(studioRecoveryCookie),
    }),
    { status: 200, headers }
  );
}
