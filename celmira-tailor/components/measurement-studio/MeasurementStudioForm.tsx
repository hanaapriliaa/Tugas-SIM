"use client";

import { CheckIcon, MinusIcon, PlusIcon } from "@/components/ui/icons";
import {
  MEASUREMENT_GARMENT_TYPES,
  formatMeasurementNumber,
  getMeasurementGarmentTypeById,
  getTemplateFieldValue,
  parseMeasurementNumeric,
  stepMeasurementValue,
  type MeasurementGarmentTypeOption,
  type MeasurementStudioDraft,
} from "@/lib/measurement-studio";
import type {
  MeasurementSizePreset,
  MeasurementTemplateConfig,
  MeasurementTemplateField,
} from "@/lib/types/tailor";

export type MeasurementStudioStep = 1 | 2 | 3;

type MeasurementStudioFormProps = {
  currentStep: Exclude<MeasurementStudioStep, 3>;
  draft: MeasurementStudioDraft;
  activeTemplate: MeasurementTemplateConfig;
  templates?: MeasurementTemplateConfig[];
  activeFieldKey: string | null;
  errors: Record<string, string>;
  onSelectGarmentType: (option: MeasurementGarmentTypeOption) => void;
  onApplyPreset: (presetId: string) => void;
  onChangeFieldValue: (field: MeasurementTemplateField, value: string) => void;
  onFocusField: (fieldKey: string) => void;
};

function isPresetMatchingDraft(
  preset: MeasurementSizePreset,
  draft: MeasurementStudioDraft
): boolean {
  for (const [key, expected] of Object.entries(preset.values)) {
    if (typeof expected !== "number") continue;
    const current = draft.values[key as keyof typeof draft.values];
    if (current !== formatMeasurementNumber(expected)) {
      return false;
    }
  }
  if (preset.extraValues) {
    for (const [key, expected] of Object.entries(preset.extraValues)) {
      const current = draft.extraValues[key];
      if (current !== formatMeasurementNumber(expected)) {
        return false;
      }
    }
  }
  return true;
}

