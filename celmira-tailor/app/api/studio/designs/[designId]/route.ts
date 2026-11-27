import type { DesignStudioDraft } from "@/lib/design-studio";
import { getAdminSession, getCustomerSession } from "@/lib/server/auth";
import { getChatEnv } from "@/lib/server/cf-env";
import {
  deleteDesignInDb,
  getDesignByIdInDb,
  saveDesignInDb,
} from "@/lib/server/studio-repo";

type RouteContext = {
  params: Promise<{ designId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const env = getChatEnv();
  const { designId } = await context.params;

  const [adminSession, customerSession, found] = await Promise.all([
    getAdminSession(request, env.DB),
    getCustomerSession(request, env.DB),
    getDesignByIdInDb(env.DB, designId),
  ]);

  if (!found) {
    return Response.json({ error: "Desain tidak ditemukan." }, { status: 404 });
  }

  const isAuthorized =
    Boolean(adminSession) ||
    (Boolean(customerSession) && customerSession?.id === found.customerSessionId);

  if (!isAuthorized) {
    return Response.json(
      { error: "Anda tidak memiliki izin mengakses desain ini." },
      { status: customerSession ? 403 : 401 }
    );
  }

  return Response.json(
    { design: found.design },
    { status: 200, headers: { "cache-control": "no-store" } }
  );
}

export async function PUT(request: Request, context: RouteContext) {
  const env = getChatEnv();
  const customerSession = await getCustomerSession(request, env.DB);
  if (!customerSession) {
    return Response.json({ error: "Sesi pelanggan diperlukan untuk mengubah desain." }, { status: 401 });
  }

  const { designId } = await context.params;

  let body: { draft?: DesignStudioDraft };
  try {
    body = (await request.json()) as { draft?: DesignStudioDraft };
  } catch {
    return Response.json({ error: "Payload JSON tidak valid." }, { status: 400 });
  }

  if (!body.draft) {
    return Response.json({ error: "Data desain wajib disertakan." }, { status: 400 });
  }

  const updated = await saveDesignInDb(env.DB, customerSession.id, body.draft, designId);
  if (!updated.ok) {
    return Response.json(
      { error: updated.error, errors: updated.errors },
      { status: updated.status }
    );
  }

  return Response.json(
    { design: updated.design },
    { status: 200, headers: { "cache-control": "no-store" } }
  );
}

export async function DELETE(request: Request, context: RouteContext) {
  const env = getChatEnv();
  const customerSession = await getCustomerSession(request, env.DB);
  if (!customerSession) {
    return Response.json({ error: "Sesi pelanggan diperlukan untuk menghapus desain." }, { status: 401 });
  }

  const { designId } = await context.params;
  const deleted = await deleteDesignInDb(env.DB, customerSession.id, designId);
  if (!deleted.ok) {
    return Response.json({ error: deleted.error }, { status: deleted.status });
  }

  return Response.json({ ok: true }, { status: 200, headers: { "cache-control": "no-store" } });
}
