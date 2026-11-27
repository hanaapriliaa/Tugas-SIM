import type { MeasurementStudioDraft } from "@/lib/measurement-studio";
import { getOrCreateCustomerSession } from "@/lib/server/auth";
import { getChatEnv } from "@/lib/server/cf-env";
import {
  listMeasurementProfilesInDb,
  saveMeasurementProfileInDb,
} from "@/lib/server/studio-repo";

export async function GET(request: Request) {
  const env = getChatEnv();
  const { session, setCookieHeader } = await getOrCreateCustomerSession(request, env.DB);
  const profiles = await listMeasurementProfilesInDb(env.DB, session.id);

  const headers = new Headers({
    "content-type": "application/json",
    "cache-control": "no-store",
  });
  if (setCookieHeader) {
    headers.append("set-cookie", setCookieHeader);
  }

  return new Response(JSON.stringify({ profiles }), { status: 200, headers });
}

export async function POST(request: Request) {
  const env = getChatEnv();
  const { session, setCookieHeader } = await getOrCreateCustomerSession(request, env.DB);

  let body: { draft?: MeasurementStudioDraft };
  try {
    body = (await request.json()) as { draft?: MeasurementStudioDraft };
  } catch {
    return Response.json({ error: "Payload JSON tidak valid." }, { status: 400 });
  }

  if (!body.draft) {
    return Response.json({ error: "Data profil ukuran wajib disertakan." }, { status: 400 });
  }

  const saved = await saveMeasurementProfileInDb(env.DB, session.id, body.draft, null);
  if (!saved.ok) {
    return Response.json(
      { error: saved.error, errors: saved.errors },
      { status: saved.status }
    );
  }

  const headers = new Headers({
    "content-type": "application/json",
    "cache-control": "no-store",
  });
  if (setCookieHeader) {
    headers.append("set-cookie", setCookieHeader);
  }

  return new Response(JSON.stringify({ profile: saved.profile }), { status: 201, headers });
}
