import { getAdminSession, isAdminAuthConfigured } from "@/lib/server/auth";
import { getChatEnv } from "@/lib/server/cf-env";

export async function GET(request: Request) {
  const env = getChatEnv();
  const configured = isAdminAuthConfigured(env);
  const session = await getAdminSession(request, env.DB);

  if (!session) {
    return Response.json(
      { authenticated: false, configured },
      { status: 401, headers: { "cache-control": "no-store" } }
    );
  }

  return Response.json(
    {
      authenticated: true,
      configured,
      admin: {
        email: session.adminEmail,
        name: session.adminName,
        expiresAt: session.expiresAt,
      },
    },
    { status: 200, headers: { "cache-control": "no-store" } }
  );
}
