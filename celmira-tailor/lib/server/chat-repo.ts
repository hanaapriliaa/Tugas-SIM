import {
  MAX_CHAT_IMAGES_PER_MESSAGE,
  MAX_CHAT_MESSAGE_LENGTH,
  deriveThreadTitle,
  sanitizeOrderCodeParam,
  sanitizeShortParam,
  type AdminChatFilter,
} from "../chat.ts";
import type {
  AdminChatConfig,
  ChatMessage,
  ChatMessageAttachment,
  ChatMessageSender,
  ChatMessageStatus,
  ChatThread,
  ChatThreadContext,
  ChatThreadSource,
  GarmentCategoryId,
  MeasurementTemplateId,
} from "@/lib/types/tailor";
import { ensureChatSchema } from "./chat-schema.ts";

type ThreadRow = {
  id: string;
  customer_session_id: string;
  legacy_local_id: string | null;
  title: string;
  customer_name: string | null;
  source: ChatThreadSource;
  order_code: string | null;
  order_verified: number;
  category_id: GarmentCategoryId | null;
  design_id: string | null;
  design_title: string | null;
  measurement_profile_id: string | null;
  measurement_label: string | null;
  template_id: MeasurementTemplateId | null;
  unread_by_customer: number;
  unread_by_admin: number;
  last_message_preview: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
};

type MessageRow = {
  id: string;
  thread_id: string;
  client_message_id: string | null;
  sender: ChatMessageSender;
  sender_name: string;
  body: string;
  status: ChatMessageStatus;
  read_at: string | null;
  created_at: string;
};

type AttachmentRow = {
  id: string;
  thread_id: string;
  message_id: string | null;
  file_name: string;
  mime_type: string;
  size_bytes: number;
};

const VALID_SOURCES = new Set<ChatThreadSource>([
  "general",
  "design-studio",
  "measurement-studio",
  "orders",
  "track",
]);

function mapAttachmentRow(row: AttachmentRow): ChatMessageAttachment {
  return {
    id: row.id,
    name: row.file_name,
    size: row.size_bytes,
    mimeType: row.mime_type,
    url: `/api/chat/attachments/${encodeURIComponent(row.id)}`,
  };
}

function mapMessageRow(
  row: MessageRow,
  attachmentsByMessage: Map<string, ChatMessageAttachment[]>
): ChatMessage {
  return {
    id: row.id,
    threadId: row.thread_id,
    clientMessageId: row.client_message_id ?? undefined,
    sender: row.sender,
    senderName: row.sender_name,
    body: row.body,
    attachments: attachmentsByMessage.get(row.id) ?? [],
    createdAt: row.created_at,
    status: row.status,
    readAt: row.read_at ?? undefined,
  };
}

