import {
  celmiraDesignReferences,
  createInitialOrderDraft,
  getCategoryById,
} from "@/lib/booking-options";
import {
  MAX_SAVED_DESIGNS,
  removeSavedDesign,
  upsertSavedDesign,
} from "@/lib/design-studio";
import {
  DEFAULT_MEASUREMENT_TEMPLATES,
  MAX_SAVED_MEASUREMENT_PROFILES,
  normalizeMeasurementTemplates,
  removeMeasurementProfile,
  upsertMeasurementProfile,
} from "@/lib/measurement-studio";
import {
  MAX_CHAT_THREADS,
  createDefaultAdminChatConfig,
  prepareChatThreadsForStorage,
  sanitizeOrderCodeParam,
  upsertChatThreadInList,
} from "@/lib/chat";
import {
  createDefaultAdminPaymentConfig,
  createHistoryEvent,
  generateTrackingAccessCode,
  normalizeSubmittedOrder,
} from "@/lib/order-tracking";
import type {
  AdminChatConfig,
  AdminPaymentConfig,
  ChatThread,
  DesignStudioSavedConfig,
  MeasurementProfile,
  MeasurementTemplateConfig,
  OrderDraft,
  SubmittedOrder,
} from "@/lib/types/tailor";

export const STORAGE_KEYS = {
  bookingDraft: "celmira_booking_draft_v1",
  orders: "celmira_orders_v1",
  designs: "celmira_designs_v1",
  measurements: "celmira_measurements_v1",
  measurementTemplates: "celmira_measurement_templates_v1",
  paymentConfig: "celmira_payment_config_v1",
  chatThreads: "celmira_chat_threads_v1",
  chatConfig: "celmira_chat_config_v1",
} as const;

export const SESSION_KEYS = {
  verifiedOrders: "celmira_verified_orders_session_v1",
} as const;

export const CHAT_UPDATED_EVENT = "celmira-chat-updated";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function safeParseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSetItem(key: string, value: unknown): boolean {
  if (!isBrowser()) return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/**
 * Menghapus dataUrl berukuran besar jika penyimpanan browser penuh
 * agar draft tetap aman tersimpan tanpa kehilangan metadata file.
 */
function sanitizeDraftForStorage(draft: OrderDraft): OrderDraft {
  return {
    ...draft,
    attachments: draft.attachments.map((file) => ({
      ...file,
      previewDataUrl:
        file.previewDataUrl && file.previewDataUrl.length <= 160_000
          ? file.previewDataUrl
          : undefined,
    })),
  };
}

export function loadBookingDraft(): OrderDraft {
  if (!isBrowser()) return createInitialOrderDraft();
  const parsed = safeParseJson<Partial<OrderDraft> | null>(
    window.localStorage.getItem(STORAGE_KEYS.bookingDraft),
    null
  );
  if (!parsed) return createInitialOrderDraft();

  const initial = createInitialOrderDraft();
  return {
    ...initial,
    ...parsed,
    specifications: {
      ...initial.specifications,
      ...(parsed.specifications ?? {}),
    },
    measurements: {
      ...initial.measurements,
      ...(parsed.measurements ?? {}),
      values: {
        ...initial.measurements.values,
        ...(parsed.measurements?.values ?? {}),
      },
      extraValues: parsed.measurements?.extraValues
        ? { ...parsed.measurements.extraValues }
        : undefined,
    },
    customer: {
      ...initial.customer,
      ...(parsed.customer ?? {}),
    },
    delivery: {
      ...initial.delivery,
      ...(parsed.delivery ?? {}),
    },
    attachments: Array.isArray(parsed.attachments) ? parsed.attachments : [],
  };
}

export function saveBookingDraft(draft: OrderDraft): void {
  const payload = sanitizeDraftForStorage({
    ...draft,
    updatedAt: new Date().toISOString(),
  });
  const ok = safeSetItem(STORAGE_KEYS.bookingDraft, payload);
  if (!ok) {
    safeSetItem(STORAGE_KEYS.bookingDraft, {
      ...payload,
      attachments: payload.attachments.map(({ previewDataUrl: _ignored, ...rest }) => rest),
    });
  }
}

export function clearBookingDraft(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEYS.bookingDraft);
  } catch {
    // Abaikan jika akses storage dibatasi browser.
  }
}

