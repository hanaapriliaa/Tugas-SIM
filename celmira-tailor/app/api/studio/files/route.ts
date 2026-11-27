import { getOrCreateCustomerSession } from "@/lib/server/auth";
import { getChatEnv } from "@/lib/server/cf-env";
import { storeStudioFile } from "@/lib/server/studio-storage";
import type { ReferenceAttachment } from "@/lib/types/tailor";

export async function POST(request: Request) {
  const env = getChatEnv();
  const { session, setCookieHeader } = await getOrCreateCustomerSession(request, env.DB);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Request harus berupa multipart/form-data." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size <= 0) {
    return Response.json({ error: "File referensi wajib dipilih." }, { status: 400 });
  }

  const designIdRaw = formData.get("designId");
  const designId = typeof designIdRaw === "string" && designIdRaw.trim() ? designIdRaw.trim() : null;

  const bytes = new Uint8Array(await file.arrayBuffer());
  const stored = await storeStudioFile(env.DB, env.CHAT_ATTACHMENTS, {
    customerSessionId: session.id,
    designId,
    fileName: file.name,
    bytes,
  });

  if (!stored.ok) {
    return Response.json({ error: stored.error }, { status: 400 });
  }

  const attachment: ReferenceAttachment = {
    id: stored.file.id,
    name: stored.file.fileName,
    size: stored.file.sizeBytes,
    mimeType: stored.file.mimeType,
    kind: stored.file.mimeType === "application/pdf" ? "pdf" : "image",
    url: stored.file.url,
    note: "",
  };

  const headers = new Headers({
    "content-type": "application/json",
    "cache-control": "no-store",
  });
  if (setCookieHeader) {
    headers.append("set-cookie", setCookieHeader);
  }

  return new Response(JSON.stringify({ attachment }), { status: 201, headers });
}
