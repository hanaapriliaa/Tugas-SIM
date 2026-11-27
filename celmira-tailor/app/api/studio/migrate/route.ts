import { getOrCreateCustomerSession } from "@/lib/server/auth";
import { getChatEnv } from "@/lib/server/cf-env";
import { migrateLegacyStudioDataInDb } from "@/lib/server/studio-repo";
import type { DesignStudioSavedConfig, MeasurementProfile } from "@/lib/types/tailor";

export async function POST(request: Request) {
  const env = getChatEnv();
  const { session, setCookieHeader } = await getOrCreateCustomerSession(request, env.DB);

  let body: {
    designs?: DesignStudioSavedConfig[];
    profiles?: MeasurementProfile[];
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Payload migrasi JSON tidak valid." }, { status: 400 });
  }

  const result = await migrateLegacyStudioDataInDb(env.DB, env.CHAT_ATTACHMENTS, session.id, {
    designs: body.designs,
    profiles: body.profiles,
  });

  const headers = new Headers({
    "content-type": "application/json",
    "cache-control": "no-store",
  });
  if (setCookieHeader) {
    headers.append("set-cookie", setCookieHeader);
  }

  return new Response(
    JSON.stringify({
      ok: true,
      ...result,
    }),
    { status: 200, headers }
  );
}
