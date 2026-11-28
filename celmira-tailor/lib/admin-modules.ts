import { garmentCategories } from "./booking-options.ts";
import {
  DEFAULT_MEASUREMENT_TEMPLATES,
  isMeasurementTemplateId,
  normalizeMeasurementTemplates,
} from "./measurement-studio.ts";
import type {
  AdminProductionCapacityConfig,
  BlockedProductionDate,
  GarmentCategoryId,
  MeasurementTemplateConfig,
  OrderStatus,
  ProductionDailyAlert,
  ProductionLoadStatus,
  ProductionQueueItem,
  ProductionScheduleSummary,
  ProductionWeekLoad,
  SubmittedOrder,
} from "@/lib/types/tailor";

export const DEFAULT_CATEGORY_LEAD_DAYS: Record<GarmentCategoryId, number> = {
  kebaya: 14,
  gamis: 10,
  "kemeja-pria": 10,
  blazer: 14,
  mukena: 7,
  "busana-wisuda": 14,
  "busana-pernikahan": 21,
  "custom-lainnya": 14,
};

export const MAX_ADMIN_CUSTOMER_NOTE_LENGTH = 1000;
export const MAX_BLOCKED_DATES = 90;

const VALID_CATEGORY_IDS = new Set<string>(garmentCategories.map((c) => c.id));
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const ACTIVE_ORDER_STATUSES = new Set<OrderStatus>([
  "menunggu_penawaran",
  "penawaran_dikirim",
  "menunggu_dp",
  "menunggu_verifikasi_dp",
  "perlu_tinjauan_admin",
  "dalam_produksi",
  "selesai_jahit_menunggu_pelunasan",
  "menunggu_verifikasi_pelunasan",
  "siap_diambil_atau_dikirim",
  "dalam_pengiriman",
]);

const IN_PRODUCTION_STATUSES = new Set<OrderStatus>([
  "dalam_produksi",
  "selesai_jahit_menunggu_pelunasan",
  "menunggu_verifikasi_pelunasan",
  "siap_diambil_atau_dikirim",
  "dalam_pengiriman",
]);

const AWAITING_QUOTE_OR_DP_STATUSES = new Set<OrderStatus>([
  "menunggu_penawaran",
  "penawaran_dikirim",
  "menunggu_dp",
  "menunggu_verifikasi_dp",
  "perlu_tinjauan_admin",
]);

