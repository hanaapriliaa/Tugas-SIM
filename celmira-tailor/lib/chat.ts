import { garmentCategories } from "./booking-options.ts";
import { normalizeWhatsappNumber } from "./booking-validation.ts";
import type {
  AdminChatConfig,
  ChatMessage,
  ChatMessageAttachment,
  ChatThread,
  ChatThreadContext,
  ChatThreadSource,
  GarmentCategoryId,
  MeasurementTemplateId,
  SubmittedOrder,
} from "@/lib/types/tailor";

export const MAX_CHAT_THREADS = 20;
export const MAX_MESSAGES_PER_THREAD = 60;
export const MAX_CHAT_IMAGES_PER_MESSAGE = 4;
export const MAX_CHAT_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_CHAT_IMAGE_DATA_URL_LENGTH = 120_000;
export const MAX_CHAT_MESSAGE_LENGTH = 1500;

export const ALLOWED_CHAT_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const CHAT_SOURCE_LABELS: Record<ChatThreadSource, string> = {
  general: "Konsultasi Umum",
  "design-studio": "Design Studio",
  "measurement-studio": "Measurement Studio",
  orders: "Pemesanan",
  track: "Pesanan",
};

const VALID_SOURCES = new Set<ChatThreadSource>([
  "general",
  "design-studio",
  "measurement-studio",
  "orders",
  "track",
]);

const VALID_TEMPLATES = new Set<MeasurementTemplateId>([
  "hijab",
  "atasan",
  "gamis",
  "busana-formal",
  "bawahan",
]);

export function createDefaultAdminChatConfig(now: Date = new Date()): AdminChatConfig {
  return {
    adminDisplayName: "Tim Atelier Celmira",
    statusLabel: "Siap menerima pesan · Mode lokal",
    availabilityNote:
      "Pesan Anda tersimpan di perangkat ini. Balasan admin langsung melalui dashboard akan tersedia pada Tahap 5B.",
    updatedAt: now.toISOString(),
  };
}

export function validateChatImageFile(file: {
  name: string;
  size: number;
  type: string;
}): string | null {
  const normalizedType = file.type.toLowerCase();
  const allowed = (ALLOWED_CHAT_IMAGE_MIME_TYPES as readonly string[]).includes(normalizedType);

  if (!allowed) {
    return `Gambar "${file.name}" harus berformat JPG, PNG, atau WEBP.`;
  }
  if (file.size <= 0) {
    return `File "${file.name}" kosong dan tidak dapat dilampirkan.`;
  }
  if (file.size > MAX_CHAT_IMAGE_SIZE_BYTES) {
    return `Ukuran "${file.name}" melebihi batas maksimal 5 MB per gambar.`;
  }
  return null;
}

export function validateChatMessageInput(
  body: string,
  attachments: ChatMessageAttachment[]
): { valid: boolean; error: string | null } {
  const trimmed = body.trim();
  if (!trimmed && attachments.length === 0) {
    return {
      valid: false,
      error: "Tulis pesan atau lampirkan minimal 1 gambar referensi sebelum mengirim.",
    };
  }
  if (trimmed.length > MAX_CHAT_MESSAGE_LENGTH) {
    return {
      valid: false,
      error: `Pesan maksimal ${MAX_CHAT_MESSAGE_LENGTH} karakter.`,
    };
  }
  if (attachments.length > MAX_CHAT_IMAGES_PER_MESSAGE) {
    return {
      valid: false,
      error: `Maksimal ${MAX_CHAT_IMAGES_PER_MESSAGE} gambar referensi per pesan.`,
    };
  }
  return { valid: true, error: null };
}

export function sanitizeOrderCodeParam(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const normalized = raw.trim().toUpperCase().slice(0, 32);
  if (/^CT-\d{8}-[A-Z0-9]{4,8}$/.test(normalized)) {
    return normalized;
  }
  return undefined;
}

export function sanitizeShortParam(raw?: string | null, maxLength = 80): string | undefined {
  if (!raw) return undefined;
  const cleaned = raw.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, maxLength);
  return cleaned || undefined;
}

export type ChatRouteInput = {
  source?: ChatThreadSource;
  orderCode?: string;
  category?: GarmentCategoryId | "";
  designId?: string;
  measurementId?: string;
  template?: MeasurementTemplateId;
};

