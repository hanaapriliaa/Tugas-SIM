"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import type { AdminOrderActionBody } from "@/app/api/admin/orders/[orderId]/action/route";
import { OrderHistoryLog } from "@/components/track/OrderHistoryLog";
import { StatusBadge } from "@/components/track/StatusBadge";
import { buttonClass } from "@/components/ui/ButtonLink";
import {
  AlertCircleIcon,
  ArrowRight,
  ChatIcon,
  CheckIcon,
  ClockIcon,
  FileTextIcon,
  LockIcon,
  ReceiptIcon,
  SearchIcon,
  ShieldIcon,
  TrashIcon,
  TruckIcon,
  UploadIcon,
} from "@/components/ui/icons";
import { formatFileSize } from "@/lib/attachments";
import { validateAttachmentFile } from "@/lib/booking-validation";
import { startChatRealtime } from "@/lib/chat-realtime";
import {
  ORDER_STATUS_META,
  PRODUCTION_STAGES,
  canAdvanceToFulfillment,
  canStartProduction,
  createDefaultAdminPaymentConfig,
  formatDateOnlyId,
  formatDateTimeId,
  formatRupiah,
  getDpDeadlineState,
  getLatestPaymentByStage,
  getPaymentSummaryBadge,
  getProductionStageIndex,
  getProductionStageMeta,
  isPaymentVerified,
} from "@/lib/order-tracking";
import {
  deleteAdminQrisApi,
  fetchAdminOrdersApi,
  runAdminOrderActionApi,
  updateAdminPaymentConfigApi,
  uploadAdminQrisApi,
} from "@/lib/orders-client";
import type {
  AdminPaymentConfig,
  PaymentRecord,
  PaymentStage,
  ProductionStage,
  SubmittedOrder,
} from "@/lib/types/tailor";

type OrderFilter = "all" | "needs_quote" | "needs_verify" | "production" | "attention" | "closed";

function matchesFilter(order: SubmittedOrder, filter: OrderFilter): boolean {
  if (filter === "all") return true;
  if (filter === "needs_quote") {
    return order.status === "menunggu_penawaran" || order.status === "penawaran_ditolak";
  }
  if (filter === "needs_verify") {
    return (
      order.status === "menunggu_verifikasi_dp" ||
      order.status === "menunggu_verifikasi_pelunasan"
    );
  }
  if (filter === "production") {
    return (
      order.status === "dalam_produksi" ||
      order.status === "selesai_jahit_menunggu_pelunasan" ||
      order.status === "siap_diambil_atau_dikirim" ||
      order.status === "dalam_pengiriman"
    );
  }
  if (filter === "attention") {
    const deadline = getDpDeadlineState(order);
    return order.status === "perlu_tinjauan_admin" || deadline.requiresAdminReview;
  }
  return order.status === "selesai" || order.status === "dibatalkan";
}

function parseRupiahInput(raw: string): number {
  const digitsOnly = raw.replace(/[^0-9]/g, "");
  if (!digitsOnly) return NaN;
  return Number(digitsOnly);
}

type AdminOrderManagementProps = {
  focusedOrderCode?: string | null;
  onOpenOrderChat?: (orderCode: string) => void;
};

