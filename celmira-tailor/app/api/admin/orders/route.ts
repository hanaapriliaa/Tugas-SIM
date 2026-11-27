import { getAdminSession } from "@/lib/server/auth";
import { getChatEnv } from "@/lib/server/cf-env";
import { getOrInitPaymentConfigInDb, listAllOrdersInDb } from "@/lib/server/order-repo";

export async function GET(request: Request) {
  const env = getChatEnv();
  const admin = await getAdminSession(request, env.DB);
  if (!admin) {
    return Response.json({ error: "Autentikasi admin diperlukan." }, { status: 401 });
  }

  const [orders, paymentConfig] = await Promise.all([
    listAllOrdersInDb(env.DB),
    getOrInitPaymentConfigInDb(env.DB),
  ]);

  return Response.json(
    {
      orders,
      paymentConfig,
      serverTime: new Date().toISOString(),
    },
    { status: 200, headers: { "cache-control": "no-store" } }
  );
}
