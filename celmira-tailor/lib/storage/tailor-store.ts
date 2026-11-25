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
import type {
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
} as const;

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
  return safeParseJson<SubmittedOrder[]>(
    window.localStorage.getItem(STORAGE_KEYS.orders),
    []
  );
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

  return {
    id,
    orderCode: generateOrderCode(now),
    createdAt: timestamp,
    updatedAt: timestamp,
    persistenceMode: "local-browser",
    status: "menunggu_penawaran",
    productionStage: "antrian_penawaran",
    categoryId: draft.categoryId,
    categoryName: category?.name ?? draft.categoryId,
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
      tailoringFee: null,
      shippingFee: null,
      dpAmount: null,
      dpDueAt: null,
      settlementTailoringAmount: null,
      settlementTotalAmount: null,
    },
    payments: [],
  };
}

export function saveSubmittedOrder(order: SubmittedOrder): SubmittedOrder {
  const existing = loadSubmittedOrders();
  const next = [order, ...existing];
  const ok = safeSetItem(STORAGE_KEYS.orders, next);
  if (!ok) {
    const lightweightOrder: SubmittedOrder = {
      ...order,
      attachments: order.attachments.map(({ previewDataUrl: _ignored, ...rest }) => rest),
    };
    safeSetItem(STORAGE_KEYS.orders, [lightweightOrder, ...existing]);
  }
  return order;
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
