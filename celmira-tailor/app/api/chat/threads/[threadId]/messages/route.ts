import { getCustomerSession } from "@/lib/server/auth";
import { broadcastChatEvent, getChatEnv } from "@/lib/server/cf-env";
import {
  createChatMessage,
  getThreadWithOwner,
  listThreadMessagesAfter,
} from "@/lib/server/chat-repo";

type RouteContext = {
  params: Promise<{ threadId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const env = getChatEnv();
  const session = await getCustomerSession(request, env.DB);
  if (!session) {
    return Response.json({ error: "Sesi pelanggan tidak ditemukan." }, { status: 401 });
  }

  const { threadId } = await context.params;
  const found = await getThreadWithOwner(env.DB, threadId);
  if (!found) {
    return Response.json({ error: "Percakapan tidak ditemukan." }, { status: 404 });
  }
  if (found.customerSessionId !== session.id) {
    return Response.json(
      { error: "Anda tidak memiliki izin mengakses percakapan ini." },
      { status: 403 }
    );
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
  const session = await getCustomerSession(request, env.DB);
  if (!session) {
    return Response.json({ error: "Sesi pelanggan tidak ditemukan." }, { status: 401 });
  }

  const { threadId } = await context.params;
  const found = await getThreadWithOwner(env.DB, threadId);
  if (!found) {
    return Response.json({ error: "Percakapan tidak ditemukan." }, { status: 404 });
  }
  if (found.customerSessionId !== session.id) {
    return Response.json(
      { error: "Anda tidak memiliki izin mengirim pesan ke percakapan ini." },
      { status: 403 }
    );
  }

  let payload: {
    body?: string;
    senderName?: string;
    clientMessageId?: string;
    attachmentIds?: string[];
  };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return Response.json({ error: "Payload pesan tidak valid." }, { status: 400 });
  }

  const result = await createChatMessage(env.DB, {
    threadId,
    sender: "customer",
    senderName: payload.senderName ?? found.thread.customerName ?? "Pelanggan",
    body: payload.body ?? "",
    clientMessageId: payload.clientMessageId,
    attachmentIds: payload.attachmentIds,
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  if (!result.duplicate) {
    await broadcastChatEvent(env.CHAT_HUB, ["role:admin", `customer:${session.id}`], {
      type: "message:new",
      threadId,
      message: result.message,
      unreadByAdmin: result.thread.unreadByAdmin,
      unreadByCustomer: result.thread.unreadByCustomer,
      updatedAt: result.thread.updatedAt,
    });
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