export function loadSavedDesigns(): DesignStudioSavedConfig[] {
  if (!isBrowser()) return [];
  return safeParseJson<DesignStudioSavedConfig[]>(
    window.localStorage.getItem(STORAGE_KEYS.designs),
    []
  );
}

export function loadMeasurementProfiles(): MeasurementProfile[] {
  if (!isBrowser()) return [];
  const parsed = safeParseJson<MeasurementProfile[]>(
    window.localStorage.getItem(STORAGE_KEYS.measurements),
    []
  );
  return Array.isArray(parsed) ? parsed : [];
}

export function saveMeasurementProfiles(profiles: MeasurementProfile[]): void {
  if (!isBrowser()) return;
  const limited = profiles.slice(0, MAX_SAVED_MEASUREMENT_PROFILES).map((profile) => ({
    ...profile,
    values: { ...profile.values },
    extraValues: profile.extraValues ? { ...profile.extraValues } : undefined,
  }));
  safeSetItem(STORAGE_KEYS.measurements, limited);
}

export function saveMeasurementProfile(profile: MeasurementProfile): MeasurementProfile {
  const existing = loadMeasurementProfiles();
  saveMeasurementProfiles(upsertMeasurementProfile(existing, profile));
  return profile;
}

export function deleteMeasurementProfile(id: string): void {
  const existing = loadMeasurementProfiles();
  saveMeasurementProfiles(removeMeasurementProfile(existing, id));
}

export function loadMeasurementTemplates(): MeasurementTemplateConfig[] {
  if (!isBrowser()) {
    return normalizeMeasurementTemplates(DEFAULT_MEASUREMENT_TEMPLATES);
  }
  const stored = safeParseJson<MeasurementTemplateConfig[] | null>(
    window.localStorage.getItem(STORAGE_KEYS.measurementTemplates),
    null
  );
  return normalizeMeasurementTemplates(stored);
}

export function saveMeasurementTemplates(templates: MeasurementTemplateConfig[]): void {
  if (!isBrowser()) return;
  safeSetItem(STORAGE_KEYS.measurementTemplates, normalizeMeasurementTemplates(templates));
}

export function resetMeasurementTemplates(): MeasurementTemplateConfig[] {
  if (isBrowser()) {
    try {
      window.localStorage.removeItem(STORAGE_KEYS.measurementTemplates);
    } catch {
      // Abaikan jika akses storage dibatasi browser.
    }
  }
  return normalizeMeasurementTemplates(DEFAULT_MEASUREMENT_TEMPLATES);
}

export function loadSubmittedOrders(): SubmittedOrder[] {
  if (!isBrowser()) return [];
  const raw = safeParseJson<SubmittedOrder[]>(
    window.localStorage.getItem(STORAGE_KEYS.orders),
    []
  );
  if (!Array.isArray(raw)) return [];
  return raw.map((order) => normalizeSubmittedOrder(order));
}

function sanitizeOrderForStorage(order: SubmittedOrder): SubmittedOrder {
  return {
    ...order,
    attachments: order.attachments.map((file) => ({
      ...file,
      previewDataUrl:
        file.previewDataUrl && file.previewDataUrl.length <= 160_000
          ? file.previewDataUrl
          : undefined,
    })),
    payments: order.payments.map((payment) => ({
      ...payment,
      proofPreviewDataUrl:
        payment.proofPreviewDataUrl && payment.proofPreviewDataUrl.length <= 180_000
          ? payment.proofPreviewDataUrl
          : undefined,
    })),
  };
}

