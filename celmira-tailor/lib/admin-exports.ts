import {
  ORDER_STATUS_META,
  formatDateOnlyId,
  formatRupiah,
  getLatestPaymentByStage,
  getProductionStageMeta,
  isPaymentVerified,
} from "./order-tracking.ts";
import type { SubmittedOrder } from "@/lib/types/tailor";

export type AdminRevenueSummary = {
  totalActiveQuotedValue: number;
  verifiedDpTotal: number;
  verifiedSettlementTotal: number;
  totalCashReceived: number;
  outstandingReceivable: number;
  paidFullCount: number;
  paidDpOnlyCount: number;
};

export function computeAdminRevenueSummary(orders: SubmittedOrder[]): AdminRevenueSummary {
  let totalActiveQuotedValue = 0;
  let verifiedDpTotal = 0;
  let verifiedSettlementTotal = 0;
  let outstandingReceivable = 0;
  let paidFullCount = 0;
  let paidDpOnlyCount = 0;

  for (const order of orders) {
    if (order.status === "dibatalkan") continue;

    const tailoringFee = order.invoice.tailoringFee ?? 0;
    const shippingFee = order.invoice.shippingFee ?? 0;
    const dpAmount = order.invoice.dpAmount ?? 0;
    const settlementTotal =
      order.invoice.settlementTotalAmount ??
      (tailoringFee > 0 ? tailoringFee - dpAmount + shippingFee : 0);

    if (tailoringFee > 0) {
      totalActiveQuotedValue += tailoringFee;
    }

    const dpVerified = isPaymentVerified(order, "dp");
    const settlementVerified = isPaymentVerified(order, "pelunasan");

    const dpRecord = getLatestPaymentByStage(order, "dp");
    const settlementRecord = getLatestPaymentByStage(order, "pelunasan");

    const receivedDp = dpVerified ? (dpRecord?.totalAmount ?? dpAmount) : 0;
    const receivedSettlement = settlementVerified
      ? (settlementRecord?.totalAmount ?? settlementTotal)
      : 0;

    verifiedDpTotal += receivedDp;
    verifiedSettlementTotal += receivedSettlement;

    if (dpVerified && settlementVerified) {
      paidFullCount += 1;
    } else if (dpVerified) {
      paidDpOnlyCount += 1;
      outstandingReceivable += Math.max(0, settlementTotal);
    } else if (order.invoice.quoteStatus === "disetujui" && tailoringFee > 0) {
      outstandingReceivable += tailoringFee + shippingFee;
    }
  }

  return {
    totalActiveQuotedValue,
    verifiedDpTotal,
    verifiedSettlementTotal,
    totalCashReceived: verifiedDpTotal + verifiedSettlementTotal,
    outstandingReceivable,
    paidFullCount,
    paidDpOnlyCount,
  };
}

/**
 * Mensterilkan nilai sel CSV agar aman dari formula injection di Excel/Sheets
 * dan selalu di-quote dengan benar sesuai RFC 4180.
 */
