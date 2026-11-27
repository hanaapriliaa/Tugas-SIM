import { getOrCreateCustomerSession } from "@/lib/server/auth";
import { broadcastChatEvent, getChatEnv } from "@/lib/server/cf-env";
import {
  createCustomerThread,
  getOrInitAdminChatConfig,
  listCustomerThreads,
} from "@/lib/server/chat-repo";
import type { ChatThreadContext } from "@/lib/types/tailor";

export async function GET(request: Request) {
  const env = getChatEnv();
  const { session, setCookieHeader } = await getOrCreateCustomerSession(request, env.DB);
  const [threads, config] = await Promise.all([
    listCustomerThreads(env.DB, session.id),
    getOrInitAdminChatConfig(env.DB),
  ]);

  const headers = new Headers({
    "content-type": "application/json",
    "cache-control": "no-store",
  });
  if (setCookieHeader) {
    headers.append("set-cookie", setCookieHeader);
  }

  return new Response(
    JSON.stringify({
      sessionId: session.id,
      threads,
      config,
      serverTime: new Date().toISOString(),
    }),
    { status: 200, headers }
  );
}

export async function POST(request: Request) {
  const env = getChatEnv();
  const { session, setCookieHeader } = await getOrCreateCustomerSession(request, env.DB);

  let body: {
    title?: string;
    customerName?: string;
    legacyLocalId?: string;
    context?: Partial<ChatThreadContext>;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Payload JSON tidak valid." }, { status: 400 });
  }

  const { thread, created } = await createCustomerThread(env.DB, session.id, {
    title: body.title,
    customerName: body.customerName,
    legacyLocalId: body.legacyLocalId,
    context: body.context,
  });

  if (created) {
    await broadcastChatEvent(env.CHAT_HUB, ["role:admin", `customer:${session.id}`], {
      type: "thread:updated",
      threadId: thread.id,
      updatedAt: thread.updatedAt,
    });
  }

  const headers = new Headers({
    "content-type": "application/json",
    "cache-control": "no-store",
  });
  if (setCookieHeader) {
    headers.append("set-cookie", setCookieHeader);
  }

  return new Response(JSON.stringify({ thread, created }), {
    status: created ? 201 : 200,
    headers,
  });
}
