import { evaluateDpOverdueForReview } from "@/lib/order-tracking";
import { getAdminSession, getCustomerSession } from "@/lib/server/auth";
import { getChatEnv } from "@/lib/server/cf-env";
import {
  getOrderByCode,
  getOrInitPaymentConfigInDb,
  hasTrackingSessionAccess,
  saveOrderInDb,
} from "@/lib/server/order-repo";

type RouteContext = {
  params: Promise<{ orderCode: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const env = getChatEnv();
  const { orderCode } = await context.params;
  const normalizedCode = orderCode.trim().toUpperCase();

  const found = await getOrderByCode(env.DB, normalizedCode);
  if (!found) {
    return Response.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
  }

  const [adminSession, customerSession, hasTrack] = await Promise.all([
    getAdminSession(request, env.DB),
    getCustomerSession(request, env.DB),
    hasTrackingSessionAccess(request, env.DB, normalizedCode),
  ]);

  const ownsByCustomer =
    Boolean(customerSession) &&
    Boolean(found.customerSessionId) &&
    customerSession?.id === found.customerSessionId;

  if (!adminSession && !hasTrack && !ownsByCustomer) {
    return Response.json(
      { error: "Verifikasi dua faktor diperlukan untuk melihat detail pesanan ini." },
      { status: 403 }
    );
  }

  let currentOrder = found.order;
  const overdueEval = evaluateDpOverdueForReview(currentOrder, new Date());
  if (overdueEval.ok && overdueEval.order.status !== currentOrder.status) {
    currentOrder = await saveOrderInDb(env.DB, overdueEval.order);
  }

  const paymentConfig = await getOrInitPaymentConfigInDb(env.DB);

  return Response.json(
    { order: currentOrder, paymentConfig },
    { status: 200, headers: { "cache-control": "no-store" } }
  );
}
