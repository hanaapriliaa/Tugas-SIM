import { getOrCreateCustomerSession } from "@/lib/server/auth";
import { getChatEnv } from "@/lib/server/cf-env";
import { getOrCreateStudioSyncCode } from "@/lib/server/studio-repo";

export async function GET(request: Request) {
  const env = getChatEnv();
  const { session, setCookieHeader } = await getOrCreateCustomerSession(request, env.DB);
  const syncCode = await getOrCreateStudioSyncCode(env.DB, session.id);

  const headers = new Headers({
    "content-type": "application/json",
    "cache-control": "no-store",
  });
  if (setCookieHeader) {
    headers.append("set-cookie", setCookieHeader);
  }

  return new Response(
    JSON.stringify({
      sessionId: session.id,
      syncCode,
    }),
    { status: 200, headers }
  );
}
