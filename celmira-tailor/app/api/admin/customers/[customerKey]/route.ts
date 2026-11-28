import { getAdminSession } from "@/lib/server/auth";
import { getChatEnv } from "@/lib/server/cf-env";
import {
  getAdminCustomerDetailInDb,
  saveAdminCustomerNoteInDb,
} from "@/lib/server/admin-repo";

type RouteContext = {
  params: Promise<{ customerKey: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const env = getChatEnv();
  const admin = await getAdminSession(request, env.DB);
  if (!admin) {
    return Response.json({ error: "Autentikasi admin diperlukan." }, { status: 401 });
  }

  const { customerKey } = await context.params;
  const decodedKey = decodeURIComponent(customerKey);
  const detail = await getAdminCustomerDetailInDb(env.DB, decodedKey);
  if (!detail) {
    return Response.json({ error: "Data pelanggan tidak ditemukan." }, { status: 404 });
  }

  return Response.json(
    { detail, serverTime: new Date().toISOString() },
    { status: 200, headers: { "cache-control": "no-store" } }
  );
}

export async function PATCH(request: Request, context: RouteContext) {
  const env = getChatEnv();
  const admin = await getAdminSession(request, env.DB);
  if (!admin) {
    return Response.json({ error: "Autentikasi admin diperlukan." }, { status: 401 });
  }

  const { customerKey } = await context.params;
  const decodedKey = decodeURIComponent(customerKey);

  let body: { internalNote?: string };
  try {
    body = (await request.json()) as { internalNote?: string };
  } catch {
    return Response.json({ error: "Payload JSON tidak valid." }, { status: 400 });
  }

  if (typeof body.internalNote !== "string") {
    return Response.json({ error: "Catatan internal harus berupa teks." }, { status: 400 });
  }

  const saved = await saveAdminCustomerNoteInDb(env.DB, decodedKey, body.internalNote);
  if (!saved.ok) {
    return Response.json({ error: saved.error }, { status: saved.status });
  }

  return Response.json(
    {
      internalNote: saved.internalNote,
      updatedAt: saved.updatedAt,
    },
    { status: 200, headers: { "cache-control": "no-store" } }
  );
}
