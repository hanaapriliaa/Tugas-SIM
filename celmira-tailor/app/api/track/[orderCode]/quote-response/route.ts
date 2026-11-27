import { customerRespondToQuote } from "@/lib/order-tracking";
import { getCustomerSession } from "@/lib/server/auth";
import { broadcastChatEvent, getChatEnv } from "@/lib/server/cf-env";
import {
  getOrderByCode,
  getOrInitPaymentConfigInDb,
  hasTrackingSessionAccess,
  saveOrderInDb,
} from "@/lib/server/order-repo";

type RouteContext = {
  params: Promise<{ orderCode: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const env = getChatEnv();
  const { orderCode } = await context.params;
  const normalizedCode = orderCode.trim().toUpperCase();

  const found = await getOrderByCode(env.DB, normalizedCode);
  if (!found) {
    return Response.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
  }

  const [customerSession, hasTrack] = await Promise.all([
    getCustomerSession(request, env.DB),
    hasTrackingSessionAccess(request, env.DB, normalizedCode),
  ]);

  const ownsByCustomer =
    Boolean(customerSession) &&
    Boolean(found.customerSessionId) &&
    customerSession?.id === found.customerSessionId;

  if (!hasTrack && !ownsByCustomer) {
    return Response.json(
      { error: "Verifikasi akses tracking diperlukan untuk merespons penawaran." },
      { status: 403 }
    );
  }

  let body: { decision?: "approve" | "reject"; rejectionReason?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Payload JSON tidak valid." }, { status: 400 });
  }

  if (body.decision !== "approve" && body.decision !== "reject") {
    return Response.json({ error: "Pilihan keputusan penawaran tidak valid." }, { status: 400 });
  }

  const paymentConfig = await getOrInitPaymentConfigInDb(env.DB);
  const result = customerRespondToQuote(
    found.order,
    {
      decision: body.decision,
      rejectionReason: body.rejectionReason,
    },
    new Date(),
    paymentConfig.dpWindowHours
  );

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  const saved = await saveOrderInDb(env.DB, result.order);

  const targets = ["role:admin"];
  if (found.customerSessionId) targets.push(`customer:${found.customerSessionId}`);
  await broadcastChatEvent(env.CHAT_HUB, targets, {
    type: "order:updated",
    orderId: saved.id,
    orderCode: saved.orderCode,
    status: saved.status,
    updatedAt: saved.updatedAt,
  });

  return Response.json(
    { order: saved },
    { status: 200, headers: { "cache-control": "no-store" } }
  );
}
