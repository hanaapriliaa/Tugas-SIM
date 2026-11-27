import { getChatEnv } from "@/lib/server/cf-env";
import { consumeGuestRecoveryToken } from "@/lib/server/guest-recovery";
import { listDesignsInDb, listMeasurementProfilesInDb } from "@/lib/server/studio-repo";

export async function POST(request: Request) {
  const env = getChatEnv();

  let body: { token?: string };
  try {
    body = (await request.json()) as { token?: string };
  } catch {
    return Response.json({ error: "Payload JSON tidak valid." }, { status: 400 });
  }

  const result = await consumeGuestRecoveryToken(request, env.DB, body.token ?? "");
  if (!result.ok) {
    return Response.json(
      { error: result.error },
      { status: result.status, headers: { "cache-control": "no-store" } }
    );
  }

  const [designs, profiles] = await Promise.all([
    listDesignsInDb(env.DB, result.customerSessionId),
    listMeasurementProfilesInDb(env.DB, result.customerSessionId),
  ]);

  const headers = new Headers({
    "content-type": "application/json",
    "cache-control": "no-store",
  });
  headers.append("set-cookie", result.setCookieHeader);

  return new Response(
    JSON.stringify({
      ok: true,
      designsCount: designs.length,
      profilesCount: profiles.length,
    }),
    { status: 200, headers }
  );
}
