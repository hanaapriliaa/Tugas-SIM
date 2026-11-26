"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { InvoicePaymentPanel } from "@/components/track/InvoicePaymentPanel";
import { OrderHistoryLog } from "@/components/track/OrderHistoryLog";
import { ProductionTimeline } from "@/components/track/ProductionTimeline";
import { StatusBadge } from "@/components/track/StatusBadge";
import { buttonClass } from "@/components/ui/ButtonLink";
import {
  ArrowRight,
  ChatIcon,
  LockIcon,
  SearchIcon,
  ShieldIcon,
} from "@/components/ui/icons";
import { buildChatHref } from "@/lib/chat";
import {
  ORDER_STATUS_META,
  createDefaultAdminPaymentConfig,
  customerRespondToQuote,
  customerUploadPaymentProof,
  formatDateOnlyId,
  formatDateTimeId,
  getPaymentSummaryBadge,
  getProductionStageMeta,
  maskOrderContact,
  verifyOrderTrackingAccess,
} from "@/lib/order-tracking";
import {
  clearOrderVerifiedInSession,
  loadAdminPaymentConfig,
  loadSubmittedOrders,
  markOrderVerifiedInSession,
  updateSubmittedOrder,
} from "@/lib/storage/tailor-store";
import type {
  AdminPaymentConfig,
  PaymentStage,
  SubmittedOrder,
} from "@/lib/types/tailor";

