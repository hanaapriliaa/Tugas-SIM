"use client";

import { useState, type ChangeEvent } from "react";
import { StatusBadge } from "@/components/track/StatusBadge";
import { buttonClass } from "@/components/ui/ButtonLink";
import {
  AlertCircleIcon,
  CheckIcon,
  ClockIcon,
  FileTextIcon,
  ReceiptIcon,
  ShieldIcon,
  UploadIcon,
} from "@/components/ui/icons";
import { createImageThumbnail, formatFileSize } from "@/lib/attachments";
import { validateAttachmentFile } from "@/lib/booking-validation";
import {
  formatDateOnlyId,
  formatDateTimeId,
  formatRupiah,
  getDpDeadlineState,
  getLatestPaymentByStage,
  isPaymentVerified,
} from "@/lib/order-tracking";
import type {
  AdminPaymentConfig,
  PaymentRecord,
  PaymentStage,
  SubmittedOrder,
} from "@/lib/types/tailor";

type ProofUploadPayload = {
  stage: PaymentStage;
  file: File;
  customerNote?: string;
};

type InvoicePaymentPanelProps = {
  order: SubmittedOrder;
  paymentConfig: AdminPaymentConfig;
  onRespondQuote: (
    decision: "approve" | "reject",
    rejectionReason?: string
  ) => void | Promise<void>;
  onUploadProof: (payload: ProofUploadPayload) => void | Promise<void>;
  isBusy?: boolean;
  feedbackMessage?: string | null;
  errorMessage?: string | null;
};

function verificationStatusBadge(record?: PaymentRecord): {
  label: string;
  tone: "neutral" | "info" | "warning" | "success" | "danger";
} {
  if (!record || record.verificationStatus === "belum_unggah") {
    return { label: "Belum Unggah Bukti", tone: "warning" };
  }
  if (record.verificationStatus === "menunggu_verifikasi_admin") {
    return { label: "Menunggu Verifikasi Admin", tone: "info" };
  }
  if (record.verificationStatus === "terverifikasi") {
    return { label: "Terverifikasi Admin", tone: "success" };
  }
  return { label: "Bukti Ditolak — Perlu Unggah Ulang", tone: "danger" };
}

type PaymentProofUploaderProps = {
  stage: PaymentStage;
  disabled: boolean;
  onUpload: (payload: ProofUploadPayload) => void | Promise<void>;
};

