import { getCustomerSession, getOrCreateCustomerSession } from "@/lib/server/auth";
import { getChatEnv } from "@/lib/server/cf-env";
import {
  createGuestRecoveryToken,
  revokeActiveGuestRecoveryTokens,
} from "@/lib/server/guest-recovery";

export async function POST(request: Request) {
  const env = getChatEnv();
  const { session, setCookieHeader } = await getOrCreateCustomerSession(request, env.DB);
  const { token, expiresAt } = await createGuestRecoveryToken(env.DB, session.id);

  const headers = new Headers({
    "content-type": "application/json",
    "cache-control": "no-store",
  });
  if (setCookieHeader) {
    headers.append("set-cookie", setCookieHeader);
  }

  return new Response(
    JSON.stringify({
      token,
      expiresAt,
      ttlMinutes: 15,
    }),
    { status: 201, headers }
  );
}

export async function DELETE(request: Request) {
  const env = getChatEnv();
  const session = await getCustomerSession(request, env.DB);
  if (session) {
    await revokeActiveGuestRecoveryTokens(env.DB, session.id);
  }

  return Response.json(
    { ok: true },
    { status: 200, headers: { "cache-control": "no-store" } }
  );
}
