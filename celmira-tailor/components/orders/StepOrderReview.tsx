"use client";

import Link from "next/link";
import { celmiraDesignReferences, getCategoryById } from "@/lib/booking-options";
import { getMeasurementTemplateById } from "@/lib/measurement-studio";
import type { DesignStudioSavedConfig, OrderDraft } from "@/lib/types/tailor";

type StepOrderReviewProps = {
  draft: OrderDraft;
  savedDesigns: DesignStudioSavedConfig[];
  errors: Record<string, string>;
  onJumpToStep: (step: number) => void;
  onToggleAgreed: (agreed: boolean) => void;
};

export function StepOrderReview({
  draft,
  savedDesigns,
  errors,
  onJumpToStep,
  onToggleAgreed,
}: StepOrderReviewProps) {
  const category = getCategoryById(draft.categoryId);
  const celmiraRef = celmiraDesignReferences.find(
    (item) => item.id === draft.selectedCelmiraDesignId
  );
  const studioRef = savedDesigns.find((item) => item.id === draft.selectedStudioDesignId);

  const designTitle =
    draft.designSource === "celmira"
      ? celmiraRef?.title ?? "-"
      : draft.designSource === "design-studio"
        ? studioRef?.title ?? "-"
        : draft.customDesignTitle.trim() || "Upload desain custom";

  const extraMeasurementEntries: Array<[string, string]> =
    draft.measurements.templateId && draft.measurements.extraValues
      ? getMeasurementTemplateById(draft.measurements.templateId)
          .fields.filter((field) => field.storageTarget === "extra")
          .map((field): [string, string] => [
            field.label,
            draft.measurements.extraValues?.[field.key] ?? "",
          ])
          .filter(([, val]) => val.trim().length > 0)
      : [];

  const measurementEntries = [
    ["Lingkar badan / dada", draft.measurements.values.bust],
    ["Lingkar pinggang", draft.measurements.values.waist],
    ["Lingkar panggul", draft.measurements.values.hip],
    ["Lebar bahu", draft.measurements.values.shoulderWidth],
    ["Panjang lengan", draft.measurements.values.sleeveLength],
    ["Panjang busana", draft.measurements.values.garmentLength],
    ["Lingkar leher", draft.measurements.values.neckCircumference],
    ...extraMeasurementEntries,
  ].filter(([, val]) => val.trim().length > 0);

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <p className="eyebrow">Langkah 5</p>
        <h2 className="text-2xl text-espresso sm:text-[1.75rem]">
          Periksa ringkasan pesanan Anda
        </h2>
        <p className="text-sm leading-relaxed text-muted">
          Pastikan seluruh detail kategori, desain, bahan, ukuran, dan data kontak sudah tepat
          sebelum mengajukan pesanan ke tim Celmira.
        </p>
      </div>

      {/* Ringkasan Kategori & Desain */}
      <section className="rounded-2xl border border-cocoa/15 bg-ivory p-5">
        <div className="flex items-center justify-between gap-4 border-b border-cocoa/10 pb-3">
          <h3 className="font-[family-name:var(--font-display)] text-lg text-espresso">
            1. Kategori &amp; Acuan Desain
          </h3>
          <button
            className="text-xs font-medium text-cocoa underline underline-offset-4 hover:text-espresso"
            onClick={() => onJumpToStep(1)}
            type="button"
          >
            Ubah
          </button>
        </div>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted">Kategori</dt>
            <dd className="font-medium text-espresso">{category?.name ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted">Acuan Model</dt>
            <dd className="font-medium text-espresso">{designTitle}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted">
              Lampiran Referensi
            </dt>
            <dd className="text-espresso">
              {draft.attachments.length === 0
                ? "Tidak ada file tambahan"
                : draft.attachments.map((f) => f.name).join(", ")}
            </dd>
          </div>
        </dl>
      </section>

      {/* Ringkasan Detail Busana */}
      <section className="rounded-2xl border border-cocoa/15 bg-ivory p-5">
        <div className="flex items-center justify-between gap-4 border-b border-cocoa/10 pb-3">
          <h3 className="font-[family-name:var(--font-display)] text-lg text-espresso">
            2. Kain, Warna &amp; Finishing
          </h3>
          <button
            className="text-xs font-medium text-cocoa underline underline-offset-4 hover:text-espresso"
            onClick={() => onJumpToStep(2)}
            type="button"
          >
            Ubah
          </button>
        </div>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted">Kain</dt>
            <dd className="font-medium text-espresso">
              {draft.specifications.fabric}
              {draft.specifications.customFabricNote
                ? ` (${draft.specifications.customFabricNote})`
                : ""}
            </dd>
          </div>
          <div>
            <dt className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted">Warna</dt>
            <dd className="flex items-center gap-2 font-medium text-espresso">
              <span
                className="inline-block h-4 w-4 rounded-full border border-cocoa/25"
                style={{ backgroundColor: draft.specifications.colorHex }}
              />
              {draft.specifications.colorName}
            </dd>
          </div>
          <div>
            <dt className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted">
              Lengan &amp; Kerah
            </dt>
            <dd className="text-espresso">
              {draft.specifications.sleeveStyle} · {draft.specifications.collarStyle}
            </dd>
          </div>
          <div>
            <dt className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted">Panjang</dt>
            <dd className="text-espresso">{draft.specifications.lengthOption}</dd>
          </div>
          <div>
            <dt className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted">
              Renda &amp; Bordir
            </dt>
            <dd className="text-espresso">
              {draft.specifications.laceDetail} · {draft.specifications.embroideryDetail}
            </dd>
          </div>
          <div>
            <dt className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted">
              Kancing &amp; Resleting
            </dt>
            <dd className="text-espresso">
              {draft.specifications.buttonStyle} · {draft.specifications.zipperStyle}
            </dd>
          </div>
          {draft.specifications.notes ? (
            <div className="sm:col-span-2">
              <dt className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted">Catatan</dt>
              <dd className="text-espresso">{draft.specifications.notes}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      {/* Ringkasan Ukuran */}
      <section className="rounded-2xl border border-cocoa/15 bg-ivory p-5">
        <div className="flex items-center justify-between gap-4 border-b border-cocoa/10 pb-3">
          <h3 className="font-[family-name:var(--font-display)] text-lg text-espresso">
            3. Ukuran Pelanggan
          </h3>
          <button
            className="text-xs font-medium text-cocoa underline underline-offset-4 hover:text-espresso"
            onClick={() => onJumpToStep(3)}
            type="button"
          >
            Ubah
          </button>
        </div>

        {draft.measurements.mode === "sample_garment" ? (
          <div className="mt-3 text-sm">
            <p className="font-medium text-espresso">Metode: Replikasi Baju Contoh</p>
            <p className="mt-1 text-muted">{draft.measurements.sampleGarmentNote}</p>
          </div>
        ) : (
          <div className="mt-3">
            {draft.measurements.mode === "profile" && draft.measurements.profileName ? (
              <p className="mb-3 text-xs text-muted">
                Profil tersimpan:{" "}
                <strong className="font-semibold text-espresso">
                  {draft.measurements.profileName}
                </strong>
                {draft.measurements.templateId
                  ? ` (${getMeasurementTemplateById(draft.measurements.templateId).shortLabel})`
                  : ""}
              </p>
            ) : null}
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              {measurementEntries.map(([label, val]) => (
                <div key={label}>
                  <dt className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted">{label}</dt>
                  <dd className="font-medium text-espresso">{val} cm</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {draft.measurements.fitPreferenceNote ? (
          <p className="mt-3 border-t border-cocoa/10 pt-2.5 text-xs text-muted">
            Preferensi fitting: {draft.measurements.fitPreferenceNote}
          </p>
        ) : null}
      </section>

      {/* Ringkasan Identitas & Pengiriman */}
      <section className="rounded-2xl border border-cocoa/15 bg-ivory p-5">
        <div className="flex items-center justify-between gap-4 border-b border-cocoa/10 pb-3">
          <h3 className="font-[family-name:var(--font-display)] text-lg text-espresso">
            4. Identitas, Penyerahan &amp; Target
          </h3>
          <button
            className="text-xs font-medium text-cocoa underline underline-offset-4 hover:text-espresso"
            onClick={() => onJumpToStep(4)}
            type="button"
          >
            Ubah
          </button>
        </div>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted">Nama</dt>
            <dd className="font-medium text-espresso">{draft.customer.fullName}</dd>
          </div>
          <div>
            <dt className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted">WhatsApp</dt>
            <dd className="font-medium text-espresso">{draft.customer.whatsapp}</dd>
          </div>
          {draft.customer.email ? (
            <div>
              <dt className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted">Email</dt>
              <dd className="text-espresso">{draft.customer.email}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted">
              Target Selesai
            </dt>
            <dd className="font-medium text-espresso">{draft.targetDate}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted">Penyerahan</dt>
            <dd className="text-espresso">
              {draft.delivery.method === "pickup"
                ? "Ambil di Butik Celmira (Bayen RT 2, Purwomartani, Kalasan, Sleman)"
                : `Kirim ke ${draft.delivery.addressLine}, ${draft.delivery.city}${
                    draft.delivery.postalCode ? ` ${draft.delivery.postalCode}` : ""
                  }`}
            </dd>
          </div>
        </dl>
      </section>

      {/* Persetujuan Alur Penawaran & DP */}
      <div className="rounded-2xl border border-cocoa/20 bg-cream/60 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cocoa">
          Ketentuan Penawaran &amp; Pembayaran
        </p>
        <ul className="mt-2.5 flex list-disc flex-col gap-1.5 pl-4 text-xs leading-relaxed text-muted">
          <li>Tim Celmira meninjau detail pesanan lalu mengirim penawaran biaya jahit.</li>
          <li>
            Setelah Anda menyetujui penawaran, DP sebesar 50% biaya jahit dibayarkan dalam batas
            waktu 24 jam dengan mengunggah bukti pembayaran QRIS untuk diverifikasi manual oleh
            admin.
          </li>
          <li>Pesanan baru masuk antrean produksi setelah DP diverifikasi admin.</li>
          <li>
            Pelunasan 50% biaya jahit beserta invoice biaya pengiriman (terpisah) ditagihkan
            setelah jahitan selesai.
          </li>
        </ul>

        <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-espresso">
          <input
            checked={draft.agreedToTerms}
            className="mt-1 h-4 w-4 accent-espresso"
            onChange={(e) => onToggleAgreed(e.target.checked)}
            type="checkbox"
          />
          <span>
            Saya telah memeriksa seluruh detail pesanan di atas dan memahami{" "}
            <Link className="underline underline-offset-4 hover:text-cocoa" href="/syarat-ketentuan">
              Syarat &amp; Ketentuan
            </Link>{" "}
            serta{" "}
            <Link className="underline underline-offset-4 hover:text-cocoa" href="/kebijakan-privasi">
              Kebijakan Privasi
            </Link>{" "}
            Celmira Tailor (alur penawaran, DP 50% verifikasi manual, dan pelunasan terpisah dengan
            biaya pengiriman).
          </span>
        </label>
        {errors.agreedToTerms ? (
          <p className="mt-2 text-xs font-medium text-espresso" role="alert">
            {errors.agreedToTerms}
          </p>
        ) : null}
      </div>
    </div>
  );
}
