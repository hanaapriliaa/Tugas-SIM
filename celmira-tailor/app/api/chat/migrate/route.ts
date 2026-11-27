import { getOrCreateCustomerSession } from "@/lib/server/auth";
import { broadcastChatEvent, getChatEnv } from "@/lib/server/cf-env";
import {
  migrateLegacyThreadsForCustomer,
  type LegacyMigrationThreadInput,
} from "@/lib/server/chat-repo";

export async function POST(request: Request) {
  const env = getChatEnv();
  const { session, setCookieHeader } = await getOrCreateCustomerSession(request, env.DB);

  let payload: { threads?: LegacyMigrationThreadInput[] };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return Response.json({ error: "Payload migrasi tidak valid." }, { status: 400 });
  }

  if (!Array.isArray(payload.threads)) {
    return Response.json({ error: "Daftar threads migrasi harus berupa array." }, { status: 400 });
  }

  const summary = await migrateLegacyThreadsForCustomer(env.DB, session.id, payload.threads);

  if (summary.migratedThreads > 0 || summary.migratedMessages > 0) {
    await broadcastChatEvent(env.CHAT_HUB, ["role:admin", `customer:${session.id}`], {
      type: "thread:updated",
      updatedAt: new Date().toISOString(),
    });
  }

  const headers = new Headers({
    "content-type": "application/json",
    "cache-control": "no-store",
  });
  if (setCookieHeader) {
    headers.append("set-cookie", setCookieHeader);
  }

  return new Response(JSON.stringify({ ok: true, summary }), { status: 200, headers });
}