export function isValidIsoDateOnly(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

export function formatUtcDateOnly(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function parseIsoDateToUtcStart(dateStr: string): Date | null {
  if (!isValidIsoDateOnly(dateStr)) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function addUtcDays(date: Date, days: number): Date {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function getMondayOfUtcWeek(date: Date): Date {
  const day = date.getUTCDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  return addUtcDays(
    new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())),
    diff
  );
}

function formatShortWeekRangeId(start: Date, end: Date): string {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];
  const sDay = start.getUTCDate();
  const sMon = months[start.getUTCMonth()];
  const eDay = end.getUTCDate();
  const eMon = months[end.getUTCMonth()];
  const eYear = end.getUTCFullYear();
  if (sMon === eMon) {
    return `${sDay}–${eDay} ${eMon} ${eYear}`;
  }
  return `${sDay} ${sMon} – ${eDay} ${eMon} ${eYear}`;
}

export function createDefaultProductionCapacityConfig(
  now: Date = new Date()
): AdminProductionCapacityConfig {
  return {
    weeklyOrderLimit: 12,
    dailyTargetLimit: 3,
    standardLeadDays: 14,
    blockedDates: [],
    categoryLeadDays: { ...DEFAULT_CATEGORY_LEAD_DAYS },
    operationalNote: "",
    updatedAt: now.toISOString(),
  };
}

export function normalizeProductionCapacityConfig(
  raw: Partial<AdminProductionCapacityConfig> | null | undefined,
  now: Date = new Date()
): AdminProductionCapacityConfig {
  const defaults = createDefaultProductionCapacityConfig(now);
  if (!raw || typeof raw !== "object") return defaults;

  const weeklyOrderLimit =
    typeof raw.weeklyOrderLimit === "number" && Number.isFinite(raw.weeklyOrderLimit)
      ? Math.max(1, Math.min(200, Math.round(raw.weeklyOrderLimit)))
      : defaults.weeklyOrderLimit;

  const dailyTargetLimit =
    typeof raw.dailyTargetLimit === "number" && Number.isFinite(raw.dailyTargetLimit)
      ? Math.max(1, Math.min(50, Math.round(raw.dailyTargetLimit)))
      : defaults.dailyTargetLimit;

  const standardLeadDays =
    typeof raw.standardLeadDays === "number" && Number.isFinite(raw.standardLeadDays)
      ? Math.max(1, Math.min(120, Math.round(raw.standardLeadDays)))
      : defaults.standardLeadDays;

  const seenDates = new Set<string>();
  const blockedDates: BlockedProductionDate[] = [];
  if (Array.isArray(raw.blockedDates)) {
    for (const item of raw.blockedDates) {
      if (!item || typeof item.date !== "string") continue;
      const date = item.date.trim();
      if (!isValidIsoDateOnly(date) || seenDates.has(date)) continue;
      seenDates.add(date);
      blockedDates.push({
        date,
        reason:
          typeof item.reason === "string" && item.reason.trim().length > 0
            ? item.reason.trim().slice(0, 120)
            : "Tutup / jadwal penuh",
      });
      if (blockedDates.length >= MAX_BLOCKED_DATES) break;
    }
  }
  blockedDates.sort((a, b) => a.date.localeCompare(b.date));

  const categoryLeadDays: Partial<Record<GarmentCategoryId, number>> = {
    ...DEFAULT_CATEGORY_LEAD_DAYS,
  };
  if (raw.categoryLeadDays && typeof raw.categoryLeadDays === "object") {
    for (const [key, val] of Object.entries(raw.categoryLeadDays)) {
      if (!VALID_CATEGORY_IDS.has(key)) continue;
      if (typeof val === "number" && Number.isFinite(val)) {
        categoryLeadDays[key as GarmentCategoryId] = Math.max(
          1,
          Math.min(120, Math.round(val))
        );
      }
    }
  }

  return {
    weeklyOrderLimit,
    dailyTargetLimit,
    standardLeadDays,
    blockedDates,
    categoryLeadDays,
    operationalNote:
      typeof raw.operationalNote === "string" ? raw.operationalNote.trim().slice(0, 600) : "",
    updatedAt:
      typeof raw.updatedAt === "string" && raw.updatedAt.trim()
        ? raw.updatedAt
        : defaults.updatedAt,
  };
}

export function validateProductionCapacityInput(
  input: Partial<AdminProductionCapacityConfig>
): { valid: boolean; error?: string; normalized?: AdminProductionCapacityConfig } {
  if (
    input.weeklyOrderLimit !== undefined &&
    (!Number.isFinite(input.weeklyOrderLimit) ||
      input.weeklyOrderLimit < 1 ||
      input.weeklyOrderLimit > 200)
  ) {
    return {
      valid: false,
      error: "Batas kapasitas pesanan mingguan harus antara 1 sampai 200 pesanan.",
    };
  }

  if (
    input.dailyTargetLimit !== undefined &&
    (!Number.isFinite(input.dailyTargetLimit) ||
      input.dailyTargetLimit < 1 ||
      input.dailyTargetLimit > 50)
  ) {
    return {
      valid: false,
      error: "Batas target selesai harian harus antara 1 sampai 50 pesanan.",
    };
  }

  if (
    input.standardLeadDays !== undefined &&
    (!Number.isFinite(input.standardLeadDays) ||
      input.standardLeadDays < 1 ||
      input.standardLeadDays > 120)
  ) {
    return {
      valid: false,
      error: "Estimasi pengerjaan standar harus antara 1 sampai 120 hari.",
    };
  }

  if (input.blockedDates !== undefined) {
    if (!Array.isArray(input.blockedDates)) {
      return { valid: false, error: "Daftar tanggal libur/blokir harus berupa array." };
    }
    if (input.blockedDates.length > MAX_BLOCKED_DATES) {
      return {
        valid: false,
        error: `Maksimal ${MAX_BLOCKED_DATES} tanggal libur/blokir yang dapat disimpan.`,
      };
    }
    for (const item of input.blockedDates) {
      if (!item || typeof item.date !== "string" || !isValidIsoDateOnly(item.date.trim())) {
        return {
          valid: false,
          error: `Format tanggal libur tidak valid ("${String(item?.date ?? "")}"). Gunakan format YYYY-MM-DD.`,
        };
      }
    }
  }

  if (input.categoryLeadDays !== undefined && input.categoryLeadDays !== null) {
    if (typeof input.categoryLeadDays !== "object") {
      return { valid: false, error: "Estimasi hari per kategori tidak valid." };
    }
    for (const [catId, days] of Object.entries(input.categoryLeadDays)) {
      if (!VALID_CATEGORY_IDS.has(catId)) {
        return { valid: false, error: `Kategori tidak dikenal: ${catId}.` };
      }
      if (typeof days !== "number" || !Number.isFinite(days) || days < 1 || days > 120) {
        return {
          valid: false,
          error: `Estimasi hari untuk kategori ${catId} harus antara 1 sampai 120 hari.`,
        };
      }
    }
  }

  return {
    valid: true,
    normalized: normalizeProductionCapacityConfig(input),
  };
}

export function isActiveProductionOrder(status: OrderStatus): boolean {
  return ACTIVE_ORDER_STATUSES.has(status);
}

export function classifyLoadStatus(count: number, limit: number): ProductionLoadStatus {
  if (count > limit) return "melebihi_kapasitas";
  if (limit > 0 && count / limit >= 0.75) return "mendekati_penuh";
  return "aman";
}

export function computeProductionScheduleSummary(
  orders: SubmittedOrder[],
  capacityConfig: AdminProductionCapacityConfig,
  referenceDate: Date = new Date(),
  weeksCount = 6
): ProductionScheduleSummary {
  const capacity = normalizeProductionCapacityConfig(capacityConfig, referenceDate);
  const todayUtc = new Date(
    Date.UTC(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth(),
      referenceDate.getUTCDate()
    )
  );
  const blockedMap = new Map<string, string>();
  for (const item of capacity.blockedDates) {
    blockedMap.set(item.date, item.reason);
  }

  const activeOrders = orders.filter((order) => ACTIVE_ORDER_STATUSES.has(order.status));
  const queue: ProductionQueueItem[] = [];
  const dailyMap = new Map<string, string[]>();

  let inProductionOrders = 0;
  let awaitingQuoteOrDpOrders = 0;
  let dueWithin7Days = 0;
  let overdueOrders = 0;
  let blockedDateConflicts = 0;

  for (const order of activeOrders) {
    const effectiveDateStr =
      order.estimatedCompletionDate && isValidIsoDateOnly(order.estimatedCompletionDate)
        ? order.estimatedCompletionDate
        : order.targetDate;
    const effectiveDate = parseIsoDateToUtcStart(effectiveDateStr);
    const daysUntilTarget = effectiveDate
      ? Math.round((effectiveDate.getTime() - todayUtc.getTime()) / (24 * 60 * 60 * 1000))
      : 999;

    const isInProduction = IN_PRODUCTION_STATUSES.has(order.status);
    if (isInProduction) inProductionOrders += 1;
    if (AWAITING_QUOTE_OR_DP_STATUSES.has(order.status)) awaitingQuoteOrDpOrders += 1;
    if (daysUntilTarget >= 0 && daysUntilTarget <= 7) dueWithin7Days += 1;
    if (daysUntilTarget < 0) overdueOrders += 1;

    const isBlockedDateConflict = blockedMap.has(effectiveDateStr);
    if (isBlockedDateConflict) blockedDateConflicts += 1;

    if (isValidIsoDateOnly(effectiveDateStr)) {
      const existing = dailyMap.get(effectiveDateStr) ?? [];
      existing.push(order.orderCode);
      dailyMap.set(effectiveDateStr, existing);
    }

    queue.push({
      orderId: order.id,
      orderCode: order.orderCode,
      customerName: order.customer.fullName,
      categoryId: order.categoryId,
      categoryName: order.categoryName,
      designTitle: order.designTitle,
      status: order.status,
      productionStage: order.productionStage,
      targetDate: order.targetDate,
      estimatedCompletionDate: order.estimatedCompletionDate,
      daysUntilTarget,
      isBlockedDateConflict,
      isInProduction,
    });
  }

  queue.sort((a, b) => {
    if (a.daysUntilTarget !== b.daysUntilTarget) return a.daysUntilTarget - b.daysUntilTarget;
    return a.orderCode.localeCompare(b.orderCode);
  });

  const firstMonday = getMondayOfUtcWeek(todayUtc);
  const weeks: ProductionWeekLoad[] = [];
  for (let i = 0; i < weeksCount; i += 1) {
    const start = addUtcDays(firstMonday, i * 7);
    const end = addUtcDays(start, 6);
    const weekStart = formatUtcDateOnly(start);
    const weekEnd = formatUtcDateOnly(end);

    const weekOrders = queue.filter((item) => {
      const effective =
        item.estimatedCompletionDate && isValidIsoDateOnly(item.estimatedCompletionDate)
          ? item.estimatedCompletionDate
          : item.targetDate;
      return effective >= weekStart && effective <= weekEnd;
    });

    const activeCount = weekOrders.length;
    const inProductionCount = weekOrders.filter((item) => item.isInProduction).length;
    const utilizationPercent =
      capacity.weeklyOrderLimit > 0
        ? Math.min(200, Math.round((activeCount / capacity.weeklyOrderLimit) * 100))
        : 0;

    weeks.push({
      weekStart,
      weekEnd,
      label: formatShortWeekRangeId(start, end),
      activeCount,
      inProductionCount,
      limit: capacity.weeklyOrderLimit,
      utilizationPercent,
      status: classifyLoadStatus(activeCount, capacity.weeklyOrderLimit),
      orders: weekOrders,
    });
  }

  const dailyAlerts: ProductionDailyAlert[] = [];
  for (const [date, orderCodes] of dailyMap.entries()) {
    const isBlocked = blockedMap.has(date);
    if (isBlocked || orderCodes.length > capacity.dailyTargetLimit) {
      dailyAlerts.push({
        date,
        count: orderCodes.length,
        limit: capacity.dailyTargetLimit,
        isBlocked,
        blockedReason: blockedMap.get(date),
        orderCodes,
      });
    }
  }
  dailyAlerts.sort((a, b) => a.date.localeCompare(b.date));

  return {
    capacity,
    metrics: {
      totalActiveOrders: activeOrders.length,
      inProductionOrders,
      awaitingQuoteOrDpOrders,
      dueWithin7Days,
      overdueOrders,
      blockedDateConflicts,
    },
    weeks,
    dailyAlerts,
    queue,
    generatedAt: referenceDate.toISOString(),
  };
}

export function validateMeasurementTemplateUpdate(
  candidate: MeasurementTemplateConfig,
  allTemplates: MeasurementTemplateConfig[] = DEFAULT_MEASUREMENT_TEMPLATES
): { valid: boolean; error?: string; template?: MeasurementTemplateConfig } {
  if (!candidate || typeof candidate !== "object") {
    return { valid: false, error: "Payload template ukuran tidak valid." };
  }

  if (!isMeasurementTemplateId(candidate.id)) {
    return {
      valid: false,
      error: `ID template "${String(candidate.id)}" tidak dikenal.`,
    };
  }

  const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
  if (name.length < 2 || name.length > 80) {
    return { valid: false, error: "Nama template wajib diisi (2–80 karakter)." };
  }

  const shortLabel = typeof candidate.shortLabel === "string" ? candidate.shortLabel.trim() : "";
  if (shortLabel.length < 2 || shortLabel.length > 32) {
    return { valid: false, error: "Label singkat template wajib diisi (2–32 karakter)." };
  }

  const tagline = typeof candidate.tagline === "string" ? candidate.tagline.trim() : "";
  const description = typeof candidate.description === "string" ? candidate.description.trim() : "";
  if (description.length < 5 || description.length > 400) {
    return { valid: false, error: "Deskripsi template wajib diisi (5–400 karakter)." };
  }

  if (!Array.isArray(candidate.supportedCategories) || candidate.supportedCategories.length === 0) {
    return { valid: false, error: "Minimal satu kategori busana didukung wajib dipilih." };
  }
  const uniqueCategories = Array.from(new Set(candidate.supportedCategories));
  for (const catId of uniqueCategories) {
    if (!VALID_CATEGORY_IDS.has(catId)) {
      return { valid: false, error: `Kategori busana "${catId}" tidak valid.` };
    }
  }

  const defaultCategoryId = VALID_CATEGORY_IDS.has(candidate.defaultCategoryId)
    ? candidate.defaultCategoryId
    : uniqueCategories[0];

  if (!Array.isArray(candidate.fields) || candidate.fields.length === 0) {
    return { valid: false, error: "Template harus memiliki minimal satu kolom ukuran." };
  }

  const normalizedBase = normalizeMeasurementTemplates(allTemplates);
  const baseTemplate =
    normalizedBase.find((t) => t.id === candidate.id) ?? DEFAULT_MEASUREMENT_TEMPLATES[0];

  const seenFieldKeys = new Set<string>();
  const cleanFields = [];
  for (const field of candidate.fields) {
    if (!field || typeof field.key !== "string" || !field.key.trim()) {
      return { valid: false, error: "Setiap kolom ukuran wajib memiliki key yang valid." };
    }
    const key = field.key.trim();
    if (seenFieldKeys.has(key)) {
      return { valid: false, error: `Terdapat duplikasi key kolom ukuran: ${key}.` };
    }
    seenFieldKeys.add(key);

    const label = typeof field.label === "string" ? field.label.trim() : "";
    const fieldShortLabel = typeof field.shortLabel === "string" ? field.shortLabel.trim() : label;
    if (label.length < 2 || label.length > 80) {
      return { valid: false, error: `Label kolom ukuran "${key}" wajib 2–80 karakter.` };
    }

    const min = Number(field.min);
    const max = Number(field.max);
    const step = Number(field.step);
    const defaultValue = Number(field.defaultValue);

    if (!Number.isFinite(min) || !Number.isFinite(max) || min < 1 || max > 300 || min >= max) {
      return {
        valid: false,
        error: `Rentang min–max untuk "${label}" tidak valid (min harus < max, dalam 1–300 cm).`,
      };
    }

    if (!Number.isFinite(step) || step <= 0 || step > 10) {
      return {
        valid: false,
        error: `Nilai step untuk "${label}" harus antara 0.1 hingga 10 cm.`,
      };
    }

    if (!Number.isFinite(defaultValue) || defaultValue < min || defaultValue > max) {
      return {
        valid: false,
        error: `Nilai default untuk "${label}" (${defaultValue} cm) harus di antara ${min}–${max} cm.`,
      };
    }

    const baseField = baseTemplate.fields.find((f) => f.key === key);
    cleanFields.push({
      key,
      storageTarget: baseField?.storageTarget ?? field.storageTarget ?? "extra",
      standardKey: baseField?.standardKey ?? field.standardKey,
      label,
      shortLabel: fieldShortLabel.slice(0, 40),
      required: Boolean(field.required),
      unit: "cm" as const,
      min,
      max,
      step,
      defaultValue,
      guideTitle:
        typeof field.guideTitle === "string" && field.guideTitle.trim()
          ? field.guideTitle.trim().slice(0, 100)
          : baseField?.guideTitle ?? `Cara mengukur ${label.toLowerCase()}`,
      guideSteps:
        Array.isArray(field.guideSteps) && field.guideSteps.length > 0
          ? field.guideSteps
              .map((s) => (typeof s === "string" ? s.trim() : ""))
              .filter(Boolean)
              .slice(0, 6)
          : baseField?.guideSteps ?? [],
      tip:
        typeof field.tip === "string"
          ? field.tip.trim().slice(0, 260)
          : baseField?.tip ?? "",
      mannequinAnchor: baseField?.mannequinAnchor ?? field.mannequinAnchor ?? "bust",
    });
  }

  // Pastikan minimal 1 template tetap aktif di seluruh sistem
  const nextActive = Boolean(candidate.active);
  if (!nextActive) {
    const otherActiveCount = normalizedBase.filter(
      (t) => t.id !== candidate.id && t.active
    ).length;
    if (otherActiveCount === 0) {
      return {
        valid: false,
        error: "Minimal satu template ukuran harus tetap aktif agar Measurement Studio tetap berfungsi.",
      };
    }
  }

  const sortOrder =
    typeof candidate.sortOrder === "number" && Number.isFinite(candidate.sortOrder)
      ? Math.max(1, Math.min(20, Math.round(candidate.sortOrder)))
      : baseTemplate.sortOrder;

  const cleanTemplate: MeasurementTemplateConfig = {
    ...baseTemplate,
    name,
    shortLabel,
    tagline: tagline.slice(0, 140),
    description,
    defaultCategoryId,
    supportedCategories: uniqueCategories,
    active: nextActive,
    sortOrder,
    updatedAt: new Date().toISOString(),
    fields: cleanFields,
    sizePresets:
      Array.isArray(candidate.sizePresets) && candidate.sizePresets.length > 0
        ? candidate.sizePresets
        : baseTemplate.sizePresets,
  };

  return { valid: true, template: cleanTemplate };
}