export function buildChatHref(input: ChatRouteInput = {}): string {
  const params = new URLSearchParams();
  if (input.source && input.source !== "general") {
    params.set("source", input.source);
  }
  const safeOrderCode = sanitizeOrderCodeParam(input.orderCode);
  if (safeOrderCode) {
    params.set("orderCode", safeOrderCode);
  }
  if (
    input.category &&
    garmentCategories.some((item) => item.id === input.category)
  ) {
    params.set("category", input.category);
  }
  const safeDesignId = sanitizeShortParam(input.designId, 80);
  if (safeDesignId) {
    params.set("designId", safeDesignId);
  }
  const safeMeasurementId = sanitizeShortParam(input.measurementId, 80);
  if (safeMeasurementId) {
    params.set("measurementId", safeMeasurementId);
  }
  if (input.template && VALID_TEMPLATES.has(input.template)) {
    params.set("template", input.template);
  }

  const query = params.toString();
  return query ? `/chat?${query}` : "/chat";
}

export function parseChatQueryParams(search: {
  get(name: string): string | null;
}): ChatThreadContext {
  const rawSource = sanitizeShortParam(search.get("source"), 32) as ChatThreadSource | undefined;
  const source: ChatThreadSource =
    rawSource && VALID_SOURCES.has(rawSource) ? rawSource : "general";

  const orderCode = sanitizeOrderCodeParam(search.get("orderCode"));
  const rawCategory = sanitizeShortParam(search.get("category"), 40) as
    | GarmentCategoryId
    | undefined;
  const categoryId =
    rawCategory && garmentCategories.some((item) => item.id === rawCategory)
      ? rawCategory
      : undefined;

  const designId = sanitizeShortParam(search.get("designId"), 80);
  const measurementProfileId = sanitizeShortParam(search.get("measurementId"), 80);
  const rawTemplate = sanitizeShortParam(search.get("template"), 40) as
    | MeasurementTemplateId
    | undefined;
  const templateId =
    rawTemplate && VALID_TEMPLATES.has(rawTemplate) ? rawTemplate : undefined;

  return {
    source: orderCode && source === "general" ? "track" : source,
    orderCode,
    categoryId,
    designId,
    measurementProfileId,
    templateId,
  };
}

export function buildOfficialWhatsappHref(
  rawPhone?: string | null,
  prefillMessage?: string
): string | null {
  if (!rawPhone) return null;
  const cleaned = normalizeWhatsappNumber(rawPhone);
  if (!/^(\+62|62|0)8[1-9][0-9]{7,12}$/.test(cleaned)) {
    return null;
  }
  const international = cleaned.startsWith("+62")
    ? cleaned.slice(1)
    : cleaned.startsWith("62")
      ? cleaned
      : `62${cleaned.slice(1)}`;

  const query = prefillMessage?.trim()
    ? `?text=${encodeURIComponent(prefillMessage.trim())}`
    : "";
  return `https://wa.me/${international}${query}`;
}

export function deriveThreadTitle(context: ChatThreadContext, customTitle?: string): string {
  if (customTitle?.trim()) return customTitle.trim().slice(0, 80);
  if (context.orderCode) return `Pesanan ${context.orderCode}`;
  if (context.designTitle) return `Desain: ${context.designTitle}`;
  if (context.measurementLabel) return `Ukuran: ${context.measurementLabel}`;
  if (context.categoryId) {
    const category = garmentCategories.find((item) => item.id === context.categoryId);
    if (category) return `Konsultasi ${category.name}`;
  }
  return CHAT_SOURCE_LABELS[context.source];
}

export function createChatThread(
  input: {
    title?: string;
    customerName?: string;
    context?: Partial<ChatThreadContext>;
  } = {},
  now: Date = new Date()
): ChatThread {
  const source: ChatThreadSource = input.context?.source ?? "general";
  const context: ChatThreadContext = {
    source,
    orderCode: sanitizeOrderCodeParam(input.context?.orderCode),
    categoryId: input.context?.categoryId,
    designId: sanitizeShortParam(input.context?.designId, 80),
    designTitle: sanitizeShortParam(input.context?.designTitle, 80),
    measurementProfileId: sanitizeShortParam(input.context?.measurementProfileId, 80),
    measurementLabel: sanitizeShortParam(input.context?.measurementLabel, 80),
    templateId: input.context?.templateId,
  };

  const timestamp = now.toISOString();
  const id = `chat-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`;

  return {
    id,
    title: deriveThreadTitle(context, input.title),
    customerName: sanitizeShortParam(input.customerName, 80),
    source: context.source,
    context,
    createdAt: timestamp,
    updatedAt: timestamp,
    unreadByCustomer: 0,
    unreadByAdmin: 0,
    messages: [],
  };
}

