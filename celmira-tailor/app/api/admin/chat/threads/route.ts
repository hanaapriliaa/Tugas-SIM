import type { AdminChatFilter } from "@/lib/chat";
import { getAdminSession } from "@/lib/server/auth";
import { getChatEnv } from "@/lib/server/cf-env";
import { getOrInitAdminChatConfig, listAdminThreads } from "@/lib/server/chat-repo";

export async function GET(request: Request) {
  const env = getChatEnv();
  const adminSession = await getAdminSession(request, env.DB);
  if (!adminSession) {
    return Response.json({ error: "Autentikasi admin diperlukan." }, { status: 401 });
  }

  const url = new URL(request.url);
  const rawFilter = url.searchParams.get("filter");
  const filter: AdminChatFilter =
    rawFilter === "unread" || rawFilter === "active" ? rawFilter : "all";
  const query = url.searchParams.get("q") ?? "";

  const [{ threads, totalUnreadForAdmin }, config] = await Promise.all([
    listAdminThreads(env.DB, { filter, query }),
    getOrInitAdminChatConfig(env.DB),
  ]);

  return Response.json(
    {
      threads,
      totalUnreadForAdmin,
      config,
      serverTime: new Date().toISOString(),
    },
    { headers: { "cache-control": "no-store" } }
  );
}
