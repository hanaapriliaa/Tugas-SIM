import { getCustomerSession } from "@/lib/server/auth";
import { broadcastChatEvent, getChatEnv } from "@/lib/server/cf-env";
import { getThreadWithOwner, markThreadMessagesRead } from "@/lib/server/chat-repo";

type RouteContext = {
  params: Promise<{ threadId: string }>;
};

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
      { error: "Anda tidak memiliki izin mengakses percakapan ini." },
      { status: 403 }
    );
  }

  const result = await markThreadMessagesRead(env.DB, threadId, "customer");
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  if (result.updatedCount > 0) {
    await broadcastChatEvent(env.CHAT_HUB, ["role:admin", `customer:${session.id}`], {
      type: "messages:read",
      threadId,
      readerRole: "customer",
      readAt: result.readAt,
      unreadByAdmin: result.thread.unreadByAdmin,
      unreadByCustomer: result.thread.unreadByCustomer,
    });
  }

  return Response.json(
    {
      ok: true,
      updatedCount: result.updatedCount,
      readAt: result.readAt,
      thread: result.thread,
    },
    { headers: { "cache-control": "no-store" } }
  );
}