export function saveSubmittedOrders(orders: SubmittedOrder[]): void {
  if (!isBrowser()) return;
  const sanitized = orders.map((order) => sanitizeOrderForStorage(order));
  const ok = safeSetItem(STORAGE_KEYS.orders, sanitized);
  if (!ok) {
    const lightweight = sanitized.map((order) => ({
      ...order,
      attachments: order.attachments.map(({ previewDataUrl: _a, ...rest }) => rest),
      payments: order.payments.map(({ proofPreviewDataUrl: _p, ...rest }) => rest),
    }));
    safeSetItem(STORAGE_KEYS.orders, lightweight);
  }
}

export function generateOrderCode(now: Date = new Date()): string {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CT-${yyyy}${mm}${dd}-${suffix}`;
}

export function createSubmittedOrderFromDraft(
  draft: OrderDraft,
  now: Date = new Date()
): SubmittedOrder {
  if (!draft.categoryId) {
    throw new Error("Kategori busana wajib dipilih sebelum membuat pesanan.");
  }

  const category = getCategoryById(draft.categoryId);
  const timestamp = now.toISOString();
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `order-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`;

  const celmiraRef = celmiraDesignReferences.find(
    (item) => item.id === draft.selectedCelmiraDesignId
  );
  const studioConfigs = loadSavedDesigns();
  const studioRef = studioConfigs.find((item) => item.id === draft.selectedStudioDesignId);

  const designTitle =
    draft.designSource === "celmira"
      ? celmiraRef?.title ?? `Desain Celmira (${category?.name ?? draft.categoryId})`
      : draft.designSource === "design-studio"
        ? studioRef?.title ?? `Desain Studio (${category?.name ?? draft.categoryId})`
        : draft.customDesignTitle.trim() || `Desain Custom (${category?.name ?? draft.categoryId})`;

  const sanitizedAttachments = draft.attachments.map((file) => ({
    ...file,
    previewDataUrl:
      file.previewDataUrl && file.previewDataUrl.length <= 160_000
        ? file.previewDataUrl
        : undefined,
  }));

  const categoryName = category?.name ?? draft.categoryId;

  return {
    id,
    orderCode: generateOrderCode(now),
    trackingAccessCode: generateTrackingAccessCode(),
    createdAt: timestamp,
    updatedAt: timestamp,
    persistenceMode: "local-browser",
    status: "menunggu_penawaran",
    productionStage: "menunggu_produksi",
    categoryId: draft.categoryId,
    categoryName,
    designSource: draft.designSource,
    designTitle,
    selectedCelmiraDesignId:
      draft.designSource === "celmira" ? draft.selectedCelmiraDesignId : undefined,
    selectedStudioDesignId:
      draft.designSource === "design-studio" ? draft.selectedStudioDesignId : undefined,
    attachments: sanitizedAttachments,
    specifications: { ...draft.specifications },
    measurements: {
      ...draft.measurements,
      values: { ...draft.measurements.values },
      extraValues: draft.measurements.extraValues
        ? { ...draft.measurements.extraValues }
        : undefined,
    },
    customer: {
      fullName: draft.customer.fullName.trim(),
      whatsapp: draft.customer.whatsapp.trim(),
      email: draft.customer.email.trim(),
    },
    delivery: {
      ...draft.delivery,
      addressLine: draft.delivery.addressLine.trim(),
      city: draft.delivery.city.trim(),
      postalCode: draft.delivery.postalCode.trim(),
      courierNote: draft.delivery.courierNote.trim(),
    },
    targetDate: draft.targetDate,
    invoice: {
      quoteStatus: "belum_dikirim",
      tailoringFee: null,
      shippingFee: draft.delivery.method === "pickup" ? 0 : null,
      dpAmount: null,
      dpDueAt: null,
      settlementTailoringAmount: null,
      settlementTotalAmount: null,
    },
    payments: [],
    history: [
      createHistoryEvent(
        {
          actor: "customer",
          category: "pesanan",
          title: "Pengajuan pesanan dikirim",
          description: `Pesanan ${categoryName} (${designTitle}) diajukan dan menunggu peninjauan harga akhir oleh admin.`,
          orderStatus: "menunggu_penawaran",
          productionStage: "menunggu_produksi",
        },
        now
      ),
    ],
  };
}

export function saveSubmittedOrder(order: SubmittedOrder): SubmittedOrder {
  const existing = loadSubmittedOrders();
  const normalized = normalizeSubmittedOrder(order);
  const next = [normalized, ...existing.filter((item) => item.id !== normalized.id)];
  saveSubmittedOrders(next);
  return normalized;
}

export function updateSubmittedOrder(updated: SubmittedOrder): SubmittedOrder {
  const existing = loadSubmittedOrders();
  const normalized = normalizeSubmittedOrder(updated);
  const exists = existing.some((item) => item.id === normalized.id);
  const next = exists
    ? existing.map((item) => (item.id === normalized.id ? normalized : item))
    : [normalized, ...existing];
  saveSubmittedOrders(next);
  return normalized;
}

export function loadAdminPaymentConfig(): AdminPaymentConfig {
  if (!isBrowser()) return createDefaultAdminPaymentConfig();
  const stored = safeParseJson<Partial<AdminPaymentConfig> | null>(
    window.localStorage.getItem(STORAGE_KEYS.paymentConfig),
    null
  );
  const defaults = createDefaultAdminPaymentConfig();
  if (!stored) return defaults;
  return {
    ...defaults,
    ...stored,
    dpWindowHours:
      typeof stored.dpWindowHours === "number" && stored.dpWindowHours >= 1
        ? Math.round(stored.dpWindowHours)
        : defaults.dpWindowHours,
  };
}

export function saveAdminPaymentConfig(config: AdminPaymentConfig): AdminPaymentConfig {
  const payload: AdminPaymentConfig = {
    ...config,
    updatedAt: new Date().toISOString(),
  };
  const ok = safeSetItem(STORAGE_KEYS.paymentConfig, payload);
  if (!ok && payload.qrisImageDataUrl) {
    safeSetItem(STORAGE_KEYS.paymentConfig, {
      ...payload,
      qrisImageDataUrl: undefined,
    });
  }
  return payload;
}

export function saveSavedDesigns(designs: DesignStudioSavedConfig[]): void {
  if (!isBrowser()) return;

  const limited = designs.slice(0, MAX_SAVED_DESIGNS).map((design) => ({
    ...design,
    specifications: { ...design.specifications },
    attachments: design.attachments.map((attachment) => ({
      ...attachment,
      previewDataUrl:
        attachment.previewDataUrl && attachment.previewDataUrl.length <= 160_000
          ? attachment.previewDataUrl
          : undefined,
    })),
  }));

  const ok = safeSetItem(STORAGE_KEYS.designs, limited);
  if (!ok) {
    safeSetItem(
      STORAGE_KEYS.designs,
      limited.map((design) => ({
        ...design,
        attachments: design.attachments.map(({ previewDataUrl: _ignored, ...rest }) => rest),
      }))
    );
  }
}

export function saveDesignConfig(config: DesignStudioSavedConfig): DesignStudioSavedConfig {
  const existing = loadSavedDesigns();
  saveSavedDesigns(upsertSavedDesign(existing, config));
  return config;
}

export function deleteDesignConfig(id: string): void {
  const existing = loadSavedDesigns();
  saveSavedDesigns(removeSavedDesign(existing, id));
}

function notifyChatUpdated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CHAT_UPDATED_EVENT));
}

export function loadChatThreads(): ChatThread[] {
  if (!isBrowser()) return [];
  const parsed = safeParseJson<ChatThread[]>(
    window.localStorage.getItem(STORAGE_KEYS.chatThreads),
    []
  );
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((item) => item && typeof item.id === "string" && Array.isArray(item.messages))
    .slice(0, MAX_CHAT_THREADS);
}

export function saveChatThreads(threads: ChatThread[]): void {
  if (!isBrowser()) return;
  const limited = prepareChatThreadsForStorage(threads);

  const ok = safeSetItem(STORAGE_KEYS.chatThreads, limited);
  if (!ok) {
    // Jika kuota browser penuh, pertahankan teks & metadata sambil melepas thumbnail lama terlebih dulu.
    const reduced = prepareChatThreadsForStorage(limited, { keepImagesOnlyForTopCount: 2 });
    const reducedOk = safeSetItem(STORAGE_KEYS.chatThreads, reduced);
    if (!reducedOk) {
      safeSetItem(
        STORAGE_KEYS.chatThreads,
        prepareChatThreadsForStorage(limited, { stripAllImages: true })
      );
    }
  }
  notifyChatUpdated();
}

export function upsertChatThread(thread: ChatThread): ChatThread[] {
  const next = upsertChatThreadInList(loadChatThreads(), thread);
  saveChatThreads(next);
  return next;
}

export function deleteChatThread(id: string): ChatThread[] {
  const next = loadChatThreads().filter((item) => item.id !== id);
  saveChatThreads(next);
  return next;
}

export function loadAdminChatConfig(): AdminChatConfig {
  if (!isBrowser()) return createDefaultAdminChatConfig();
  const stored = safeParseJson<Partial<AdminChatConfig> | null>(
    window.localStorage.getItem(STORAGE_KEYS.chatConfig),
    null
  );
  const defaults = createDefaultAdminChatConfig();
  if (!stored) return defaults;
  return {
    ...defaults,
    ...stored,
  };
}

export function saveAdminChatConfig(config: AdminChatConfig): AdminChatConfig {
  const payload: AdminChatConfig = {
    ...config,
    updatedAt: new Date().toISOString(),
  };
  safeSetItem(STORAGE_KEYS.chatConfig, payload);
  notifyChatUpdated();
  return payload;
}

function isSessionStorageAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function loadVerifiedOrderCodesFromSession(): string[] {
  if (!isSessionStorageAvailable()) return [];
  const parsed = safeParseJson<string[]>(
    window.sessionStorage.getItem(SESSION_KEYS.verifiedOrders),
    []
  );
  return Array.isArray(parsed) ? parsed : [];
}

export function markOrderVerifiedInSession(orderCode: string): void {
  if (!isSessionStorageAvailable()) return;
  const safeCode = sanitizeOrderCodeParam(orderCode);
  if (!safeCode) return;
  const existing = loadVerifiedOrderCodesFromSession();
  if (existing.includes(safeCode)) return;
  try {
    window.sessionStorage.setItem(
      SESSION_KEYS.verifiedOrders,
      JSON.stringify([safeCode, ...existing].slice(0, 20))
    );
  } catch {
    // Abaikan jika sessionStorage dibatasi browser.
  }
}

export function isOrderVerifiedInSession(orderCode?: string | null): boolean {
  const safeCode = sanitizeOrderCodeParam(orderCode);
  if (!safeCode) return false;
  return loadVerifiedOrderCodesFromSession().includes(safeCode);
}

export function clearOrderVerifiedInSession(orderCode?: string | null): void {
  if (!isSessionStorageAvailable()) return;
  const safeCode = sanitizeOrderCodeParam(orderCode);
  if (!safeCode) return;
  const next = loadVerifiedOrderCodesFromSession().filter((code) => code !== safeCode);
  try {
    window.sessionStorage.setItem(SESSION_KEYS.verifiedOrders, JSON.stringify(next));
  } catch {
    // Abaikan jika sessionStorage dibatasi browser.
  }
}