export function appendCustomerMessage(
  thread: ChatThread,
  input: {
    body: string;
    attachments?: ChatMessageAttachment[];
    senderName?: string;
  },
  now: Date = new Date()
): { ok: true; thread: ChatThread; message: ChatMessage } | { ok: false; error: string } {
  const attachments = (input.attachments ?? []).slice(0, MAX_CHAT_IMAGES_PER_MESSAGE);
  const validation = validateChatMessageInput(input.body, attachments);
  if (!validation.valid) {
    return { ok: false, error: validation.error ?? "Pesan tidak valid." };
  }

  const timestamp = now.toISOString();
  const message: ChatMessage = {
    id: `msg-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
    threadId: thread.id,
    sender: "customer",
    senderName: input.senderName?.trim() || "Anda",
    body: input.body.trim(),
    attachments: attachments.map((item) => ({
      ...item,
      previewDataUrl:
        item.previewDataUrl && item.previewDataUrl.length <= MAX_CHAT_IMAGE_DATA_URL_LENGTH
          ? item.previewDataUrl
          : undefined,
    })),
    createdAt: timestamp,
    status: "terkirim",
  };

  const nextMessages = [...thread.messages, message].slice(-MAX_MESSAGES_PER_THREAD);

  return {
    ok: true,
    message,
    thread: {
      ...thread,
      updatedAt: timestamp,
      unreadByAdmin: thread.unreadByAdmin + 1,
      messages: nextMessages,
    },
  };
}

export function markThreadReadByCustomer(
  thread: ChatThread,
  now: Date = new Date()
): ChatThread {
  const timestamp = now.toISOString();
  let changed = thread.unreadByCustomer > 0;

  const messages = thread.messages.map((message) => {
    if (message.sender === "admin" && message.status !== "dibaca") {
      changed = true;
      return {
        ...message,
        status: "dibaca" as const,
        readAt: message.readAt ?? timestamp,
      };
    }
    return message;
  });

  if (!changed) return thread;

  return {
    ...thread,
    unreadByCustomer: 0,
    messages,
  };
}

/**
 * Helper yang disiapkan untuk Tahap 5B (Admin Chat Reply) saat admin membaca
 * percakapan pelanggan di dashboard.
 */
export function markCustomerMessagesReadByAdmin(
  thread: ChatThread,
  now: Date = new Date()
): ChatThread {
  const timestamp = now.toISOString();
  let changed = thread.unreadByAdmin > 0;

  const messages = thread.messages.map((message) => {
    if (message.sender === "customer" && message.status !== "dibaca") {
      changed = true;
      return {
        ...message,
        status: "dibaca" as const,
        readAt: message.readAt ?? timestamp,
      };
    }
    return message;
  });

  if (!changed) return thread;

  return {
    ...thread,
    unreadByAdmin: 0,
    messages,
  };
}

export function upsertChatThreadInList(
  threads: ChatThread[],
  thread: ChatThread
): ChatThread[] {
  const next = [thread, ...threads.filter((item) => item.id !== thread.id)];
  return next
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, MAX_CHAT_THREADS);
}

export function prepareChatThreadsForStorage(
  threads: ChatThread[],
  options: { stripAllImages?: boolean; keepImagesOnlyForTopCount?: number } = {}
): ChatThread[] {
  const { stripAllImages = false, keepImagesOnlyForTopCount } = options;

  return threads.slice(0, MAX_CHAT_THREADS).map((thread, index) => {
    const stripThreadImages =
      stripAllImages ||
      (typeof keepImagesOnlyForTopCount === "number" && index >= keepImagesOnlyForTopCount);

    return {
      ...thread,
      messages: thread.messages.slice(-MAX_MESSAGES_PER_THREAD).map((message) => ({
        ...message,
        attachments: (message.attachments ?? []).map((attachment) => ({
          ...attachment,
          previewDataUrl:
            !stripThreadImages &&
            attachment.previewDataUrl &&
            attachment.previewDataUrl.length <= MAX_CHAT_IMAGE_DATA_URL_LENGTH
              ? attachment.previewDataUrl
              : undefined,
        })),
      })),
    };
  });
}

export function findMatchingContextThread(
  threads: ChatThread[],
  context: ChatThreadContext
): ChatThread | undefined {
  if (context.orderCode) {
    return threads.find((item) => item.context.orderCode === context.orderCode);
  }
  if (context.designId) {
    return threads.find((item) => item.context.designId === context.designId);
  }
  if (context.measurementProfileId) {
    return threads.find(
      (item) => item.context.measurementProfileId === context.measurementProfileId
    );
  }
  return undefined;
}

export function filterChatThreads(
  threads: ChatThread[],
  query: string,
  sourceFilter: ChatThreadSource | "all" = "all"
): ChatThread[] {
  const normalizedQuery = query.trim().toLowerCase();

  return [...threads]
    .filter((thread) => {
      if (sourceFilter !== "all" && thread.source !== sourceFilter) {
        return false;
      }
      if (!normalizedQuery) return true;

      const haystacks = [
        thread.title,
        thread.context.orderCode ?? "",
        thread.context.designTitle ?? "",
        thread.context.measurementLabel ?? "",
        ...thread.messages.map((msg) => msg.body),
      ];
      return haystacks.some((item) => item.toLowerCase().includes(normalizedQuery));
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function getTotalUnreadForCustomer(threads: ChatThread[]): number {
  return threads.reduce((sum, thread) => sum + Math.max(0, thread.unreadByCustomer), 0);
}

export function getTotalUnreadForAdmin(threads: ChatThread[]): number {
  return threads.reduce((sum, thread) => sum + Math.max(0, thread.unreadByAdmin), 0);
}

export type AdminChatFilter = "all" | "unread" | "active";

export type ResolvedThreadCustomer = {
  customerName: string;
  order: SubmittedOrder | null;
};

export function resolveThreadCustomerDisplay(
  thread: ChatThread,
  orders: SubmittedOrder[]
): ResolvedThreadCustomer {
  const order = thread.context.orderCode
    ? orders.find((item) => item.orderCode === thread.context.orderCode) ?? null
    : null;

  const customerName =
    order?.customer.fullName?.trim() ||
    thread.customerName?.trim() ||
    "Pelanggan (Browser Lokal)";

  return { customerName, order };
}

export function appendAdminMessage(
  thread: ChatThread,
  input: {
    body: string;
    attachments?: ChatMessageAttachment[];
    senderName?: string;
  },
  now: Date = new Date()
): { ok: true; thread: ChatThread; message: ChatMessage } | { ok: false; error: string } {
  const attachments = (input.attachments ?? []).slice(0, MAX_CHAT_IMAGES_PER_MESSAGE);
  const validation = validateChatMessageInput(input.body, attachments);
  if (!validation.valid) {
    return { ok: false, error: validation.error ?? "Balasan tidak valid." };
  }

  const readThread = markCustomerMessagesReadByAdmin(thread, now);
  const timestamp = now.toISOString();
  const message: ChatMessage = {
    id: `msg-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
    threadId: readThread.id,
    sender: "admin",
    senderName: input.senderName?.trim() || "Tim Atelier Celmira",
    body: input.body.trim(),
    attachments: attachments.map((item) => ({
      ...item,
      previewDataUrl:
        item.previewDataUrl && item.previewDataUrl.length <= MAX_CHAT_IMAGE_DATA_URL_LENGTH
          ? item.previewDataUrl
          : undefined,
    })),
    createdAt: timestamp,
    status: "terkirim",
  };

  const nextMessages = [...readThread.messages, message].slice(-MAX_MESSAGES_PER_THREAD);

  return {
    ok: true,
    message,
    thread: {
      ...readThread,
      updatedAt: timestamp,
      unreadByAdmin: 0,
      unreadByCustomer: readThread.unreadByCustomer + 1,
      messages: nextMessages,
    },
  };
}

