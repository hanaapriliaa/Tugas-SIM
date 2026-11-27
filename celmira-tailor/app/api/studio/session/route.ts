import { getOrCreateCustomerSession } from "@/lib/server/auth";
import { getChatEnv } from "@/lib/server/cf-env";

export async function GET(request: Request) {
  const env = getChatEnv();
  const { session, setCookieHeader } = await getOrCreateCustomerSession(request, env.DB);

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
      mode: "guest",
    }),
    { status: 200, headers }
  );
}
