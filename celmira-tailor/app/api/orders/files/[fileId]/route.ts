import { getAdminSession, getCustomerSession } from "@/lib/server/auth";
import { getChatEnv } from "@/lib/server/cf-env";
import { hasAnyValidTrackingSession, hasTrackingSessionAccess } from "@/lib/server/order-repo";
import { getOrderFileWithOwner } from "@/lib/server/order-storage";

type RouteContext = {
  params: Promise<{ fileId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const env = getChatEnv();
  const { fileId } = await context.params;

  const [adminSession, customerSession] = await Promise.all([
    getAdminSession(request, env.DB),
    getCustomerSession(request, env.DB),
  ]);

  const record = await getOrderFileWithOwner(env.DB, fileId);
  if (!record) {
    return Response.json({ error: "File pesanan tidak ditemukan." }, { status: 404 });
  }

  let isAuthorized = Boolean(adminSession);

  if (!isAuthorized && record.kind === "qris") {
    const hasTrack = await hasAnyValidTrackingSession(request, env.DB);
    isAuthorized = Boolean(customerSession) || hasTrack;
  } else if (!isAuthorized) {
    const ownsBySession =
      Boolean(customerSession) &&
      Boolean(record.customerSessionId) &&
      customerSession?.id === record.customerSessionId;
    const ownsByTracking = record.orderCode
      ? await hasTrackingSessionAccess(request, env.DB, record.orderCode)
      : false;
    isAuthorized = ownsBySession || ownsByTracking;
  }

  if (!isAuthorized) {
    const hasAnyAuth =
      Boolean(adminSession) ||
      Boolean(customerSession) ||
      (await hasAnyValidTrackingSession(request, env.DB));
    return Response.json(
      {
        error: hasAnyAuth
          ? "Anda tidak memiliki izin mengakses file pesanan ini."
          : "Autentikasi atau verifikasi akses tracking diperlukan untuk melihat file ini.",
      },
      { status: hasAnyAuth ? 403 : 401 }
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
