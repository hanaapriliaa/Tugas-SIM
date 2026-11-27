import { getOrCreateCustomerSession } from "@/lib/server/auth";
import { getChatEnv } from "@/lib/server/cf-env";
import { getOrInitAdminChatConfig } from "@/lib/server/chat-repo";

async function handleSession(request: Request) {
  const env = getChatEnv();
  const { session, setCookieHeader } = await getOrCreateCustomerSession(request, env.DB);
  const config = await getOrInitAdminChatConfig(env.DB);

  const headers = new Headers({
    "content-type": "application/json",
    "cache-control": "no-store",
  });
  if (setCookieHeader) {
    headers.append("set-cookie", setCookieHeader);
  }

  return new Response(
    JSON.stringify({
      session: {
        id: session.id,
        customerName: session.customerName,
      },
      config,
    }),
    { status: 200, headers }
  );
}

export async function GET(request: Request) {
  return handleSession(request);
}

export async function POST(request: Request) {
  return handleSession(request);
}