function mapThreadRow(row: ThreadRow, messages: ChatMessage[]): ChatThread {
  return {
    id: row.id,
    title: row.title,
    customerName: row.customer_name ?? undefined,
    source: row.source,
    context: {
      source: row.source,
      orderCode: row.order_code ?? undefined,
      orderVerified: row.order_verified === 1,
      categoryId: row.category_id ?? undefined,
      designId: row.design_id ?? undefined,
      designTitle: row.design_title ?? undefined,
      measurementProfileId: row.measurement_profile_id ?? undefined,
      measurementLabel: row.measurement_label ?? undefined,
      templateId: row.template_id ?? undefined,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    unreadByCustomer: row.unread_by_customer,
    unreadByAdmin: row.unread_by_admin,
    messages,
  };
}

async function hydrateThreads(db: D1Database, rows: ThreadRow[]): Promise<ChatThread[]> {
  if (rows.length === 0) return [];

  const threadIds = rows.map((r) => r.id);
  const placeholders = threadIds.map(() => "?").join(", ");

  const [msgResult, attResult] = await Promise.all([
    db
      .prepare(
        `SELECT id, thread_id, client_message_id, sender, sender_name, body, status, read_at, created_at
         FROM chat_messages
         WHERE thread_id IN (${placeholders})
         ORDER BY created_at ASC`
      )
      .bind(...threadIds)
      .all<MessageRow>(),
    db
      .prepare(
        `SELECT id, thread_id, message_id, file_name, mime_type, size_bytes
         FROM chat_attachments
         WHERE thread_id IN (${placeholders}) AND message_id IS NOT NULL
         ORDER BY created_at ASC`
      )
      .bind(...threadIds)
      .all<AttachmentRow>(),
  ]);

  const attachmentsByMessage = new Map<string, ChatMessageAttachment[]>();
  for (const att of attResult.results ?? []) {
    if (!att.message_id) continue;
    const list = attachmentsByMessage.get(att.message_id) ?? [];
    list.push(mapAttachmentRow(att));
    attachmentsByMessage.set(att.message_id, list);
  }

  const messagesByThread = new Map<string, ChatMessage[]>();
  for (const msg of msgResult.results ?? []) {
    const list = messagesByThread.get(msg.thread_id) ?? [];
    list.push(mapMessageRow(msg, attachmentsByMessage));
    messagesByThread.set(msg.thread_id, list);
  }

  return rows.map((row) => mapThreadRow(row, messagesByThread.get(row.id) ?? []));
}

export async function getOrInitAdminChatConfig(db: D1Database): Promise<AdminChatConfig> {
  await ensureChatSchema(db);
  const row = await db
    .prepare(
      `SELECT admin_display_name, status_label, availability_note, official_whatsapp_number, updated_at
       FROM chat_admin_config
       WHERE id = 'default'`
    )
    .first<{
      admin_display_name: string;
      status_label: string;
      availability_note: string;
      official_whatsapp_number: string | null;
      updated_at: string;
    }>();

  if (row) {
    return {
      adminDisplayName: row.admin_display_name,
      statusLabel: row.status_label,
      availabilityNote: row.availability_note,
      officialWhatsappNumber: row.official_whatsapp_number ?? undefined,
      updatedAt: row.updated_at,
    };
  }

  const now = new Date().toISOString();
  const initial: AdminChatConfig = {
    adminDisplayName: "Tim Atelier Celmira",
    statusLabel: "Online · Terhubung ke server",
    availabilityNote:
      "Pesan Anda tersimpan aman di server dan langsung masuk ke Admin Chat Inbox Celmira Tailor.",
    updatedAt: now,
  };

  await db
    .prepare(
      `INSERT OR IGNORE INTO chat_admin_config
       (id, admin_display_name, status_label, availability_note, official_whatsapp_number, updated_at)
       VALUES ('default', ?, ?, ?, NULL, ?)`
    )
    .bind(
      initial.adminDisplayName,
      initial.statusLabel,
      initial.availabilityNote,
      initial.updatedAt
    )
    .run();

  return initial;
}

export async function updateAdminChatConfig(
  db: D1Database,
  input: {
    adminDisplayName: string;
    statusLabel: string;
    availabilityNote: string;
    officialWhatsappNumber?: string | null;
  }
): Promise<AdminChatConfig> {
  await ensureChatSchema(db);
  const now = new Date().toISOString();
  const displayName = sanitizeShortParam(input.adminDisplayName, 80) || "Tim Atelier Celmira";
  const statusLabel = sanitizeShortParam(input.statusLabel, 80) || "Online · Terhubung ke server";
  const availabilityNote =
    sanitizeShortParam(input.availabilityNote, 300) ||
    "Pesan Anda tersimpan aman di server dan langsung masuk ke Admin Chat Inbox Celmira Tailor.";
  const whatsapp = sanitizeShortParam(input.officialWhatsappNumber, 32) ?? null;

  await db
    .prepare(
      `INSERT INTO chat_admin_config
       (id, admin_display_name, status_label, availability_note, official_whatsapp_number, updated_at)
       VALUES ('default', ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         admin_display_name = excluded.admin_display_name,
         status_label = excluded.status_label,
         availability_note = excluded.availability_note,
         official_whatsapp_number = excluded.official_whatsapp_number,
         updated_at = excluded.updated_at`
    )
    .bind(displayName, statusLabel, availabilityNote, whatsapp, now)
    .run();

  return {
    adminDisplayName: displayName,
    statusLabel,
    availabilityNote,
    officialWhatsappNumber: whatsapp ?? undefined,
    updatedAt: now,
  };
}

export async function listCustomerThreads(
  db: D1Database,
  customerSessionId: string
): Promise<ChatThread[]> {
  await ensureChatSchema(db);
  const result = await db
    .prepare(
      `SELECT * FROM chat_threads
       WHERE customer_session_id = ?
       ORDER BY updated_at DESC
       LIMIT 50`
    )
    .bind(customerSessionId)
    .all<ThreadRow>();

  return hydrateThreads(db, result.results ?? []);
}

export async function listAdminThreads(
  db: D1Database,
  options: { filter?: AdminChatFilter; query?: string } = {}
): Promise<{ threads: ChatThread[]; totalUnreadForAdmin: number }> {
  await ensureChatSchema(db);
  const result = await db
    .prepare(
      `SELECT * FROM chat_threads
       ORDER BY updated_at DESC
       LIMIT 100`
    )
    .all<ThreadRow>();

  const allThreads = await hydrateThreads(db, result.results ?? []);
  const totalUnreadForAdmin = allThreads.reduce((sum, t) => sum + t.unreadByAdmin, 0);

  const filter = options.filter ?? "all";
  const needle = (options.query ?? "").trim().toLowerCase();

  const filtered = allThreads.filter((thread) => {
    if (filter === "unread" && thread.unreadByAdmin <= 0) return false;
    if (filter === "active" && thread.messages.length === 0) return false;
    if (!needle) return true;

    const haystacks = [
      thread.title,
      thread.customerName ?? "",
      thread.context.orderCode ?? "",
      thread.context.designTitle ?? "",
      thread.context.measurementLabel ?? "",
      ...thread.messages.map((m) => `${m.senderName} ${m.body}`),
    ];
    return haystacks.some((h) => h.toLowerCase().includes(needle));
  });

  return { threads: filtered, totalUnreadForAdmin };
}

export async function getThreadWithOwner(
  db: D1Database,
  threadId: string
): Promise<{ thread: ChatThread; customerSessionId: string } | null> {
  await ensureChatSchema(db);
  const row = await db
    .prepare(`SELECT * FROM chat_threads WHERE id = ?`)
    .bind(threadId)
    .first<ThreadRow>();

  if (!row) return null;
  const [hydrated] = await hydrateThreads(db, [row]);
  if (!hydrated) return null;
  return { thread: hydrated, customerSessionId: row.customer_session_id };
}

export async function listThreadMessagesAfter(
  db: D1Database,
  threadId: string,
  afterIso?: string | null
): Promise<ChatMessage[]> {
  await ensureChatSchema(db);
  const stmt = afterIso
    ? db
        .prepare(
          `SELECT id, thread_id, client_message_id, sender, sender_name, body, status, read_at, created_at
           FROM chat_messages
           WHERE thread_id = ? AND created_at > ?
           ORDER BY created_at ASC`
        )
        .bind(threadId, afterIso)
    : db
        .prepare(
          `SELECT id, thread_id, client_message_id, sender, sender_name, body, status, read_at, created_at
           FROM chat_messages
           WHERE thread_id = ?
           ORDER BY created_at ASC`
        )
        .bind(threadId);

  const msgResult = await stmt.all<MessageRow>();
  const messages = msgResult.results ?? [];
  if (messages.length === 0) return [];

  const msgIds = messages.map((m) => m.id);
  const placeholders = msgIds.map(() => "?").join(", ");
  const attResult = await db
    .prepare(
      `SELECT id, thread_id, message_id, file_name, mime_type, size_bytes
       FROM chat_attachments
       WHERE message_id IN (${placeholders})
       ORDER BY created_at ASC`
    )
    .bind(...msgIds)
    .all<AttachmentRow>();

  const attMap = new Map<string, ChatMessageAttachment[]>();
  for (const att of attResult.results ?? []) {
    if (!att.message_id) continue;
    const list = attMap.get(att.message_id) ?? [];
    list.push(mapAttachmentRow(att));
    attMap.set(att.message_id, list);
  }

  return messages.map((m) => mapMessageRow(m, attMap));
}

export async function createCustomerThread(
  db: D1Database,
  customerSessionId: string,
  input: {
    title?: string;
    customerName?: string;
    legacyLocalId?: string;
    context?: Partial<ChatThreadContext>;
  }
): Promise<{ thread: ChatThread; created: boolean }> {
  await ensureChatSchema(db);

  const legacyLocalId = sanitizeShortParam(input.legacyLocalId, 80) ?? null;
  if (legacyLocalId) {
    const existing = await db
      .prepare(
        `SELECT * FROM chat_threads
         WHERE customer_session_id = ? AND legacy_local_id = ?`
      )
      .bind(customerSessionId, legacyLocalId)
      .first<ThreadRow>();
    if (existing) {
      const [hydrated] = await hydrateThreads(db, [existing]);
      return { thread: hydrated, created: false };
    }
  }

  const rawSource = input.context?.source;
  const source: ChatThreadSource =
    rawSource && VALID_SOURCES.has(rawSource) ? rawSource : "general";

  const context: ChatThreadContext = {
    source,
    orderCode: sanitizeOrderCodeParam(input.context?.orderCode),
    orderVerified: Boolean(input.context?.orderVerified && sanitizeOrderCodeParam(input.context?.orderCode)),
    categoryId: input.context?.categoryId,
    designId: sanitizeShortParam(input.context?.designId, 80),
    designTitle: sanitizeShortParam(input.context?.designTitle, 80),
    measurementProfileId: sanitizeShortParam(input.context?.measurementProfileId, 80),
    measurementLabel: sanitizeShortParam(input.context?.measurementLabel, 80),
    templateId: input.context?.templateId,
  };

  const title = deriveThreadTitle(context, input.title);
  const customerName = sanitizeShortParam(input.customerName, 80) ?? null;
  const id = `thr-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO chat_threads (
        id, customer_session_id, legacy_local_id, title, customer_name, source,
        order_code, order_verified, category_id, design_id, design_title,
        measurement_profile_id, measurement_label, template_id,
        unread_by_customer, unread_by_admin, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`
    )
    .bind(
      id,
      customerSessionId,
      legacyLocalId,
      title,
      customerName,
      context.source,
      context.orderCode ?? null,
      context.orderVerified ? 1 : 0,
      context.categoryId ?? null,
      context.designId ?? null,
      context.designTitle ?? null,
      context.measurementProfileId ?? null,
      context.measurementLabel ?? null,
      context.templateId ?? null,
      now,
      now
    )
    .run();

  if (customerName) {
    await db
      .prepare(`UPDATE chat_customer_sessions SET customer_name = ? WHERE id = ?`)
      .bind(customerName, customerSessionId)
      .run();
  }

  const found = await getThreadWithOwner(db, id);
  if (!found) {
    throw new Error("Gagal membuat percakapan baru di database.");
  }
  return { thread: found.thread, created: true };
}

