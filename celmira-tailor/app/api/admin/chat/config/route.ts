import { buildOfficialWhatsappHref } from "@/lib/chat";
import { getAdminSession } from "@/lib/server/auth";
import { broadcastChatEvent, getChatEnv } from "@/lib/server/cf-env";
import { getOrInitAdminChatConfig, updateAdminChatConfig } from "@/lib/server/chat-repo";

export async function GET(request: Request) {
  const env = getChatEnv();
  const adminSession = await getAdminSession(request, env.DB);
  if (!adminSession) {
    return Response.json({ error: "Autentikasi admin diperlukan." }, { status: 401 });
  }

  const config = await getOrInitAdminChatConfig(env.DB);
  return Response.json({ config }, { headers: { "cache-control": "no-store" } });
}

export async function PATCH(request: Request) {
  const env = getChatEnv();
  const adminSession = await getAdminSession(request, env.DB);
  if (!adminSession) {
    return Response.json({ error: "Autentikasi admin diperlukan." }, { status: 401 });
  }

  let payload: {
    adminDisplayName?: string;
    statusLabel?: string;
    availabilityNote?: string;
    officialWhatsappNumber?: string | null;
  };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return Response.json({ error: "Payload pengaturan tidak valid." }, { status: 400 });
  }

  const rawWa = (payload.officialWhatsappNumber ?? "").trim();
  if (rawWa && !buildOfficialWhatsappHref(rawWa)) {
    return Response.json(
      { error: "Format nomor WhatsApp resmi tidak valid (contoh: 081234567890 atau +62812...)." },
      { status: 400 }
    );
  }

  const config = await updateAdminChatConfig(env.DB, {
    adminDisplayName: payload.adminDisplayName ?? "Tim Atelier Celmira",
    statusLabel: payload.statusLabel ?? "Online · Terhubung ke server",
    availabilityNote:
      payload.availabilityNote ??
      "Pesan Anda tersimpan aman di server dan langsung masuk ke Admin Chat Inbox Celmira Tailor.",
    officialWhatsappNumber: rawWa || null,
  });

  await broadcastChatEvent(env.CHAT_HUB, ["role:admin", "role:customer"], {
    type: "config:updated",
    config,
  });

  return Response.json({ ok: true, config }, { headers: { "cache-control": "no-store" } });
}
