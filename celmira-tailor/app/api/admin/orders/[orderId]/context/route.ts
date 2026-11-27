import { getAdminSession } from "@/lib/server/auth";
import { getChatEnv } from "@/lib/server/cf-env";
import { getAdminOrderContextInDb } from "@/lib/server/order-repo";

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const env = getChatEnv();
  const admin = await getAdminSession(request, env.DB);
  if (!admin) {
    return Response.json({ error: "Autentikasi admin diperlukan." }, { status: 401 });
  }

  const { orderId } = await context.params;
  const integrated = await getAdminOrderContextInDb(env.DB, orderId);
  if (!integrated) {
    return Response.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
  }

  return Response.json(
    {
      context: integrated,
      serverTime: new Date().toISOString(),
    },
    { status: 200, headers: { "cache-control": "no-store" } }
  );
}