function escapeCsvCell(raw: string | number | null | undefined): string {
  if (raw === null || raw === undefined) return '""';
  let str = String(raw).replace(/\r?\n/g, " ").trim();
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

export function buildOrdersCsv(orders: SubmittedOrder[]): string {
  const headers = [
    "Kode Pesanan",
    "Tanggal Pesan",
    "Nama Pelanggan",
    "WhatsApp",
    "Email",
    "Kategori",
    "Desain",
    "Status Pesanan",
    "Tahap Produksi",
    "Target Selesai",
    "Estimasi Admin",
    "Metode Serah Terima",
    "Harga Jahit (Rp)",
    "DP 50% (Rp)",
    "Status DP",
    "Ongkir Terpisah (Rp)",
    "Total Pelunasan (Rp)",
    "Status Pelunasan",
    "Kurir",
    "Nomor Resi",
  ];

  const rows = orders.map((order) => {
    const dpVerified = isPaymentVerified(order, "dp");
    const settlementVerified = isPaymentVerified(order, "pelunasan");
    const latestDp = getLatestPaymentByStage(order, "dp");
    const latestSettlement = getLatestPaymentByStage(order, "pelunasan");

    const dpStatus = dpVerified
      ? "Terverifikasi"
      : latestDp?.verificationStatus === "menunggu_verifikasi_admin"
        ? "Menunggu Verifikasi"
        : latestDp?.verificationStatus === "ditolak"
          ? "Ditolak"
          : "Belum Bayar";

    const settlementStatus = settlementVerified
      ? "Lunas Terverifikasi"
      : latestSettlement?.verificationStatus === "menunggu_verifikasi_admin"
        ? "Menunggu Verifikasi"
        : order.invoice.settlementInvoiceNumber
          ? "Menunggu Pelunasan"
          : "Belum Terbit";

    return [
      order.orderCode,
      order.createdAt.slice(0, 10),
      order.customer.fullName,
      order.customer.whatsapp,
      order.customer.email,
      order.categoryName,
      order.designTitle,
      ORDER_STATUS_META[order.status].label,
      getProductionStageMeta(order.productionStage).label,
      order.targetDate,
      order.estimatedCompletionDate ?? "",
      order.delivery.method === "shipping" ? "Kirim Kurir" : "Ambil di Butik",
      order.invoice.tailoringFee ?? "",
      order.invoice.dpAmount ?? "",
      dpStatus,
      order.invoice.shippingFee ?? "",
      order.invoice.settlementTotalAmount ?? "",
      settlementStatus,
      order.courierName ?? "",
      order.trackingNumber ?? "",
    ]
      .map(escapeCsvCell)
      .join(",");
  });

  // Sertakan UTF-8 BOM agar Excel di Windows membaca karakter khusus & Rupiah secara rapi
  return `\uFEFF${[headers.map(escapeCsvCell).join(","), ...rows].join("\r\n")}`;
}

export function normalizePhoneForWaMe(phone: string): string | null {
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.length < 9 || digits.length > 15) return null;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

export function buildOrderWhatsAppUpdateMessage(
  order: SubmittedOrder,
  siteOrigin = "https://celmiraboutique.com"
): string {
  const cleanOrigin = siteOrigin.replace(/\/+$/, "");
  const trackUrl = `${cleanOrigin}/track?code=${encodeURIComponent(order.orderCode)}`;
  const stageMeta = getProductionStageMeta(order.productionStage);
  const greeting = `Halo Kak ${order.customer.fullName}, ini dari tim Celmira Tailor.`;

  let detailLine = `Status terbaru pesanan ${order.orderCode} (${order.categoryName} — ${order.designTitle}): *${ORDER_STATUS_META[order.status].label}* (${stageMeta.label}).`;

  if (order.status === "penawaran_dikirim" && order.invoice.tailoringFee) {
    detailLine = `Penawaran harga akhir untuk pesanan ${order.orderCode} (${order.categoryName} — ${order.designTitle}) sudah siap sebesar *${formatRupiah(order.invoice.tailoringFee)}* (DP 50%: ${formatRupiah(order.invoice.dpAmount)}). Silakan tinjau dan setujui melalui tautan pelacakan.`;
  } else if (order.status === "menunggu_dp" && order.invoice.dpAmount) {
    detailLine = `Invoice DP 50% untuk pesanan ${order.orderCode} sebesar *${formatRupiah(order.invoice.dpAmount)}* telah terbit. Mohon unggah bukti transfer QRIS resmi sebelum batas waktu 24 jam agar pesanan segera masuk jadwal produksi.`;
  } else if (order.status === "dalam_produksi") {
    const est = order.estimatedCompletionDate
      ? ` Estimasi selesai: ${formatDateOnlyId(order.estimatedCompletionDate)}.`
      : "";
    detailLine = `Kabar baik! Pesanan ${order.orderCode} (${order.categoryName}) saat ini berada di tahap *${stageMeta.label}*.${est}`;
  } else if (
    order.status === "selesai_jahit_menunggu_pelunasan" &&
    order.invoice.settlementTotalAmount
  ) {
    const ongkirText =
      order.delivery.method === "shipping" && order.invoice.shippingFee !== null
        ? ` (termasuk ongkir terpisah ${formatRupiah(order.invoice.shippingFee)})`
        : " (ambil di butik, ongkir Rp 0)";
    detailLine = `Busana pesanan ${order.orderCode} telah selesai dijahit dan lulus QC! Total tagihan pelunasan sebesar *${formatRupiah(order.invoice.settlementTotalAmount)}*${ongkirText}. Silakan unggah bukti pelunasan melalui tautan pelacakan.`;
  } else if (order.status === "dalam_pengiriman" && order.trackingNumber) {
    detailLine = `Pesanan ${order.orderCode} sudah dikirim melalui *${order.courierName || "kurir"}* dengan nomor resi *${order.trackingNumber}*.`;
  } else if (order.status === "siap_diambil_atau_dikirim") {
    detailLine =
      order.delivery.method === "pickup"
        ? `Pelunasan pesanan ${order.orderCode} telah diverifikasi. Busana Kakak sudah siap diambil di Official Store Celmira Boutique Yogyakarta.`
        : `Pelunasan pesanan ${order.orderCode} telah diverifikasi. Pesanan sedang dipersiapkan untuk pengiriman.`;
  }

  return [
    greeting,
    "",
    detailLine,
    "",
    `Lacak & detail pesanan: ${trackUrl}`,
    `Kode Akses Tracking: ${order.trackingAccessCode}`,
    "",
    "Terima kasih telah mempercayakan busana custom kepada Celmira Tailor.",
  ].join("\n");
}

export function buildWhatsAppChatUrl(phone: string, message: string): string | null {
  const normalized = normalizePhoneForWaMe(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
