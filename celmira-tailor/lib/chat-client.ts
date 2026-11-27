import type { AdminChatFilter } from "@/lib/chat";
import { loadChatThreads } from "@/lib/storage/tailor-store";
import type {
  AdminChatConfig,
  ChatMessage,
  ChatMessageAttachment,
  ChatThread,
  ChatThreadContext,
} from "@/lib/types/tailor";

export const MIGRATION_FLAG_KEY = "celmira_chat_migration_v1";

export type AdminIdentity = {
  email: string;
  name: string;
  expiresAt: string;
};

export type MigrationSummary = {
  migratedThreads: number;
  skippedThreads: number;
  migratedMessages: number;
  skippedMessages: number;
  uploadedAttachments: number;
  verifiedAt: string;
};

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    const message =
      (data as { error?: string }).error ??
      `Permintaan gagal dengan status ${response.status}.`;
    const err = new Error(message) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }
  return data;
}

export function generateClientMessageId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `cmsg-${crypto.randomUUID()}`;
  }
  return `cmsg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ---------- CUSTOMER API ----------

export async function initCustomerChatSession(): Promise<{
  session: { id: string; customerName: string | null };
  config: AdminChatConfig;
}> {
  const res = await fetch("/api/chat/session", {
    method: "POST",
    credentials: "same-origin",
  });
  return parseJsonResponse(res);
}

export async function fetchCustomerThreads(): Promise<{
  sessionId: string;
  threads: ChatThread[];
  config: AdminChatConfig;
  serverTime: string;
}> {
  const res = await fetch("/api/chat/threads", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  return parseJsonResponse(res);
}

export async function createCustomerThreadApi(input: {
  title?: string;
  customerName?: string;
  context?: Partial<ChatThreadContext>;
}): Promise<{ thread: ChatThread; created: boolean }> {
  const res = await fetch("/api/chat/threads", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJsonResponse(res);
}

export async function sendCustomerMessageApi(
  threadId: string,
  input: {
    body: string;
    senderName?: string;
    clientMessageId: string;
    attachmentIds?: string[];
  }
): Promise<{ message: ChatMessage; thread: ChatThread; duplicate: boolean }> {
  const res = await fetch(`/api/chat/threads/${encodeURIComponent(threadId)}/messages`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJsonResponse(res);
}

export async function markCustomerThreadReadApi(threadId: string): Promise<{
  ok: boolean;
  updatedCount: number;
  readAt: string;
  thread: ChatThread;
}> {
  const res = await fetch(`/api/chat/threads/${encodeURIComponent(threadId)}/read`, {
    method: "POST",
    credentials: "same-origin",
  });
  return parseJsonResponse(res);
}

// ---------- ATTACHMENTS (R2) ----------

export async function uploadChatAttachmentApi(
  threadId: string,
  file: File,
  role: "customer" | "admin"
): Promise<ChatMessageAttachment> {
  const form = new FormData();
  form.set("threadId", threadId);
  form.set("role", role);
  form.set("file", file, file.name);

  const res = await fetch("/api/chat/attachments", {
    method: "POST",
    credentials: "same-origin",
    body: form,
  });
  const data = await parseJsonResponse<{ attachment: ChatMessageAttachment }>(res);
  return data.attachment;
}

// ---------- ADMIN AUTH API ----------

export async function fetchAdminAuthStatus(): Promise<{
  authenticated: boolean;
  configured: boolean;
  admin?: AdminIdentity;
}> {
  const res = await fetch("/api/admin/auth/me", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as {
    authenticated?: boolean;
    configured?: boolean;
    admin?: AdminIdentity;
  };
  return {
    authenticated: res.ok && Boolean(data.authenticated),
    configured: Boolean(data.configured),
    admin: data.admin,
  };
}

export async function loginAdminApi(
  email: string,
  password: string
): Promise<{ authenticated: true; admin: AdminIdentity }> {
  const res = await fetch("/api/admin/auth/login", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return parseJsonResponse(res);
}

export async function logoutAdminApi(): Promise<void> {
  await fetch("/api/admin/auth/logout", {
    method: "POST",
    credentials: "same-origin",
  });
}

// ---------- ADMIN CHAT API ----------

export async function fetchAdminThreads(options: {
  filter?: AdminChatFilter;
  query?: string;
} = {}): Promise<{
  threads: ChatThread[];
  totalUnreadForAdmin: number;
  config: AdminChatConfig;
  serverTime: string;
}> {
  const params = new URLSearchParams();
  if (options.filter && options.filter !== "all") params.set("filter", options.filter);
  if (options.query?.trim()) params.set("q", options.query.trim());
  const qs = params.toString();
  const res = await fetch(`/api/admin/chat/threads${qs ? `?${qs}` : ""}`, {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  return parseJsonResponse(res);
}

export async function sendAdminReplyApi(
  threadId: string,
  input: {
    body: string;
    senderName?: string;
    clientMessageId: string;
    attachmentIds?: string[];
  }
): Promise<{ message: ChatMessage; thread: ChatThread; duplicate: boolean }> {
  const res = await fetch(`/api/admin/chat/threads/${encodeURIComponent(threadId)}/messages`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJsonResponse(res);
}

export async function markAdminThreadReadApi(threadId: string): Promise<{
  ok: boolean;
  updatedCount: number;
  readAt: string;
  thread: ChatThread;
}> {
  const res = await fetch(`/api/admin/chat/threads/${encodeURIComponent(threadId)}/read`, {
    method: "POST",
    credentials: "same-origin",
  });
  return parseJsonResponse(res);
}

export async function updateAdminChatConfigApi(input: {
  adminDisplayName: string;
  statusLabel: string;
  availabilityNote: string;
  officialWhatsappNumber?: string | null;
}): Promise<{ ok: boolean; config: AdminChatConfig }> {
  const res = await fetch("/api/admin/chat/config", {
    method: "PATCH",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJsonResponse(res);
}

// ---------- SAFE LOCALSTORAGE MIGRATION ----------

export function getLocalMigrationInfo(): {
  legacyThreadCount: number;
  legacyMessageCount: number;
  alreadyVerified: boolean;
  lastSummary: MigrationSummary | null;
} {
  if (typeof window === "undefined") {
    return { legacyThreadCount: 0, legacyMessageCount: 0, alreadyVerified: false, lastSummary: null };
  }
  const legacyThreads = loadChatThreads();
  const legacyMessageCount = legacyThreads.reduce((sum, t) => sum + t.messages.length, 0);

  let lastSummary: MigrationSummary | null = null;
  try {
    const raw = window.localStorage.getItem(MIGRATION_FLAG_KEY);
    if (raw) lastSummary = JSON.parse(raw) as MigrationSummary;
  } catch {
    lastSummary = null;
  }

  return {
    legacyThreadCount: legacyThreads.length,
    legacyMessageCount,
    alreadyVerified: Boolean(lastSummary?.verifiedAt),
    lastSummary,
  };
}

function dataUrlToFile(dataUrl: string, fileName: string): File | null {
  try {
    const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/i.exec(dataUrl);
    if (!match) return null;
    const mimeType = match[1].toLowerCase();
    const binary = atob(match[2]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new File([bytes], fileName, { type: mimeType });
  } catch {
    return null;
  }
}

/**
 * Memigrasikan riwayat chat lokal Stage 5A/5B-1 ke backend secara idempotent.
 * Data localStorage lama TIDAK dihapus agar tetap aman jika perlu diverifikasi ulang.
 */
export async function migrateLocalChatToBackend(): Promise<MigrationSummary> {
  const legacyThreads = loadChatThreads();
  if (legacyThreads.length === 0) {
    const empty: MigrationSummary = {
      migratedThreads: 0,
      skippedThreads: 0,
      migratedMessages: 0,
      skippedMessages: 0,
      uploadedAttachments: 0,
      verifiedAt: new Date().toISOString(),
    };
    return empty;
  }

  // Pastikan sesi customer aktif terlebih dulu
  await initCustomerChatSession();

  let uploadedAttachments = 0;
  const payloadThreads: Array<{
    legacyLocalId: string;
    title: string;
    customerName?: string;
    context: ChatThreadContext;
    messages: Array<{
      clientMessageId: string;
      sender: "customer" | "admin";
      senderName: string;
      body: string;
      createdAt: string;
      status: "terkirim" | "dibaca";
      readAt?: string;
      attachmentIds: string[];
    }>;
  }> = [];

  for (const thread of legacyThreads) {
    // Pastikan thread dibuat lebih dulu di server agar lampiran lama bisa diunggah ke R2
    const ensured = await createCustomerThreadApi({
      title: thread.title,
      customerName: thread.customerName,
      context: thread.context,
    });
    const serverThreadId = ensured.thread.id;

    const preparedMessages = [];
    for (const msg of thread.messages) {
      if (msg.sender !== "customer" && msg.sender !== "admin") continue;
      const attachmentIds: string[] = [];

      for (const att of msg.attachments) {
        if (!att.previewDataUrl) continue;
        const file = dataUrlToFile(att.previewDataUrl, att.name);
        if (!file) continue;
        try {
          const uploaded = await uploadChatAttachmentApi(serverThreadId, file, "customer");
          attachmentIds.push(uploaded.id);
          uploadedAttachments += 1;
        } catch {
          // Lewati lampiran rusak tanpa menggagalkan teks pesan
        }
      }

      preparedMessages.push({
        clientMessageId: msg.id,
        sender: msg.sender,
        senderName: msg.senderName,
        body: msg.body,
        createdAt: msg.createdAt,
        status: msg.status,
        readAt: msg.readAt,
        attachmentIds,
      });
    }

    payloadThreads.push({
      legacyLocalId: thread.id,
      title: thread.title,
      customerName: thread.customerName,
      context: thread.context,
      messages: preparedMessages,
    });
  }

  const res = await fetch("/api/chat/migrate", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ threads: payloadThreads }),
  });
  const data = await parseJsonResponse<{
    ok: boolean;
    summary: {
      migratedThreads: number;
      skippedThreads: number;
      migratedMessages: number;
      skippedMessages: number;
    };
  }>(res);

  const verifiedSummary: MigrationSummary = {
    ...data.summary,
    uploadedAttachments,
    verifiedAt: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(MIGRATION_FLAG_KEY, JSON.stringify(verifiedSummary));
  } catch {
    // Abaikan jika storage terbatas
  }

  return verifiedSummary;
}
