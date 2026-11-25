"use client";

import Link from "next/link";
import { getRequiredMeasurementKeys } from "@/lib/booking-validation";
import {
  buildMeasurementStudioHref,
  getMeasurementTemplateById,
  summarizeMeasurementProfile,
} from "@/lib/measurement-studio";
import type {
  CustomerMeasurements,
  GarmentCategoryId,
  MeasurementInputMode,
  MeasurementProfile,
  MeasurementValues,
} from "@/lib/types/tailor";

type StepMeasurementsProps = {
  categoryId: GarmentCategoryId | "";
  measurements: CustomerMeasurements;
  profiles: MeasurementProfile[];
  errors: Record<string, string>;
  onChangeMode: (mode: MeasurementInputMode) => void;
  onChangeValue: (key: keyof MeasurementValues, value: string) => void;
  onSelectProfile: (profile: MeasurementProfile) => void;
  onChangeSampleNote: (note: string) => void;
  onChangeFitNote: (note: string) => void;
};

const MEASUREMENT_FIELDS: Array<{
  key: keyof MeasurementValues;
  label: string;
  hint: string;
  placeholder: string;
}> = [
  {
    key: "bust",
    label: "Lingkar badan / dada",
    hint: "Diukur melingkar pada bagian dada terlebar",
    placeholder: "92",
  },
  {
    key: "waist",
    label: "Lingkar pinggang",
    hint: "Diukur pada lekuk pinggang tanpa menarik pita ukur",
    placeholder: "74",
  },
  {
    key: "hip",
    label: "Lingkar panggul",
    hint: "Diukur melingkar sejajar lantai pada bagian terlebar",
    placeholder: "98",
  },
  {
    key: "shoulderWidth",
    label: "Lebar bahu",
    hint: "Dari ujung tulang bahu kiri ke bahu kanan",
    placeholder: "38",
  },
  {
    key: "sleeveLength",
    label: "Panjang lengan",
    hint: "Dari ujung bahu mengikuti lekuk siku hingga pergelangan",
    placeholder: "56",
  },
  {
    key: "garmentLength",
    label: "Panjang busana",
    hint: "Dari titik bahu tertinggi sampai panjang yang diinginkan",
    placeholder: "135",
  },
  {
    key: "neckCircumference",
    label: "Lingkar leher",
    hint: "Opsional — disarankan untuk kerah Shanghai atau kemeja",
    placeholder: "36",
  },
];

