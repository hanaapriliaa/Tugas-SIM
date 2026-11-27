import { getChatEnv } from "@/lib/server/cf-env";
import { getOrInitAdminChatConfig } from "@/lib/server/chat-repo";

export async function GET() {
  const env = getChatEnv();
  const config = await getOrInitAdminChatConfig(env.DB);

  return Response.json(
    {
      adminDisplayName: config.adminDisplayName,
      statusLabel: config.statusLabel,
      availabilityNote: config.availabilityNote,
      officialWhatsappNumber: config.officialWhatsappNumber ?? null,
    },
    { status: 200, headers: { "cache-control": "no-store" } }
  );
}