export function AdminOrderManagement({
  focusedOrderCode,
  onOpenOrderChat,
}: AdminOrderManagementProps = {}) {
  const [orders, setOrders] = useState<SubmittedOrder[]>([]);
  const [paymentConfig, setPaymentConfig] = useState<AdminPaymentConfig>(
    createDefaultAdminPaymentConfig
  );
  const [hydrated, setHydrated] = useState(false);

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [filter, setFilter] = useState<OrderFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showQrisPanel, setShowQrisPanel] = useState(false);

  // Feedback state
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isActionBusy, setIsActionBusy] = useState(false);

  // QRIS form state
  const [merchantNameInput, setMerchantNameInput] = useState("");
  const [instructionsInput, setInstructionsInput] = useState("");
  const [dpHoursInput, setDpHoursInput] = useState("24");
  const [qrisError, setQrisError] = useState<string | null>(null);
  const [isQrisBusy, setIsQrisBusy] = useState(false);

  // Selected order action forms
  const [tailoringFeeInput, setTailoringFeeInput] = useState("");
  const [quoteShippingInput, setQuoteShippingInput] = useState("");
  const [quoteEstimateInput, setQuoteEstimateInput] = useState("");
  const [quoteNoteInput, setQuoteNoteInput] = useState("");

  const [dpVerifyNote, setDpVerifyNote] = useState("");
  const [settlementVerifyNote, setSettlementVerifyNote] = useState("");
  const [cancelReasonInput, setCancelReasonInput] = useState("");

  const [selectedStage, setSelectedStage] = useState<ProductionStage>("menunggu_produksi");
  const [stageNoteInput, setStageNoteInput] = useState("");
  const [estimateUpdateInput, setEstimateUpdateInput] = useState("");

  const [settlementShippingInput, setSettlementShippingInput] = useState("");
  const [settlementNoteInput, setSettlementNoteInput] = useState("");

  const [courierNameInput, setCourierNameInput] = useState("");
  const [trackingNumberInput, setTrackingNumberInput] = useState("");
  const [pickupNoteInput, setPickupNoteInput] = useState("");

  const refreshFromServer = useCallback(async (syncConfigInputs = false) => {
    try {
      const data = await fetchAdminOrdersApi();
      setOrders(data.orders);
      setPaymentConfig(data.paymentConfig);
      if (syncConfigInputs) {
        setMerchantNameInput(data.paymentConfig.qrisMerchantName ?? "");
        setInstructionsInput(data.paymentConfig.paymentInstructions);
        setDpHoursInput(String(data.paymentConfig.dpWindowHours));
      }
      setSelectedOrderId((prev) => {
        if (prev && data.orders.some((item) => item.id === prev)) return prev;
        return data.orders[0]?.id ?? null;
      });
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Gagal memuat daftar pesanan dari server."
      );
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    void refreshFromServer(true);

    return startChatRealtime({
      role: "admin",
      enabled: true,
      onEvent: (event) => {
        if (event.type === "order:updated") {
          void refreshFromServer(false);
        }
      },
      onSyncNeeded: () => refreshFromServer(false),
    });
  }, [refreshFromServer]);

  useEffect(() => {
    if (!focusedOrderCode) return;
    const matched = orders.find((item) => item.orderCode === focusedOrderCode);
    if (matched) {
      setSelectedOrderId(matched.id);
      setFilter("all");
    }
  }, [focusedOrderCode, orders]);

  const selectedOrder = useMemo(
    () => orders.find((item) => item.id === selectedOrderId) ?? null,
    [orders, selectedOrderId]
  );

  // Sinkronkan nilai form setiap kali admin memilih pesanan berbeda
  useEffect(() => {
    if (!selectedOrder) return;
    setTailoringFeeInput(
      selectedOrder.invoice.tailoringFee !== null ? String(selectedOrder.invoice.tailoringFee) : ""
    );
    setQuoteShippingInput(
      selectedOrder.delivery.method === "pickup"
        ? "0"
        : selectedOrder.invoice.shippingFee !== null
          ? String(selectedOrder.invoice.shippingFee)
          : ""
    );
    setQuoteEstimateInput(selectedOrder.estimatedCompletionDate ?? selectedOrder.targetDate ?? "");
    setQuoteNoteInput(selectedOrder.invoice.quoteNote ?? "");
    setSelectedStage(selectedOrder.productionStage);
    setEstimateUpdateInput(selectedOrder.estimatedCompletionDate ?? "");
    setSettlementShippingInput(
      selectedOrder.delivery.method === "pickup"
        ? "0"
        : selectedOrder.invoice.shippingFee !== null
          ? String(selectedOrder.invoice.shippingFee)
          : ""
    );
    setCourierNameInput(selectedOrder.courierName ?? "");
    setTrackingNumberInput(selectedOrder.trackingNumber ?? "");
    setPickupNoteInput(selectedOrder.pickupReadyNote ?? "");
    setDpVerifyNote("");
    setSettlementVerifyNote("");
    setCancelReasonInput("");
    setStageNoteInput("");
    setSettlementNoteInput("");
  }, [selectedOrder?.id, selectedOrder?.updatedAt]);

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orders.filter((order) => {
      if (!matchesFilter(order, filter)) return false;
      if (!q) return true;
      return (
        order.orderCode.toLowerCase().includes(q) ||
        order.customer.fullName.toLowerCase().includes(q) ||
        order.categoryName.toLowerCase().includes(q) ||
        order.designTitle.toLowerCase().includes(q)
      );
    });
  }, [orders, filter, searchQuery]);

  const kpis = useMemo(() => {
    const needsQuote = orders.filter(
      (item) => item.status === "menunggu_penawaran" || item.status === "penawaran_ditolak"
    ).length;
    const needsVerify = orders.filter(
      (item) =>
        item.status === "menunggu_verifikasi_dp" ||
        item.status === "menunggu_verifikasi_pelunasan"
    ).length;
    const inProduction = orders.filter(
      (item) => item.status === "dalam_produksi"
    ).length;
    const needsAttention = orders.filter(
      (item) => item.status === "perlu_tinjauan_admin" || getDpDeadlineState(item).requiresAdminReview
    ).length;

    return {
      total: orders.length,
      needsQuote,
      needsVerify,
      inProduction,
      needsAttention,
    };
  }, [orders]);

  const executeAdminAction = async (
    orderId: string,
    payload: AdminOrderActionBody,
    successMessage: string
  ) => {
    setFeedback(null);
    setErrorMessage(null);
    setIsActionBusy(true);
    try {
      const { order: saved } = await runAdminOrderActionApi(orderId, payload);
      setOrders((prev) => prev.map((item) => (item.id === saved.id ? saved : item)));
      setSelectedOrderId(saved.id);
      setFeedback(successMessage);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Gagal memproses aksi pesanan di server."
      );
    } finally {
      setIsActionBusy(false);
    }
  };

  const handleQrisUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setQrisError("QRIS resmi harus berupa gambar (JPG, PNG, atau WEBP).");
      return;
    }
    const validationErr = validateAttachmentFile(file);
    if (validationErr) {
      setQrisError(validationErr);
      return;
    }

    setQrisError(null);
    setIsQrisBusy(true);
    try {
      const { paymentConfig: updated } = await uploadAdminQrisApi(
        file,
        merchantNameInput.trim() || undefined
      );
      setPaymentConfig(updated);
      setFeedback("QRIS resmi berhasil diunggah ke penyimpanan server dan aktif pada invoice pelanggan.");
    } catch (err) {
      setQrisError(
        err instanceof Error ? err.message : "Gagal mengunggah gambar QRIS ke server."
      );
    } finally {
      setIsQrisBusy(false);
    }
  };

  const handleSavePaymentSettings = async () => {
    setQrisError(null);
    setIsQrisBusy(true);
    try {
      const hours = Math.max(1, Math.min(168, Number(dpHoursInput) || 24));
      const { paymentConfig: updated } = await updateAdminPaymentConfigApi({
        qrisMerchantName: merchantNameInput.trim() || null,
        paymentInstructions:
          instructionsInput.trim() || createDefaultAdminPaymentConfig().paymentInstructions,
        dpWindowHours: hours,
      });
      setPaymentConfig(updated);
      setDpHoursInput(String(updated.dpWindowHours));
      setFeedback("Pengaturan pembayaran resmi telah disimpan di server.");
    } catch (err) {
      setQrisError(
        err instanceof Error ? err.message : "Gagal menyimpan pengaturan pembayaran."
      );
    } finally {
      setIsQrisBusy(false);
    }
  };

  const handleClearQris = async () => {
    setQrisError(null);
    setIsQrisBusy(true);
    try {
      const { paymentConfig: updated } = await deleteAdminQrisApi();
      setPaymentConfig(updated);
      setFeedback("QRIS dihapus dari server. Halaman invoice pelanggan kini menampilkan status belum tersedia.");
    } catch (err) {
      setQrisError(err instanceof Error ? err.message : "Gagal menghapus QRIS.");
    } finally {
      setIsQrisBusy(false);
    }
  };

  const renderPaymentVerificationCard = (
    order: SubmittedOrder,
    stage: PaymentStage,
    record: PaymentRecord | undefined,
    noteValue: string,
    onNoteChange: (val: string) => void
  ) => {
    const title = stage === "dp" ? "Verifikasi Pembayaran DP (50%)" : "Verifikasi Pelunasan";
    const isVerified = isPaymentVerified(order, stage);

    return (
      <div className="rounded-2xl border border-cocoa/14 bg-ivory p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cocoa">{title}</p>
          <StatusBadge
            label={
              isVerified
                ? "Terverifikasi"
                : record?.verificationStatus === "menunggu_verifikasi_admin"
                  ? "Menunggu Verifikasi"
                  : record?.verificationStatus === "ditolak"
                    ? "Ditolak"
                    : "Belum Unggah"
            }
            tone={
              isVerified
                ? "success"
                : record?.verificationStatus === "menunggu_verifikasi_admin"
                  ? "info"
                  : record?.verificationStatus === "ditolak"
                    ? "danger"
                    : "neutral"
            }
          />
        </div>

        {!record || !record.proofFileName ? (
          <p className="mt-2.5 text-xs text-muted">
            Pelanggan belum mengunggah bukti pembayaran untuk tahap ini.
          </p>
        ) : (
          <div className="mt-3 space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cocoa/10 bg-cream/45 px-3 py-2">
              <span className="flex items-center gap-1.5 font-medium text-espresso">
                <FileTextIcon className="h-3.5 w-3.5 text-cocoa" />
                {record.proofFileName}
                {record.proofSize ? ` (${formatFileSize(record.proofSize)})` : ""}
              </span>
              <span className="text-muted">
                Tagihan: <strong className="text-espresso">{formatRupiah(record.totalAmount)}</strong>
              </span>
            </div>

            {record.proofUploadedAt ? (
              <p className="text-muted">Diunggah: {formatDateTimeId(record.proofUploadedAt)}</p>
            ) : null}

            {record.customerNote ? (
              <p className="text-muted">
                <strong className="text-espresso">Catatan pelanggan:</strong> {record.customerNote}
              </p>
            ) : null}

            {record.proofPreviewDataUrl ? (
              record.proofMimeType === "application/pdf" ? (
                <div>
                  <a
                    className="inline-flex items-center gap-1.5 rounded-full border border-cocoa/25 bg-cream/60 px-3.5 py-1.5 font-medium text-espresso transition-colors hover:border-espresso"
                    href={record.proofPreviewDataUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <FileTextIcon className="h-3.5 w-3.5 text-cocoa" />
                    Buka Dokumen PDF Bukti Bayar
                  </a>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-cocoa/12 bg-cream/30 p-2">
                  <img
                    alt={`Bukti ${stage} ${record.proofFileName}`}
                    className="mx-auto max-h-44 rounded-lg object-contain"
                    src={record.proofPreviewDataUrl}
                  />
                </div>
              )
            ) : null}

            {record.verificationStatus === "menunggu_verifikasi_admin" ? (
              <div className="space-y-2.5 pt-1">
                <input
                  className="w-full rounded-xl border border-cocoa/20 bg-ivory px-3 py-2 text-xs text-espresso placeholder:text-muted/65 focus:border-cocoa focus:outline-none"
                  onChange={(event) => onNoteChange(event.target.value)}
                  placeholder="Catatan verifikasi (wajib diisi jika menolak bukti)"
                  type="text"
                  value={noteValue}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    className="inline-flex items-center gap-1.5 rounded-full bg-espresso px-4 py-2 text-xs font-medium text-ivory transition-colors hover:bg-cocoa disabled:opacity-60"
                    disabled={isActionBusy}
                    onClick={() =>
                      void executeAdminAction(
                        order.id,
                        {
                          action: "verify_payment",
                          stage,
                          decision: "approve",
                          adminNote: noteValue,
                        },
                        stage === "dp"
                          ? "DP 50% terverifikasi. Pesanan kini dapat masuk tahap produksi."
                          : "Pelunasan terverifikasi. Pesanan kini siap dikirim atau diambil."
                      )
                    }
                    type="button"
                  >
                    <CheckIcon className="h-3.5 w-3.5" />
                    Verifikasi Pembayaran
                  </button>
                  <button
                    className="rounded-full border border-red-800/30 bg-red-50 px-4 py-2 text-xs font-medium text-red-900 transition-colors hover:bg-red-100 disabled:opacity-60"
                    disabled={isActionBusy}
                    onClick={() =>
                      void executeAdminAction(
                        order.id,
                        {
                          action: "verify_payment",
                          stage,
                          decision: "reject",
                          adminNote: noteValue,
                        },
                        `Bukti ${stage === "dp" ? "DP" : "pelunasan"} ditolak dan pelanggan diminta mengunggah ulang.`
                      )
                    }
                    type="button"
                  >
                    Tolak Bukti
                  </button>
                </div>
              </div>
            ) : record.verifiedAt ? (
              <p className="text-muted">
                Diputuskan admin pada {formatDateTimeId(record.verifiedAt)}
                {record.adminNote ? ` · ${record.adminNote}` : ""}
              </p>
            ) : null}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="shell py-10 sm:py-14">
      {/* Header & Peringatan Keamanan Jujur */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.24em] text-cocoa">
              Pengelolaan Pesanan &amp; Invoice
            </p>
            <span className="rounded-full border border-cocoa/25 bg-cream px-3 py-0.5 text-[0.625rem] font-medium uppercase tracking-[0.14em] text-cocoa">
              Backend Server Aktif (Cloudflare D1 &amp; R2)
            </span>
          </div>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-espresso sm:text-4xl">
            Panel Admin Celmira Tailor
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Tinjau pengajuan pesanan masuk, tetapkan harga akhir &amp; ongkos kirim, verifikasi
            pembayaran DP/pelunasan secara manual, dan perbarui 10 tahap produksi secara terukur.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            className={buttonClass("outline")}
            onClick={() => setShowQrisPanel((prev) => !prev)}
            type="button"
          >
            <ReceiptIcon className="h-4 w-4" />
            {showQrisPanel ? "Tutup Pengaturan QRIS" : "Pengaturan QRIS Resmi"}
          </button>
          <Link className={buttonClass("solid")} href="/track">
            Buka Halaman Lacak
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Info Status Backend */}
      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-cocoa/18 bg-cream/60 p-4 text-xs leading-relaxed text-muted">
        <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-cocoa" />
        <p>
          <strong className="font-semibold text-espresso">Terhubung ke Server Database:</strong>{" "}
          Seluruh pesanan, penawaran, verifikasi bukti bayar, QRIS resmi, dan progres produksi
          disimpan di Cloudflare D1 &amp; R2 privat dengan autentikasi sesi admin server dan
          sinkronisasi real-time.
        </p>
      </div>

      {/* Pengaturan QRIS Resmi (Opsional, dikelola admin, tanpa QRIS palsu) */}
      {showQrisPanel ? (
        <section className="mt-6 rounded-[1.75rem] border border-cocoa/18 bg-cream/55 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-cocoa/12 pb-4">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-xl text-espresso">
                Konfigurasi QRIS &amp; Pembayaran Resmi
              </h2>
              <p className="mt-1 text-xs text-muted">
                Unggah gambar QRIS resmi milik Celmira Boutique. Jika belum diunggah, invoice
                pelanggan menampilkan status &ldquo;QRIS resmi belum tersedia&rdquo;.
              </p>
            </div>
            <StatusBadge
              label={paymentConfig.qrisImageDataUrl ? "QRIS Resmi Aktif" : "QRIS Belum Tersedia"}
              tone={paymentConfig.qrisImageDataUrl ? "success" : "warning"}
            />
          </div>

          <div className="mt-5 grid gap-6 lg:grid-cols-12">
            <div className="space-y-3 lg:col-span-5">
              {paymentConfig.qrisImageDataUrl ? (
                <div className="rounded-2xl border border-cocoa/15 bg-ivory p-4 text-center">
                  <img
                    alt="QRIS resmi Celmira Boutique"
                    className="mx-auto max-h-56 rounded-xl object-contain"
                    src={paymentConfig.qrisImageDataUrl}
                  />
                  <p className="mt-2 text-xs text-muted">
                    {paymentConfig.qrisFileName || "QRIS Resmi"} · Diperbarui{" "}
                    {formatDateTimeId(paymentConfig.qrisUpdatedAt)}
                  </p>
                  <button
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-red-800/25 bg-red-50 px-3.5 py-1.5 text-xs font-medium text-red-900 hover:bg-red-100 disabled:opacity-60"
                    disabled={isQrisBusy}
                    onClick={() => void handleClearQris()}
                    type="button"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                    Hapus QRIS
                  </button>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-cocoa/30 bg-ivory p-6 text-center text-xs text-muted">
                  Belum ada gambar QRIS resmi yang diunggah admin.
                </div>
              )}

              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-full border border-cocoa/25 bg-ivory px-4 py-2.5 text-xs font-medium text-espresso transition-colors hover:border-espresso">
                <UploadIcon className="h-4 w-4 text-cocoa" />
                Unggah / Ganti Gambar QRIS Resmi
                <input
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={handleQrisUpload}
                  type="file"
                />
              </label>

              {qrisError ? <p className="text-xs font-medium text-red-800">{qrisError}</p> : null}
            </div>

            <div className="space-y-4 lg:col-span-7">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    className="block text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-cocoa"
                    htmlFor="admin-merchant-name"
                  >
                    Nama Merchant Resmi QRIS
                  </label>
                  <input
                    className="mt-1.5 w-full rounded-xl border border-cocoa/20 bg-ivory px-3.5 py-2.5 text-sm text-espresso focus:border-cocoa focus:outline-none"
                    id="admin-merchant-name"
                    onChange={(event) => setMerchantNameInput(event.target.value)}
                    placeholder="Contoh: Celmira Boutique Yogyakarta"
                    type="text"
                    value={merchantNameInput}
                  />
                </div>
                <div>
                  <label
                    className="block text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-cocoa"
                    htmlFor="admin-dp-hours"
                  >
                    Batas Waktu Pembayaran DP (Jam)
                  </label>
                  <input
                    className="mt-1.5 w-full rounded-xl border border-cocoa/20 bg-ivory px-3.5 py-2.5 text-sm text-espresso focus:border-cocoa focus:outline-none"
                    id="admin-dp-hours"
                    max={168}
                    min={1}
                    onChange={(event) => setDpHoursInput(event.target.value)}
                    type="number"
                    value={dpHoursInput}
                  />
                </div>
              </div>

              <div>
                <label
                  className="block text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-cocoa"
                  htmlFor="admin-payment-instructions"
                >
                  Instruksi Pembayaran untuk Pelanggan
                </label>
                <textarea
                  className="mt-1.5 w-full rounded-xl border border-cocoa/20 bg-ivory px-3.5 py-2.5 text-sm text-espresso focus:border-cocoa focus:outline-none"
                  id="admin-payment-instructions"
                  onChange={(event) => setInstructionsInput(event.target.value)}
                  rows={3}
                  value={instructionsInput}
                />
              </div>

              <div className="flex justify-end">
                <button
                  className={buttonClass("solid")}
                  disabled={isQrisBusy}
                  onClick={() => void handleSavePaymentSettings()}
                  type="button"
                >
                  {isQrisBusy ? "Menyimpan..." : "Simpan Pengaturan Pembayaran"}
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Ringkasan KPI */}
      <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-cocoa/14 bg-cream/55 p-4">
          <p className="text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-cocoa">
            Total Pesanan Masuk
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl text-espresso">
            {hydrated ? kpis.total : "—"}
          </p>
          <p className="mt-0.5 text-[0.6875rem] text-muted">
            {kpis.needsQuote} menunggu penawaran harga
          </p>
        </div>

        <div className="rounded-2xl border border-cocoa/14 bg-cream/55 p-4">
          <p className="text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-cocoa">
            Menunggu Verifikasi Bayar
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl text-espresso">
            {hydrated ? kpis.needsVerify : "—"}
          </p>
          <p className="mt-0.5 text-[0.6875rem] text-muted">Bukti DP &amp; pelunasan masuk</p>
        </div>

        <div className="rounded-2xl border border-cocoa/14 bg-cream/55 p-4">
          <p className="text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-cocoa">
            Sedang Diproduksi
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl text-espresso">
            {hydrated ? kpis.inProduction : "—"}
          </p>
          <p className="mt-0.5 text-[0.6875rem] text-muted">DP sudah diverifikasi admin</p>
        </div>

        <div className="rounded-2xl border border-cocoa/14 bg-cream/55 p-4">
          <p className="text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-cocoa">
            Perlu Tinjauan Tenggat
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl text-espresso">
            {hydrated ? kpis.needsAttention : "—"}
          </p>
          <p className="mt-0.5 text-[0.6875rem] text-muted">DP lewat 24 jam tanpa bukti</p>
        </div>
      </div>

      {/* Feedback global */}
      {feedback ? (
        <div className="mt-5 rounded-2xl border border-emerald-800/20 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-900">
          {feedback}
        </div>
      ) : null}
      {errorMessage ? (
        <div className="mt-5 rounded-2xl border border-red-800/20 bg-red-50 px-4 py-3 text-xs font-medium text-red-900">
          {errorMessage}
        </div>
      ) : null}

      {/* Layout Utama: Daftar Pesanan + Panel Pengelolaan Detail */}
      <div className="mt-7 grid gap-7 lg:grid-cols-12">
        {/* Sidebar Daftar Pesanan */}
        <aside className="space-y-4 lg:col-span-4">
          <div className="rounded-[1.75rem] border border-cocoa/14 bg-cream/45 p-5">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                className="w-full rounded-full border border-cocoa/20 bg-ivory py-2.5 pl-10 pr-4 text-xs text-espresso placeholder:text-muted/65 focus:border-cocoa focus:outline-none"
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Cari kode pesanan, pelanggan, kategori..."
                type="text"
                value={searchQuery}
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {(
                [
                  { id: "all", label: "Semua" },
                  { id: "needs_quote", label: "Penawaran" },
                  { id: "needs_verify", label: "Verifikasi" },
                  { id: "production", label: "Produksi" },
                  { id: "attention", label: "Tinjauan" },
                  { id: "closed", label: "Selesai/Batal" },
                ] as const
              ).map((tab) => (
                <button
                  className={`rounded-full px-3 py-1 text-[0.6875rem] font-medium transition-colors ${
                    filter === tab.id
                      ? "bg-espresso text-ivory"
                      : "border border-cocoa/15 bg-ivory text-muted hover:text-espresso"
                  }`}
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {!hydrated ? (
              <p className="mt-5 text-xs text-muted">Memuat pesanan...</p>
            ) : filteredOrders.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-cocoa/12 bg-ivory p-5 text-center text-xs leading-relaxed text-muted">
                <p className="font-medium text-espresso">Belum ada pesanan yang sesuai.</p>
                <p className="mt-1">
                  Pesanan yang diajukan melalui halaman Booking Flow akan otomatis muncul di sini.
                </p>
                <Link className="link-underline mt-3" href="/orders">
                  Buka Booking Flow
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              <ul className="mt-4 max-h-[680px] space-y-2.5 overflow-y-auto pr-1">
                {filteredOrders.map((order) => {
                  const statusMeta = ORDER_STATUS_META[order.status];
                  const isSelected = order.id === selectedOrderId;
                  return (
                    <li key={order.id}>
                      <button
                        className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                          isSelected
                            ? "border-espresso/45 bg-ivory shadow-sm"
                            : "border-cocoa/12 bg-ivory/70 hover:border-cocoa/35 hover:bg-ivory"
                        }`}
                        onClick={() => {
                          setSelectedOrderId(order.id);
                          setFeedback(null);
                          setErrorMessage(null);
                        }}
                        type="button"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-mono text-xs font-semibold text-espresso">
                            {order.orderCode}
                          </span>
                          <StatusBadge label={statusMeta.label} tone={statusMeta.tone} />
                        </div>
                        <p className="mt-2 truncate text-sm font-medium text-espresso">
                          {order.designTitle}
                        </p>
                        <p className="mt-0.5 text-xs text-muted">
                          {order.customer.fullName} · {order.categoryName}
                        </p>
                        <div className="mt-2 flex items-center justify-between text-[0.6875rem] text-muted">
                          <span>{getProductionStageMeta(order.productionStage).shortLabel}</span>
                          <span>{formatRupiah(order.invoice.tailoringFee)}</span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* Detail & Aksi Pengelolaan Pesanan Terpilih */}
        <div className="space-y-6 lg:col-span-8">
          {!selectedOrder ? (
            <div className="rounded-[1.75rem] border border-cocoa/14 bg-cream/40 p-8 text-center">
              <h2 className="font-[family-name:var(--font-display)] text-2xl text-espresso">
                Pilih pesanan untuk dikelola
              </h2>
              <p className="mt-2 text-sm text-muted">
                Klik salah satu pesanan pada daftar di samping, atau ajukan pesanan baru di{" "}
                <Link className="underline" href="/orders">
                  /orders
                </Link>{" "}
                untuk menguji alur penawaran, pembayaran DP/pelunasan, dan tracking.
              </p>
            </div>
          ) : (
            <>
              {/* 1. Ringkasan Pesanan Masuk */}
              <section className="rounded-[1.75rem] border border-cocoa/16 bg-cream/55 p-6">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-cocoa/12 pb-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-cocoa">
                        {selectedOrder.orderCode}
                      </span>
                      <span className="rounded-full border border-cocoa/20 bg-ivory px-2.5 py-0.5 font-mono text-[0.6875rem] text-espresso">
                        Akses: {selectedOrder.trackingAccessCode}
                      </span>
                    </div>
                    <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl text-espresso">
                      {selectedOrder.designTitle}
                    </h2>
                    <p className="mt-0.5 text-xs text-muted">
                      {selectedOrder.categoryName} · Dipesan{" "}
                      {formatDateTimeId(selectedOrder.createdAt)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge
                      label={ORDER_STATUS_META[selectedOrder.status].label}
                      tone={ORDER_STATUS_META[selectedOrder.status].tone}
                    />
                    <StatusBadge
                      label={getPaymentSummaryBadge(selectedOrder).label}
                      tone={getPaymentSummaryBadge(selectedOrder).tone}
                    />
                    {onOpenOrderChat ? (
                      <button
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-cocoa/25 bg-ivory px-3 py-1 text-[0.6875rem] font-medium text-espresso transition-colors hover:border-espresso"
                        onClick={() => onOpenOrderChat(selectedOrder.orderCode)}
                        type="button"
                      >
                        <ChatIcon className="h-3.5 w-3.5" />
                        Buka Chat Pesanan
                      </button>
                    ) : null}
                  </div>
                </div>

                <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-xl border border-cocoa/10 bg-ivory p-3.5">
                    <dt className="uppercase tracking-[0.12em] text-muted">Pelanggan</dt>
                    <dd className="mt-1 font-medium text-espresso">
                      {selectedOrder.customer.fullName}
                    </dd>
                    <dd className="text-muted">{selectedOrder.customer.whatsapp}</dd>
                    {selectedOrder.customer.email ? (
                      <dd className="text-muted">{selectedOrder.customer.email}</dd>
                    ) : null}
                  </div>

                  <div className="rounded-xl border border-cocoa/10 bg-ivory p-3.5">
                    <dt className="uppercase tracking-[0.12em] text-muted">Serah Terima</dt>
                    <dd className="mt-1 font-medium text-espresso">
                      {selectedOrder.delivery.method === "shipping"
                        ? "Kirim via Kurir"
                        : "Ambil Sendiri di Butik"}
                    </dd>
                    <dd className="text-muted">
                      {selectedOrder.delivery.method === "shipping"
                        ? `${selectedOrder.delivery.addressLine}, ${selectedOrder.delivery.city}`
                        : "Biaya pengiriman: Rp 0"}
                    </dd>
                  </div>

                  <div className="rounded-xl border border-cocoa/10 bg-ivory p-3.5">
                    <dt className="uppercase tracking-[0.12em] text-muted">Spesifikasi &amp; Target</dt>
                    <dd className="mt-1 font-medium text-espresso">
                      {selectedOrder.specifications.fabric} ·{" "}
                      {selectedOrder.specifications.colorName}
                    </dd>
                    <dd className="text-muted">
                      Target pelanggan: {formatDateOnlyId(selectedOrder.targetDate)}
                    </dd>
                  </div>
                </dl>
              </section>

              {/* 2. Penawaran Harga Akhir */}
              <section className="rounded-[1.75rem] border border-cocoa/14 bg-cream/40 p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-cocoa">
                      Langkah Admin 1
                    </p>
                    <h3 className="mt-1 font-[family-name:var(--font-display)] text-xl text-espresso">
                      Harga Akhir &amp; Kirim Penawaran
                    </h3>
                  </div>
                  <StatusBadge
                    label={`Penawaran: ${selectedOrder.invoice.quoteStatus.replace(/_/g, " ")}`}
                    tone={selectedOrder.invoice.quoteStatus === "disetujui" ? "success" : "info"}
                  />
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      className="block text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-cocoa"
                      htmlFor="admin-tailoring-fee"
                    >
                      Harga Akhir Biaya Jahit (Rp)
                    </label>
                    <input
                      className="mt-1 w-full rounded-xl border border-cocoa/20 bg-ivory px-3.5 py-2.5 text-sm text-espresso focus:border-cocoa focus:outline-none"
                      disabled={isPaymentVerified(selectedOrder, "dp")}
                      id="admin-tailoring-fee"
                      onChange={(event) => setTailoringFeeInput(event.target.value)}
                      placeholder="Contoh: 650000"
                      type="text"
                      value={tailoringFeeInput}
                    />
                    <p className="mt-1 text-[0.6875rem] text-muted">
                      DP 50% dihitung otomatis:{" "}
                      {Number.isFinite(parseRupiahInput(tailoringFeeInput))
                        ? formatRupiah(Math.ceil(parseRupiahInput(tailoringFeeInput) / 2))
                        : "—"}
                    </p>
                  </div>

                  <div>
                    <label
                      className="block text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-cocoa"
                      htmlFor="admin-quote-shipping"
                    >
                      Biaya Pengiriman Terpisah (Rp)
                    </label>
                    <input
                      className="mt-1 w-full rounded-xl border border-cocoa/20 bg-ivory px-3.5 py-2.5 text-sm text-espresso disabled:bg-sand/40 focus:border-cocoa focus:outline-none"
                      disabled={
                        selectedOrder.delivery.method === "pickup" ||
                        isPaymentVerified(selectedOrder, "dp")
                      }
                      id="admin-quote-shipping"
                      onChange={(event) => setQuoteShippingInput(event.target.value)}
                      placeholder={
                        selectedOrder.delivery.method === "pickup"
                          ? "0 (Ambil sendiri di butik)"
                          : "Opsional saat penawaran, final saat pelunasan"
                      }
                      type="text"
                      value={quoteShippingInput}
                    />
                  </div>

                  <div>
                    <label
                      className="block text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-cocoa"
                      htmlFor="admin-quote-estimate"
                    >
                      Estimasi Tanggal Penyelesaian
                    </label>
                    <input
                      className="mt-1 w-full rounded-xl border border-cocoa/20 bg-ivory px-3.5 py-2.5 text-sm text-espresso focus:border-cocoa focus:outline-none"
                      id="admin-quote-estimate"
                      onChange={(event) => setQuoteEstimateInput(event.target.value)}
                      type="date"
                      value={quoteEstimateInput}
                    />
                  </div>

                  <div>
                    <label
                      className="block text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-cocoa"
                      htmlFor="admin-quote-note"
                    >
                      Catatan Penawaran (Opsional)
                    </label>
                    <input
                      className="mt-1 w-full rounded-xl border border-cocoa/20 bg-ivory px-3.5 py-2.5 text-sm text-espresso focus:border-cocoa focus:outline-none"
                      id="admin-quote-note"
                      onChange={(event) => setQuoteNoteInput(event.target.value)}
                      placeholder="Contoh: Termasuk furing & payet bagian kerah"
                      type="text"
                      value={quoteNoteInput}
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <button
                    className="rounded-full border border-cocoa/25 bg-ivory px-4 py-2 text-xs font-medium text-espresso hover:border-espresso disabled:opacity-60"
                    disabled={isActionBusy}
                    onClick={() =>
                      void executeAdminAction(
                        selectedOrder.id,
                        {
                          action: "update_estimated_completion",
                          estimatedCompletionDate: quoteEstimateInput,
                        },
                        "Estimasi tanggal penyelesaian telah diperbarui."
                      )
                    }
                    type="button"
                  >
                    Simpan Estimasi Saja
                  </button>
                  <button
                    className={buttonClass("solid")}
                    disabled={
                      isActionBusy ||
                      isPaymentVerified(selectedOrder, "dp") ||
                      selectedOrder.status === "dibatalkan"
                    }
                    onClick={() =>
                      void executeAdminAction(
                        selectedOrder.id,
                        {
                          action: "send_quote",
                          tailoringFee: parseRupiahInput(tailoringFeeInput),
                          shippingFee:
                            selectedOrder.delivery.method === "pickup"
                              ? 0
                              : quoteShippingInput.trim()
                                ? parseRupiahInput(quoteShippingInput)
                                : null,
                          estimatedCompletionDate: quoteEstimateInput,
                          quoteNote: quoteNoteInput,
                        },
                        "Penawaran harga akhir telah dikirim kepada pelanggan."
                      )
                    }
                    type="button"
                  >
                    Kirim Penawaran ke Pelanggan
                  </button>
                </div>
              </section>

              {/* 3. Verifikasi Pembayaran & Aturan Tenggat 24 Jam */}
              <section className="space-y-4 rounded-[1.75rem] border border-cocoa/14 bg-cream/40 p-6">
                <div>
                  <p className="text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-cocoa">
                    Langkah Admin 2
                  </p>
                  <h3 className="mt-1 font-[family-name:var(--font-display)] text-xl text-espresso">
                    Verifikasi Bukti Pembayaran &amp; Kontrol Batas 24 Jam
                  </h3>
                </div>

                {/* Status batas waktu 24 jam DP */}
                {selectedOrder.invoice.quoteStatus === "disetujui" &&
                !isPaymentVerified(selectedOrder, "dp") &&
                selectedOrder.status !== "dibatalkan" ? (
                  <div className="rounded-2xl border border-cocoa/14 bg-ivory p-4 text-xs">
                    <div className="flex items-start gap-2.5">
                      {getDpDeadlineState(selectedOrder).protectedByProofUpload ? (
                        <ShieldIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-800" />
                      ) : (
                        <ClockIcon className="mt-0.5 h-4 w-4 shrink-0 text-cocoa" />
                      )}
                      <div className="flex-1">
                        <p className="font-semibold text-espresso">
                          Status Batas Waktu DP ({paymentConfig.dpWindowHours} Jam)
                        </p>
                        <p className="mt-1 leading-relaxed text-muted">
                          {getDpDeadlineState(selectedOrder).summary}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        className="rounded-full border border-cocoa/25 bg-cream/60 px-3.5 py-1.5 text-xs font-medium text-espresso hover:border-espresso disabled:opacity-60"
                        disabled={isActionBusy}
                        onClick={() =>
                          void executeAdminAction(
                            selectedOrder.id,
                            {
                              action: "extend_dp_deadline",
                              extraHours: paymentConfig.dpWindowHours,
                            },
                            `Batas waktu pembayaran DP diperpanjang ${paymentConfig.dpWindowHours} jam.`
                          )
                        }
                        type="button"
                      >
                        Perpanjang +{paymentConfig.dpWindowHours} Jam
                      </button>

                      {getDpDeadlineState(selectedOrder).requiresAdminReview ? (
                        <button
                          className="rounded-full border border-rose/50 bg-blush/35 px-3.5 py-1.5 text-xs font-medium text-espresso hover:bg-blush/60 disabled:opacity-60"
                          disabled={isActionBusy}
                          onClick={() =>
                            void executeAdminAction(
                              selectedOrder.id,
                              { action: "evaluate_overdue" },
                              "Pesanan ditandai untuk tinjauan admin karena melewati batas 24 jam tanpa bukti."
                            )
                          }
                          type="button"
                        >
                          Tandai Perlu Tinjauan Admin
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2">
                  {renderPaymentVerificationCard(
                    selectedOrder,
                    "dp",
                    getLatestPaymentByStage(selectedOrder, "dp"),
                    dpVerifyNote,
                    setDpVerifyNote
                  )}
                  {renderPaymentVerificationCard(
                    selectedOrder,
                    "pelunasan",
                    getLatestPaymentByStage(selectedOrder, "pelunasan"),
                    settlementVerifyNote,
                    setSettlementVerifyNote
                  )}
                </div>
              </section>

              {/* 4. Kontrol 10 Tahap Produksi & Invoice Pelunasan */}
              <section className="space-y-4 rounded-[1.75rem] border border-cocoa/14 bg-cream/40 p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-cocoa">
                      Langkah Admin 3
                    </p>
                    <h3 className="mt-1 font-[family-name:var(--font-display)] text-xl text-espresso">
                      Tahap Produksi &amp; Invoice Pelunasan
                    </h3>
                  </div>
                  <span className="text-xs font-medium text-cocoa">
                    Aktif: Tahap {getProductionStageMeta(selectedOrder.productionStage).step}/10 (
                    {getProductionStageMeta(selectedOrder.productionStage).shortLabel})
                  </span>
                </div>

                {!canStartProduction(selectedOrder) ? (
                  <div className="flex items-start gap-2.5 rounded-2xl border border-cocoa/15 bg-ivory p-4 text-xs text-muted">
                    <LockIcon className="mt-0.5 h-4 w-4 shrink-0 text-cocoa" />
                    <p>
                      <strong className="text-espresso">Terkunci oleh aturan DP:</strong> Produksi
                      tidak dapat dimulai sebelum pembayaran DP 50% diverifikasi admin.
                    </p>
                  </div>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      className="block text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-cocoa"
                      htmlFor="admin-stage-select"
                    >
                      Pilih Tahap Produksi
                    </label>
                    <select
                      className="mt-1 w-full rounded-xl border border-cocoa/20 bg-ivory px-3.5 py-2.5 text-sm text-espresso focus:border-cocoa focus:outline-none"
                      id="admin-stage-select"
                      onChange={(event) => setSelectedStage(event.target.value as ProductionStage)}
                      value={selectedStage}
                    >
                      {PRODUCTION_STAGES.map((stage) => {
                        const locked =
                          (stage.requiresDpVerified && !canStartProduction(selectedOrder)) ||
                          (stage.requiresSettlementVerified &&
                            !canAdvanceToFulfillment(selectedOrder));
                        return (
                          <option key={stage.id} value={stage.id}>
                            {stage.step}. {stage.label}
                            {locked ? " (Terkunci)" : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label
                      className="block text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-cocoa"
                      htmlFor="admin-stage-estimate"
                    >
                      Estimasi Penyelesaian (Opsional)
                    </label>
                    <input
                      className="mt-1 w-full rounded-xl border border-cocoa/20 bg-ivory px-3.5 py-2.5 text-sm text-espresso focus:border-cocoa focus:outline-none"
                      id="admin-stage-estimate"
                      onChange={(event) => setEstimateUpdateInput(event.target.value)}
                      type="date"
                      value={estimateUpdateInput}
                    />
                  </div>
                </div>

                <div>
                  <label
                    className="block text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-cocoa"
                    htmlFor="admin-stage-note"
                  >
                    Catatan Progres untuk Pelanggan (Opsional)
                  </label>
                  <input
                    className="mt-1 w-full rounded-xl border border-cocoa/20 bg-ivory px-3.5 py-2.5 text-sm text-espresso focus:border-cocoa focus:outline-none"
                    id="admin-stage-note"
                    onChange={(event) => setStageNoteInput(event.target.value)}
                    placeholder="Contoh: Pemotongan pola selesai, besok lanjut penjahitan utama."
                    type="text"
                    value={stageNoteInput}
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    className={buttonClass("solid")}
                    disabled={isActionBusy || selectedOrder.status === "dibatalkan"}
                    onClick={() =>
                      void executeAdminAction(
                        selectedOrder.id,
                        {
                          action: "update_production_stage",
                          stage: selectedStage,
                          estimatedCompletionDate: estimateUpdateInput || undefined,
                          note: stageNoteInput,
                        },
                        `Tahap produksi diperbarui ke "${getProductionStageMeta(selectedStage).label}".`
                      )
                    }
                    type="button"
                  >
                    Perbarui Tahap Produksi
                  </button>
                </div>

                {/* Penerbitan Invoice Pelunasan */}
                <div className="border-t border-cocoa/12 pt-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cocoa">
                    Terbitkan Invoice Pelunasan (Setelah Tahap 6: Selesai Dikerjakan)
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    Menagihkan sisa 50% biaya jahit (
                    {formatRupiah(selectedOrder.invoice.settlementTailoringAmount)})
                    {selectedOrder.delivery.method === "shipping"
                      ? " ditambah biaya pengiriman terpisah berdasarkan tarif kurir resmi."
                      : " tanpa biaya pengiriman (ambil sendiri di butik)."}
                  </p>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label
                        className="block text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-cocoa"
                        htmlFor="admin-settlement-shipping"
                      >
                        Biaya Pengiriman Final (Rp)
                      </label>
                      <input
                        className="mt-1 w-full rounded-xl border border-cocoa/20 bg-ivory px-3.5 py-2 text-sm text-espresso disabled:bg-sand/40 focus:border-cocoa focus:outline-none"
                        disabled={
                          selectedOrder.delivery.method === "pickup" ||
                          isPaymentVerified(selectedOrder, "pelunasan")
                        }
                        id="admin-settlement-shipping"
                        onChange={(event) => setSettlementShippingInput(event.target.value)}
                        placeholder={
                          selectedOrder.delivery.method === "pickup"
                            ? "0 (Ambil di butik)"
                            : "Contoh: 24000"
                        }
                        type="text"
                        value={settlementShippingInput}
                      />
                    </div>
                    <div>
                      <label
                        className="block text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-cocoa"
                        htmlFor="admin-settlement-note"
                      >
                        Catatan Invoice Pelunasan
                      </label>
                      <input
                        className="mt-1 w-full rounded-xl border border-cocoa/20 bg-ivory px-3.5 py-2 text-sm text-espresso focus:border-cocoa focus:outline-none"
                        id="admin-settlement-note"
                        onChange={(event) => setSettlementNoteInput(event.target.value)}
                        placeholder="Contoh: Tarif JNE Reguler Sleman ke Bandung"
                        type="text"
                        value={settlementNoteInput}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs text-muted">
                      {getProductionStageIndex(selectedOrder.productionStage) <
                      getProductionStageIndex("selesai_dikerjakan")
                        ? "Tersedia setelah status mencapai Tahap 6 (Selesai dikerjakan)."
                        : "Siap menerbitkan Invoice Pelunasan."}
                    </span>
                    <button
                      className={buttonClass("outline")}
                      disabled={
                        isActionBusy ||
                        isPaymentVerified(selectedOrder, "pelunasan") ||
                        selectedOrder.status === "dibatalkan"
                      }
                      onClick={() =>
                        void executeAdminAction(
                          selectedOrder.id,
                          {
                            action: "issue_settlement_invoice",
                            shippingFee:
                              selectedOrder.delivery.method === "pickup"
                                ? 0
                                : parseRupiahInput(settlementShippingInput),
                            note: settlementNoteInput,
                          },
                          "Invoice Pelunasan telah diterbitkan dan tersedia di halaman Lacak Pesanan."
                        )
                      }
                      type="button"
                    >
                      Terbitkan Invoice Pelunasan
                    </button>
                  </div>
                </div>
              </section>

              {/* 5. Pengiriman / Pengambilan & Penyelesaian */}
              <section className="space-y-4 rounded-[1.75rem] border border-cocoa/14 bg-cream/40 p-6">
                <div className="flex items-center gap-2">
                  <TruckIcon className="h-4 w-4 text-cocoa" />
                  <h3 className="font-[family-name:var(--font-display)] text-xl text-espresso">
                    {selectedOrder.delivery.method === "shipping"
                      ? "Pengiriman Kurir & Nomor Resi"
                      : "Pengambilan di Celmira Boutique"}
                  </h3>
                </div>

                {!canAdvanceToFulfillment(selectedOrder) ? (
                  <p className="rounded-xl border border-cocoa/12 bg-ivory px-4 py-3 text-xs text-muted">
                    Serah terima dan pengiriman baru aktif setelah pelunasan diverifikasi oleh
                    admin.
                  </p>
                ) : selectedOrder.delivery.method === "shipping" ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label
                        className="block text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-cocoa"
                        htmlFor="admin-courier"
                      >
                        Jasa Pengiriman Resmi
                      </label>
                      <input
                        className="mt-1 w-full rounded-xl border border-cocoa/20 bg-ivory px-3.5 py-2 text-sm text-espresso focus:border-cocoa focus:outline-none"
                        id="admin-courier"
                        onChange={(event) => setCourierNameInput(event.target.value)}
                        placeholder="Contoh: JNE Reguler / J&T / Paxel"
                        type="text"
                        value={courierNameInput}
                      />
                    </div>
                    <div>
                      <label
                        className="block text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-cocoa"
                        htmlFor="admin-resi"
                      >
                        Nomor Resi
                      </label>
                      <input
                        className="mt-1 w-full rounded-xl border border-cocoa/20 bg-ivory px-3.5 py-2 text-sm text-espresso focus:border-cocoa focus:outline-none"
                        id="admin-resi"
                        onChange={(event) => setTrackingNumberInput(event.target.value)}
                        placeholder="Masukkan nomor resi asli dari kurir"
                        type="text"
                        value={trackingNumberInput}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label
                      className="block text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-cocoa"
                      htmlFor="admin-pickup-note"
                    >
                      Catatan Jadwal Pengambilan di Butik
                    </label>
                    <input
                      className="mt-1 w-full rounded-xl border border-cocoa/20 bg-ivory px-3.5 py-2 text-sm text-espresso focus:border-cocoa focus:outline-none"
                      id="admin-pickup-note"
                      onChange={(event) => setPickupNoteInput(event.target.value)}
                      placeholder="Contoh: Siap diambil Senin–Sabtu pukul 09.00–17.00 WIB"
                      type="text"
                      value={pickupNoteInput}
                    />
                  </div>
                )}

                <div className="flex flex-wrap gap-2.5">
                  <button
                    className={buttonClass("outline")}
                    disabled={isActionBusy || !canAdvanceToFulfillment(selectedOrder)}
                    onClick={() =>
                      void executeAdminAction(
                        selectedOrder.id,
                        {
                          action: "update_fulfillment",
                          courierName: courierNameInput,
                          trackingNumber: trackingNumberInput,
                          pickupReadyNote: pickupNoteInput,
                          fulfillmentAction: "mark_dispatched_or_ready",
                        },
                        selectedOrder.delivery.method === "shipping"
                          ? "Pesanan ditandai Dalam Pengiriman beserta data resi."
                          : "Pesanan ditandai Siap Diambil di Celmira Boutique."
                      )
                    }
                    type="button"
                  >
                    {selectedOrder.delivery.method === "shipping"
                      ? "Tandai Dalam Pengiriman"
                      : "Tandai Siap Diambil"}
                  </button>

                  <button
                    className={buttonClass("solid")}
                    disabled={
                      isActionBusy ||
                      !canAdvanceToFulfillment(selectedOrder) ||
                      selectedOrder.status === "selesai"
                    }
                    onClick={() =>
                      void executeAdminAction(
                        selectedOrder.id,
                        {
                          action: "update_fulfillment",
                          courierName: courierNameInput,
                          trackingNumber: trackingNumberInput,
                          pickupReadyNote: pickupNoteInput,
                          fulfillmentAction: "mark_completed",
                        },
                        "Pesanan ditandai Selesai."
                      )
                    }
                    type="button"
                  >
                    Tandai Pesanan Selesai
                  </button>
                </div>
              </section>

              {/* 6. Pembatalan Pesanan Tercatat */}
              {selectedOrder.status !== "selesai" && selectedOrder.status !== "dibatalkan" ? (
                <section className="rounded-[1.75rem] border border-red-800/18 bg-red-50/40 p-5">
                  <h3 className="font-[family-name:var(--font-sans)] text-xs font-semibold uppercase tracking-[0.16em] text-red-900">
                    Pembatalan Pesanan (Tercatat pada Riwayat)
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-red-900/80">
                    Jika pelanggan sudah mengunggah bukti pembayaran DP sebelum batas waktu 24 jam,
                    pembatalan karena batas waktu ditolak otomatis oleh sistem hingga bukti
                    diperiksa.
                  </p>
                  <div className="mt-3 flex flex-col gap-2.5 sm:flex-row">
                    <input
                      className="flex-1 rounded-xl border border-red-800/20 bg-ivory px-3.5 py-2 text-xs text-espresso focus:border-red-800/50 focus:outline-none"
                      onChange={(event) => setCancelReasonInput(event.target.value)}
                      placeholder="Tuliskan alasan pembatalan resmi (minimal 5 karakter)..."
                      type="text"
                      value={cancelReasonInput}
                    />
                    <button
                      className="rounded-full border border-red-800/30 bg-red-100/80 px-4 py-2 text-xs font-medium text-red-950 transition-colors hover:bg-red-200/80 disabled:opacity-60"
                      disabled={isActionBusy}
                      onClick={() =>
                        void executeAdminAction(
                          selectedOrder.id,
                          {
                            action: "cancel_order",
                            reason: cancelReasonInput,
                            isTimeoutCancellation:
                              selectedOrder.status === "perlu_tinjauan_admin" ||
                              getDpDeadlineState(selectedOrder).requiresAdminReview ||
                              getDpDeadlineState(selectedOrder).protectedByProofUpload,
                          },
                          "Pesanan telah dibatalkan dan alasan pembatalan tercatat pada riwayat."
                        )
                      }
                      type="button"
                    >
                      Batalkan Pesanan
                    </button>
                  </div>
                </section>
              ) : null}

              {/* 7. Riwayat Transaksi & Perubahan Status */}
              <OrderHistoryLog
                history={selectedOrder.history}
                title="Riwayat Transaksi & Perubahan Status Pesanan"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