export function StepMeasurements({
  categoryId,
  measurements,
  profiles,
  errors,
  onChangeMode,
  onChangeValue,
  onSelectProfile,
  onChangeSampleNote,
  onChangeFitNote,
}: StepMeasurementsProps) {
  const requiredKeys = getRequiredMeasurementKeys(categoryId);

  const modes: Array<{ id: MeasurementInputMode; title: string; subtitle: string }> = [
    { id: "manual", title: "Isi Ukuran Manual", subtitle: "Masukkan angka ukuran (cm)" },
    {
      id: "profile",
      title: "Profil Tersimpan",
      subtitle: `${profiles.length} profil dari Measurement Studio`,
    },
    {
      id: "sample_garment",
      title: "Replikasi Baju Contoh",
      subtitle: "Untuk pelanggan jauh atau kirim baju nyaman",
    },
  ];

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <p className="eyebrow">Langkah 3</p>
        <h2 className="text-2xl text-espresso sm:text-[1.75rem]">Ukuran pelanggan</h2>
        <p className="text-sm leading-relaxed text-muted">
          Masukkan ukuran badan dalam satuan sentimeter (cm), pilih profil yang sudah tersimpan,
          atau gunakan metode replikasi baju contoh. Tim produksi tetap meninjau ukuran sebelum
          pemotongan kain.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3" role="tablist">
        {modes.map((mode) => {
          const active = measurements.mode === mode.id;
          return (
            <button
              aria-selected={active}
              className={`cursor-pointer rounded-2xl border p-4 text-left transition-all ${
                active
                  ? "border-espresso bg-espresso text-ivory"
                  : "border-cocoa/15 bg-ivory text-espresso hover:border-cocoa/45"
              }`}
              key={mode.id}
              onClick={() => onChangeMode(mode.id)}
              role="tab"
              type="button"
            >
              <span className="block text-sm font-medium">{mode.title}</span>
              <span
                className={`mt-1 block text-[0.6875rem] ${
                  active ? "text-ivory/80" : "text-muted"
                }`}
              >
                {mode.subtitle}
              </span>
            </button>
          );
        })}
      </div>

      {measurements.mode === "profile" ? (
        <div className="rounded-2xl border border-cocoa/15 bg-cream/40 p-5">
          {profiles.length === 0 ? (
            <div>
              <p className="font-[family-name:var(--font-display)] text-lg text-espresso">
                Belum ada profil ukuran tersimpan
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                Anda dapat mengisi ukuran secara manual di tab pertama, atau membuat profil ukuran
                terlebih dahulu di Measurement Studio.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  className="rounded-full bg-espresso px-5 py-2 text-xs font-medium uppercase tracking-[0.14em] text-ivory"
                  onClick={() => onChangeMode("manual")}
                  type="button"
                >
                  Isi Manual Sekarang
                </button>
                <Link
                  className="rounded-full border border-cocoa/35 px-5 py-2 text-xs font-medium uppercase tracking-[0.14em] text-espresso hover:border-espresso"
                  href="/measurement-studio"
                >
                  Buka Measurement Studio
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cocoa">
                  Pilih Profil Ukuran
                </p>
                <Link
                  className="text-xs font-medium text-cocoa underline underline-offset-4 hover:text-espresso"
                  href={buildMeasurementStudioHref({ categoryId })}
                >
                  Kelola / Buat di Measurement Studio
                </Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {profiles.map((profile) => {
                  const selected = measurements.profileId === profile.id;
                  const template = getMeasurementTemplateById(profile.templateId);
                  const summary = summarizeMeasurementProfile(profile).slice(0, 3);
                  return (
                    <div
                      className={`rounded-2xl border p-4 transition-all ${
                        selected
                          ? "border-espresso bg-ivory ring-1 ring-espresso"
                          : "border-cocoa/15 bg-ivory/75 hover:border-cocoa/45"
                      }`}
                      key={profile.id}
                    >
                      <button
                        aria-pressed={selected}
                        className="w-full cursor-pointer text-left"
                        onClick={() => onSelectProfile(profile)}
                        type="button"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="rounded-full bg-cream px-2 py-0.5 text-[0.5625rem] font-semibold uppercase tracking-[0.14em] text-cocoa">
                            {template.shortLabel}
                          </span>
                          {selected ? (
                            <span className="text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-espresso">
                              Dipilih
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1.5 font-[family-name:var(--font-display)] text-lg text-espresso">
                          {profile.label}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-muted">
                          {summary.length > 0
                            ? summary.map((item) => `${item.label} ${item.value}`).join(" · ")
                            : "Belum ada angka ukuran"}
                        </p>
                      </button>
                      <div className="mt-2.5 border-t border-cocoa/10 pt-2">
                        <Link
                          className="text-[0.6875rem] font-medium text-cocoa underline underline-offset-4 hover:text-espresso"
                          href={buildMeasurementStudioHref({ profileId: profile.id })}
                        >
                          Ubah di Measurement Studio
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
              {errors.profileId ? (
                <p className="text-xs text-espresso" role="alert">
                  {errors.profileId}
                </p>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      {measurements.mode === "sample_garment" ? (
        <div className="rounded-2xl border border-cocoa/15 bg-cream/45 p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cocoa">
            Replikasi dari Baju Contoh
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Cocok bagi pelanggan di luar Yogyakarta atau yang lebih nyaman menyamakan ukuran dengan
            busana favorit yang sudah pas di badan. Baju contoh dapat diantar ke butik atau
            dikirim setelah konfirmasi penawaran.
          </p>

          <label
            className="mt-4 block text-xs font-medium text-espresso"
            htmlFor="sample-garment-note"
          >
            Keterangan baju contoh &amp; penyesuaian yang diinginkan *
          </label>
          <textarea
            aria-invalid={Boolean(errors.sampleGarmentNote)}
            className="mt-1.5 min-h-[6rem] w-full rounded-xl border border-cocoa/25 bg-ivory px-4 py-3 text-sm text-espresso placeholder:text-muted/60 focus:border-espresso focus:outline-none"
            id="sample-garment-note"
            onChange={(e) => onChangeSampleNote(e.target.value)}
            placeholder="Contoh: Akan mengirim gamis katun biru sebagai patokan lebar dada dan bahu, namun panjang busana minta ditambah 3 cm."
            value={measurements.sampleGarmentNote}
          />
          {errors.sampleGarmentNote ? (
            <p className="mt-1.5 text-xs text-espresso" role="alert">
              {errors.sampleGarmentNote}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-5 rounded-2xl border border-cocoa/15 bg-cream/35 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cocoa">
              Detail Ukuran Badan (cm)
            </p>
            <Link
              className="text-xs font-medium text-cocoa underline underline-offset-4 hover:text-espresso"
              href={buildMeasurementStudioHref({ categoryId })}
            >
              Butuh panduan visual? Buka Measurement Studio
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {MEASUREMENT_FIELDS.map((field) => {
              const isRequired = requiredKeys.includes(field.key);
              const error = errors[field.key];
              return (
                <div
                  className="flex flex-col gap-1.5 rounded-xl border border-cocoa/12 bg-ivory p-4"
                  key={field.key}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <label
                      className="text-sm font-medium text-espresso"
                      htmlFor={`measure-${field.key}`}
                    >
                      {field.label} {isRequired ? "*" : "(Opsional)"}
                    </label>
                    <span className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted">
                      cm
                    </span>
                  </div>
                  <p className="text-[0.6875rem] leading-snug text-muted">{field.hint}</p>
                  <input
                    aria-invalid={Boolean(error)}
                    className="mt-1 w-full rounded-xl border border-cocoa/25 bg-ivory px-3.5 py-2 text-sm text-espresso placeholder:text-muted/50 focus:border-espresso focus:outline-none"
                    id={`measure-${field.key}`}
                    inputMode="decimal"
                    min={15}
                    max={200}
                    onChange={(e) => onChangeValue(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    step="0.5"
                    type="number"
                    value={measurements.values[field.key]}
                  />
                  {error ? (
                    <p className="text-xs font-medium text-espresso" role="alert">
                      {error}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
          {measurements.templateId &&
          measurements.extraValues &&
          Object.keys(measurements.extraValues).length > 0 ? (
            <div className="rounded-xl border border-cocoa/12 bg-ivory/85 p-4 text-xs">
              <p className="font-semibold uppercase tracking-[0.14em] text-cocoa">
                Ukuran Tambahan dari Template{" "}
                {getMeasurementTemplateById(measurements.templateId).shortLabel}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {getMeasurementTemplateById(measurements.templateId)
                  .fields.filter((field) => field.storageTarget === "extra")
                  .map((field) => {
                    const val = measurements.extraValues?.[field.key]?.trim();
                    if (!val) return null;
                    return (
                      <span
                        className="rounded-full bg-cream px-3 py-1 text-espresso"
                        key={field.key}
                      >
                        {field.shortLabel}: <strong>{val} cm</strong>
                      </span>
                    );
                  })}
              </div>
            </div>
          ) : null}
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-espresso" htmlFor="fit-preference-note">
          Preferensi kelonggaran / postur (opsional)
        </label>
        <input
          className="mt-1.5 w-full rounded-xl border border-cocoa/25 bg-ivory px-4 py-2.5 text-sm text-espresso placeholder:text-muted/60 focus:border-espresso focus:outline-none"
          id="fit-preference-note"
          onChange={(e) => onChangeFitNote(e.target.value)}
          placeholder="Contoh: Lebih suka potongan agak longgar di bagian lengan dan pinggang"
          type="text"
          value={measurements.fitPreferenceNote}
        />
      </div>
    </div>
  );
}
