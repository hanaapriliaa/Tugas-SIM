"use client";

import { celmiraDesignReferences, getCategoryById } from "@/lib/booking-options";
import type { DesignStudioSavedConfig, OrderDraft } from "@/lib/types/tailor";

type BookingSummarySidebarProps = {
  draft: OrderDraft;
  savedDesigns: DesignStudioSavedConfig[];
};

export function BookingSummarySidebar({ draft, savedDesigns }: BookingSummarySidebarProps) {
  const category = getCategoryById(draft.categoryId);
  const celmiraRef = celmiraDesignReferences.find(
    (item) => item.id === draft.selectedCelmiraDesignId
  );
  const studioRef = savedDesigns.find((item) => item.id === draft.selectedStudioDesignId);

  const designLabel =
    draft.designSource === "celmira"
      ? celmiraRef?.title ?? "Belum dipilih"
      : draft.designSource === "design-studio"
        ? studioRef?.title ?? "Belum dipilih"
        : draft.customDesignTitle.trim() || "Upload desain custom";

  const filledMeasurements = Object.values(draft.measurements.values).filter(
    (v) => v.trim().length > 0
  ).length;

  const measurementLabel =
    draft.measurements.mode === "sample_garment"
      ? "Replikasi baju contoh"
      : draft.measurements.mode === "profile"
        ? draft.measurements.profileName || "Profil tersimpan"
        : filledMeasurements > 0
          ? `${filledMeasurements} ukuran diisi`
          : "Belum diisi";

  const rows = [
    { label: "Kategori", value: category?.name ?? "Belum dipilih" },
    { label: "Model / Desain", value: designLabel },
    {
      label: "Lampiran",
      value:
        draft.attachments.length > 0 ? `${draft.attachments.length} file referensi` : "Tidak ada",
    },
    { label: "Kain", value: draft.specifications.fabric || "Belum dipilih" },
    { label: "Warna", value: draft.specifications.colorName || "Belum dipilih" },
    { label: "Lengan", value: draft.specifications.sleeveStyle || "-" },
    { label: "Kerah", value: draft.specifications.collarStyle || "-" },
    { label: "Ukuran", value: measurementLabel },
    {
      label: "Penyerahan",
      value: draft.delivery.method === "pickup" ? "Ambil di Butik Celmira" : "Kirim ke Alamat",
    },
    { label: "Target Selesai", value: draft.targetDate || "Belum ditentukan" },
  ];

  return (
    <aside className="lg:sticky lg:top-28 lg:self-start">
      <div className="rounded-[1.75rem] border border-cocoa/15 bg-cream/65 p-6 sm:p-7">
        <div className="flex items-start justify-between gap-3 border-b border-cocoa/12 pb-4">
          <div>
            <p className="text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-cocoa">
              Ringkasan Draft
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl text-espresso">
              Pesanan Custom
            </h2>
          </div>
          <span
            aria-label={draft.specifications.colorName}
            className="h-6 w-6 shrink-0 rounded-full border border-cocoa/25"
            style={{ backgroundColor: draft.specifications.colorHex || "#d9bdb2" }}
            title={draft.specifications.colorName}
          />
        </div>

        <dl className="mt-4 divide-y divide-cocoa/10 text-sm">
          {rows.map((row) => (
            <div className="flex items-baseline justify-between gap-4 py-2.5" key={row.label}>
              <dt className="shrink-0 text-[0.6875rem] uppercase tracking-[0.14em] text-muted">
                {row.label}
              </dt>
              <dd className="text-right font-medium text-espresso">{row.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-5 rounded-2xl border border-cocoa/12 bg-ivory/85 p-4 text-xs leading-relaxed text-muted">
          <p className="font-semibold uppercase tracking-[0.14em] text-cocoa">Alur Biaya & DP</p>
          <p className="mt-1.5">
            Belum ada tagihan saat pengajuan. Tim Celmira mengirim penawaran terlebih dahulu; jika
            disetujui, DP 50% biaya jahit dibayarkan dalam 24 jam (verifikasi manual), lalu
            pelunasan 50% + ongkos kirim terpisah setelah busana selesai.
          </p>
        </div>
      </div>
    </aside>
  );
}
