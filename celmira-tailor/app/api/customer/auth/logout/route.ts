import { logoutCustomerDevice } from "@/lib/server/customer-auth";
import { getChatEnv } from "@/lib/server/cf-env";

export async function POST(request: Request) {
  const env = getChatEnv();
  const clearCookie = await logoutCustomerDevice(request, env.DB);

  const headers = new Headers({
    "content-type": "application/json",
    "cache-control": "no-store",
  });
  headers.append("set-cookie", clearCookie);

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}
