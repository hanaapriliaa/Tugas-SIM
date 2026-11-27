import {
  createAdminSession,
  verifyAdminCredentials,
} from "@/lib/server/auth";
import { getChatEnv } from "@/lib/server/cf-env";
import { getOrInitAdminChatConfig } from "@/lib/server/chat-repo";

export async function POST(request: Request) {
  const env = getChatEnv();

  let payload: { email?: string; password?: string };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return Response.json({ error: "Payload login tidak valid." }, { status: 400 });
  }

  const email = String(payload.email ?? "").trim();
  const password = String(payload.password ?? "");

  if (!email || !password) {
    return Response.json(
      { error: "Masukkan email dan kata sandi admin." },
      { status: 400 }
    );
  }

  const verified = await verifyAdminCredentials(email, password, env);
  if (!verified.ok) {
    return Response.json({ error: verified.error }, { status: verified.status });
  }

  const config = await getOrInitAdminChatConfig(env.DB);
  const { session, setCookieHeader } = await createAdminSession(
    request,
    env.DB,
    verified.adminEmail,
    config.adminDisplayName
  );

  const headers = new Headers({
    "content-type": "application/json",
    "cache-control": "no-store",
  });
  headers.append("set-cookie", setCookieHeader);

  return new Response(
    JSON.stringify({
      authenticated: true,
      admin: {
        email: session.adminEmail,
        name: session.adminName,
        expiresAt: session.expiresAt,
      },
    }),
    { status: 200, headers }
  );
}