export function MeasurementStudioForm({
  currentStep,
  draft,
  activeTemplate,
  templates,
  activeFieldKey,
  errors,
  onSelectGarmentType,
  onApplyPreset,
  onChangeFieldValue,
  onFocusField,
}: MeasurementStudioFormProps) {
  const selectedGarmentType = getMeasurementGarmentTypeById(draft.garmentTypeId);
  const activeTemplateIds = templates
    ? new Set(templates.filter((tpl) => tpl.active).map((tpl) => tpl.id))
    : null;
  const visibleGarmentTypes =
    activeTemplateIds && activeTemplateIds.size > 0
      ? MEASUREMENT_GARMENT_TYPES.filter((opt) => activeTemplateIds.has(opt.templateId))
      : MEASUREMENT_GARMENT_TYPES;

  // =========================================================================
  // 01 — JENIS PAKAIAN (Satu pilihan utama, template otomatis di Tahap 02)
  // =========================================================================
  if (currentStep === 1) {
    return (
      <section className="rounded-[1.5rem] border border-cocoa/15 bg-cream/40 p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-cocoa/12 pb-4">
          <div className="flex flex-col gap-1">
            <p className="text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-cocoa">
              01 · Jenis Pakaian
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-espresso">
              Pilih jenis pakaian yang akan dibuat
            </h2>
            <p className="text-xs leading-relaxed text-muted">
              Cukup pilih satu jenis pakaian. Format pengukuran dan bentuk mannequin akan disiapkan
              otomatis pada tahap berikutnya.
            </p>
          </div>
          <span className="text-xs text-muted">
            Terpilih: <strong className="text-espresso">{selectedGarmentType.name}</strong>
          </span>
        </div>

        <div
          aria-label="Pilih jenis pakaian"
          className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3"
          role="radiogroup"
        >
          {visibleGarmentTypes.map((option) => {
            const selected = draft.garmentTypeId === option.id;
            return (
              <button
                aria-checked={selected}
                className={`cursor-pointer rounded-2xl border p-4 text-left transition-all ${
                  selected
                    ? "border-espresso bg-espresso text-ivory shadow-[0_12px_28px_-18px_rgba(59,43,37,0.8)]"
                    : "border-cocoa/15 bg-ivory text-espresso hover:border-cocoa/50 hover:bg-cream/60"
                }`}
                key={option.id}
                onClick={() => onSelectGarmentType(option)}
                role="radio"
                type="button"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-[0.5625rem] font-semibold uppercase tracking-[0.18em] ${
                      selected ? "text-ivory/75" : "text-cocoa/70"
                    }`}
                  >
                    {option.index}
                  </span>
                  {selected ? <CheckIcon className="h-4 w-4 shrink-0 text-ivory" /> : null}
                </div>
                <span className="mt-1.5 block font-[family-name:var(--font-display)] text-lg leading-snug">
                  {option.name}
                </span>
                <p
                  className={`mt-1 text-[0.75rem] leading-relaxed ${
                    selected ? "text-ivory/80" : "text-muted"
                  }`}
                >
                  {option.description}
                </p>
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  // =========================================================================
  // 02 — PILIH DAN ISI UKURAN
  // =========================================================================
  return (
    <section className="rounded-[1.5rem] border border-cocoa/15 bg-cream/40 p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-cocoa/12 pb-4">
        <div className="flex flex-col gap-1">
          <p className="text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-cocoa">
            02 · Pilih &amp; Isi Ukuran ({selectedGarmentType.name})
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-xl text-espresso">
            Atur ukuran tubuh dalam sentimeter (cm)
          </h2>
          <p className="text-xs leading-relaxed text-muted">{activeTemplate.description}</p>
        </div>
        <span className="rounded-full border border-cocoa/20 bg-ivory px-3 py-1 text-[0.625rem] font-medium uppercase tracking-[0.16em] text-cocoa">
          Satuan: cm
        </span>
      </div>

      {/* Acuan Cepat S/M/L/XL atau Standar/Syar'i */}
      {activeTemplate.sizePresets.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-cocoa/12 bg-ivory/75 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-cocoa">
              Acuan Cepat ({activeTemplate.shortLabel})
            </p>
            <span className="text-[0.6875rem] text-muted">
              Pilih ukuran awal, lalu sesuaikan dengan pita ukur Anda
            </span>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {activeTemplate.sizePresets.map((preset) => {
              const active = isPresetMatchingDraft(preset, draft);
              return (
                <button
                  aria-pressed={active}
                  className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-left text-xs transition-colors ${
                    active
                      ? "border-espresso bg-espresso text-ivory"
                      : "border-cocoa/25 bg-ivory text-espresso hover:border-espresso hover:bg-cream"
                  }`}
                  key={preset.id}
                  onClick={() => onApplyPreset(preset.id)}
                  type="button"
                >
                  <span className="font-semibold">{preset.label}</span>
                  <span
                    className={`ml-1.5 text-[0.6875rem] ${
                      active ? "text-ivory/80" : "text-muted"
                    }`}
                  >
                    {preset.summary}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Daftar Input Ukuran */}
      <div className="mt-5 flex flex-col gap-4">
        {activeTemplate.fields.map((field) => {
          const raw = getTemplateFieldValue(draft, field);
          const numeric = parseMeasurementNumeric(raw, field.defaultValue);
          const clampedForSlider = Math.min(field.max, Math.max(field.min, numeric));
          const error = errors[field.key];
          const isActive = activeFieldKey === field.key;
          const atMin = numeric <= field.min;
          const atMax = numeric >= field.max;

          return (
            <div
              className={`rounded-2xl border p-4 transition-all sm:p-5 ${
                error
                  ? "border-rose bg-ivory ring-1 ring-rose/40"
                  : isActive
                    ? "border-espresso bg-ivory shadow-[0_14px_30px_-24px_rgba(59,43,37,0.7)]"
                    : "border-cocoa/14 bg-ivory/85 hover:border-cocoa/35"
              }`}
              id={`measurement-card-${field.key}`}
              key={field.key}
              onClick={() => onFocusField(field.key)}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label
                      className="text-sm font-semibold text-espresso"
                      htmlFor={`studio-field-${field.key}`}
                    >
                      {field.label}
                    </label>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[0.5625rem] font-medium uppercase tracking-[0.14em] ${
                        field.required
                          ? "bg-cream text-cocoa"
                          : "border border-cocoa/20 text-muted"
                      }`}
                    >
                      {field.required ? "Wajib" : "Opsional"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[0.6875rem] text-muted">
                    Rentang ideal: {field.min}–{field.max} cm · Kelipatan {field.step} cm
                  </p>
                </div>

                {/* Kontrol +/- dan Input Angka */}
                <div className="flex items-center gap-1.5">
                  <button
                    aria-label={`Kurangi ${field.label} sebesar ${field.step} cm`}
                    className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-cocoa/25 bg-ivory text-espresso transition-colors hover:border-espresso hover:bg-cream disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={atMin}
                    onClick={(event) => {
                      event.stopPropagation();
                      onFocusField(field.key);
                      onChangeFieldValue(field, stepMeasurementValue(raw, -field.step, field));
                    }}
                    type="button"
                  >
                    <MinusIcon className="h-4 w-4" />
                  </button>

                  <div className="relative w-24">
                    <input
                      aria-invalid={Boolean(error)}
                      className="h-10 w-full rounded-xl border border-cocoa/25 bg-ivory pl-3 pr-8 text-right text-sm font-semibold text-espresso outline-none transition-colors focus:border-espresso"
                      id={`studio-field-${field.key}`}
                      inputMode="decimal"
                      max={field.max}
                      min={field.min}
                      onChange={(event) => onChangeFieldValue(field, event.target.value)}
                      onFocus={() => onFocusField(field.key)}
                      placeholder={String(field.defaultValue)}
                      step={field.step}
                      type="number"
                      value={raw}
                    />
                    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[0.6875rem] font-medium text-muted">
                      cm
                    </span>
                  </div>

                  <button
                    aria-label={`Tambah ${field.label} sebesar ${field.step} cm`}
                    className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-cocoa/25 bg-ivory text-espresso transition-colors hover:border-espresso hover:bg-cream disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={atMax}
                    onClick={(event) => {
                      event.stopPropagation();
                      onFocusField(field.key);
                      onChangeFieldValue(field, stepMeasurementValue(raw, field.step, field));
                    }}
                    type="button"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Slider Interaktif Tersinkronisasi */}
              <div className="mt-3.5">
                <input
                  aria-label={`Slider ${field.label} dalam cm`}
                  className="h-2.5 w-full cursor-pointer rounded-full accent-espresso"
                  max={field.max}
                  min={field.min}
                  onChange={(event) => {
                    onFocusField(field.key);
                    onChangeFieldValue(field, event.target.value);
                  }}
                  onFocus={() => onFocusField(field.key)}
                  step={field.step}
                  type="range"
                  value={clampedForSlider}
                />
                <div className="mt-1 flex items-center justify-between text-[0.625rem] text-muted">
                  <span>{field.min} cm</span>
                  <span className="font-medium text-cocoa">
                    {raw.trim() ? `${raw.trim()} cm` : "Belum diisi"}
                  </span>
                  <span>{field.max} cm</span>
                </div>
              </div>

              {/* Validasi Inline */}
              {error ? (
                <p className="mt-2 text-xs font-medium text-rose" role="alert">
                  {error}
                </p>
              ) : null}

              {/* Petunjuk Cara Mengukur */}
              {isActive ? (
                <div className="mt-3.5 rounded-xl border border-cocoa/12 bg-cream/55 p-3.5 text-xs">
                  <p className="font-semibold uppercase tracking-[0.14em] text-cocoa">
                    {field.guideTitle}
                  </p>
                  <ol className="mt-2 flex list-decimal flex-col gap-1 pl-4 leading-relaxed text-espresso/85">
                    {field.guideSteps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                  <p className="mt-2 border-t border-cocoa/10 pt-2 text-[0.6875rem] leading-relaxed text-muted">
                    <strong className="font-semibold text-cocoa">Tips:</strong> {field.tip}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-[0.6875rem] leading-relaxed text-muted">
                  {field.guideSteps[0]}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
