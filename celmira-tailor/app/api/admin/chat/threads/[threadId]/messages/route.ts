import { getAdminSession } from "@/lib/server/auth";
import { broadcastChatEvent, getChatEnv } from "@/lib/server/cf-env";
import {
  createChatMessage,
  getOrInitAdminChatConfig,
  getThreadWithOwner,
  listThreadMessagesAfter,
} from "@/lib/server/chat-repo";

type RouteContext = {
  params: Promise<{ threadId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const env = getChatEnv();
  const adminSession = await getAdminSession(request, env.DB);
  if (!adminSession) {
    return Response.json({ error: "Autentikasi admin diperlukan." }, { status: 401 });
  }

  const { threadId } = await context.params;
  const found = await getThreadWithOwner(env.DB, threadId);
  if (!found) {
    return Response.json({ error: "Percakapan tidak ditemukan." }, { status: 404 });
  }

  const url = new URL(request.url);
  const after = url.searchParams.get("after");
  const messages = after
    ? await listThreadMessagesAfter(env.DB, threadId, after)
    : found.thread.messages;

  return Response.json(
    {
      thread: found.thread,
      messages,
      serverTime: new Date().toISOString(),
    },
    { headers: { "cache-control": "no-store" } }
  );
}

export async function POST(request: Request, context: RouteContext) {
  const env = getChatEnv();
  const adminSession = await getAdminSession(request, env.DB);
  if (!adminSession) {
    return Response.json({ error: "Autentikasi admin diperlukan." }, { status: 401 });
  }

  const { threadId } = await context.params;

  let payload: {
    body?: string;
    senderName?: string;
    clientMessageId?: string;
    attachmentIds?: string[];
  };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return Response.json({ error: "Payload balasan admin tidak valid." }, { status: 400 });
  }

  const config = await getOrInitAdminChatConfig(env.DB);
  const result = await createChatMessage(env.DB, {
    threadId,
    sender: "admin",
    senderName: payload.senderName?.trim() || config.adminDisplayName,
    body: payload.body ?? "",
    clientMessageId: payload.clientMessageId,
    attachmentIds: payload.attachmentIds,
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  if (!result.duplicate) {
    await broadcastChatEvent(
      env.CHAT_HUB,
      [`customer:${result.customerSessionId}`, "role:admin"],
      {
        type: "message:new",
        threadId,
        message: result.message,
        unreadByAdmin: result.thread.unreadByAdmin,
        unreadByCustomer: result.thread.unreadByCustomer,
        updatedAt: result.thread.updatedAt,
      }
    );
  }

  return Response.json(
    {
      message: result.message,
      thread: result.thread,
      duplicate: result.duplicate,
    },
    { status: result.duplicate ? 200 : 201, headers: { "cache-control": "no-store" } }
  );
}