export async function createChatMessage(
  db: D1Database,
  params: {
    threadId: string;
    sender: "customer" | "admin";
    senderName: string;
    body: string;
    clientMessageId?: string;
    attachmentIds?: string[];
    createdAtOverride?: string;
    statusOverride?: ChatMessageStatus;
    readAtOverride?: string;
  }
): Promise<
  | { ok: true; message: ChatMessage; thread: ChatThread; customerSessionId: string; duplicate: boolean }
  | { ok: false; status: number; error: string }
> {
  await ensureChatSchema(db);

  const trimmedBody = params.body.trim();
  const attachmentIds = Array.from(
    new Set((params.attachmentIds ?? []).filter((id) => typeof id === "string" && id.trim().length > 0))
  ).slice(0, MAX_CHAT_IMAGES_PER_MESSAGE);

  if (!trimmedBody && attachmentIds.length === 0) {
    return {
      ok: false,
      status: 400,
      error: "Tulis pesan atau lampirkan minimal 1 gambar referensi sebelum mengirim.",
    };
  }

  if (trimmedBody.length > MAX_CHAT_MESSAGE_LENGTH) {
    return {
      ok: false,
      status: 400,
      error: `Pesan maksimal ${MAX_CHAT_MESSAGE_LENGTH} karakter.`,
    };
  }

  if ((params.attachmentIds ?? []).length > MAX_CHAT_IMAGES_PER_MESSAGE) {
    return {
      ok: false,
      status: 400,
      error: `Maksimal ${MAX_CHAT_IMAGES_PER_MESSAGE} gambar referensi per pesan.`,
    };
  }

  const existingThread = await getThreadWithOwner(db, params.threadId);
  if (!existingThread) {
    return { ok: false, status: 404, error: "Percakapan tidak ditemukan." };
  }

  const clientMessageId = sanitizeShortParam(params.clientMessageId, 100) ?? null;

  // Idempotency check: cegah duplikasi pesan ketika reconnect / retry
  if (clientMessageId) {
    const existingMsg = await db
      .prepare(
        `SELECT id, thread_id, client_message_id, sender, sender_name, body, status, read_at, created_at
         FROM chat_messages
         WHERE thread_id = ? AND client_message_id = ?`
      )
      .bind(params.threadId, clientMessageId)
      .first<MessageRow>();

    if (existingMsg) {
      const refreshed = await getThreadWithOwner(db, params.threadId);
      const matched = refreshed?.thread.messages.find((m) => m.id === existingMsg.id);
      if (refreshed && matched) {
        return {
          ok: true,
          message: matched,
          thread: refreshed.thread,
          customerSessionId: refreshed.customerSessionId,
          duplicate: true,
        };
      }
    }
  }

  // Validasi semua attachmentIds milik thread ini dan belum terikat pesan lain
  if (attachmentIds.length > 0) {
    const placeholders = attachmentIds.map(() => "?").join(", ");
    const attRows = await db
      .prepare(
        `SELECT id, thread_id, message_id
         FROM chat_attachments
         WHERE id IN (${placeholders})`
      )
      .bind(...attachmentIds)
      .all<{ id: string; thread_id: string; message_id: string | null }>();

    const validIds = new Set(
      (attRows.results ?? [])
        .filter((r) => r.thread_id === params.threadId && r.message_id === null)
        .map((r) => r.id)
    );

    if (validIds.size !== attachmentIds.length) {
      return {
        ok: false,
        status: 400,
        error: "Satu atau lebih lampiran gambar tidak valid untuk percakapan ini.",
      };
    }
  }

  const now = params.createdAtOverride ?? new Date().toISOString();
  const messageId = `msg-${crypto.randomUUID()}`;
  const senderName =
    sanitizeShortParam(params.senderName, 80) ??
    (params.sender === "admin" ? "Tim Atelier Celmira" : "Pelanggan");
  const recipientRole = params.sender === "admin" ? "customer" : "admin";
  const status: ChatMessageStatus = params.statusOverride ?? "terkirim";
  const preview = (trimmedBody || `[${attachmentIds.length} lampiran gambar]`).slice(0, 140);

  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        `INSERT INTO chat_messages
         (id, thread_id, client_message_id, sender, sender_name, recipient_role, body, status, read_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        messageId,
        params.threadId,
        clientMessageId,
        params.sender,
        senderName,
        recipientRole,
        trimmedBody,
        status,
        params.readAtOverride ?? null,
        now
      ),
  ];

  for (const attId of attachmentIds) {
    statements.push(
      db
        .prepare(`UPDATE chat_attachments SET message_id = ? WHERE id = ? AND thread_id = ?`)
        .bind(messageId, attId, params.threadId)
    );
  }

  if (params.sender === "customer") {
    statements.push(
      db
        .prepare(
          `UPDATE chat_threads
           SET updated_at = ?,
               last_message_at = ?,
               last_message_preview = ?,
               unread_by_admin = unread_by_admin + 1,
               customer_name = COALESCE(customer_name, ?)
           WHERE id = ?`
        )
        .bind(
          now,
          now,
          preview,
          senderName !== "Anda" && senderName !== "Pelanggan" ? senderName : null,
          params.threadId
        )
    );
  } else {
    // Saat admin membalas, pesan customer yang belum dibaca otomatis ditandai dibaca di server
    statements.push(
      db
        .prepare(
          `UPDATE chat_messages
           SET status = 'dibaca', read_at = COALESCE(read_at, ?)
           WHERE thread_id = ? AND sender = 'customer' AND status = 'terkirim'`
        )
        .bind(now, params.threadId)
    );
    statements.push(
      db
        .prepare(
          `UPDATE chat_threads
           SET updated_at = ?,
               last_message_at = ?,
               last_message_preview = ?,
               unread_by_customer = unread_by_customer + 1,
               unread_by_admin = 0
           WHERE id = ?`
        )
        .bind(now, now, preview, params.threadId)
    );
  }

  await db.batch(statements);

  const refreshed = await getThreadWithOwner(db, params.threadId);
  const createdMsg = refreshed?.thread.messages.find((m) => m.id === messageId);
  if (!refreshed || !createdMsg) {
    return { ok: false, status: 500, error: "Pesan gagal dimuat ulang setelah penyimpanan." };
  }

  return {
    ok: true,
    message: createdMsg,
    thread: refreshed.thread,
    customerSessionId: refreshed.customerSessionId,
    duplicate: false,
  };
}

export async function markThreadMessagesRead(
  db: D1Database,
  threadId: string,
  readerRole: "customer" | "admin"
): Promise<
  | { ok: true; updatedCount: number; readAt: string; thread: ChatThread; customerSessionId: string }
  | { ok: false; status: number; error: string }
> {
  await ensureChatSchema(db);
  const found = await getThreadWithOwner(db, threadId);
  if (!found) {
    return { ok: false, status: 404, error: "Percakapan tidak ditemukan." };
  }

  const targetSender = readerRole === "admin" ? "customer" : "admin";
  const now = new Date().toISOString();

  const updateRes = await db
    .prepare(
      `UPDATE chat_messages
       SET status = 'dibaca', read_at = COALESCE(read_at, ?)
       WHERE thread_id = ? AND sender = ? AND status = 'terkirim'`
    )
    .bind(now, threadId, targetSender)
    .run();

  const unreadColumn = readerRole === "admin" ? "unread_by_admin" : "unread_by_customer";
  await db
    .prepare(`UPDATE chat_threads SET ${unreadColumn} = 0 WHERE id = ?`)
    .bind(threadId)
    .run();

  const refreshed = await getThreadWithOwner(db, threadId);
  if (!refreshed) {
    return { ok: false, status: 404, error: "Percakapan tidak ditemukan." };
  }

  return {
    ok: true,
    updatedCount: Number(updateRes.meta?.changes ?? 0),
    readAt: now,
    thread: refreshed.thread,
    customerSessionId: refreshed.customerSessionId,
  };
}

export type LegacyMigrationThreadInput = {
  legacyLocalId: string;
  title?: string;
  customerName?: string;
  context?: Partial<ChatThreadContext>;
  messages: Array<{
    clientMessageId: string;
    sender: "customer" | "admin";
    senderName: string;
    body: string;
    createdAt?: string;
    status?: ChatMessageStatus;
    readAt?: string;
    attachmentIds?: string[];
  }>;
};

export async function migrateLegacyThreadsForCustomer(
  db: D1Database,
  customerSessionId: string,
  legacyThreads: LegacyMigrationThreadInput[]
): Promise<{
  migratedThreads: number;
  skippedThreads: number;
  migratedMessages: number;
  skippedMessages: number;
  threadMap: Record<string, string>;
}> {
  let migratedThreads = 0;
  let skippedThreads = 0;
  let migratedMessages = 0;
  let skippedMessages = 0;
  const threadMap: Record<string, string> = {};

  for (const item of legacyThreads.slice(0, 20)) {
    if (!item?.legacyLocalId) continue;
    const { thread, created } = await createCustomerThread(db, customerSessionId, {
      title: item.title,
      customerName: item.customerName,
      legacyLocalId: item.legacyLocalId,
      context: item.context,
    });
    threadMap[item.legacyLocalId] = thread.id;
    if (created) migratedThreads += 1;
    else skippedThreads += 1;

    for (const msg of (item.messages ?? []).slice(0, 60)) {
      if (msg.sender !== "customer" && msg.sender !== "admin") continue;
      const res = await createChatMessage(db, {
        threadId: thread.id,
        sender: msg.sender,
        senderName: msg.senderName,
        body: msg.body,
        clientMessageId: msg.clientMessageId,
        attachmentIds: msg.attachmentIds,
        createdAtOverride: msg.createdAt,
        statusOverride: msg.status,
        readAtOverride: msg.readAt,
      });
      if (res.ok) {
        if (res.duplicate) skippedMessages += 1;
        else migratedMessages += 1;
      }
    }
  }

  return {
    migratedThreads,
    skippedThreads,
    migratedMessages,
    skippedMessages,
    threadMap,
  };
}
