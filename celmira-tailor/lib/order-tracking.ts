import { normalizeWhatsappNumber } from "./booking-validation.ts";
import type {
  AdminPaymentConfig,
  OrderHistoryCategory,
  OrderHistoryEvent,
  OrderInvoice,
  OrderStatus,
  PaymentRecord,
  PaymentStage,
  ProductionStage,
  SubmittedOrder,
} from "@/lib/types/tailor";

export const DP_WINDOW_HOURS = 24;

export type ProductionStageDefinition = {
  id: ProductionStage;
  step: number;
  label: string;
  shortLabel: string;
  description: string;
  requiresDpVerified: boolean;
  requiresSettlementVerified: boolean;
};

export const PRODUCTION_STAGES: readonly ProductionStageDefinition[] = [
  {
    id: "menunggu_produksi",
    step: 1,
    label: "Menunggu produksi",
    shortLabel: "Menunggu Produksi",
    description:
      "Pesanan terdaftar dan menunggu penawaran disetujui serta pembayaran DP 50% diverifikasi admin.",
    requiresDpVerified: false,
    requiresSettlementVerified: false,
  },
  {
    id: "persiapan_bahan",
    step: 2,
    label: "Persiapan bahan",
    shortLabel: "Persiapan Bahan",
    description:
      "Tim butik menyiapkan kain, furing, benang, dan kelengkapan detail sesuai spesifikasi pesanan.",
    requiresDpVerified: true,
    requiresSettlementVerified: false,
  },
  {
    id: "pemotongan_kain",
    step: 3,
    label: "Pemotongan kain",
    shortLabel: "Pemotongan Kain",
    description: "Pembuatan pola dan pemotongan kain berdasarkan profil ukuran pelanggan.",
    requiresDpVerified: true,
    requiresSettlementVerified: false,
  },
  {
    id: "proses_penjahitan",
    step: 4,
    label: "Proses penjahitan",
    shortLabel: "Penjahitan",
    description: "Penyusunan struktur busana, pemasangan lengan, kerah, dan detail jahitan utama.",
    requiresDpVerified: true,
    requiresSettlementVerified: false,
  },
  {
    id: "finishing_qc",
    step: 5,
    label: "Finishing dan quality control",
    shortLabel: "Finishing & QC",
    description:
      "Pemasangan kancing/resleting, penyetrikaan uap, serta pengecekan kerapian dan kesesuaian ukuran.",
    requiresDpVerified: true,
    requiresSettlementVerified: false,
  },
  {
    id: "selesai_dikerjakan",
    step: 6,
    label: "Selesai dikerjakan",
    shortLabel: "Selesai Jahit",
    description:
      "Busana telah selesai dijahit dan lulus pengecekan kualitas, siap masuk tahap penagihan pelunasan.",
    requiresDpVerified: true,
    requiresSettlementVerified: false,
  },
  {
    id: "menunggu_pelunasan",
    step: 7,
    label: "Menunggu pelunasan",
    shortLabel: "Menunggu Pelunasan",
    description:
      "Invoice pelunasan 50% sisa biaya jahit (serta ongkir terpisah jika dikirim) telah diterbitkan.",
    requiresDpVerified: true,
    requiresSettlementVerified: false,
  },
  {
    id: "siap_dikirim_atau_diambil",
    step: 8,
    label: "Siap dikirim atau diambil",
    shortLabel: "Siap Serah Terima",
    description:
      "Pelunasan telah diverifikasi admin. Busana dikemas dan disiapkan untuk pengiriman atau pengambilan.",
    requiresDpVerified: true,
    requiresSettlementVerified: true,
  },
  {
    id: "dalam_pengiriman_atau_siap_diambil",
    step: 9,
    label: "Dalam pengiriman atau siap diambil",
    shortLabel: "Pengiriman / Pengambilan",
    description:
      "Pesanan sedang dikirim oleh kurir dengan nomor resi resmi atau siap diambil di Celmira Boutique.",
    requiresDpVerified: true,
    requiresSettlementVerified: true,
  },
  {
    id: "pesanan_selesai",
    step: 10,
    label: "Pesanan selesai",
    shortLabel: "Selesai",
    description: "Busana telah diterima pelanggan dan seluruh proses transaksi telah selesai.",
    requiresDpVerified: true,
    requiresSettlementVerified: true,
  },
] as const;

export type StatusTone = "neutral" | "info" | "warning" | "success" | "danger";

export type OrderStatusMeta = {
  label: string;
  description: string;
  tone: StatusTone;
};

export const ORDER_STATUS_META: Record<OrderStatus, OrderStatusMeta> = {
  menunggu_penawaran: {
    label: "Menunggu Penawaran",
    description: "Admin sedang meninjau desain, bahan, dan ukuran untuk menetapkan harga akhir.",
    tone: "neutral",
  },
  penawaran_dikirim: {
    label: "Penawaran Dikirim",
    description: "Harga akhir telah ditetapkan admin. Silakan setujui atau tolak penawaran.",
    tone: "info",
  },
  penawaran_ditolak: {
    label: "Penawaran Ditolak",
    description: "Pelanggan menolak penawaran. Admin dapat mengirim penawaran baru atau menutup pesanan.",
    tone: "danger",
  },
  menunggu_dp: {
    label: "Menunggu Pembayaran DP",
    description: "Invoice DP 50% telah terbit dengan batas pembayaran 24 jam.",
    tone: "warning",
  },
  menunggu_verifikasi_dp: {
    label: "Verifikasi DP",
    description: "Bukti DP telah diunggah dan sedang diperiksa oleh admin.",
    tone: "info",
  },
  perlu_tinjauan_admin: {
    label: "Perlu Tinjauan Admin",
    description: "Batas waktu 24 jam pembayaran DP telah lewat tanpa unggahan bukti pembayaran.",
    tone: "warning",
  },
  dalam_produksi: {
    label: "Dalam Produksi",
    description: "DP telah terverifikasi dan busana sedang diproses oleh tim Celmira Tailor.",
    tone: "info",
  },
  selesai_jahit_menunggu_pelunasan: {
    label: "Menunggu Pelunasan",
    description: "Jahitan selesai. Silakan lunasi sisa 50% biaya jahit dan ongkos kirim bila ada.",
    tone: "warning",
  },
  menunggu_verifikasi_pelunasan: {
    label: "Verifikasi Pelunasan",
    description: "Bukti pelunasan telah diunggah dan menunggu verifikasi admin sebelum serah terima.",
    tone: "info",
  },
  siap_diambil_atau_dikirim: {
    label: "Siap Dikirim / Diambil",
    description: "Pelunasan terverifikasi. Pesanan sedang disiapkan untuk pengiriman atau pengambilan.",
    tone: "success",
  },
  dalam_pengiriman: {
    label: "Dalam Pengiriman",
    description: "Pesanan telah diserahkan ke kurir menuju alamat tujuan.",
    tone: "info",
  },
  selesai: {
    label: "Pesanan Selesai",
    description: "Pesanan telah diterima pelanggan.",
    tone: "success",
  },
  dibatalkan: {
    label: "Dibatalkan",
    description: "Pesanan dibatalkan sesuai catatan dan aturan admin.",
    tone: "danger",
  },
};

export type TransitionResult =
  | { ok: true; order: SubmittedOrder }
  | { ok: false; error: string };

const ACCESS_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function generateTrackingAccessCode(): string {
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    const idx = Math.floor(Math.random() * ACCESS_CODE_ALPHABET.length);
    code += ACCESS_CODE_ALPHABET[idx];
  }
  return code;
}