function PaymentProofUploader({ stage, disabled, onUpload }: PaymentProofUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<{
    file: File;
    name: string;
    mimeType: string;
    size: number;
    previewDataUrl?: string;
  } | null>(null);
  const [customerNote, setCustomerNote] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const validationError = validateAttachmentFile(file);
    if (validationError) {
      setFileError(validationError);
      setSelectedFile(null);
      return;
    }

    setFileError(null);
    setIsReading(true);
    try {
      const isPdf = file.type.toLowerCase() === "application/pdf";
      const previewDataUrl = isPdf ? undefined : await createImageThumbnail(file);
      setSelectedFile({
        file,
        name: file.name,
        mimeType: file.type,
        size: file.size,
        previewDataUrl,
      });
    } finally {
      setIsReading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      setFileError("Pilih file bukti pembayaran (JPG, PNG, WEBP, atau PDF) terlebih dahulu.");
      return;
    }
    await onUpload({
      stage,
      file: selectedFile.file,
      customerNote: customerNote.trim() || undefined,
    });
    setSelectedFile(null);
    setCustomerNote("");
    setFileError(null);
  };

  const inputId = `proof-upload-${stage}`;

  return (
    <div className="mt-5 rounded-2xl border border-cocoa/15 bg-ivory p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cocoa">
        Unggah Bukti Pembayaran {stage === "dp" ? "DP (50%)" : "Pelunasan"}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        Format yang diterima: JPG, PNG, WEBP, atau PDF (maks. 5 MB). Status pembayaran baru berubah
        menjadi lunas/terverifikasi setelah diperiksa manual oleh admin.
      </p>

      <div className="mt-3 flex flex-col gap-3">
        <label
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-cocoa/30 bg-cream/45 px-4 py-5 text-center transition-colors hover:border-cocoa/60 hover:bg-cream/75 ${
            disabled ? "pointer-events-none opacity-60" : ""
          }`}
          htmlFor={inputId}
        >
          <UploadIcon className="h-5 w-5 text-cocoa" />
          <span className="text-xs font-medium text-espresso">
            {isReading
              ? "Memproses file bukti..."
              : selectedFile
                ? `Terpilih: ${selectedFile.name} (${formatFileSize(selectedFile.size)})`
                : "Klik untuk memilih gambar atau PDF bukti transfer QRIS"}
          </span>
          <input
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="sr-only"
            disabled={disabled || isReading}
            id={inputId}
            onChange={handleFileChange}
            type="file"
          />
        </label>

        {selectedFile?.previewDataUrl ? (
          <div className="overflow-hidden rounded-xl border border-cocoa/15 bg-cream/30 p-2">
            <img
              alt={`Pratinjau ${selectedFile.name}`}
              className="mx-auto max-h-44 rounded-lg object-contain"
              src={selectedFile.previewDataUrl}
            />
          </div>
        ) : null}

        <div>
          <label
            className="block text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-muted"
            htmlFor={`${inputId}-note`}
          >
            Catatan Pembayaran (Opsional)
          </label>
          <input
            className="mt-1 w-full rounded-xl border border-cocoa/20 bg-ivory px-3.5 py-2.5 text-sm text-espresso placeholder:text-muted/65 focus:border-cocoa focus:outline-none"
            disabled={disabled}
            id={`${inputId}-note`}
            onChange={(event) => setCustomerNote(event.target.value)}
            placeholder="Contoh: Transfer QRIS atas nama Nadia pukul 14.20"
            type="text"
            value={customerNote}
          />
        </div>

        {fileError ? (
          <p className="text-xs font-medium text-red-800">{fileError}</p>
        ) : null}

        <div className="flex justify-end">
          <button
            className={buttonClass("solid")}
            disabled={disabled || isReading || !selectedFile}
            onClick={() => void handleSubmit()}
            type="button"
          >
            {disabled ? "Mengunggah..." : "Kirim Bukti untuk Verifikasi Admin"}
          </button>
        </div>
      </div>
    </div>
  );
}

function OfficialQrisBox({ config }: { config: AdminPaymentConfig }) {
  const qrisSrc = config.qrisImageUrl ?? config.qrisImageDataUrl;
  return (
    <div className="rounded-2xl border border-cocoa/15 bg-cream/55 p-4 sm:p-5">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-cocoa">
        QRIS Resmi Celmira Boutique
      </p>

      {qrisSrc ? (
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="w-full max-w-[190px] shrink-0 overflow-hidden rounded-2xl border border-cocoa/15 bg-white p-2.5">
            <img
              alt={
                config.qrisMerchantName
                  ? `QRIS resmi ${config.qrisMerchantName}`
                  : "QRIS resmi Celmira Boutique"
              }
              className="h-auto w-full object-contain"
              src={qrisSrc}
            />
          </div>
          <div className="space-y-2 text-xs leading-relaxed text-muted">
            {config.qrisMerchantName ? (
              <p className="text-sm font-semibold text-espresso">{config.qrisMerchantName}</p>
            ) : null}
            <p>{config.paymentInstructions}</p>
            {config.qrisUpdatedAt ? (
              <p className="text-[0.6875rem] text-muted">
                Diperbarui admin: {formatDateTimeId(config.qrisUpdatedAt)}
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-start gap-3 rounded-xl border border-rose/40 bg-ivory p-3.5 text-xs leading-relaxed text-muted">
          <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-cocoa" />
          <div>
            <p className="font-semibold text-espresso">QRIS resmi belum tersedia</p>
            <p className="mt-1">
              Admin belum mengunggah QRIS resmi Celmira Boutique. Demi keamanan, sistem tidak
              menampilkan QRIS atau nomor rekening pengganti. Silakan tunggu admin mengunggah QRIS
              resmi melalui panel Admin atau hubungi tim butik melalui halaman Chat.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function UploadedProofSummary({ record }: { record: PaymentRecord }) {
  if (!record.proofFileName) return null;

  return (
    <div className="mt-4 rounded-2xl border border-cocoa/14 bg-ivory p-4 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-medium text-espresso">
          <FileTextIcon className="h-4 w-4 text-cocoa" />
          <span>{record.proofFileName}</span>
          {record.proofSize ? (
            <span className="text-muted">({formatFileSize(record.proofSize)})</span>
          ) : null}
        </div>
        {record.proofUploadedAt ? (
          <span className="text-muted">Diunggah: {formatDateTimeId(record.proofUploadedAt)}</span>
        ) : null}
      </div>

      {record.proofPreviewDataUrl ? (
        record.proofMimeType === "application/pdf" ? (
          <div className="mt-3">
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
          <div className="mt-3 overflow-hidden rounded-xl border border-cocoa/12 bg-cream/30 p-2">
            <img
              alt={`Bukti pembayaran ${record.proofFileName}`}
              className="mx-auto max-h-48 rounded-lg object-contain"
              src={record.proofPreviewDataUrl}
            />
          </div>
        )
      ) : null}

      {record.customerNote ? (
        <p className="mt-2.5 text-muted">
          <strong className="font-medium text-espresso">Catatan pelanggan:</strong>{" "}
          {record.customerNote}
        </p>
      ) : null}

      {record.verificationStatus === "terverifikasi" && record.verifiedAt ? (
        <p className="mt-2.5 flex items-center gap-1.5 font-medium text-emerald-800">
          <CheckIcon className="h-4 w-4" />
          Diverifikasi admin pada {formatDateTimeId(record.verifiedAt)}
          {record.adminNote ? ` — ${record.adminNote}` : ""}
        </p>
      ) : null}

      {record.verificationStatus === "ditolak" ? (
        <p className="mt-2.5 rounded-xl border border-red-800/20 bg-red-50 px-3 py-2 font-medium text-red-900">
          Ditolak admin: {record.adminNote || "Bukti pembayaran belum sesuai."} Silakan unggah
          ulang bukti pembayaran yang benar.
        </p>
      ) : null}
    </div>
  );
}

export function InvoicePaymentPanel({
  order,
  paymentConfig,
  onRespondQuote,
  onUploadProof,
  isBusy = false,
  feedbackMessage,
  errorMessage,
}: InvoicePaymentPanelProps) {
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const latestDp = getLatestPaymentByStage(order, "dp");
  const latestSettlement = getLatestPaymentByStage(order, "pelunasan");
  const dpVerified = isPaymentVerified(order, "dp");
  const settlementVerified = isPaymentVerified(order, "pelunasan");
  const dpDeadline = getDpDeadlineState(order);
  const isCancelled = order.status === "dibatalkan";

  const canUploadDp =
    !isCancelled &&
    order.invoice.quoteStatus === "disetujui" &&
    !dpVerified &&
    latestDp?.verificationStatus !== "menunggu_verifikasi_admin";

  const canUploadSettlement =
    !isCancelled &&
    Boolean(order.invoice.settlementInvoiceNumber) &&
    !settlementVerified &&
    latestSettlement?.verificationStatus !== "menunggu_verifikasi_admin";

  return (
    <section className="space-y-5 rounded-[1.75rem] border border-cocoa/14 bg-ivory p-6 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-cocoa/10 pb-5">
        <div>
          <p className="text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-cocoa">
            Penawaran & Tagihan Resmi
          </p>
          <h3 className="mt-1 font-[family-name:var(--font-display)] text-xl text-espresso sm:text-2xl">
            Invoice & Pembayaran Dua Tahap
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Tahap 1: DP 50% biaya jahit sebelum produksi. Tahap 2: Pelunasan 50% sisa biaya jahit
            (ditambah ongkir terpisah jika menggunakan pengiriman) setelah jahitan selesai.
          </p>
        </div>

        <div className="rounded-2xl border border-cocoa/14 bg-cream/65 px-4 py-3 text-right">
          <p className="text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-cocoa">
            Harga Akhir Jahit
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-xl text-espresso">
            {formatRupiah(order.invoice.tailoringFee)}
          </p>
          <p className="mt-0.5 text-[0.6875rem] text-muted">
            {order.delivery.method === "pickup"
              ? "Ambil di butik · Ongkir Rp 0"
              : order.invoice.shippingFee !== null
                ? `Ongkir terpisah: ${formatRupiah(order.invoice.shippingFee)}`
                : "Ongkir ditetapkan terpisah oleh admin"}
          </p>
        </div>
      </div>

      {feedbackMessage ? (
        <div className="rounded-2xl border border-emerald-800/20 bg-emerald-50/85 px-4 py-3 text-xs font-medium text-emerald-900">
          {feedbackMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-2xl border border-red-800/20 bg-red-50/85 px-4 py-3 text-xs font-medium text-red-900">
          {errorMessage}
        </div>
      ) : null}

      {/* Status 0: Belum ada penawaran dari admin */}
      {order.invoice.quoteStatus === "belum_dikirim" ? (
        <div className="rounded-2xl border border-cocoa/14 bg-cream/55 p-5 text-sm leading-relaxed text-muted">
          <p className="font-medium text-espresso">Menunggu penawaran harga akhir dari admin</p>
          <p className="mt-1.5 text-xs">
            Tim Celmira Tailor sedang memeriksa detail kain, kerumitan model, dan ukuran Anda.
            Setelah harga akhir ditetapkan, Anda dapat menyetujui atau menolak penawaran langsung
            dari halaman ini.
          </p>
        </div>
      ) : null}

      {/* Status 1: Penawaran dikirim — Menunggu persetujuan pelanggan */}
      {order.invoice.quoteStatus === "menunggu_persetujuan" && !isCancelled ? (
        <div className="rounded-2xl border border-cocoa/25 bg-cream/75 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ReceiptIcon className="h-4 w-4 text-cocoa" />
              <h4 className="font-[family-name:var(--font-display)] text-lg text-espresso">
                Penawaran Harga Akhir Siap Ditinjau
              </h4>
            </div>
            <StatusBadge label="Menunggu Persetujuan Anda" tone="info" />
          </div>

          <dl className="mt-4 grid gap-3 rounded-2xl border border-cocoa/12 bg-ivory p-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted">
                Total Biaya Jahit
              </dt>
              <dd className="mt-1 font-semibold text-espresso">
                {formatRupiah(order.invoice.tailoringFee)}
              </dd>
            </div>
            <div>
              <dt className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted">
                DP 50% (Tahap 1)
              </dt>
              <dd className="mt-1 font-semibold text-espresso">
                {formatRupiah(order.invoice.dpAmount)}
              </dd>
            </div>
            <div>
              <dt className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted">
                Sisa 50% + Pengiriman
              </dt>
              <dd className="mt-1 font-medium text-espresso">
                {formatRupiah(order.invoice.settlementTailoringAmount)}
                <span className="block text-[0.6875rem] text-muted">
                  {order.delivery.method === "pickup"
                    ? "Tanpa ongkir (ambil di butik)"
                    : order.invoice.shippingFee !== null
                      ? `+ ongkir ${formatRupiah(order.invoice.shippingFee)}`
                      : "+ ongkir aktual saat selesai jahit"}
                </span>
              </dd>
            </div>
          </dl>

          {order.estimatedCompletionDate ? (
            <p className="mt-3 text-xs text-muted">
              <strong className="font-medium text-espresso">Estimasi selesai:</strong>{" "}
              {formatDateOnlyId(order.estimatedCompletionDate)}
            </p>
          ) : null}

          {order.invoice.quoteNote ? (
            <p className="mt-2 text-xs leading-relaxed text-muted">
              <strong className="font-medium text-espresso">Catatan admin:</strong>{" "}
              {order.invoice.quoteNote}
            </p>
          ) : null}

          <p className="mt-3 text-xs leading-relaxed text-muted">
            Dengan menyetujui penawaran, sistem akan menerbitkan{" "}
            <strong className="font-medium text-espresso">Invoice DP sebesar 50% biaya jahit</strong>{" "}
            dengan batas pembayaran{" "}
            <strong className="font-medium text-espresso">{paymentConfig.dpWindowHours} jam</strong>.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              className={buttonClass("solid")}
              disabled={isBusy}
              onClick={() => void onRespondQuote("approve")}
              type="button"
            >
              {isBusy ? "Memproses..." : "Setujui Penawaran & Terbitkan Invoice DP"}
            </button>
            <button
              className={buttonClass("outline")}
              disabled={isBusy}
              onClick={() => setShowRejectBox((prev) => !prev)}
              type="button"
            >
              Tolak Penawaran
            </button>
          </div>

          {showRejectBox ? (
            <div className="mt-4 rounded-2xl border border-cocoa/15 bg-ivory p-4">
              <label
                className="block text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-muted"
                htmlFor="quote-reject-reason"
              >
                Alasan Penolakan (Opsional)
              </label>
              <textarea
                className="mt-1.5 w-full rounded-xl border border-cocoa/20 bg-ivory px-3.5 py-2.5 text-sm text-espresso focus:border-cocoa focus:outline-none"
                id="quote-reject-reason"
                onChange={(event) => setRejectionReason(event.target.value)}
                placeholder="Contoh: Ingin menyesuaikan pilihan bahan agar biaya lebih sesuai anggaran."
                rows={2}
                value={rejectionReason}
              />
              <div className="mt-3 flex justify-end gap-2">
                <button
                  className="rounded-full px-4 py-2 text-xs text-muted hover:text-espresso"
                  onClick={() => setShowRejectBox(false)}
                  type="button"
                >
                  Batal
                </button>
                <button
                  className="rounded-full border border-red-800/30 bg-red-50 px-5 py-2 text-xs font-medium text-red-900 transition-colors hover:bg-red-100"
                  onClick={() => {
                    onRespondQuote("reject", rejectionReason);
                    setShowRejectBox(false);
                    setRejectionReason("");
                  }}
                  type="button"
                >
                  Konfirmasi Tolak Penawaran
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {order.invoice.quoteStatus === "ditolak" ? (
        <div className="rounded-2xl border border-red-800/20 bg-red-50/70 p-5 text-xs leading-relaxed text-red-900">
          <p className="font-semibold">Penawaran harga sebelumnya ditolak.</p>
          {order.invoice.quoteRejectionReason ? (
            <p className="mt-1">Catatan: {order.invoice.quoteRejectionReason}</p>
          ) : null}
          <p className="mt-1.5 text-red-900/80">
            Admin dapat meninjau ulang dan mengirimkan penawaran baru apabila Anda ingin berdiskusi
            lebih lanjut.
          </p>
        </div>
      ) : null}

      {/* TAHAP 1: INVOICE DP (50% BIAYA JAHIT) */}
      {order.invoice.quoteStatus === "disetujui" && order.invoice.dpAmount !== null ? (
        <article className="rounded-2xl border border-cocoa/18 bg-cream/45 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-cocoa/12 pb-4">
            <div>
              <p className="text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-cocoa">
                Tahap 1 · Invoice Uang Muka (DP 50%)
              </p>
              <h4 className="mt-1 font-[family-name:var(--font-display)] text-lg text-espresso">
                {order.invoice.dpInvoiceNumber || `INV-DP-${order.orderCode}`}
              </h4>
              <p className="mt-0.5 text-[0.6875rem] text-muted">
                Diterbitkan: {formatDateTimeId(order.invoice.dpIssuedAt)}
              </p>
            </div>
            <StatusBadge
              label={verificationStatusBadge(latestDp).label}
              tone={verificationStatusBadge(latestDp).tone}
            />
          </div>

          {/* Rincian nominal DP */}
          <div className="mt-4 space-y-2 rounded-2xl border border-cocoa/12 bg-ivory p-4 text-sm">
            <div className="flex items-center justify-between gap-4 text-muted">
              <span>Total Biaya Jahit Disetujui</span>
              <span>{formatRupiah(order.invoice.tailoringFee)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-cocoa/10 pt-2.5 font-semibold text-espresso">
              <span>Tagihan DP (50% Biaya Jahit)</span>
              <span className="font-[family-name:var(--font-display)] text-lg">
                {formatRupiah(order.invoice.dpAmount)}
              </span>
            </div>
            <p className="text-[0.6875rem] text-muted">
              Biaya pengiriman tidak ditagihkan pada tahap DP. Sisa 50% biaya jahit dan ongkos
              kirim (jika dikirim) ditagihkan pada Invoice Pelunasan.
            </p>
          </div>

          {/* Status batas waktu 24 jam */}
          <div
            className={`mt-4 flex items-start gap-3 rounded-2xl border p-4 text-xs leading-relaxed ${
              dpDeadline.protectedByProofUpload
                ? "border-emerald-800/20 bg-emerald-50/75 text-emerald-900"
                : dpDeadline.requiresAdminReview
                  ? "border-red-800/20 bg-red-50/75 text-red-900"
                  : "border-cocoa/15 bg-ivory text-muted"
            }`}
          >
            {dpDeadline.protectedByProofUpload ? (
              <ShieldIcon className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <ClockIcon className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <div>
              <p className="font-semibold">
                {dpDeadline.protectedByProofUpload
                  ? "Terlindungi dari pembatalan otomatis"
                  : dpDeadline.requiresAdminReview
                    ? "Melewati batas waktu 24 jam"
                    : "Batas waktu pembayaran DP (24 jam)"}
              </p>
              <p className="mt-0.5">{dpDeadline.summary}</p>
            </div>
          </div>

          {!dpVerified && !isCancelled ? (
            <div className="mt-4">
              <OfficialQrisBox config={paymentConfig} />
            </div>
          ) : null}

          {latestDp ? <UploadedProofSummary record={latestDp} /> : null}

          {canUploadDp ? (
            <PaymentProofUploader
              disabled={isCancelled || isBusy}
              onUpload={onUploadProof}
              stage="dp"
            />
          ) : null}
        </article>
      ) : null}

      {/* TAHAP 2: INVOICE PELUNASAN */}
      {order.invoice.quoteStatus === "disetujui" ? (
        <article className="rounded-2xl border border-cocoa/18 bg-cream/45 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-cocoa/12 pb-4">
            <div>
              <p className="text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-cocoa">
                Tahap 2 · Invoice Pelunasan
              </p>
              <h4 className="mt-1 font-[family-name:var(--font-display)] text-lg text-espresso">
                {order.invoice.settlementInvoiceNumber || "Belum Diterbitkan"}
              </h4>
              {order.invoice.settlementIssuedAt ? (
                <p className="mt-0.5 text-[0.6875rem] text-muted">
                  Diterbitkan: {formatDateTimeId(order.invoice.settlementIssuedAt)}
                </p>
              ) : null}
            </div>
            <StatusBadge
              label={
                order.invoice.settlementInvoiceNumber
                  ? verificationStatusBadge(latestSettlement).label
                  : "Menunggu Jahitan Selesai"
              }
              tone={
                order.invoice.settlementInvoiceNumber
                  ? verificationStatusBadge(latestSettlement).tone
                  : "neutral"
              }
            />
          </div>

          {!order.invoice.settlementInvoiceNumber ? (
            <p className="mt-4 text-xs leading-relaxed text-muted">
              Invoice pelunasan (sisa 50% biaya jahit
              {order.delivery.method === "shipping"
                ? " + biaya pengiriman terpisah berdasarkan tarif kurir resmi"
                : ", tanpa biaya pengiriman karena ambil sendiri di butik"}
              ) akan diterbitkan oleh admin setelah busana selesai dikerjakan dan lulus quality
              control.
            </p>
          ) : (
            <>
              <div className="mt-4 space-y-2 rounded-2xl border border-cocoa/12 bg-ivory p-4 text-sm">
                <div className="flex items-center justify-between gap-4 text-muted">
                  <span>Sisa Biaya Jahit (50%)</span>
                  <span>{formatRupiah(order.invoice.settlementTailoringAmount)}</span>
                </div>
                <div className="flex items-center justify-between gap-4 text-muted">
                  <span>
                    {order.delivery.method === "shipping"
                      ? "Biaya Pengiriman (Terpisah)"
                      : "Biaya Pengiriman (Ambil Sendiri di Butik)"}
                  </span>
                  <span>
                    {order.delivery.method === "shipping"
                      ? formatRupiah(order.invoice.shippingFee)
                      : "Rp 0 (Gratis)"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-cocoa/10 pt-2.5 font-semibold text-espresso">
                  <span>Total Tagihan Pelunasan</span>
                  <span className="font-[family-name:var(--font-display)] text-lg">
                    {formatRupiah(order.invoice.settlementTotalAmount)}
                  </span>
                </div>
              </div>

              {!settlementVerified && !isCancelled ? (
                <div className="mt-4">
                  <OfficialQrisBox config={paymentConfig} />
                </div>
              ) : null}

              {latestSettlement ? <UploadedProofSummary record={latestSettlement} /> : null}

              {canUploadSettlement ? (
                <PaymentProofUploader
                  disabled={isCancelled || isBusy}
                  onUpload={onUploadProof}
                  stage="pelunasan"
                />
              ) : null}
            </>
          )}
        </article>
      ) : null}
    </section>
  );
}
