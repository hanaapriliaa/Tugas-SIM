import { getAdminSession, getCustomerSession } from "@/lib/server/auth";
import { getChatEnv } from "@/lib/server/cf-env";
import { deleteStudioFile, getStudioFileById } from "@/lib/server/studio-storage";

type RouteContext = {
  params: Promise<{ fileId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const env = getChatEnv();
  const { fileId } = await context.params;

  const [adminSession, customerSession, record] = await Promise.all([
    getAdminSession(request, env.DB),
    getCustomerSession(request, env.DB),
    getStudioFileById(env.DB, fileId),
  ]);

  if (!record) {
    return Response.json({ error: "File referensi studio tidak ditemukan." }, { status: 404 });
  }

  const isAuthorized =
    Boolean(adminSession) ||
    (Boolean(customerSession) && customerSession?.id === record.customerSessionId);

  if (!isAuthorized) {
    return Response.json(
      { error: "Anda tidak memiliki izin mengakses file referensi ini." },
      { status: customerSession ? 403 : 401 }
    );
  }

  const r2Object = await env.CHAT_ATTACHMENTS.get(record.r2Key);
  if (!r2Object) {
    return Response.json({ error: "File tidak ditemukan di penyimpanan R2." }, { status: 404 });
  }

  const headers = new Headers();
  headers.set("content-type", record.mimeType);
  headers.set("content-length", String(record.sizeBytes));
  headers.set("cache-control", "private, max-age=3600");
  headers.set("x-content-type-options", "nosniff");
  headers.set("content-disposition", `inline; filename="${record.fileName.replace(/"/g, "")}"`);

  return new Response(r2Object.body, { status: 200, headers });
}

export async function DELETE(request: Request, context: RouteContext) {
  const env = getChatEnv();
  const customerSession = await getCustomerSession(request, env.DB);
  if (!customerSession) {
    return Response.json({ error: "Sesi pelanggan diperlukan." }, { status: 401 });
  }

  const { fileId } = await context.params;
  const ok = await deleteStudioFile(env.DB, env.CHAT_ATTACHMENTS, fileId, customerSession.id);
  if (!ok) {
    return Response.json({ error: "File tidak ditemukan atau tidak dimiliki sesi ini." }, { status: 404 });
  }

  return Response.json({ ok: true }, { status: 200, headers: { "cache-control": "no-store" } });
}
