import {
  createAdminSession,
  verifyAdminCredentials,
} from "@/lib/server/auth";
import { getChatEnv } from "@/lib/server/cf-env";
import { getOrInitAdminChatConfig } from "@/lib/server/chat-repo";
import {
  ADMIN_LOGIN_RATE_LIMIT,
  buildRateLimitKey,
  checkRateLimit,
  clearRateLimit,
  extractClientIp,
  recordRateLimitFailure,
} from "@/lib/server/rate-limit";

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

  const rateKey = await buildRateLimitKey("admin_login", extractClientIp(request), email);
  const rateCheck = await checkRateLimit(env.DB, rateKey, ADMIN_LOGIN_RATE_LIMIT);
  if (!rateCheck.allowed) {
    const minutes = Math.max(1, Math.ceil(rateCheck.retryAfterSeconds / 60));
    return Response.json(
      {
        error: `Terlalu banyak percobaan login gagal. Coba kembali dalam ${minutes} menit.`,
        retryAfterSeconds: rateCheck.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          "cache-control": "no-store",
          "retry-after": String(rateCheck.retryAfterSeconds),
        },
      }
    );
  }

  const verified = await verifyAdminCredentials(email, password, env);
  if (!verified.ok) {
    if (verified.status === 401) {
      await recordRateLimitFailure(env.DB, rateKey, ADMIN_LOGIN_RATE_LIMIT);
    }
    return Response.json({ error: verified.error }, { status: verified.status });
  }

  await clearRateLimit(env.DB, rateKey);

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
