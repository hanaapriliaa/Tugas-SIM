import {
  ADMIN_SESSION_COOKIE,
  buildClearCookieHeader,
  isSecureRequest,
  revokeAdminSession,
} from "@/lib/server/auth";
import { getChatEnv } from "@/lib/server/cf-env";

export async function POST(request: Request) {
  const env = getChatEnv();
  await revokeAdminSession(request, env.DB);

  const headers = new Headers({
    "content-type": "application/json",
    "cache-control": "no-store",
  });
  headers.append(
    "set-cookie",
    buildClearCookieHeader(ADMIN_SESSION_COOKIE, isSecureRequest(request))
  );

  return new Response(JSON.stringify({ ok: true, authenticated: false }), {
    status: 200,
    headers,
  });
}
