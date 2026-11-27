import { getAdminSession, getCustomerSession } from "@/lib/server/auth";
import { getAttachmentRecord } from "@/lib/server/attachment-storage";
import { getChatEnv } from "@/lib/server/cf-env";

type RouteContext = {
  params: Promise<{ attachmentId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const env = getChatEnv();
  const { attachmentId } = await context.params;

  const [adminSession, customerSession] = await Promise.all([
    getAdminSession(request, env.DB),
    getCustomerSession(request, env.DB),
  ]);

  if (!adminSession && !customerSession) {
    return Response.json({ error: "Autentikasi diperlukan untuk melihat lampiran." }, { status: 401 });
  }

  const record = await getAttachmentRecord(env.DB, attachmentId);
  if (!record) {
    return Response.json({ error: "Lampiran tidak ditemukan." }, { status: 404 });
  }

  const isAuthorized =
    Boolean(adminSession) ||
    (Boolean(customerSession) && customerSession?.id === record.customerSessionId);

  if (!isAuthorized) {
    return Response.json(
      { error: "Anda tidak memiliki izin mengakses lampiran percakapan lain." },
      { status: 403 }
    );
  }

  const r2Object = await env.CHAT_ATTACHMENTS.get(record.r2Key);
  if (!r2Object) {
    return Response.json({ error: "File lampiran tidak ditemukan di penyimpanan." }, { status: 404 });
  }

  const headers = new Headers();
  headers.set("content-type", record.mimeType);
  headers.set("content-length", String(record.sizeBytes));
  headers.set("cache-control", "private, max-age=3600");
  headers.set("x-content-type-options", "nosniff");
  headers.set("content-disposition", `inline; filename="${record.fileName.replace(/"/g, "")}"`);

  return new Response(r2Object.body, { status: 200, headers });
}
