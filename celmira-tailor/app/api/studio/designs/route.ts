import type { DesignStudioDraft } from "@/lib/design-studio";
import { getOrCreateCustomerSession } from "@/lib/server/auth";
import { getChatEnv } from "@/lib/server/cf-env";
import {
  getOrCreateStudioSyncCode,
  listDesignsInDb,
  saveDesignInDb,
} from "@/lib/server/studio-repo";

export async function GET(request: Request) {
  const env = getChatEnv();
  const { session, setCookieHeader } = await getOrCreateCustomerSession(request, env.DB);
  const [designs, syncCode] = await Promise.all([
    listDesignsInDb(env.DB, session.id),
    getOrCreateStudioSyncCode(env.DB, session.id),
  ]);

  const headers = new Headers({
    "content-type": "application/json",
    "cache-control": "no-store",
  });
  if (setCookieHeader) {
    headers.append("set-cookie", setCookieHeader);
  }

  return new Response(JSON.stringify({ designs, syncCode }), { status: 200, headers });
}

export async function POST(request: Request) {
  const env = getChatEnv();
  const { session, setCookieHeader } = await getOrCreateCustomerSession(request, env.DB);

  let body: { draft?: DesignStudioDraft };
  try {
    body = (await request.json()) as { draft?: DesignStudioDraft };
  } catch {
    return Response.json({ error: "Payload JSON tidak valid." }, { status: 400 });
  }

  if (!body.draft) {
    return Response.json({ error: "Data desain wajib disertakan." }, { status: 400 });
  }

  const saved = await saveDesignInDb(env.DB, session.id, body.draft, null);
  if (!saved.ok) {
    return Response.json(
      { error: saved.error, errors: saved.errors },
      { status: saved.status }
    );
  }

  const syncCode = await getOrCreateStudioSyncCode(env.DB, session.id);

  const headers = new Headers({
    "content-type": "application/json",
    "cache-control": "no-store",
  });
  if (setCookieHeader) {
    headers.append("set-cookie", setCookieHeader);
  }

  return new Response(
    JSON.stringify({ design: saved.design, syncCode }),
    { status: 201, headers }
  );
}