export function normalizeTrackingAccessCode(value: string): string {
  return value.replace(/[\s-]/g, "").trim().toUpperCase();
}

export function canonicalizeWhatsapp(value: string): string {
  const cleaned = normalizeWhatsappNumber(value);
  if (!cleaned) return "";
  if (cleaned.startsWith("+62")) return `62${cleaned.slice(3)}`;
  if (cleaned.startsWith("62")) return cleaned;
  if (cleaned.startsWith("0")) return `62${cleaned.slice(1)}`;
  return cleaned;
}

export function maskOrderContact(whatsapp: string): string {
  const cleaned = normalizeWhatsappNumber(whatsapp);
  if (cleaned.length <= 6) return "••••";
  return `${cleaned.slice(0, 4)}••••${cleaned.slice(-3)}`;
}

export function formatRupiah(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) {
    return "Belum ditetapkan";
  }
  const rounded = Math.round(amount);
  const formatted = new Intl.NumberFormat("id-ID").format(rounded);
  return `Rp ${formatted}`;
}

export function formatDateTimeId(iso?: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDateOnlyId(dateInput?: string | null): string {
  if (!dateInput) return "Belum ditentukan admin";
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(dateInput)
    ? `${dateInput}T00:00:00`
    : dateInput;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return dateInput;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function getProductionStageMeta(stage: ProductionStage): ProductionStageDefinition {
  return (
    PRODUCTION_STAGES.find((item) => item.id === stage) ?? PRODUCTION_STAGES[0]
  );
}

export function getProductionStageIndex(stage: ProductionStage): number {
  const index = PRODUCTION_STAGES.findIndex((item) => item.id === stage);
  return index >= 0 ? index : 0;
}

function createEventId(now: Date): string {
  return `evt-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`;
}

function createPaymentId(stage: PaymentStage, now: Date): string {
  return `pay-${stage}-${now.getTime()}-${Math.random().toString(36).slice(2, 6)}`;
}

function buildInvoiceNumber(prefix: "DP" | "LN", orderCode: string): string {
  const normalizedCode = orderCode.replace(/^CT-/i, "");
  return `INV-${prefix}-${normalizedCode}`;
}

export function createHistoryEvent(
  input: {
    actor: OrderHistoryEvent["actor"];
    category: OrderHistoryCategory;
    title: string;
    description: string;
    orderStatus?: OrderStatus;
    productionStage?: ProductionStage;
  },
  now: Date = new Date()
): OrderHistoryEvent {
  return {
    id: createEventId(now),
    timestamp: now.toISOString(),
    ...input,
  };
}

export function createDefaultAdminPaymentConfig(
  now: Date = new Date()
): AdminPaymentConfig {
  return {
    paymentInstructions:
      "Lakukan pembayaran sesuai nominal pada invoice melalui QRIS resmi Celmira Boutique, lalu unggah bukti transfer pada halaman Lacak Pesanan agar admin dapat memverifikasi secara manual.",
    dpWindowHours: DP_WINDOW_HOURS,
    updatedAt: now.toISOString(),
  };
}

const LEGACY_STAGE_MAP: Record<string, ProductionStage> = {
  antrian_penawaran: "menunggu_produksi",
  menunggu_dp: "menunggu_produksi",
  pemotongan_bahan: "pemotongan_kain",
  penjahitan: "proses_penjahitan",
  finishing: "finishing_qc",
  quality_check: "finishing_qc",
  siap_serah_terima: "siap_dikirim_atau_diambil",
  selesai: "pesanan_selesai",
};

/**
 * Menormalkan data pesanan lama yang tersimpan sebelum Tahap 4
 * agar tetap kompatibel penuh tanpa merusak riwayat lokal yang ada.
 */
export function normalizeSubmittedOrder(raw: SubmittedOrder): SubmittedOrder {
  const validStageIds = new Set<string>(PRODUCTION_STAGES.map((stage) => stage.id));
  const rawStage = String(raw.productionStage ?? "menunggu_produksi");
  const normalizedStage: ProductionStage = validStageIds.has(rawStage)
    ? (rawStage as ProductionStage)
    : (LEGACY_STAGE_MAP[rawStage] ?? "menunggu_produksi");

  const inferredQuoteStatus: OrderInvoice["quoteStatus"] = raw.invoice?.quoteStatus
    ? raw.invoice.quoteStatus
    : raw.status === "penawaran_ditolak"
      ? "ditolak"
      : raw.status === "penawaran_dikirim"
        ? "menunggu_persetujuan"
        : raw.invoice?.dpAmount
          ? "disetujui"
          : "belum_dikirim";

  const normalizedHistory: OrderHistoryEvent[] =
    Array.isArray(raw.history) && raw.history.length > 0
      ? raw.history
      : [
          {
            id: `evt-init-${raw.id}`,
            timestamp: raw.createdAt,
            actor: "customer",
            category: "pesanan",
            title: "Pengajuan pesanan dibuat",
            description: `Pesanan ${raw.categoryName} (${raw.designTitle}) diajukan dan menunggu penawaran harga dari admin.`,
            orderStatus: "menunggu_penawaran",
            productionStage: "menunggu_produksi",
          },
        ];

  return {
    ...raw,
    trackingAccessCode: raw.trackingAccessCode?.trim()
      ? normalizeTrackingAccessCode(raw.trackingAccessCode)
      : generateTrackingAccessCode(),
    productionStage: normalizedStage,
    invoice: {
      quoteStatus: inferredQuoteStatus,
      quoteSentAt: raw.invoice?.quoteSentAt,
      quoteRespondedAt: raw.invoice?.quoteRespondedAt,
      quoteRejectionReason: raw.invoice?.quoteRejectionReason,
      tailoringFee: raw.invoice?.tailoringFee ?? null,
      shippingFee: raw.invoice?.shippingFee ?? null,
      dpInvoiceNumber: raw.invoice?.dpInvoiceNumber,
      dpIssuedAt: raw.invoice?.dpIssuedAt,
      dpAmount: raw.invoice?.dpAmount ?? null,
      dpDueAt: raw.invoice?.dpDueAt ?? null,
      settlementInvoiceNumber: raw.invoice?.settlementInvoiceNumber,
      settlementIssuedAt: raw.invoice?.settlementIssuedAt,
      settlementTailoringAmount: raw.invoice?.settlementTailoringAmount ?? null,
      settlementTotalAmount: raw.invoice?.settlementTotalAmount ?? null,
      quoteNote: raw.invoice?.quoteNote,
    },
    payments: Array.isArray(raw.payments) ? raw.payments : [],
    history: normalizedHistory,
  };
}

/**
 * Verifikasi akses tracking pesanan secara aman dengan dua faktor:
 * nomor pesanan DAN (nomor WhatsApp terdaftar ATAU kode akses tracking ATAU email terdaftar).
 */
export function verifyOrderTrackingAccess(
  orders: SubmittedOrder[],
  orderCodeInput: string,
  verifierInput: string
): { ok: true; order: SubmittedOrder } | { ok: false; error: string } {
  const normalizedCode = orderCodeInput.trim().toUpperCase();
  const trimmedVerifier = verifierInput.trim();

  if (!normalizedCode) {
    return { ok: false, error: "Masukkan nomor pesanan terlebih dahulu." };
  }

  if (!trimmedVerifier) {
    return {
      ok: false,
      error:
        "Demi keamanan, masukkan nomor WhatsApp terdaftar atau Kode Akses Tracking bersama nomor pesanan.",
    };
  }

  const matchedOrder = orders.find(
    (item) => item.orderCode.trim().toUpperCase() === normalizedCode
  );

  if (!matchedOrder) {
    return {
      ok: false,
      error:
        "Kombinasi nomor pesanan dan identitas verifikasi tidak cocok dengan data pesanan yang tersimpan.",
    };
  }

  const normalizedOrder = normalizeSubmittedOrder(matchedOrder);
  const inputPhone = canonicalizeWhatsapp(trimmedVerifier);
  const orderPhone = canonicalizeWhatsapp(normalizedOrder.customer.whatsapp);
  const phoneMatches = Boolean(inputPhone && orderPhone && inputPhone === orderPhone);

  const inputAccessCode = normalizeTrackingAccessCode(trimmedVerifier);
  const orderAccessCode = normalizeTrackingAccessCode(normalizedOrder.trackingAccessCode);
  const accessCodeMatches = Boolean(
    inputAccessCode && orderAccessCode && inputAccessCode === orderAccessCode
  );

  const orderEmail = normalizedOrder.customer.email.trim().toLowerCase();
  const emailMatches = Boolean(
    orderEmail && trimmedVerifier.toLowerCase() === orderEmail
  );

  if (!phoneMatches && !accessCodeMatches && !emailMatches) {
    return {
      ok: false,
      error:
        "Kombinasi nomor pesanan dan identitas verifikasi tidak cocok dengan data pesanan yang tersimpan.",
    };
  }

  return { ok: true, order: normalizedOrder };
}

export function getLatestPaymentByStage(
  order: SubmittedOrder,
  stage: PaymentStage
): PaymentRecord | undefined {
  for (let i = order.payments.length - 1; i >= 0; i -= 1) {
    if (order.payments[i].stage === stage) {
      return order.payments[i];
    }
  }
  return undefined;
}

export function isPaymentVerified(order: SubmittedOrder, stage: PaymentStage): boolean {
  return order.payments.some(
    (record) => record.stage === stage && record.verificationStatus === "terverifikasi"
  );
}

export function hasProofUploadedBeforeDpDeadline(order: SubmittedOrder): boolean {
  const dueAt = order.invoice.dpDueAt;
  if (!dueAt) return false;
  const dueMs = new Date(dueAt).getTime();
  if (Number.isNaN(dueMs)) return false;

  const latestDp = getLatestPaymentByStage(order, "dp");
  if (!latestDp?.proofUploadedAt) return false;
  if (
    latestDp.verificationStatus !== "menunggu_verifikasi_admin" &&
    latestDp.verificationStatus !== "terverifikasi"
  ) {
    return false;
  }

  const uploadedMs = new Date(latestDp.proofUploadedAt).getTime();
  return !Number.isNaN(uploadedMs) && uploadedMs <= dueMs;
}

export type DpDeadlineState = {
  active: boolean;
  dueAt: string | null;
  remainingMs: number;
  isExpired: boolean;
  protectedByProofUpload: boolean;
  requiresAdminReview: boolean;
  summary: string;
};

export function getDpDeadlineState(
  order: SubmittedOrder,
  now: Date = new Date()
): DpDeadlineState {
  const dueAt = order.invoice.dpDueAt;
  if (!dueAt || order.invoice.quoteStatus !== "disetujui") {
    return {
      active: false,
      dueAt: null,
      remainingMs: 0,
      isExpired: false,
      protectedByProofUpload: false,
      requiresAdminReview: false,
      summary: "Batas pembayaran DP 24 jam akan aktif setelah penawaran disetujui.",
    };
  }

  if (isPaymentVerified(order, "dp")) {
    return {
      active: false,
      dueAt,
      remainingMs: 0,
      isExpired: false,
      protectedByProofUpload: true,
      requiresAdminReview: false,
      summary: "Pembayaran DP telah diverifikasi oleh admin.",
    };
  }

  if (order.status === "dibatalkan") {
    return {
      active: false,
      dueAt,
      remainingMs: 0,
      isExpired: true,
      protectedByProofUpload: false,
      requiresAdminReview: false,
      summary: "Pesanan telah dibatalkan.",
    };
  }

  const dueMs = new Date(dueAt).getTime();
  const remainingMs = dueMs - now.getTime();
  const isExpired = remainingMs <= 0;
  const protectedByProofUpload = hasProofUploadedBeforeDpDeadline(order);

  if (protectedByProofUpload) {
    return {
      active: true,
      dueAt,
      remainingMs: Math.max(0, remainingMs),
      isExpired,
      protectedByProofUpload: true,
      requiresAdminReview: false,
      summary:
        "Bukti DP telah diunggah sebelum batas 24 jam. Pesanan aman dan menunggu verifikasi admin tanpa pembatalan otomatis.",
    };
  }

  const latestDp = getLatestPaymentByStage(order, "dp");
  if (latestDp?.verificationStatus === "menunggu_verifikasi_admin") {
    return {
      active: true,
      dueAt,
      remainingMs: Math.max(0, remainingMs),
      isExpired,
      protectedByProofUpload: false,
      requiresAdminReview: false,
      summary: "Bukti DP telah diunggah dan sedang menunggu verifikasi manual admin.",
    };
  }

  if (isExpired) {
    return {
      active: true,
      dueAt,
      remainingMs: 0,
      isExpired: true,
      protectedByProofUpload: false,
      requiresAdminReview: true,
      summary:
        "Batas waktu 24 jam terlewati tanpa unggahan bukti pembayaran. Pesanan ditandai untuk ditinjau atau dibatalkan sesuai aturan admin.",
    };
  }

  const totalMinutes = Math.max(1, Math.ceil(remainingMs / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return {
    active: true,
    dueAt,
    remainingMs,
    isExpired: false,
    protectedByProofUpload: false,
    requiresAdminReview: false,
    summary: `Sisa waktu pembayaran DP: ${hours} jam ${minutes} menit (batas ${formatDateTimeId(dueAt)}).`,
  };
}

export function getPaymentSummaryBadge(
  order: SubmittedOrder,
  now: Date = new Date()
): { label: string; tone: StatusTone } {
  if (order.status === "dibatalkan") {
    return { label: "Dibatalkan", tone: "danger" };
  }
  if (order.invoice.quoteStatus === "belum_dikirim") {
    return { label: "Belum Ada Tagihan", tone: "neutral" };
  }
  if (order.invoice.quoteStatus === "menunggu_persetujuan") {
    return { label: "Menunggu Persetujuan Harga", tone: "info" };
  }
  if (order.invoice.quoteStatus === "ditolak") {
    return { label: "Penawaran Ditolak", tone: "danger" };
  }

  if (isPaymentVerified(order, "pelunasan")) {
    return { label: "Lunas Terverifikasi", tone: "success" };
  }

  const latestSettlement = getLatestPaymentByStage(order, "pelunasan");
  if (latestSettlement?.verificationStatus === "menunggu_verifikasi_admin") {
    return { label: "Pelunasan Menunggu Verifikasi Admin", tone: "info" };
  }
  if (latestSettlement?.verificationStatus === "ditolak") {
    return { label: "Bukti Pelunasan Ditolak — Unggah Ulang", tone: "danger" };
  }
  if (order.invoice.settlementInvoiceNumber) {
    return { label: "Menunggu Pelunasan", tone: "warning" };
  }

  if (isPaymentVerified(order, "dp")) {
    return { label: "DP 50% Terverifikasi", tone: "success" };
  }

  const latestDp = getLatestPaymentByStage(order, "dp");
  if (latestDp?.verificationStatus === "menunggu_verifikasi_admin") {
    return { label: "Bukti DP Menunggu Verifikasi Admin", tone: "info" };
  }
  if (latestDp?.verificationStatus === "ditolak") {
    return { label: "Bukti DP Ditolak — Unggah Ulang", tone: "danger" };
  }

  const deadline = getDpDeadlineState(order, now);
  if (deadline.requiresAdminReview || order.status === "perlu_tinjauan_admin") {
    return { label: "DP Lewat 24 Jam — Tinjauan Admin", tone: "warning" };
  }

  return { label: "Menunggu Pembayaran DP (50%)", tone: "warning" };
}

export function canStartProduction(order: SubmittedOrder): boolean {
  return (
    order.status !== "dibatalkan" &&
    order.status !== "penawaran_ditolak" &&
    isPaymentVerified(order, "dp")
  );
}

export function canAdvanceToFulfillment(order: SubmittedOrder): boolean {
  return (
    canStartProduction(order) &&
    isPaymentVerified(order, "pelunasan")
  );
}

export function adminSendQuote(
  rawOrder: SubmittedOrder,
  input: {
    tailoringFee: number;
    shippingFee?: number | null;
    estimatedCompletionDate?: string;
    quoteNote?: string;
  },
  now: Date = new Date()
): TransitionResult {
  const order = normalizeSubmittedOrder(rawOrder);
  if (order.status === "dibatalkan" || order.status === "selesai") {
    return {
      ok: false,
      error: "Pesanan yang sudah dibatalkan atau selesai tidak dapat diberi penawaran baru.",
    };
  }
  if (isPaymentVerified(order, "dp")) {
    return {
      ok: false,
      error: "Penawaran tidak dapat diubah setelah pembayaran DP diverifikasi.",
    };
  }
  const latestDpPayment = getLatestPaymentByStage(order, "dp");
  if (latestDpPayment?.verificationStatus === "menunggu_verifikasi_admin") {
    return {
      ok: false,
      error:
        "Penawaran harga tidak dapat diubah saat bukti pembayaran DP masih menunggu verifikasi admin. Putuskan terima atau tolak bukti pembayaran terlebih dahulu.",
    };
  }

  if (!Number.isFinite(input.tailoringFee) || input.tailoringFee <= 0) {
    return { ok: false, error: "Harga akhir biaya jahit harus lebih besar dari Rp 0." };
  }

  const cleanTailoringFee = Math.round(input.tailoringFee);
  let cleanShippingFee: number | null = 0;

  if (order.delivery.method === "pickup") {
    cleanShippingFee = 0;
  } else if (
    input.shippingFee !== undefined &&
    input.shippingFee !== null
  ) {
    if (!Number.isFinite(input.shippingFee) || input.shippingFee < 0) {
      return { ok: false, error: "Biaya pengiriman tidak boleh bernilai negatif." };
    }
    cleanShippingFee = Math.round(input.shippingFee);
  } else {
    cleanShippingFee = order.invoice.shippingFee;
  }

  const dpAmount = Math.ceil(cleanTailoringFee / 2);
  const settlementTailoringAmount = cleanTailoringFee - dpAmount;
  const timestamp = now.toISOString();
  const quoteNote = input.quoteNote?.trim() || undefined;
  const estimatedCompletionDate =
    input.estimatedCompletionDate?.trim() || order.estimatedCompletionDate;

  const shippingSummary =
    order.delivery.method === "pickup"
      ? "Ambil di butik (biaya kirim Rp 0)."
      : cleanShippingFee !== null
        ? `Estimasi ongkir terpisah ${formatRupiah(cleanShippingFee)}.`
        : "Ongkos kirim akan ditetapkan terpisah saat pelunasan.";

  const nextOrder: SubmittedOrder = {
    ...order,
    updatedAt: timestamp,
    status: "penawaran_dikirim",
    productionStage: "menunggu_produksi",
    estimatedCompletionDate,
    invoice: {
      ...order.invoice,
      quoteStatus: "menunggu_persetujuan",
      quoteSentAt: timestamp,
      quoteRespondedAt: undefined,
      quoteRejectionReason: undefined,
      tailoringFee: cleanTailoringFee,
      shippingFee: cleanShippingFee,
      dpAmount,
      dpDueAt: null,
      dpInvoiceNumber: undefined,
      dpIssuedAt: undefined,
      settlementTailoringAmount,
      settlementTotalAmount:
        cleanShippingFee !== null ? settlementTailoringAmount + cleanShippingFee : null,
      quoteNote,
    },
    history: [
      ...order.history,
      createHistoryEvent(
        {
          actor: "admin",
          category: "penawaran",
          title: "Penawaran harga akhir dikirim",
          description: `Biaya jahit ditetapkan ${formatRupiah(cleanTailoringFee)} (DP 50%: ${formatRupiah(dpAmount)}). ${shippingSummary}${quoteNote ? ` Catatan: ${quoteNote}` : ""}`,
          orderStatus: "penawaran_dikirim",
          productionStage: "menunggu_produksi",
        },
        now
      ),
    ],
  };

  return { ok: true, order: nextOrder };
}

export function customerRespondToQuote(
  rawOrder: SubmittedOrder,
  input: {
    decision: "approve" | "reject";
    rejectionReason?: string;
  },
  now: Date = new Date(),
  dpWindowHours: number = DP_WINDOW_HOURS
): TransitionResult {
  const order = normalizeSubmittedOrder(rawOrder);
  if (order.status === "dibatalkan") {
    return { ok: false, error: "Pesanan sudah dibatalkan." };
  }
  if (order.invoice.quoteStatus !== "menunggu_persetujuan" || !order.invoice.tailoringFee) {
    return {
      ok: false,
      error: "Tidak ada penawaran harga aktif yang menunggu persetujuan.",
    };
  }

  const timestamp = now.toISOString();

  if (input.decision === "reject") {
    const reason = input.rejectionReason?.trim() || "Pelanggan memilih menolak penawaran harga.";
    const nextOrder: SubmittedOrder = {
      ...order,
      updatedAt: timestamp,
      status: "penawaran_ditolak",
      invoice: {
        ...order.invoice,
        quoteStatus: "ditolak",
        quoteRespondedAt: timestamp,
        quoteRejectionReason: reason,
      },
      history: [
        ...order.history,
        createHistoryEvent(
          {
            actor: "customer",
            category: "penawaran",
            title: "Penawaran harga ditolak pelanggan",
            description: reason,
            orderStatus: "penawaran_ditolak",
            productionStage: order.productionStage,
          },
          now
        ),
      ],
    };
    return { ok: true, order: nextOrder };
  }

  const dpAmount =
    order.invoice.dpAmount ?? Math.ceil(order.invoice.tailoringFee / 2);
  const dueAt = new Date(
    now.getTime() + Math.max(1, dpWindowHours) * 60 * 60 * 1000
  ).toISOString();
  const dpInvoiceNumber = buildInvoiceNumber("DP", order.orderCode);

  const dpRecord: PaymentRecord = {
    id: createPaymentId("dp", now),
    invoiceNumber: dpInvoiceNumber,
    stage: "dp",
    tailoringPortion: dpAmount,
    shippingPortion: 0,
    totalAmount: dpAmount,
    method: "qris",
    verificationStatus: "belum_unggah",
  };

  const nextOrder: SubmittedOrder = {
    ...order,
    updatedAt: timestamp,
    status: "menunggu_dp",
    productionStage: "menunggu_produksi",
    invoice: {
      ...order.invoice,
      quoteStatus: "disetujui",
      quoteRespondedAt: timestamp,
      dpInvoiceNumber,
      dpIssuedAt: timestamp,
      dpAmount,
      dpDueAt: dueAt,
      settlementTailoringAmount: order.invoice.tailoringFee - dpAmount,
    },
    payments: [
      ...order.payments.filter((item) => item.stage !== "dp"),
      dpRecord,
    ],
    history: [
      ...order.history,
      createHistoryEvent(
        {
          actor: "customer",
          category: "penawaran",
          title: "Penawaran disetujui & Invoice DP diterbitkan",
          description: `Invoice ${dpInvoiceNumber} sebesar ${formatRupiah(dpAmount)} (50% biaya jahit) terbit dengan batas pembayaran ${dpWindowHours} jam hingga ${formatDateTimeId(dueAt)}.`,
          orderStatus: "menunggu_dp",
          productionStage: "menunggu_produksi",
        },
        now
      ),
    ],
  };

  return { ok: true, order: nextOrder };
}

export function customerUploadPaymentProof(
  rawOrder: SubmittedOrder,
  input: {
    stage: PaymentStage;
    proofFileName: string;
    proofMimeType: string;
    proofSize: number;
    proofPreviewDataUrl?: string;
    customerNote?: string;
  },
  now: Date = new Date()
): TransitionResult {
  const order = normalizeSubmittedOrder(rawOrder);
  if (order.status === "dibatalkan" || order.status === "selesai") {
    return {
      ok: false,
      error: "Bukti pembayaran tidak dapat diunggah untuk pesanan yang sudah ditutup.",
    };
  }

  if (!input.proofFileName.trim()) {
    return { ok: false, error: "File bukti pembayaran wajib dipilih." };
  }

  if (isPaymentVerified(order, input.stage)) {
    return {
      ok: false,
      error:
        input.stage === "dp"
          ? "Pembayaran DP sudah diverifikasi oleh admin."
          : "Pembayaran pelunasan sudah diverifikasi oleh admin.",
    };
  }

  const timestamp = now.toISOString();

  if (input.stage === "dp") {
    if (order.invoice.quoteStatus !== "disetujui" || !order.invoice.dpAmount) {
      return {
        ok: false,
        error: "Setujui penawaran terlebih dahulu sebelum mengunggah bukti DP.",
      };
    }

    const invoiceNumber =
      order.invoice.dpInvoiceNumber ?? buildInvoiceNumber("DP", order.orderCode);
    const uploadedRecord: PaymentRecord = {
      id: createPaymentId("dp", now),
      invoiceNumber,
      stage: "dp",
      tailoringPortion: order.invoice.dpAmount,
      shippingPortion: 0,
      totalAmount: order.invoice.dpAmount,
      method: "qris",
      proofFileName: input.proofFileName.trim(),
      proofMimeType: input.proofMimeType,
      proofSize: input.proofSize,
      proofPreviewDataUrl: input.proofPreviewDataUrl,
      proofUploadedAt: timestamp,
      customerNote: input.customerNote?.trim() || undefined,
      verificationStatus: "menunggu_verifikasi_admin",
    };

    const previousRecords = order.payments.filter(
      (item) => !(item.stage === "dp" && item.verificationStatus === "belum_unggah")
    );
    const uploadedBeforeDeadline =
      Boolean(order.invoice.dpDueAt) &&
      now.getTime() <= new Date(order.invoice.dpDueAt as string).getTime();

    const nextOrder: SubmittedOrder = {
      ...order,
      updatedAt: timestamp,
      status: "menunggu_verifikasi_dp",
      payments: [...previousRecords, uploadedRecord],
      history: [
        ...order.history,
        createHistoryEvent(
          {
            actor: "customer",
            category: "pembayaran",
            title: "Bukti pembayaran DP diunggah",
            description: `File "${uploadedRecord.proofFileName}" diunggah untuk ${invoiceNumber} (${formatRupiah(uploadedRecord.totalAmount)}). Menunggu verifikasi manual admin.${uploadedBeforeDeadline ? " Diunggah sebelum batas waktu 24 jam." : ""}`,
            orderStatus: "menunggu_verifikasi_dp",
            productionStage: order.productionStage,
          },
          now
        ),
      ],
    };

    return { ok: true, order: nextOrder };
  }

  if (
    !order.invoice.settlementInvoiceNumber ||
    order.invoice.settlementTailoringAmount === null ||
    order.invoice.settlementTotalAmount === null
  ) {
    return {
      ok: false,
      error: "Invoice pelunasan belum diterbitkan oleh admin.",
    };
  }

  const shippingPortion =
    order.delivery.method === "shipping" ? (order.invoice.shippingFee ?? 0) : 0;

  const uploadedRecord: PaymentRecord = {
    id: createPaymentId("pelunasan", now),
    invoiceNumber: order.invoice.settlementInvoiceNumber,
    stage: "pelunasan",
    tailoringPortion: order.invoice.settlementTailoringAmount,
    shippingPortion,
    totalAmount: order.invoice.settlementTotalAmount,
    method: "qris",
    proofFileName: input.proofFileName.trim(),
    proofMimeType: input.proofMimeType,
    proofSize: input.proofSize,
    proofPreviewDataUrl: input.proofPreviewDataUrl,
    proofUploadedAt: timestamp,
    customerNote: input.customerNote?.trim() || undefined,
    verificationStatus: "menunggu_verifikasi_admin",
  };

  const previousRecords = order.payments.filter(
    (item) => !(item.stage === "pelunasan" && item.verificationStatus === "belum_unggah")
  );

  const nextOrder: SubmittedOrder = {
    ...order,
    updatedAt: timestamp,
    status: "menunggu_verifikasi_pelunasan",
    payments: [...previousRecords, uploadedRecord],
    history: [
      ...order.history,
      createHistoryEvent(
        {
          actor: "customer",
          category: "pembayaran",
          title: "Bukti pelunasan diunggah",
          description: `File "${uploadedRecord.proofFileName}" diunggah untuk ${order.invoice.settlementInvoiceNumber} (${formatRupiah(uploadedRecord.totalAmount)}). Menunggu verifikasi manual admin.`,
          orderStatus: "menunggu_verifikasi_pelunasan",
          productionStage: order.productionStage,
        },
        now
      ),
    ],
  };

  return { ok: true, order: nextOrder };
}

export function adminVerifyPayment(
  rawOrder: SubmittedOrder,
  input: {
    stage: PaymentStage;
    decision: "approve" | "reject";
    adminNote?: string;
  },
  now: Date = new Date()
): TransitionResult {
  const order = normalizeSubmittedOrder(rawOrder);
  const latestRecord = getLatestPaymentByStage(order, input.stage);

  if (!latestRecord || latestRecord.verificationStatus !== "menunggu_verifikasi_admin") {
    return {
      ok: false,
      error:
        input.stage === "dp"
          ? "Belum ada bukti DP yang menunggu verifikasi admin."
          : "Belum ada bukti pelunasan yang menunggu verifikasi admin.",
    };
  }

  const trimmedNote = input.adminNote?.trim() || "";
  if (input.decision === "reject" && trimmedNote.length < 5) {
    return {
      ok: false,
      error: "Tuliskan alasan penolakan bukti pembayaran (minimal 5 karakter).",
    };
  }

  const timestamp = now.toISOString();
  const updatedPayments = order.payments.map((record) =>
    record.id === latestRecord.id
      ? {
          ...record,
          verificationStatus:
            input.decision === "approve"
              ? ("terverifikasi" as const)
              : ("ditolak" as const),
          verifiedAt: timestamp,
          adminNote: trimmedNote || undefined,
        }
      : record
  );

  if (input.stage === "dp") {
    if (input.decision === "approve") {
      const nextOrder: SubmittedOrder = {
        ...order,
        updatedAt: timestamp,
        status: "dalam_produksi",
        productionStage: "menunggu_produksi",
        payments: updatedPayments,
        history: [
          ...order.history,
          createHistoryEvent(
            {
              actor: "admin",
              category: "pembayaran",
              title: "Pembayaran DP diverifikasi admin",
              description: `DP sebesar ${formatRupiah(latestRecord.totalAmount)} terverifikasi. Pesanan kini dapat masuk ke tahap persiapan bahan dan produksi.${trimmedNote ? ` Catatan: ${trimmedNote}` : ""}`,
              orderStatus: "dalam_produksi",
              productionStage: "menunggu_produksi",
            },
            now
          ),
        ],
      };
      return { ok: true, order: nextOrder };
    }

    const dpExpired =
      Boolean(order.invoice.dpDueAt) &&
      now.getTime() > new Date(order.invoice.dpDueAt as string).getTime();
    const nextStatus: OrderStatus = dpExpired ? "perlu_tinjauan_admin" : "menunggu_dp";

    const nextOrder: SubmittedOrder = {
      ...order,
      updatedAt: timestamp,
      status: nextStatus,
      payments: updatedPayments,
      history: [
        ...order.history,
        createHistoryEvent(
          {
            actor: "admin",
            category: "pembayaran",
            title: "Bukti DP ditolak admin",
            description: `Alasan: ${trimmedNote}. Pelanggan perlu mengunggah bukti pembayaran yang sesuai.`,
            orderStatus: nextStatus,
            productionStage: order.productionStage,
          },
          now
        ),
      ],
    };
    return { ok: true, order: nextOrder };
  }

  if (input.decision === "approve") {
    const nextOrder: SubmittedOrder = {
      ...order,
      updatedAt: timestamp,
      status: "siap_diambil_atau_dikirim",
      productionStage: "siap_dikirim_atau_diambil",
      payments: updatedPayments,
      history: [
        ...order.history,
        createHistoryEvent(
          {
            actor: "admin",
            category: "pembayaran",
            title: "Pelunasan diverifikasi admin",
            description: `Pelunasan sebesar ${formatRupiah(latestRecord.totalAmount)} terverifikasi. Pesanan siap dikirim atau diambil.${trimmedNote ? ` Catatan: ${trimmedNote}` : ""}`,
            orderStatus: "siap_diambil_atau_dikirim",
            productionStage: "siap_dikirim_atau_diambil",
          },
          now
        ),
      ],
    };
    return { ok: true, order: nextOrder };
  }

  const nextOrder: SubmittedOrder = {
    ...order,
    updatedAt: timestamp,
    status: "selesai_jahit_menunggu_pelunasan",
    productionStage: "menunggu_pelunasan",
    payments: updatedPayments,
    history: [
      ...order.history,
      createHistoryEvent(
        {
          actor: "admin",
          category: "pembayaran",
          title: "Bukti pelunasan ditolak admin",
          description: `Alasan: ${trimmedNote}. Pelanggan diminta mengunggah bukti pelunasan yang valid.`,
          orderStatus: "selesai_jahit_menunggu_pelunasan",
          productionStage: "menunggu_pelunasan",
        },
        now
      ),
    ],
  };
  return { ok: true, order: nextOrder };
}

/**
 * Menandai pesanan yang melewati batas waktu 24 jam DP tanpa bukti pembayaran
 * untuk ditinjau admin. Tidak pernah menandai pesanan yang sudah mengunggah bukti
 * sebelum batas waktu 24 jam.
 */
export function evaluateDpOverdueForReview(
  rawOrder: SubmittedOrder,
  now: Date = new Date(),
  note?: string
): TransitionResult {
  const order = normalizeSubmittedOrder(rawOrder);
  const deadline = getDpDeadlineState(order, now);

  if (deadline.protectedByProofUpload) {
    return {
      ok: false,
      error:
        "Pelanggan sudah mengunggah bukti pembayaran sebelum batas waktu 24 jam, sehingga pesanan tidak boleh ditandai melewati batas atau dibatalkan otomatis.",
    };
  }

  if (!deadline.requiresAdminReview) {
    return {
      ok: false,
      error: "Pesanan belum melewati batas waktu pembayaran DP 24 jam tanpa bukti.",
    };
  }

  const timestamp = now.toISOString();
  const detail =
    note?.trim() ||
    "Batas waktu pembayaran DP 24 jam terlewati tanpa unggahan bukti pembayaran. Menunggu keputusan admin (perpanjang waktu atau batalkan).";

  const nextOrder: SubmittedOrder = {
    ...order,
    updatedAt: timestamp,
    status: "perlu_tinjauan_admin",
    history: [
      ...order.history,
      createHistoryEvent(
        {
          actor: "system",
          category: "pembayaran",
          title: "DP melewati batas 24 jam — perlu tinjauan admin",
          description: detail,
          orderStatus: "perlu_tinjauan_admin",
          productionStage: order.productionStage,
        },
        now
      ),
    ],
  };

  return { ok: true, order: nextOrder };
}

export function adminExtendDpDeadline(
  rawOrder: SubmittedOrder,
  input: { extraHours?: number; note?: string } = {},
  now: Date = new Date()
): TransitionResult {
  const order = normalizeSubmittedOrder(rawOrder);
  if (order.status === "dibatalkan" || isPaymentVerified(order, "dp")) {
    return {
      ok: false,
      error: "Batas waktu DP tidak dapat diperpanjang untuk pesanan ini.",
    };
  }
  if (order.invoice.quoteStatus !== "disetujui") {
    return {
      ok: false,
      error: "Penawaran belum disetujui sehingga invoice DP belum aktif.",
    };
  }

  const hours = Math.max(1, Math.round(input.extraHours ?? DP_WINDOW_HOURS));
  const nextDueAt = new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();
  const timestamp = now.toISOString();

  const nextOrder: SubmittedOrder = {
    ...order,
    updatedAt: timestamp,
    status: "menunggu_dp",
    invoice: {
      ...order.invoice,
      dpDueAt: nextDueAt,
    },
    history: [
      ...order.history,
      createHistoryEvent(
        {
          actor: "admin",
          category: "pembayaran",
          title: `Batas pembayaran DP diperpanjang ${hours} jam`,
          description: `Batas baru sampai ${formatDateTimeId(nextDueAt)}.${input.note?.trim() ? ` Catatan: ${input.note.trim()}` : ""}`,
          orderStatus: "menunggu_dp",
          productionStage: order.productionStage,
        },
        now
      ),
    ],
  };

  return { ok: true, order: nextOrder };
}

export function adminCancelOrder(
  rawOrder: SubmittedOrder,
  input: { reason: string; isTimeoutCancellation?: boolean },
  now: Date = new Date()
): TransitionResult {
  const order = normalizeSubmittedOrder(rawOrder);
  if (order.status === "selesai" || order.status === "dibatalkan") {
    return { ok: false, error: "Pesanan sudah selesai atau sebelumnya telah dibatalkan." };
  }

  const reason = input.reason.trim();
  if (reason.length < 5) {
    return {
      ok: false,
      error: "Alasan pembatalan wajib diisi minimal 5 karakter agar tercatat pada riwayat.",
    };
  }

  if (
    input.isTimeoutCancellation &&
    hasProofUploadedBeforeDpDeadline(order)
  ) {
    return {
      ok: false,
      error:
        "Pesanan tidak boleh dibatalkan karena batas waktu 24 jam apabila pelanggan sudah mengunggah bukti pembayaran tepat waktu. Verifikasi atau tolak bukti pembayaran terlebih dahulu.",
    };
  }

  const timestamp = now.toISOString();
  const nextOrder: SubmittedOrder = {
    ...order,
    updatedAt: timestamp,
    status: "dibatalkan",
    cancelledAt: timestamp,
    cancellationReason: reason,
    history: [
      ...order.history,
      createHistoryEvent(
        {
          actor: "admin",
          category: "pembatalan",
          title: "Pesanan dibatalkan oleh admin",
          description: `Alasan pembatalan: ${reason}`,
          orderStatus: "dibatalkan",
          productionStage: order.productionStage,
        },
        now
      ),
    ],
  };

  return { ok: true, order: nextOrder };
}

export function adminUpdateProductionStage(
  rawOrder: SubmittedOrder,
  input: {
    stage: ProductionStage;
    estimatedCompletionDate?: string;
    note?: string;
  },
  now: Date = new Date()
): TransitionResult {
  const order = normalizeSubmittedOrder(rawOrder);
  if (order.status === "dibatalkan") {
    return { ok: false, error: "Tahap produksi tidak dapat diperbarui pada pesanan yang dibatalkan." };
  }

  const targetMeta = getProductionStageMeta(input.stage);
  if (targetMeta.requiresDpVerified && !isPaymentVerified(order, "dp")) {
    return {
      ok: false,
      error:
        "Produksi tidak boleh dimulai sebelum pembayaran DP 50% diverifikasi oleh admin.",
    };
  }

  if (
    targetMeta.requiresSettlementVerified &&
    !isPaymentVerified(order, "pelunasan")
  ) {
    return {
      ok: false,
      error:
        "Pesanan belum dapat masuk tahap siap dikirim/diambil atau selesai sebelum pelunasan diverifikasi admin.",
    };
  }

  if (
    input.stage === "menunggu_pelunasan" &&
    !order.invoice.settlementInvoiceNumber
  ) {
    return {
      ok: false,
      error:
        "Terbitkan Invoice Pelunasan terlebih dahulu (beserta biaya pengiriman jika dikirim) sebelum masuk tahap Menunggu pelunasan.",
    };
  }

  let nextStatus: OrderStatus = order.status;
  if (
    input.stage === "persiapan_bahan" ||
    input.stage === "pemotongan_kain" ||
    input.stage === "proses_penjahitan" ||
    input.stage === "finishing_qc" ||
    input.stage === "selesai_dikerjakan"
  ) {
    nextStatus = "dalam_produksi";
  } else if (input.stage === "menunggu_pelunasan") {
    const latestSettlement = getLatestPaymentByStage(order, "pelunasan");
    nextStatus =
      latestSettlement?.verificationStatus === "menunggu_verifikasi_admin"
        ? "menunggu_verifikasi_pelunasan"
        : "selesai_jahit_menunggu_pelunasan";
  } else if (input.stage === "siap_dikirim_atau_diambil") {
    nextStatus = "siap_diambil_atau_dikirim";
  } else if (input.stage === "dalam_pengiriman_atau_siap_diambil") {
    nextStatus =
      order.delivery.method === "shipping"
        ? "dalam_pengiriman"
        : "siap_diambil_atau_dikirim";
  } else if (input.stage === "pesanan_selesai") {
    nextStatus = "selesai";
  }

  const timestamp = now.toISOString();
  const nextEstimatedDate =
    input.estimatedCompletionDate !== undefined
      ? input.estimatedCompletionDate.trim() || undefined
      : order.estimatedCompletionDate;

  const noteText = input.note?.trim();
  const estimateNote =
    nextEstimatedDate && nextEstimatedDate !== order.estimatedCompletionDate
      ? ` Estimasi penyelesaian diperbarui ke ${formatDateOnlyId(nextEstimatedDate)}.`
      : "";

  const nextOrder: SubmittedOrder = {
    ...order,
    updatedAt: timestamp,
    status: nextStatus,
    productionStage: input.stage,
    estimatedCompletionDate: nextEstimatedDate,
    completedAt: input.stage === "pesanan_selesai" ? timestamp : order.completedAt,
    history: [
      ...order.history,
      createHistoryEvent(
        {
          actor: "admin",
          category: "produksi",
          title: `Status produksi: ${targetMeta.label}`,
          description: `${noteText || targetMeta.description}${estimateNote}`,
          orderStatus: nextStatus,
          productionStage: input.stage,
        },
        now
      ),
    ],
  };

  return { ok: true, order: nextOrder };
}

export function adminUpdateEstimatedCompletion(
  rawOrder: SubmittedOrder,
  estimatedCompletionDate: string,
  note?: string,
  now: Date = new Date()
): TransitionResult {
  const order = normalizeSubmittedOrder(rawOrder);
  if (order.status === "dibatalkan" || order.status === "selesai") {
    return {
      ok: false,
      error: "Estimasi penyelesaian tidak dapat diubah pada pesanan yang sudah selesai atau dibatalkan.",
    };
  }

  const cleanDate = estimatedCompletionDate.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
    return { ok: false, error: "Pilih tanggal estimasi penyelesaian yang valid." };
  }

  const timestamp = now.toISOString();
  const nextOrder: SubmittedOrder = {
    ...order,
    updatedAt: timestamp,
    estimatedCompletionDate: cleanDate,
    history: [
      ...order.history,
      createHistoryEvent(
        {
          actor: "admin",
          category: "produksi",
          title: "Estimasi penyelesaian diperbarui",
          description: `Admin menetapkan estimasi penyelesaian pada ${formatDateOnlyId(cleanDate)}.${note?.trim() ? ` Catatan: ${note.trim()}` : ""}`,
          orderStatus: order.status,
          productionStage: order.productionStage,
        },
        now
      ),
    ],
  };

  return { ok: true, order: nextOrder };
}

export function adminIssueSettlementInvoice(
  rawOrder: SubmittedOrder,
  input: {
    shippingFee?: number | null;
    note?: string;
  } = {},
  now: Date = new Date()
): TransitionResult {
  const order = normalizeSubmittedOrder(rawOrder);
  if (order.status === "dibatalkan") {
    return { ok: false, error: "Invoice pelunasan tidak dapat diterbitkan untuk pesanan dibatalkan." };
  }
  if (!isPaymentVerified(order, "dp") || !order.invoice.tailoringFee || !order.invoice.dpAmount) {
    return {
      ok: false,
      error: "Invoice pelunasan hanya dapat diterbitkan setelah DP 50% terverifikasi.",
    };
  }

  const currentStageIndex = getProductionStageIndex(order.productionStage);
  const completedSewingIndex = getProductionStageIndex("selesai_dikerjakan");
  if (currentStageIndex < completedSewingIndex) {
    return {
      ok: false,
      error:
        "Invoice pelunasan dibuat setelah proses pengerjaan mencapai tahap Selesai dikerjakan.",
    };
  }

  if (isPaymentVerified(order, "pelunasan")) {
    return { ok: false, error: "Pelunasan pesanan ini sudah diverifikasi." };
  }

  let finalShippingFee = 0;
  if (order.delivery.method === "shipping") {
    const candidate =
      input.shippingFee !== undefined ? input.shippingFee : order.invoice.shippingFee;
    if (candidate === null || candidate === undefined || !Number.isFinite(candidate) || candidate < 0) {
      return {
        ok: false,
        error:
          "Masukkan biaya pengiriman yang valid berdasarkan tarif kurir resmi sebelum menerbitkan invoice pelunasan.",
      };
    }
    finalShippingFee = Math.round(candidate);
  }

  const settlementTailoringAmount =
    order.invoice.tailoringFee - order.invoice.dpAmount;
  const settlementTotalAmount = settlementTailoringAmount + finalShippingFee;
  const settlementInvoiceNumber =
    order.invoice.settlementInvoiceNumber ?? buildInvoiceNumber("LN", order.orderCode);
  const timestamp = now.toISOString();

  const existingVerifiedOrPending = order.payments.some(
    (item) =>
      item.stage === "pelunasan" &&
      item.verificationStatus === "menunggu_verifikasi_admin"
  );

  const nextPayments = existingVerifiedOrPending
    ? order.payments
    : [
        ...order.payments.filter(
          (item) =>
            !(item.stage === "pelunasan" && item.verificationStatus === "belum_unggah")
        ),
        {
          id: createPaymentId("pelunasan", now),
          invoiceNumber: settlementInvoiceNumber,
          stage: "pelunasan" as const,
          tailoringPortion: settlementTailoringAmount,
          shippingPortion: finalShippingFee,
          totalAmount: settlementTotalAmount,
          method: "qris" as const,
          verificationStatus: "belum_unggah" as const,
        },
      ];

  const feeBreakdown =
    order.delivery.method === "shipping"
      ? `Sisa biaya jahit 50%: ${formatRupiah(settlementTailoringAmount)} + ongkos kirim terpisah: ${formatRupiah(finalShippingFee)} = ${formatRupiah(settlementTotalAmount)}.`
      : `Sisa biaya jahit 50%: ${formatRupiah(settlementTailoringAmount)} (ambil sendiri di butik, tanpa biaya pengiriman).`;

  const nextOrder: SubmittedOrder = {
    ...order,
    updatedAt: timestamp,
    status: existingVerifiedOrPending
      ? "menunggu_verifikasi_pelunasan"
      : "selesai_jahit_menunggu_pelunasan",
    productionStage: "menunggu_pelunasan",
    invoice: {
      ...order.invoice,
      shippingFee: finalShippingFee,
      settlementInvoiceNumber,
      settlementIssuedAt: timestamp,
      settlementTailoringAmount,
      settlementTotalAmount,
    },
    payments: nextPayments,
    history: [
      ...order.history,
      createHistoryEvent(
        {
          actor: "admin",
          category: "pembayaran",
          title: `Invoice pelunasan ${settlementInvoiceNumber} diterbitkan`,
          description: `${feeBreakdown}${input.note?.trim() ? ` Catatan: ${input.note.trim()}` : ""}`,
          orderStatus: existingVerifiedOrPending
            ? "menunggu_verifikasi_pelunasan"
            : "selesai_jahit_menunggu_pelunasan",
          productionStage: "menunggu_pelunasan",
        },
        now
      ),
    ],
  };

  return { ok: true, order: nextOrder };
}

export function adminUpdateFulfillment(
  rawOrder: SubmittedOrder,
  input: {
    courierName?: string;
    trackingNumber?: string;
    pickupReadyNote?: string;
    action: "save_details" | "mark_dispatched_or_ready" | "mark_completed";
  },
  now: Date = new Date()
): TransitionResult {
  const order = normalizeSubmittedOrder(rawOrder);
  if (order.status === "dibatalkan") {
    return { ok: false, error: "Pesanan yang dibatalkan tidak dapat diperbarui pengirimannya." };
  }
  if (!isPaymentVerified(order, "pelunasan")) {
    return {
      ok: false,
      error:
        "Pengiriman atau penyerahan busana hanya dapat diproses setelah pelunasan diverifikasi oleh admin.",
    };
  }

  const courierName =
    input.courierName !== undefined ? input.courierName.trim() : (order.courierName ?? "");
  const trackingNumber =
    input.trackingNumber !== undefined
      ? input.trackingNumber.trim()
      : (order.trackingNumber ?? "");
  const pickupReadyNote =
    input.pickupReadyNote !== undefined
      ? input.pickupReadyNote.trim()
      : (order.pickupReadyNote ?? "");

  if (
    order.delivery.method === "shipping" &&
    input.action === "mark_dispatched_or_ready"
  ) {
    if (!courierName) {
      return {
        ok: false,
        error: "Masukkan nama jasa pengiriman sebelum menandai pesanan sedang dikirim.",
      };
    }
    if (!trackingNumber) {
      return {
        ok: false,
        error: "Masukkan nomor resi pengiriman sebelum menandai pesanan sedang dikirim.",
      };
    }
  }

  const timestamp = now.toISOString();
  let nextStage: ProductionStage = order.productionStage;
  let nextStatus: OrderStatus = order.status;
  let eventTitle = "Informasi serah terima diperbarui";
  let eventDescription = "";

  if (input.action === "mark_completed") {
    nextStage = "pesanan_selesai";
    nextStatus = "selesai";
    eventTitle = "Pesanan selesai";
    eventDescription =
      order.delivery.method === "shipping"
        ? `Pesanan telah diterima pelanggan${trackingNumber ? ` (resi ${courierName} ${trackingNumber})` : ""}.`
        : "Pesanan telah diambil pelanggan di Celmira Boutique.";
  } else if (input.action === "mark_dispatched_or_ready") {
    nextStage = "dalam_pengiriman_atau_siap_diambil";
    if (order.delivery.method === "shipping") {
      nextStatus = "dalam_pengiriman";
      eventTitle = "Pesanan dalam pengiriman";
      eventDescription = `Dikirim melalui ${courierName} dengan nomor resi ${trackingNumber}.`;
    } else {
      nextStatus = "siap_diambil_atau_dikirim";
      eventTitle = "Pesanan siap diambil di butik";
      eventDescription =
        pickupReadyNote ||
        "Busana sudah siap diambil langsung di Celmira Boutique (Bayen RT 2, Purwomartani, Kalasan, Sleman).";
    }
  } else {
    eventDescription =
      order.delivery.method === "shipping"
        ? `Detail kurir disimpan: ${courierName || "Belum diisi"} · Resi: ${trackingNumber || "Belum diisi"}.`
        : `Catatan pengambilan diperbarui: ${pickupReadyNote || "Siap diambil di butik."}`;
  }

  const nextOrder: SubmittedOrder = {
    ...order,
    updatedAt: timestamp,
    status: nextStatus,
    productionStage: nextStage,
    courierName: order.delivery.method === "shipping" ? courierName || undefined : undefined,
    trackingNumber: order.delivery.method === "shipping" ? trackingNumber || undefined : undefined,
    pickupReadyNote: order.delivery.method === "pickup" ? pickupReadyNote || undefined : undefined,
    shippedAt:
      input.action === "mark_dispatched_or_ready" && order.delivery.method === "shipping"
        ? timestamp
        : order.shippedAt,
    completedAt: input.action === "mark_completed" ? timestamp : order.completedAt,
    history: [
      ...order.history,
      createHistoryEvent(
        {
          actor: "admin",
          category: "pengiriman",
          title: eventTitle,
          description: eventDescription,
          orderStatus: nextStatus,
          productionStage: nextStage,
        },
        now
      ),
    ],
  };

  return { ok: true, order: nextOrder };
}
