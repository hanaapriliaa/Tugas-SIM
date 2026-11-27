import { getAdminSession } from "@/lib/server/auth";
import { getChatEnv } from "@/lib/server/cf-env";
import {
  getOrInitPaymentConfigInDb,
  updatePaymentConfigInDb,
} from "@/lib/server/order-repo";
import { deleteOrderFile, storeOrderFile } from "@/lib/server/order-storage";

export async function POST(request: Request) {
  const env = getChatEnv();
  const admin = await getAdminSession(request, env.DB);
  if (!admin) {
    return Response.json({ error: "Autentikasi admin diperlukan." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Request harus berupa multipart/form-data." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size <= 0) {
    return Response.json({ error: "File gambar QRIS wajib dipilih." }, { status: 400 });
  }

  const merchantRaw = formData.get("qrisMerchantName");
  const qrisMerchantName =
    typeof merchantRaw === "string" && merchantRaw.trim() ? merchantRaw.trim() : undefined;

  const bytes = new Uint8Array(await file.arrayBuffer());
  const stored = await storeOrderFile(env.DB, env.CHAT_ATTACHMENTS, {
    orderId: null,
    kind: "qris",
    fileName: file.name,
    bytes,
  });

  if (!stored.ok) {
    return Response.json({ error: stored.error }, { status: 400 });
  }

  const previous = await getOrInitPaymentConfigInDb(env.DB);
  const paymentConfig = await updatePaymentConfigInDb(env.DB, {
    qrisFileId: stored.file.id,
    qrisFileName: stored.file.fileName,
    qrisMerchantName: qrisMerchantName ?? previous.qrisMerchantName ?? null,
    qrisUpdatedAt: stored.file.createdAt,
  });

  if (previous.qrisFileId && previous.qrisFileId !== stored.file.id) {
    await deleteOrderFile(env.DB, env.CHAT_ATTACHMENTS, previous.qrisFileId);
  }

  return Response.json(
    { paymentConfig },
    { status: 201, headers: { "cache-control": "no-store" } }
  );
}

export async function DELETE(request: Request) {
  const env = getChatEnv();
  const admin = await getAdminSession(request, env.DB);
  if (!admin) {
    return Response.json({ error: "Autentikasi admin diperlukan." }, { status: 401 });
  }

  const previous = await getOrInitPaymentConfigInDb(env.DB);
  if (previous.qrisFileId) {
    await deleteOrderFile(env.DB, env.CHAT_ATTACHMENTS, previous.qrisFileId);
  }

  const paymentConfig = await updatePaymentConfigInDb(env.DB, {
    qrisFileId: null,
    qrisFileName: null,
    qrisUpdatedAt: null,
  });

  return Response.json(
    { paymentConfig },
    { status: 200, headers: { "cache-control": "no-store" } }
  );
}
