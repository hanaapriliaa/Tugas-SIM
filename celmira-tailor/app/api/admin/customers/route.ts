import { getAdminSession } from "@/lib/server/auth";
import { getChatEnv } from "@/lib/server/cf-env";
import { listAdminCustomersInDb } from "@/lib/server/admin-repo";

export async function GET(request: Request) {
  const env = getChatEnv();
  const admin = await getAdminSession(request, env.DB);
  if (!admin) {
    return Response.json({ error: "Autentikasi admin diperlukan." }, { status: 401 });
  }

  const customers = await listAdminCustomersInDb(env.DB);
  return Response.json(
    { customers, serverTime: new Date().toISOString() },
    { status: 200, headers: { "cache-control": "no-store" } }
  );
}
