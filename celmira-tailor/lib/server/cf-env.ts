import { env } from "cloudflare:workers";

export type ChatWorkerEnv = {
  DB: D1Database;
  CHAT_ATTACHMENTS: R2Bucket;
  CHAT_HUB: DurableObjectNamespace;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD_HASH?: string;
  AUTH_SIGNING_SECRET?: string;
};

export function getChatEnv(): ChatWorkerEnv {
  return env as unknown as ChatWorkerEnv;
}

export async function broadcastChatEvent(
  hub: DurableObjectNamespace | undefined,
  targets: string[],
  event: Record<string, unknown>
): Promise<void> {
  if (!hub || targets.length === 0) return;
  try {
    const id = hub.idFromName("celmira-chat-global");
    const stub = hub.get(id);
    await stub.fetch("https://chat-hub.internal/broadcast", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targets, event }),
    });
  } catch {
    // Jangan gagalkan penyimpanan pesan bila broadcast WS sementara tidak tersedia (fallback polling aktif).
  }
}
