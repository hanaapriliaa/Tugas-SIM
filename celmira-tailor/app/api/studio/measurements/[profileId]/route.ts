import type { MeasurementStudioDraft } from "@/lib/measurement-studio";
import { getAdminSession, getCustomerSession } from "@/lib/server/auth";
import { getChatEnv } from "@/lib/server/cf-env";
import {
  deleteMeasurementProfileInDb,
  getMeasurementProfileByIdInDb,
  saveMeasurementProfileInDb,
} from "@/lib/server/studio-repo";

type RouteContext = {
  params: Promise<{ profileId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const env = getChatEnv();
  const { profileId } = await context.params;

  const [adminSession, customerSession, found] = await Promise.all([
    getAdminSession(request, env.DB),
    getCustomerSession(request, env.DB),
    getMeasurementProfileByIdInDb(env.DB, profileId),
  ]);

  if (!found) {
    return Response.json({ error: "Profil ukuran tidak ditemukan." }, { status: 404 });
  }

  const isAuthorized =
    Boolean(adminSession) ||
    (Boolean(customerSession) && customerSession?.id === found.customerSessionId);

  if (!isAuthorized) {
    return Response.json(
      { error: "Anda tidak memiliki izin mengakses profil ukuran ini." },
      { status: customerSession ? 403 : 401 }
    );
  }

  return Response.json(
    { profile: found.profile },
    { status: 200, headers: { "cache-control": "no-store" } }
  );
}

export async function PUT(request: Request, context: RouteContext) {
  const env = getChatEnv();
  const customerSession = await getCustomerSession(request, env.DB);
  if (!customerSession) {
    return Response.json(
      { error: "Sesi pelanggan diperlukan untuk memperbarui profil ukuran." },
      { status: 401 }
    );
  }

  const { profileId } = await context.params;

  let body: { draft?: MeasurementStudioDraft };
  try {
    body = (await request.json()) as { draft?: MeasurementStudioDraft };
  } catch {
    return Response.json({ error: "Payload JSON tidak valid." }, { status: 400 });
  }

  if (!body.draft) {
    return Response.json({ error: "Data profil ukuran wajib disertakan." }, { status: 400 });
  }

  const updated = await saveMeasurementProfileInDb(
    env.DB,
    customerSession.id,
    body.draft,
    profileId
  );
  if (!updated.ok) {
    return Response.json(
      { error: updated.error, errors: updated.errors },
      { status: updated.status }
    );
  }

  return Response.json(
    { profile: updated.profile },
    { status: 200, headers: { "cache-control": "no-store" } }
  );
}

export async function DELETE(request: Request, context: RouteContext) {
  const env = getChatEnv();
  const customerSession = await getCustomerSession(request, env.DB);
  if (!customerSession) {
    return Response.json(
      { error: "Sesi pelanggan diperlukan untuk menghapus profil ukuran." },
      { status: 401 }
    );
  }

  const { profileId } = await context.params;
  const deleted = await deleteMeasurementProfileInDb(env.DB, customerSession.id, profileId);
  if (!deleted.ok) {
    return Response.json({ error: deleted.error }, { status: deleted.status });
  }

  return Response.json({ ok: true }, { status: 200, headers: { "cache-control": "no-store" } });
}
