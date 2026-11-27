import { evaluateDpOverdueForReview, verifyOrderTrackingAccess } from "@/lib/order-tracking";
import { issueAdditionalCustomerSessionCookie } from "@/lib/server/auth";
import { getChatEnv } from "@/lib/server/cf-env";
import { getAuthenticatedCustomerAccount } from "@/lib/server/customer-auth";
import {
  getOrderByCode,
  getOrInitPaymentConfigInDb,
  grantTrackingAccessCookie,
  saveOrderInDb,
} from "@/lib/server/order-repo";
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

  const found = await getOrderByCode(env.DB, orderCode);
  if (!found) {
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
    return Response.json({ error: verification.error }, { status: 403 });
  }

  const [trackingCookie, paymentConfig, activeAccount] = await Promise.all([
    grantTrackingAccessCookie(request, env.DB, verification.order.orderCode),
    getOrInitPaymentConfigInDb(env.DB),
    getAuthenticatedCustomerAccount(request, env.DB),
  ]);

  // Pemulihan sesi studio otomatis melalui verifikasi pesanan 2FA yang sah
  // (tidak menimpa bila browser sudah login ke akun pelanggan lain).
  let studioRecoveryCookie: string | null = null;
  if (found.customerSessionId && !activeAccount) {
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
