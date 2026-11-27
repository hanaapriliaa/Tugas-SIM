import { getAdminSession } from "@/lib/server/auth";
import { broadcastChatEvent, getChatEnv } from "@/lib/server/cf-env";
import { markThreadMessagesRead } from "@/lib/server/chat-repo";

type RouteContext = {
  params: Promise<{ threadId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const env = getChatEnv();
  const adminSession = await getAdminSession(request, env.DB);
  if (!adminSession) {
    return Response.json({ error: "Autentikasi admin diperlukan." }, { status: 401 });
  }

  const { threadId } = await context.params;
  const result = await markThreadMessagesRead(env.DB, threadId, "admin");
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  if (result.updatedCount > 0) {
    await broadcastChatEvent(
      env.CHAT_HUB,
      [`customer:${result.customerSessionId}`, "role:admin"],
      {
        type: "messages:read",
        threadId,
        readerRole: "admin",
        readAt: result.readAt,
        unreadByAdmin: result.thread.unreadByAdmin,
        unreadByCustomer: result.thread.unreadByCustomer,
      }
    );
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
