import { getAdminSession, getCustomerSession } from "@/lib/server/auth";
import { storeChatAttachment } from "@/lib/server/attachment-storage";
import { getChatEnv } from "@/lib/server/cf-env";
import { getThreadWithOwner } from "@/lib/server/chat-repo";

export async function POST(request: Request) {
  const env = getChatEnv();

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Format unggahan harus multipart/form-data." }, { status: 400 });
  }

  const threadId = String(formData.get("threadId") ?? "").trim();
  const roleHint = formData.get("role") === "admin" ? "admin" : "customer";
  const file = formData.get("file");

  if (!threadId) {
    return Response.json({ error: "threadId wajib disertakan saat mengunggah gambar." }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return Response.json({ error: "File gambar tidak ditemukan pada permintaan." }, { status: 400 });
  }

  const found = await getThreadWithOwner(env.DB, threadId);
  if (!found) {
    return Response.json({ error: "Percakapan tidak ditemukan." }, { status: 404 });
  }

  let uploadedBy: "customer" | "admin";
  if (roleHint === "admin") {
    const adminSession = await getAdminSession(request, env.DB);
    if (!adminSession) {
      return Response.json({ error: "Autentikasi admin diperlukan." }, { status: 401 });
    }
    uploadedBy = "admin";
  } else {
    const customerSession = await getCustomerSession(request, env.DB);
    if (!customerSession) {
      return Response.json({ error: "Sesi pelanggan tidak ditemukan." }, { status: 401 });
    }
    if (found.customerSessionId !== customerSession.id) {
      return Response.json(
        { error: "Anda tidak memiliki izin mengunggah lampiran pada percakapan ini." },
        { status: 403 }
      );
    }
    uploadedBy = "customer";
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const stored = await storeChatAttachment(env.DB, env.CHAT_ATTACHMENTS, {
    threadId,
    uploadedBy,
    fileName: file.name,
    declaredMimeType: file.type,
    bytes,
  });

  if (!stored.ok) {
    return Response.json({ error: stored.error }, { status: 400 });
  }

  return Response.json(
    {
      attachment: {
        id: stored.attachment.id,
        name: stored.attachment.fileName,
        size: stored.attachment.sizeBytes,
        mimeType: stored.attachment.mimeType,
        url: `/api/chat/attachments/${encodeURIComponent(stored.attachment.id)}`,
      },
    },
    { status: 201, headers: { "cache-control": "no-store" } }
  );
}
