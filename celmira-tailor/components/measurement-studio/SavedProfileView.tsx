"use client";

import { MannequinPreview } from "@/components/measurement-studio/MannequinPreview";
import { ButtonLink, buttonClass } from "@/components/ui/ButtonLink";
import { ArrowLeft, ArrowRight, CheckIcon, TrashIcon } from "@/components/ui/icons";
import { formatSavedDate } from "@/lib/design-studio";
import {
  buildMeasurementOrderHref,
  getMeasurementCategoryName,
  getMeasurementTemplateById,
  summarizeMeasurementProfile,
} from "@/lib/measurement-studio";
import type {
  MeasurementProfile,
  MeasurementTemplateConfig,
} from "@/lib/types/tailor";

type SavedProfileViewProps = {
  profile: MeasurementProfile;
  templates: MeasurementTemplateConfig[];
  statusMessage?: string | null;
  onEditProfile: (profile: MeasurementProfile) => void;
  onDeleteProfile: (profile: MeasurementProfile) => void;
};

export function SavedProfileView({
  profile,
  templates,
  statusMessage,
  onEditProfile,
  onDeleteProfile,
}: SavedProfileViewProps) {
  const activeTemplate = getMeasurementTemplateById(profile.templateId, templates);
  const measurementRows = summarizeMeasurementProfile(profile, templates);

  return (
    <div className="shell pb-16 pt-10 sm:pb-20 sm:pt-14">
      <div className="mx-auto max-w-4xl">
        {/* Header Profil Ukuran Tersimpan */}
        <div className="flex flex-col gap-3 pb-8">
          <div className="flex flex-wrap items-center gap-3">
            <p className="eyebrow">Profil Ukuran Tersimpan</p>
            <span className="inline-flex items-center gap-1 rounded-full bg-espresso px-3 py-1 text-[0.625rem] font-medium uppercase tracking-[0.14em] text-ivory">
              <CheckIcon className="h-3.5 w-3.5" />
              Siap Digunakan
            </span>
          </div>
          <h1 className="text-balance text-[2rem] leading-[1.12] text-espresso sm:text-[2.6rem]">
            {profile.label}
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted">
            Profil ukuran Anda tersimpan di perangkat ini dan dapat langsung diterapkan ke formulir
            pemesanan Celmira Tailor.
          </p>
        </div>

        {statusMessage ? (
          <p
            className="mb-6 rounded-xl border border-cocoa/25 bg-cream/75 px-4 py-3 text-xs leading-relaxed text-espresso"
            role="status"
          >
            {statusMessage}
          </p>
        ) : null}

        {/* Kartu Ringkasan Profil Tunggal */}
        <section className="rounded-[2rem] border border-cocoa/15 bg-cream/55 p-6 sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_15.5rem] lg:items-start">
            {/* Detail Profil & Ukuran */}
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-cocoa/12 pb-5">
                <div className="flex flex-col gap-1">
                  <p className="text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-cocoa">
                    Identitas Profil
                  </p>
                  <h2 className="font-[family-name:var(--font-display)] text-2xl text-espresso">
                    {profile.label}
                  </h2>
                  <p className="text-sm text-muted">
                    Kategori pakaian:{" "}
                    <strong className="font-medium text-espresso">
                      {getMeasurementCategoryName(profile.categoryHint)}
                    </strong>{" "}
                    · Template{" "}
                    <strong className="font-medium text-espresso">{activeTemplate.name}</strong>
                  </p>
                </div>
                <span className="rounded-full border border-cocoa/20 bg-ivory px-3 py-1 text-[0.625rem] font-medium uppercase tracking-[0.14em] text-cocoa">
                  Diperbarui {formatSavedDate(profile.updatedAt)}
                </span>
              </div>

              <div>
                <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-cocoa">
                  Ukuran Tersimpan (cm)
                </p>

                <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {measurementRows.map((row) => (
                    <div
                      className="rounded-2xl border border-cocoa/12 bg-ivory px-4 py-3.5"
                      key={row.key}
                    >
                      <dt className="text-[0.625rem] uppercase tracking-[0.14em] text-muted">
                        {row.label}
                      </dt>
                      <dd className="mt-1 font-[family-name:var(--font-display)] text-xl text-espresso">
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              {profile.notes ? (
                <div className="rounded-2xl border border-cocoa/12 bg-ivory/85 p-4 text-xs leading-relaxed">
                  <p className="font-semibold uppercase tracking-[0.14em] text-cocoa">
                    Catatan Postur &amp; Kelonggaran
                  </p>
                  <p className="mt-1.5 text-espresso">{profile.notes}</p>
                </div>
              ) : null}

              {/* Dua Tombol Utama */}
              <div className="flex flex-col gap-3 border-t border-cocoa/12 pt-5 sm:flex-row sm:items-center">
                <ButtonLink
                  className="w-full sm:w-auto"
                  href={buildMeasurementOrderHref(profile.id)}
                >
                  Gunakan untuk Pesanan
                  <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-1" />
                </ButtonLink>

                <button
                  className={buttonClass("outline", "w-full cursor-pointer sm:w-auto")}
                  onClick={() => onEditProfile(profile)}
                  type="button"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Edit Ukuran
                </button>

                <button
                  aria-label={`Hapus profil ${profile.label}`}
                  className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full border border-cocoa/15 px-4 py-3 text-xs font-medium text-muted transition-colors hover:border-rose/60 hover:text-rose sm:ml-auto"
                  onClick={() => onDeleteProfile(profile)}
                  type="button"
                >
                  <TrashIcon className="h-4 w-4" />
                  Hapus
                </button>
              </div>
            </div>

            {/* Visualisasi Proporsi Mannequin Ringkas */}
            <div className="rounded-2xl border border-cocoa/12 bg-ivory p-3.5">
              <p className="text-center text-[0.5625rem] font-semibold uppercase tracking-[0.18em] text-cocoa">
                Proporsi {activeTemplate.shortLabel}
              </p>
              <div className="mt-2 aspect-[3/4] w-full">
                <MannequinPreview
                  activeFieldKey={null}
                  extraValues={profile.extraValues ?? {}}
                  template={activeTemplate}
                  values={profile.values}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-cocoa/12 bg-ivory/80 p-4 text-xs leading-relaxed text-muted">
            <strong className="font-semibold text-espresso">Catatan atelier:</strong> Saat Anda
            menekan <em>“Gunakan untuk Pesanan”</em>, kategori pakaian, seluruh ukuran (cm), dan
            catatan profil akan langsung terpasang di formulir pemesanan. Tim produksi Celmira tetap
            meninjau kesesuaian ukuran sebelum pemotongan bahan.
          </div>
        </section>
      </div>
    </div>
  );
}