export function filterAdminChatThreads(
  threads: ChatThread[],
  options: {
    query?: string;
    filter?: AdminChatFilter;
    orders?: SubmittedOrder[];
  } = {}
): ChatThread[] {
  const normalizedQuery = (options.query ?? "").trim().toLowerCase();
  const filter = options.filter ?? "all";
  const orders = options.orders ?? [];

  return [...threads]
    .filter((thread) => {
      if (filter === "unread" && thread.unreadByAdmin <= 0) {
        return false;
      }
      if (filter === "active" && thread.messages.length === 0) {
        return false;
      }
      if (!normalizedQuery) return true;

      const { customerName, order } = resolveThreadCustomerDisplay(thread, orders);
      const haystacks = [
        customerName,
        thread.title,
        thread.context.orderCode ?? "",
        order?.designTitle ?? "",
        order?.categoryName ?? "",
        thread.context.designTitle ?? "",
        thread.context.measurementLabel ?? "",
        ...thread.messages.map((msg) => msg.body),
      ];
      return haystacks.some((item) => item.toLowerCase().includes(normalizedQuery));
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function formatChatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatChatDateDivider(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) return "Hari ini";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function getChatQuickPrompts(context: ChatThreadContext): string[] {
  if (context.orderCode) {
    return [
      `Halo admin, saya ingin menanyakan perkembangan pesanan ${context.orderCode}.`,
      "Apakah detail bahan dan warna untuk pesanan saya sudah sesuai?",
      "Mohon info estimasi penyelesaian pesanan saya.",
    ];
  }
  if (context.source === "design-studio") {
    return [
      "Apakah model desain ini cocok dengan pilihan bahan tersebut?",
      "Saya ingin konsultasi detail kerah, lengan, atau finishing-nya.",
    ];
  }
  if (context.source === "measurement-studio") {
    return [
      "Saya ingin memastikan cara mengukur bagian lingkar badan atau bahu.",
      "Apakah profil ukuran saya perlu kelonggaran tambahan?",
    ];
  }
  return [
    "Halo Celmira, saya ingin konsultasi model dan bahan jahit custom.",
    "Bagaimana cara memesan jika saya berada di luar Yogyakarta?",
  ];
}
