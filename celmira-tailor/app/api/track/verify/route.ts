import { evaluateDpOverdueForReview, verifyOrderTrackingAccess } from "@/lib/order-tracking";
import { getChatEnv } from "@/lib/server/cf-env";
import {
  getOrderByCode,
  getOrInitPaymentConfigInDb,
  grantTrackingAccessCookie,
  saveOrderInDb,
} from "@/lib/server/order-repo";

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

  const [trackingCookie, paymentConfig] = await Promise.all([
    grantTrackingAccessCookie(request, env.DB, verification.order.orderCode),
    getOrInitPaymentConfigInDb(env.DB),
  ]);

  const headers = new Headers({
    "content-type": "application/json",
    "cache-control": "no-store",
  });
  if (trackingCookie) {
    headers.append("set-cookie", trackingCookie);
  }

  return new Response(
    JSON.stringify({
      order: verification.order,
      paymentConfig,
    }),
    { status: 200, headers }
  );
}