export function OrderTrackingWorkspace() {
  const searchParams = useSearchParams();

  const [orders, setOrders] = useState<SubmittedOrder[]>([]);
  const [paymentConfig, setPaymentConfig] = useState<AdminPaymentConfig>(
    createDefaultAdminPaymentConfig
  );
  const [hydrated, setHydrated] = useState(false);

  const [orderCodeInput, setOrderCodeInput] = useState("");
  const [verifierInput, setVerifierInput] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [verifiedOrderId, setVerifiedOrderId] = useState<string | null>(null);

  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const syncStore = () => {
      setOrders(loadSubmittedOrders());
      setPaymentConfig(loadAdminPaymentConfig());
    };

    syncStore();
    setHydrated(true);

    const urlCode =
      searchParams.get("code") ??
      (typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("code")
        : null);
    if (urlCode) {
      setOrderCodeInput(urlCode.trim().toUpperCase());
    }

    const onStorage = () => syncStore();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [searchParams]);

  const activeOrder = useMemo(
    () => orders.find((item) => item.id === verifiedOrderId) ?? null,
    [orders, verifiedOrderId]
  );

  const handleVerifyLookup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLookupError(null);
    setActionFeedback(null);
    setActionError(null);

    const latestOrders = loadSubmittedOrders();
    setOrders(latestOrders);
    setPaymentConfig(loadAdminPaymentConfig());

    const result = verifyOrderTrackingAccess(latestOrders, orderCodeInput, verifierInput);
    if (!result.ok) {
      setLookupError(result.error);
      setVerifiedOrderId(null);
      return;
    }

    setVerifiedOrderId(result.order.id);
    markOrderVerifiedInSession(result.order.orderCode);
  };

  const handleRespondQuote = (decision: "approve" | "reject", rejectionReason?: string) => {
    if (!activeOrder) return;
    setActionFeedback(null);
    setActionError(null);

    const result = customerRespondToQuote(
      activeOrder,
      { decision, rejectionReason },
      new Date(),
      paymentConfig.dpWindowHours
    );
    if (!result.ok) {
      setActionError(result.error);
      return;
    }

    const saved = updateSubmittedOrder(result.order);
    setOrders(loadSubmittedOrders());
    setVerifiedOrderId(saved.id);
    setActionFeedback(
      decision === "approve"
        ? `Penawaran disetujui. Invoice DP ${saved.invoice.dpInvoiceNumber ?? ""} telah diterbitkan dengan batas waktu ${paymentConfig.dpWindowHours} jam.`
        : "Penawaran telah ditolak dan tercatat pada riwayat pesanan."
    );
  };

  const handleUploadProof = (payload: {
    stage: PaymentStage;
    proofFileName: string;
    proofMimeType: string;
    proofSize: number;
    proofPreviewDataUrl?: string;
    customerNote?: string;
  }) => {
    if (!activeOrder) return;
    setActionFeedback(null);
    setActionError(null);

    const result = customerUploadPaymentProof(activeOrder, payload, new Date());
    if (!result.ok) {
      setActionError(result.error);
      return;
    }

    const saved = updateSubmittedOrder(result.order);
    setOrders(loadSubmittedOrders());
    setVerifiedOrderId(saved.id);
    setActionFeedback(
      payload.stage === "dp"
        ? "Bukti pembayaran DP berhasil diunggah dan sedang menunggu verifikasi manual oleh admin."
        : "Bukti pelunasan berhasil diunggah dan sedang menunggu verifikasi manual oleh admin."
    );
  };

  const handleLockOrder = () => {
    clearOrderVerifiedInSession(activeOrder?.orderCode);
    setVerifiedOrderId(null);
    setVerifierInput("");
    setActionFeedback(null);
    setActionError(null);
  };

  return (
    <div className="shell py-12 sm:py-16 lg:py-20">
      {/* Header halaman */}
      <div className="max-w-3xl">
        <p className="eyebrow">Lacak Pesanan & Invoice</p>
        <h1 className="mt-4 text-balance text-[2.2rem] leading-[1.1] text-espresso sm:text-[3rem]">
          Pantau progres jahit dan tagihan Anda dengan transparan.
        </h1>
        <p className="mt-4 text-pretty text-[0.9875rem] leading-[1.85] text-muted">
          Masukkan nomor pesanan beserta verifikasi identitas (nomor WhatsApp terdaftar atau Kode
          Akses Tracking) untuk meninjau penawaran harga, mengunduh rincian invoice DP &amp;
          pelunasan, serta memantau setiap tahap pengerjaan busana Anda.
        </p>
      </div>

      {/* Form verifikasi akses tracking yang aman */}
      <div className="mt-10 grid gap-6 lg:grid-cols-12">
        <section className="rounded-[1.75rem] border border-cocoa/15 bg-cream/55 p-6 sm:p-7 lg:col-span-7">
          <div className="flex items-center gap-2.5 text-espresso">
            <ShieldIcon className="h-5 w-5 text-cocoa" />
            <h2 className="font-[family-name:var(--font-display)] text-xl">
              Verifikasi Identitas Pesanan
            </h2>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">
            Untuk menjaga privasi detail ukuran, alamat, dan invoice, nomor pesanan saja tidak
            cukup untuk membuka tracking. Lengkapi kedua kolom berikut.
          </p>

          <form className="mt-5 space-y-4" onSubmit={handleVerifyLookup}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  className="block text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-cocoa"
                  htmlFor="track-order-code"
                >
                  Nomor Pesanan
                </label>
                <input
                  autoComplete="off"
                  className="mt-1.5 w-full rounded-2xl border border-cocoa/20 bg-ivory px-4 py-3 text-sm font-medium uppercase tracking-[0.06em] text-espresso placeholder:normal-case placeholder:tracking-normal placeholder:text-muted/65 focus:border-cocoa focus:outline-none"
                  id="track-order-code"
                  onChange={(event) => setOrderCodeInput(event.target.value)}
                  placeholder="Contoh: CT-20261125-AB12"
                  required
                  type="text"
                  value={orderCodeInput}
                />
              </div>

              <div>
                <label
                  className="block text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-cocoa"
                  htmlFor="track-verifier"
                >
                  Nomor WhatsApp / Kode Akses Tracking
                </label>
                <input
                  autoComplete="off"
                  className="mt-1.5 w-full rounded-2xl border border-cocoa/20 bg-ivory px-4 py-3 text-sm text-espresso placeholder:text-muted/65 focus:border-cocoa focus:outline-none"
                  id="track-verifier"
                  onChange={(event) => setVerifierInput(event.target.value)}
                  placeholder="0812xxxx atau kode 6 karakter"
                  required
                  type="text"
                  value={verifierInput}
                />
              </div>
            </div>

            {lookupError ? (
              <p className="rounded-xl border border-red-800/20 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-900">
                {lookupError}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <p className="flex items-center gap-1.5 text-[0.6875rem] text-muted">
                <LockIcon className="h-3.5 w-3.5 text-cocoa" />
                Dilindungi verifikasi dua faktor (kode pesanan + identitas terdaftar)
              </p>
              <button className={buttonClass("solid")} type="submit">
                <SearchIcon className="h-4 w-4" />
                Buka Tracking Pesanan
              </button>
            </div>
          </form>
        </section>

        {/* Daftar pesanan tersimpan pada perangkat ini (tetap ter-masking & wajib verifikasi) */}
        <aside className="rounded-[1.75rem] border border-cocoa/14 bg-ivory p-6 sm:p-7 lg:col-span-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-[family-name:var(--font-display)] text-lg text-espresso">
              Pesanan di Perangkat Ini
            </h2>
            <span className="rounded-full border border-cocoa/18 bg-cream px-2.5 py-0.5 text-[0.625rem] font-medium uppercase tracking-[0.14em] text-cocoa">
              {hydrated ? `${orders.length} pesanan` : "Memuat..."}
            </span>
          </div>

          {!hydrated ? (
            <p className="mt-4 text-xs text-muted">Memuat daftar pesanan lokal...</p>
          ) : orders.length === 0 ? (
            <div className="mt-4 space-y-4">
              <p className="text-xs leading-relaxed text-muted">
                Belum ada pengajuan pesanan yang tersimpan di browser ini. Anda dapat membuat
                pesanan jahit custom terlebih dahulu melalui Booking Flow.
              </p>
              <Link className={buttonClass("outline")} href="/orders">
                Buat Pesanan Custom
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="mt-4 space-y-2.5">
              <p className="text-[0.6875rem] leading-relaxed text-muted">
                Klik kode pesanan untuk mengisi kolom nomor pesanan. Anda tetap wajib memasukkan
                WhatsApp terdaftar atau Kode Akses Tracking untuk membuka detailnya.
              </p>
              <ul className="max-h-56 space-y-2 overflow-y-auto pr-1">
                {orders.map((item) => {
                  const statusMeta = ORDER_STATUS_META[item.status];
                  const isSelectedCode =
                    orderCodeInput.trim().toUpperCase() === item.orderCode.toUpperCase();
                  return (
                    <li key={item.id}>
                      <button
                        className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-3.5 py-3 text-left transition-colors ${
                          isSelectedCode
                            ? "border-espresso/45 bg-cream/85"
                            : "border-cocoa/12 bg-cream/35 hover:border-cocoa/35 hover:bg-cream/65"
                        }`}
                        onClick={() => {
                          setOrderCodeInput(item.orderCode);
                          setLookupError(null);
                        }}
                        type="button"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-mono text-xs font-semibold text-espresso">
                            {item.orderCode}
                          </p>
                          <p className="mt-0.5 truncate text-[0.6875rem] text-muted">
                            {item.categoryName} · WA {maskOrderContact(item.customer.whatsapp)}
                          </p>
                        </div>
                        <StatusBadge
                          className="shrink-0"
                          label={statusMeta.label}
                          tone={statusMeta.tone}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </aside>
      </div>

      {/* Konten Tracking Terverifikasi */}
      {activeOrder ? (
        <div className="mt-10 space-y-7">
          {/* Ringkasan Identitas & Status Pesanan */}
          <section className="rounded-[2rem] border border-cocoa/18 bg-cream/55 p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-cocoa/12 pb-6">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-cocoa">
                    {activeOrder.orderCode}
                  </span>
                  {(() => {
                    const orderBadge = ORDER_STATUS_META[activeOrder.status];
                    const paymentBadge = getPaymentSummaryBadge(activeOrder);
                    const isDuplicateLabel =
                      orderBadge.label.trim().toLowerCase() ===
                      paymentBadge.label.trim().toLowerCase();

                    return (
                      <>
                        <StatusBadge label={orderBadge.label} tone={orderBadge.tone} />
                        {!isDuplicateLabel ? (
                          <StatusBadge label={paymentBadge.label} tone={paymentBadge.tone} />
                        ) : null}
                      </>
                    );
                  })()}
                </div>
                <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl text-espresso sm:text-3xl">
                  {activeOrder.designTitle}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {ORDER_STATUS_META[activeOrder.status].description}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <Link
                  className="inline-flex items-center gap-1.5 rounded-full bg-espresso px-4 py-2 text-xs font-medium text-ivory transition-colors hover:bg-cocoa"
                  href={buildChatHref({
                    source: "track",
                    orderCode: activeOrder.orderCode,
                    category: activeOrder.categoryId,
                  })}
                >
                  <ChatIcon className="h-3.5 w-3.5" />
                  Tanya Admin di Chat
                </Link>
                <button
                  className="rounded-full border border-cocoa/25 bg-ivory px-4 py-2 text-xs font-medium text-espresso transition-colors hover:border-espresso"
                  onClick={handleLockOrder}
                  type="button"
                >
                  Tutup / Ganti Pesanan
                </button>
              </div>
            </div>

            <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-cocoa/10 bg-ivory p-4">
                <dt className="text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-muted">
                  Identitas Pesanan
                </dt>
                <dd className="mt-1.5 font-medium text-espresso">
                  {activeOrder.customer.fullName}
                </dd>
                <dd className="mt-0.5 text-xs text-muted">{activeOrder.customer.whatsapp}</dd>
              </div>

              <div className="rounded-2xl border border-cocoa/10 bg-ivory p-4">
                <dt className="text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-muted">
                  Jenis Pakaian &amp; Tanggal Pesan
                </dt>
                <dd className="mt-1.5 font-medium text-espresso">{activeOrder.categoryName}</dd>
                <dd className="mt-0.5 text-xs text-muted">
                  Dipesan {formatDateTimeId(activeOrder.createdAt)}
                </dd>
              </div>

              <div className="rounded-2xl border border-cocoa/10 bg-ivory p-4">
                <dt className="text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-muted">
                  Status Pengerjaan Saat Ini
                </dt>
                <dd className="mt-1.5 font-medium text-espresso">
                  {getProductionStageMeta(activeOrder.productionStage).label}
                </dd>
                <dd className="mt-0.5 text-xs text-muted">
                  Tahap {getProductionStageMeta(activeOrder.productionStage).step} dari 10
                </dd>
              </div>

              <div className="rounded-2xl border border-cocoa/10 bg-ivory p-4">
                <dt className="text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-muted">
                  Estimasi Penyelesaian Admin
                </dt>
                <dd className="mt-1.5 font-medium text-espresso">
                  {formatDateOnlyId(activeOrder.estimatedCompletionDate)}
                </dd>
                <dd className="mt-0.5 text-xs text-muted">
                  {activeOrder.delivery.method === "shipping"
                    ? `Pengiriman ke ${activeOrder.delivery.city}`
                    : "Ambil sendiri di butik"}
                </dd>
              </div>
            </dl>

            {/* Ringkasan spesifikasi busana */}
            <div className="mt-5 grid gap-3 rounded-2xl border border-cocoa/10 bg-ivory/85 p-4 text-xs sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <span className="text-[0.625rem] uppercase tracking-[0.14em] text-muted">
                  Bahan &amp; Warna
                </span>
                <p className="mt-0.5 font-medium text-espresso">
                  {activeOrder.specifications.fabric} · {activeOrder.specifications.colorName}
                </p>
              </div>
              <div>
                <span className="text-[0.625rem] uppercase tracking-[0.14em] text-muted">
                  Lengan &amp; Kerah
                </span>
                <p className="mt-0.5 font-medium text-espresso">
                  {activeOrder.specifications.sleeveStyle} · {activeOrder.specifications.collarStyle}
                </p>
              </div>
              <div>
                <span className="text-[0.625rem] uppercase tracking-[0.14em] text-muted">
                  Panjang Busana
                </span>
                <p className="mt-0.5 font-medium text-espresso">
                  {activeOrder.specifications.lengthOption}
                </p>
              </div>
              <div>
                <span className="text-[0.625rem] uppercase tracking-[0.14em] text-muted">
                  Metode Ukuran
                </span>
                <p className="mt-0.5 font-medium text-espresso">
                  {activeOrder.measurements.mode === "profile"
                    ? `Profil: ${activeOrder.measurements.profileName ?? "Tersimpan"}`
                    : activeOrder.measurements.mode === "sample_garment"
                      ? "Menggunakan baju contoh"
                      : "Input ukuran manual"}
                </p>
              </div>
            </div>
          </section>

          {/* Invoice & Pembayaran + Timeline Produksi */}
          <div className="grid gap-7 xl:grid-cols-12">
            <div className="space-y-7 xl:col-span-7">
              <InvoicePaymentPanel
                errorMessage={actionError}
                feedbackMessage={actionFeedback}
                onRespondQuote={handleRespondQuote}
                onUploadProof={handleUploadProof}
                order={activeOrder}
                paymentConfig={paymentConfig}
              />
            </div>

            <div className="space-y-7 xl:col-span-5">
              <ProductionTimeline order={activeOrder} />
            </div>
          </div>

          {/* Riwayat Status & Transaksi */}
          <OrderHistoryLog history={activeOrder.history} />
        </div>
      ) : null}

      {/* Catatan jujur terkait status integrasi backend */}
      <div className="mt-12 flex flex-col gap-4 rounded-[1.5rem] border border-cocoa/16 bg-cream/40 p-5 text-xs leading-relaxed text-muted sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-3xl">
          <strong className="font-semibold text-espresso">Catatan Mode Penyimpanan Lokal:</strong>{" "}
          Alur tracking pesanan, penawaran harga, invoice DP/pelunasan, unggah bukti, dan
          verifikasi admin saat ini menggunakan penyimpanan browser lokal untuk pengujian alur
          antar-halaman. Sinkronisasi multi-perangkat, database PostgreSQL, penyimpanan file aman,
          serta autentikasi server akan diaktifkan pada Tahap 6.
        </p>
        <div className="flex shrink-0 flex-wrap gap-3">
          <Link className="link-underline" href="/orders">
            Buat Pesanan
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link className="link-underline" href="/admin">
            Panel Admin
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
