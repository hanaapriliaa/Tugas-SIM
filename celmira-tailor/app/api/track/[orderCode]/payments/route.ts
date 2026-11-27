import { customerUploadPaymentProof } from "@/lib/order-tracking";
import { getCustomerSession } from "@/lib/server/auth";
import { broadcastChatEvent, getChatEnv } from "@/lib/server/cf-env";
import {
  getOrderByCode,
  hasTrackingSessionAccess,
  saveOrderInDb,
} from "@/lib/server/order-repo";
import { deleteOrderFile, storeOrderFile } from "@/lib/server/order-storage";
import type { PaymentStage } from "@/lib/types/tailor";

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
      { error: "Verifikasi akses tracking diperlukan untuk mengunggah bukti pembayaran." },
      { status: 403 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Request harus berupa multipart/form-data." }, { status: 400 });
  }

  const stageRaw = formData.get("stage");
  if (stageRaw !== "dp" && stageRaw !== "pelunasan") {
    return Response.json({ error: "Tahap pembayaran harus 'dp' atau 'pelunasan'." }, { status: 400 });
  }
  const stage: PaymentStage = stageRaw;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size <= 0) {
    return Response.json({ error: "File bukti pembayaran wajib diunggah." }, { status: 400 });
  }

  const customerNoteRaw = formData.get("customerNote");
  const customerNote = typeof customerNoteRaw === "string" ? customerNoteRaw : undefined;

  const bytes = new Uint8Array(await file.arrayBuffer());
  const stored = await storeOrderFile(env.DB, env.CHAT_ATTACHMENTS, {
    orderId: found.order.id,
    kind: "payment_proof",
    fileName: file.name,
    bytes,
  });

  if (!stored.ok) {
    return Response.json({ error: stored.error }, { status: 400 });
  }

  const result = customerUploadPaymentProof(
    found.order,
    {
      stage,
      proofFileName: stored.file.fileName,
      proofMimeType: stored.file.mimeType,
      proofSize: stored.file.sizeBytes,
      proofPreviewDataUrl: stored.file.url,
      customerNote,
    },
    new Date()
  );

  if (!result.ok) {
    await deleteOrderFile(env.DB, env.CHAT_ATTACHMENTS, stored.file.id);
    return Response.json({ error: result.error }, { status: 400 });
  }

  const saved = await saveOrderInDb(env.DB, result.order);
  const latestPayment = saved.payments[saved.payments.length - 1] ?? null;

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
    { order: saved, payment: latestPayment },
    { status: 201, headers: { "cache-control": "no-store" } }
  );
}
