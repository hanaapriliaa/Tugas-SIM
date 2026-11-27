import { getOrCreateCustomerSession } from "@/lib/server/auth";
import { getChatEnv } from "@/lib/server/cf-env";
import { getCustomerAccountBySessionId } from "@/lib/server/customer-auth";

export async function GET(request: Request) {
  const env = getChatEnv();
  const { session, setCookieHeader } = await getOrCreateCustomerSession(request, env.DB);
  const account = await getCustomerAccountBySessionId(env.DB, session.id);

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
      authenticated: Boolean(account),
      customer: account
        ? {
            id: account.id,
            email: account.email,
            fullName: account.fullName,
          }
        : null,
    }),
    { status: 200, headers }
  );
}
