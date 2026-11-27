"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { MannequinPreview } from "@/components/measurement-studio/MannequinPreview";
import {
  MeasurementStudioForm,
  type MeasurementStudioStep,
} from "@/components/measurement-studio/MeasurementStudioForm";
import { SavedProfileView } from "@/components/measurement-studio/SavedProfileView";
import { StudioSyncPanel } from "@/components/studio/StudioSyncPanel";
import { buttonClass } from "@/components/ui/ButtonLink";
import { ArrowLeft, ArrowRight, ChatIcon, CheckIcon } from "@/components/ui/icons";
import { garmentCategories } from "@/lib/booking-options";
import { buildChatHref } from "@/lib/chat";
import {
  DEFAULT_MEASUREMENT_TEMPLATES,
  applySizePresetToDraft,
  createMeasurementDraftForTemplate,
  createMeasurementDraftFromProfile,
  getDefaultTemplateForCategory,
  getMeasurementGarmentTypeById,
  getMeasurementTemplateById,
  getTemplateFieldValue,
  isMeasurementTemplateId,
  removeMeasurementProfile,
  resolveMeasurementGarmentType,
  setTemplateFieldValue,
  summarizeMeasurementProfile,
  switchDraftTemplate,
  upsertMeasurementProfile,
  validateMeasurementDraft,
  validateMeasurementField,
  type MeasurementGarmentTypeOption,
  type MeasurementStudioDraft,
} from "@/lib/measurement-studio";
import {
  StudioApiError,
  deleteMeasurementProfileApi,
  fetchMeasurementProfilesApi,
  saveMeasurementProfileApi,
} from "@/lib/studio-client";
import { loadMeasurementTemplates } from "@/lib/storage/tailor-store";
import type {
  GarmentCategoryId,
  MeasurementProfile,
  MeasurementTemplateConfig,
  MeasurementTemplateField,
} from "@/lib/types/tailor";

type StudioView = "editor" | "saved";
type StatusTone = "success" | "error" | "info";

type StatusMessage = {
  tone: StatusTone;
  message: string;
};

const STUDIO_STEPS: Array<{ id: MeasurementStudioStep; short: string; title: string }> = [
  { id: 1, short: "01", title: "Jenis Pakaian" },
  { id: 2, short: "02", title: "Pilih & Isi Ukuran" },
  { id: 3, short: "03", title: "Gunakan Mannequin" },
];

const inputClass =
  "w-full rounded-xl border border-cocoa/20 bg-ivory px-3.5 py-2.5 text-sm text-espresso outline-none transition-colors focus:border-espresso";

function statusClass(tone: StatusTone): string {
  if (tone === "error") return "border-rose/40 bg-rose/10 text-espresso";
  if (tone === "success") return "border-cocoa/25 bg-cream/75 text-espresso";
  return "border-cocoa/15 bg-ivory text-muted";
}

export function MeasurementStudio() {
  const searchParams = useSearchParams();
  const [templates, setTemplates] = useState<MeasurementTemplateConfig[]>(
    DEFAULT_MEASUREMENT_TEMPLATES
  );
  const [draft, setDraft] = useState<MeasurementStudioDraft>(() =>
    createMeasurementDraftForTemplate("gamis", DEFAULT_MEASUREMENT_TEMPLATES)
  );
  const [view, setView] = useState<StudioView>("editor");
  const [currentStep, setCurrentStep] = useState<MeasurementStudioStep>(1);
  const [savedProfiles, setSavedProfiles] = useState<MeasurementProfile[]>([]);
  const [savedProfile, setSavedProfile] = useState<MeasurementProfile | null>(null);
  const [syncCode, setSyncCode] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeFieldKey, setActiveFieldKey] = useState<string | null>(
    DEFAULT_MEASUREMENT_TEMPLATES.find((item) => item.id === "gamis")?.fields[0]?.key ?? null
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<StatusMessage | null>(null);

  useEffect(() => {
    let active = true;
    const loadedTemplates = loadMeasurementTemplates();
    setTemplates(loadedTemplates);

    async function bootstrap() {
      let storedProfiles: MeasurementProfile[] = [];
      try {
        const res = await fetchMeasurementProfilesApi();
        if (!active) return;
        storedProfiles = res.profiles;
        setSavedProfiles(res.profiles);
        setSyncCode(res.syncCode);
      } catch (err) {
        if (!active) return;
        setStatus({
          tone: "error",
          message:
            err instanceof Error
              ? err.message
              : "Gagal memuat profil ukuran tersimpan dari server.",
        });
      }

      const primarySaved = storedProfiles[0] ?? null;
      setSavedProfile(primarySaved);

      const urlParams =
        typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const getParam = (key: string) => searchParams.get(key) ?? urlParams?.get(key) ?? null;

      const profileParam = getParam("profile");
      const templateParam = getParam("template");
      const categoryParam = getParam("category");
      const viewParam = getParam("view");

      let nextDraft: MeasurementStudioDraft | null = null;
      let initialStep: MeasurementStudioStep = 1;

      if (profileParam) {
        const matched = storedProfiles.find((item) => item.id === profileParam) ?? primarySaved;
        if (matched) {
          nextDraft = createMeasurementDraftFromProfile(matched, loadedTemplates);
          setSavedProfile(matched);
          initialStep = 2;
          setView("editor");
          setStatus({
            tone: "info",
            message: `Memuat profil "${matched.label}" untuk diperbarui.`,
          });
        }
      }

      if (!nextDraft && viewParam === "saved" && primarySaved) {
        setView("saved");
      }

      if (!nextDraft && templateParam && isMeasurementTemplateId(templateParam)) {
        nextDraft = createMeasurementDraftForTemplate(templateParam, loadedTemplates);
        initialStep = 2;
      }

      if (
        !nextDraft &&
        categoryParam &&
        garmentCategories.some((category) => category.id === categoryParam)
      ) {
        const mappedTemplate = getDefaultTemplateForCategory(categoryParam as GarmentCategoryId);
        const resolvedType = resolveMeasurementGarmentType(
          mappedTemplate,
          categoryParam as GarmentCategoryId
        );
        nextDraft = {
          ...createMeasurementDraftForTemplate(mappedTemplate, loadedTemplates),
          garmentTypeId: resolvedType.id,
          categoryHint: categoryParam as GarmentCategoryId,
        };
        initialStep = 2;
      }

      if (nextDraft) {
        setDraft(nextDraft);
        setCurrentStep(initialStep);
        const nextTemplate = getMeasurementTemplateById(nextDraft.templateId, loadedTemplates);
        setActiveFieldKey(nextTemplate.fields[0]?.key ?? null);
      }
    }

    void bootstrap();
    return () => {
      active = false;
    };
    // Query dibaca saat pertama dibuka agar perubahan pengguna tidak ter-reset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeTemplate = getMeasurementTemplateById(draft.templateId, templates);
  const selectedGarmentType = getMeasurementGarmentTypeById(draft.garmentTypeId);
  const activeFieldIndex = Math.max(
    0,
    activeTemplate.fields.findIndex((field) => field.key === activeFieldKey)
  );
  const activeField = activeTemplate.fields[activeFieldIndex] ?? activeTemplate.fields[0] ?? null;

  const liveValidation = validateMeasurementDraft(draft, templates);

  function handleSelectGarmentType(option: MeasurementGarmentTypeOption) {
    const shouldSwitchTemplate = draft.templateId !== option.templateId;
    const nextDraft: MeasurementStudioDraft = shouldSwitchTemplate
      ? {
          ...switchDraftTemplate(draft, option.templateId, templates),
          garmentTypeId: option.id,
          categoryHint: option.categoryId,
        }
      : {
          ...draft,
          garmentTypeId: option.id,
          categoryHint: option.categoryId,
        };

    const nextTemplate = getMeasurementTemplateById(nextDraft.templateId, templates);
    setDraft(nextDraft);
    if (shouldSwitchTemplate) {
      setActiveFieldKey(nextTemplate.fields[0]?.key ?? null);
      setErrors({});
    }
    setStatus(null);
  }

  function handleChangeLabel(label: string) {
    setDraft((previous) => ({ ...previous, label }));
    setErrors((previous) => {
      const next = { ...previous };
      delete next.label;
      return next;
    });
  }

  function handleApplyPreset(presetId: string) {
    const preset = activeTemplate.sizePresets.find((item) => item.id === presetId);
    if (!preset) return;

    setDraft((previous) => applySizePresetToDraft(previous, presetId, templates));
    setErrors((previous) => {
      const next: Record<string, string> = {};
      if (previous.label) next.label = previous.label;
      if (previous.notes) next.notes = previous.notes;
      return next;
    });
    setStatus({
      tone: "info",
      message: `Acuan ukuran "${preset.label}" diterapkan. Silakan sesuaikan tiap titik dengan pita ukur Anda.`,
    });
  }

  function handleChangeFieldValue(field: MeasurementTemplateField, value: string) {
    setDraft((previous) => setTemplateFieldValue(previous, field, value));
    const fieldError = validateMeasurementField(value, field);
    setErrors((previous) => {
      const next = { ...previous };
      if (fieldError) {
        next[field.key] = fieldError;
      } else {
        delete next[field.key];
      }
      return next;
    });
  }

  function handleChangeNotes(notes: string) {
    setDraft((previous) => ({ ...previous, notes }));
    setErrors((previous) => {
      const next = { ...previous };
      delete next.notes;
      return next;
    });
  }

  function handleStepField(direction: -1 | 1) {
    const total = activeTemplate.fields.length;
    if (total === 0) return;
    const nextIndex = (activeFieldIndex + direction + total) % total;
    const nextField = activeTemplate.fields[nextIndex];
    if (nextField) {
      setActiveFieldKey(nextField.key);
    }
  }

  function handleNextStep() {
    if (currentStep === 1) {
      setCurrentStep(2);
      setStatus(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (currentStep === 2) {
      const fieldErrors: Record<string, string> = {};
      for (const field of activeTemplate.fields) {
        const raw = getTemplateFieldValue(draft, field);
        const err = validateMeasurementField(raw, field);
        if (err) fieldErrors[field.key] = err;
      }
      if (Object.keys(fieldErrors).length > 0) {
        setErrors((previous) => ({ ...previous, ...fieldErrors }));
        setStatus({
          tone: "error",
          message: "Perbaiki angka ukuran yang masih di luar rentang sebelum melanjutkan.",
        });
        return;
      }

      setCurrentStep(3);
      setStatus(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handlePrevStep() {
    setStatus(null);
    setCurrentStep((previous) => (previous > 1 ? ((previous - 1) as MeasurementStudioStep) : 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSaveProfile() {
    const validation = validateMeasurementDraft(draft, templates);
    if (!validation.valid) {
      setErrors(validation.errors);
      const hasFieldError = activeTemplate.fields.some((field) =>
        Boolean(validation.errors[field.key])
      );
      if (hasFieldError) {
        setCurrentStep(2);
      }
      setStatus({
        tone: "error",
        message: "Periksa kembali bagian yang ditandai sebelum menyimpan profil ukuran.",
      });
      return;
    }

    setIsSaving(true);
    setStatus(null);
    try {
      const wasUpdate = Boolean(draft.id && draft.id.startsWith("mprof-"));
      const { profile, syncCode: nextCode } = await saveMeasurementProfileApi(draft);
      if (nextCode) setSyncCode(nextCode);

      setSavedProfiles((previous) => upsertMeasurementProfile(previous, profile));
      setSavedProfile(profile);
      setDraft(createMeasurementDraftFromProfile(profile, templates));
      setErrors({});
      setStatus({
        tone: "success",
        message: wasUpdate
          ? `Profil ukuran "${profile.label}" berhasil diperbarui di server. Snapshot ukuran pada pesanan lama tetap terjaga.`
          : `Profil ukuran "${profile.label}" berhasil disimpan ke server dan siap digunakan untuk pesanan.`,
      });
      setView("saved");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      if (err instanceof StudioApiError && err.errors) {
        setErrors(err.errors);
      }
      setStatus({
        tone: "error",
        message:
          err instanceof Error
            ? err.message
            : "Gagal menyimpan profil ukuran ke server. Silakan coba lagi.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  function handleCreateNewProfile() {
    setDraft(createMeasurementDraftForTemplate(draft.templateId, templates));
    setErrors({});
    setCurrentStep(1);
    setView("editor");
    setStatus({
      tone: "info",
      message: "Siap membuat profil ukuran baru. Pilih jenis pakaian dan masukkan ukuran.",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleEditSavedProfile(profile: MeasurementProfile) {
    const restored = createMeasurementDraftFromProfile(profile, templates);
    const matchedTemplate = getMeasurementTemplateById(restored.templateId, templates);
    setDraft(restored);
    setSavedProfile(profile);
    setActiveFieldKey(matchedTemplate.fields[0]?.key ?? null);
    setCurrentStep(2);
    setErrors({});
    setStatus({
      tone: "info",
      message: `Mengubah profil "${profile.label}". Pembaruan tidak akan mengubah ukuran pada pesanan yang sudah diajukan.`,
    });
    setView("editor");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDeleteProfile(profile: MeasurementProfile) {
    if (!window.confirm(`Hapus profil ukuran "${profile.label}" dari daftar tersimpan?`)) return;

    try {
      await deleteMeasurementProfileApi(profile.id);
      const nextList = removeMeasurementProfile(savedProfiles, profile.id);
      setSavedProfiles(nextList);
      const nextPrimary = nextList[0] ?? null;
      setSavedProfile(nextPrimary);
      if (nextPrimary) {
        setDraft(createMeasurementDraftFromProfile(nextPrimary, templates));
        setView("saved");
      } else {
        setDraft(createMeasurementDraftForTemplate(draft.templateId, templates));
        setCurrentStep(1);
        setView("editor");
      }
      setErrors({});
      setStatus({
        tone: "info",
        message: `Profil "${profile.label}" dihapus. Snapshot ukuran pada pesanan lama tetap tersimpan.`,
      });
    } catch (err) {
      setStatus({
        tone: "error",
        message: err instanceof Error ? err.message : "Gagal menghapus profil ukuran di server.",
      });
    }
  }

  function handleRestoredStudioSession(payload: {
    syncCode: string;
    profiles: MeasurementProfile[];
  }) {
    setSyncCode(payload.syncCode);
    setSavedProfiles(payload.profiles);
    const first = payload.profiles[0] ?? null;
    setSavedProfile(first);
    if (first) {
      setDraft(createMeasurementDraftFromProfile(first, templates));
      setView("saved");
    }
    setStatus({
      tone: "success",
      message: `Berhasil memuat ${payload.profiles.length} profil ukuran tersimpan dari server Celmira.`,
    });
  }

  // =========================================================================
  // TAMPILAN PROFIL UKURAN TERSIMPAN (Terpisah dari Form Pengukuran)
  // =========================================================================
  if (view === "saved" && savedProfile) {
    return (
      <SavedProfileView
        onCreateNewProfile={handleCreateNewProfile}
        onDeleteProfile={(p) => void handleDeleteProfile(p)}
        onEditProfile={handleEditSavedProfile}
        onRestoredSession={handleRestoredStudioSession}
        onSelectProfile={(p) => {
          setSavedProfile(p);
          setDraft(createMeasurementDraftFromProfile(p, templates));
          setStatus(null);
        }}
        profile={savedProfile}
        profiles={savedProfiles}
        statusMessage={status?.message ?? null}
        syncCode={syncCode}
        templates={templates}
      />
    );
  }

  // =========================================================================
  // TAMPILAN MEASUREMENT STUDIO (01 → 02 → 03)
  // =========================================================================
  const summaryRows = summarizeMeasurementProfile(
    {
      templateId: draft.templateId,
      values: draft.values,
      extraValues: draft.extraValues,
    },
    templates
  );

  return (
    <div>
      {/* Header Halaman */}
      <section className="shell pb-6 pt-12 sm:pt-16">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex max-w-2xl flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <p className="eyebrow">Measurement Studio</p>
              <span className="rounded-full border border-cocoa/25 px-3 py-1 text-[0.625rem] font-medium uppercase tracking-[0.16em] text-cocoa">
                Tahap 0{currentStep} dari 03
              </span>
            </div>
            <h1 className="text-balance text-[2.2rem] leading-[1.1] text-espresso sm:text-[2.9rem]">
              Ukur dengan teliti, simpan untuk pesanan berikutnya.
            </h1>
            <p className="max-w-xl text-pretty text-sm leading-relaxed text-muted sm:text-[0.95rem]">
              Ikuti 3 langkah ringkas: pilih kategori pakaian, atur ukuran tubuh dalam sentimeter
              (cm), lalu tinjau pada mannequin dan simpan profil Anda.
            </p>
          </div>

          {savedProfile ? (
            <button
              className={buttonClass("outline", "w-fit shrink-0 cursor-pointer")}
              onClick={() => {
                setStatus(null);
                setView("saved");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              type="button"
            >
              Lihat Profil Tersimpan ({savedProfiles.length})
            </button>
          ) : null}
        </div>

        <div className="mt-6">
          <StudioSyncPanel
            contextLabel="Measurement Studio"
            onRestored={handleRestoredStudioSession}
            syncCode={syncCode}
          />
        </div>
      </section>

      {/* Bar Navigasi 01 — 02 — 03 */}
      <nav
        aria-label="Langkah Measurement Studio"
        className="border-y border-cocoa/12 bg-cream/45 py-4"
      >
        <div className="shell">
          <ol className="grid grid-cols-3 gap-2 sm:gap-4">
            {STUDIO_STEPS.map((step) => {
              const isCurrent = currentStep === step.id;
              const isDone = currentStep > step.id;
              return (
                <li key={step.id}>
                  <button
                    aria-current={isCurrent ? "step" : undefined}
                    className={`flex w-full cursor-pointer items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left transition-all sm:px-4 sm:py-3 ${
                      isCurrent
                        ? "border-espresso bg-espresso text-ivory shadow-[0_10px_24px_-16px_rgba(59,43,37,0.85)]"
                        : isDone
                          ? "border-cocoa/30 bg-ivory text-espresso hover:border-espresso"
                          : "border-cocoa/15 bg-ivory/75 text-muted hover:border-cocoa/45 hover:text-espresso"
                    }`}
                    onClick={() => {
                      setStatus(null);
                      setCurrentStep(step.id);
                    }}
                    type="button"
                  >
                    <span
                      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.625rem] font-semibold ${
                        isCurrent
                          ? "bg-ivory text-espresso"
                          : isDone
                            ? "bg-cocoa text-ivory"
                            : "border border-cocoa/25 text-cocoa"
                      }`}
                    >
                      {isDone ? <CheckIcon className="h-3.5 w-3.5" /> : step.short}
                    </span>
                    <span className="min-w-0 truncate text-xs font-medium sm:text-sm">
                      {step.title}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </nav>

      {/* Konten Utama Berdasarkan Tahap */}
      <div className="shell pb-16 pt-8 sm:pb-20 sm:pt-10">
        {/* ================================================================
            TAHAP 01 — JENIS PAKAIAN (Tanpa Mannequin, Template Otomatis)
           ================================================================ */}
        {currentStep === 1 ? (
          <div className="mx-auto max-w-4xl">
            <MeasurementStudioForm
              activeFieldKey={activeField?.key ?? null}
              activeTemplate={activeTemplate}
              currentStep={1}
              draft={draft}
              errors={errors}
              onApplyPreset={handleApplyPreset}
              onChangeFieldValue={handleChangeFieldValue}
              onFocusField={setActiveFieldKey}
              onSelectGarmentType={handleSelectGarmentType}
            />

            <div className="mt-6 flex flex-col gap-3 rounded-[1.5rem] border border-cocoa/15 bg-cream/45 p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-relaxed text-muted">
                Jenis pakaian terpilih:{" "}
                <strong className="text-espresso">{selectedGarmentType.name}</strong> · Format
                pengukuran disiapkan otomatis pada tahap berikutnya.
              </p>
              <button
                className={buttonClass("solid", "w-full cursor-pointer sm:w-fit")}
                onClick={handleNextStep}
                type="button"
              >
                Lanjut ke Pilih &amp; Isi Ukuran
                <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-1" />
              </button>
            </div>

            {status ? (
              <p
                className={`mt-4 rounded-xl border px-4 py-3 text-xs leading-relaxed ${statusClass(status.tone)}`}
                role="status"
              >
                {status.message}
              </p>
            ) : null}
          </div>
        ) : null}

        {/* ================================================================
            TAHAP 02 — PILIH & ISI UKURAN (Form Dulu, Mannequin Setelahnya)
           ================================================================ */}
        {currentStep === 2 ? (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-10">
            {/* Bagian Pengisian Ukuran (Order 1: Tampil Lebih Dulu) */}
            <div className="order-1">
              <MeasurementStudioForm
                activeFieldKey={activeField?.key ?? null}
                activeTemplate={activeTemplate}
                currentStep={2}
                draft={draft}
                errors={errors}
                onApplyPreset={handleApplyPreset}
                onChangeFieldValue={handleChangeFieldValue}
                onFocusField={setActiveFieldKey}
                onSelectGarmentType={handleSelectGarmentType}
              />

              {liveValidation.warnings.length > 0 ? (
                <div
                  className="mt-5 rounded-2xl border border-rose/35 bg-cream/70 p-4 text-xs leading-relaxed text-espresso"
                  role="note"
                >
                  <p className="font-semibold uppercase tracking-[0.14em] text-cocoa">
                    Cek Proporsi Ukuran
                  </p>
                  <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-4 text-muted">
                    {liveValidation.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="mt-6 flex flex-col-reverse gap-3 rounded-[1.5rem] border border-cocoa/15 bg-cream/45 p-5 sm:flex-row sm:items-center sm:justify-between">
                <button
                  className={buttonClass("outline", "w-full cursor-pointer sm:w-fit")}
                  onClick={handlePrevStep}
                  type="button"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Langkah Sebelumnya
                </button>
                <button
                  className={buttonClass("solid", "w-full cursor-pointer sm:w-fit")}
                  onClick={handleNextStep}
                  type="button"
                >
                  Lanjut ke Gunakan Mannequin
                  <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-1" />
                </button>
              </div>

              {status ? (
                <p
                  className={`mt-4 rounded-xl border px-4 py-3 text-xs leading-relaxed ${statusClass(status.tone)}`}
                  role="status"
                >
                  {status.message}
                </p>
              ) : null}
            </div>

            {/* Visualisasi Mannequin Interaktif (Order 2: Setelah Bagian Pengisian Ukuran) */}
            <aside className="order-2 flex flex-col gap-4 lg:sticky lg:top-28 lg:self-start">
              <div className="rounded-[1.75rem] border border-cocoa/15 bg-cream/65 p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3 border-b border-cocoa/12 pb-4">
                  <div className="min-w-0">
                    <p className="text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-cocoa">
                      Visualisasi Mannequin 2D
                    </p>
                    <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl leading-snug text-espresso">
                      {selectedGarmentType.name}
                    </h2>
                    <p className="mt-0.5 text-[0.6875rem] uppercase tracking-[0.14em] text-muted">
                      Format {activeTemplate.shortLabel}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-cocoa/20 bg-ivory px-2.5 py-1 text-[0.5625rem] font-medium uppercase tracking-[0.16em] text-cocoa">
                    Interaktif
                  </span>
                </div>

                <div className="mt-4 aspect-[3/4] w-full rounded-2xl border border-cocoa/10 bg-ivory p-2.5">
                  <MannequinPreview
                    activeFieldKey={activeField?.key ?? null}
                    extraValues={draft.extraValues}
                    onSelectField={setActiveFieldKey}
                    template={activeTemplate}
                    values={draft.values}
                  />
                </div>

                {activeField ? (
                  <div className="mt-4 rounded-2xl border border-cocoa/12 bg-ivory/90 p-3.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-cocoa">
                        Panduan Titik {activeFieldIndex + 1}/{activeTemplate.fields.length}
                      </span>
                      <span className="font-semibold text-espresso">{activeField.shortLabel}</span>
                    </div>
                    <p className="mt-1.5 leading-relaxed text-muted">{activeField.guideSteps[0]}</p>
                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-cocoa/10 pt-2.5">
                      <button
                        className="inline-flex cursor-pointer items-center gap-1 text-[0.6875rem] font-medium text-cocoa transition-colors hover:text-espresso"
                        onClick={() => handleStepField(-1)}
                        type="button"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Sebelumnya
                      </button>
                      <button
                        className="inline-flex cursor-pointer items-center gap-1 text-[0.6875rem] font-medium text-cocoa transition-colors hover:text-espresso"
                        onClick={() => handleStepField(1)}
                        type="button"
                      >
                        Berikutnya
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 border-t border-cocoa/10 pt-3.5 text-center">
                  <Link
                    className="inline-flex items-center justify-center gap-1.5 text-xs font-medium text-cocoa underline underline-offset-4 transition-colors hover:text-espresso"
                    href={buildChatHref({
                      source: "measurement-studio",
                      category: draft.categoryHint,
                      template: draft.templateId,
                    })}
                  >
                    <ChatIcon className="h-3.5 w-3.5" />
                    Tanya Soal Ukuran di Chat
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        ) : null}

        {/* ================================================================
            TAHAP 03 — GUNAKAN MANNEQUIN (Visualisasi Read-Only + Ringkasan Ukuran)
           ================================================================ */}
        {currentStep === 3 ? (
          <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-10">
            {/* Visualisasi Utama: Mannequin Read-Only (Tanpa Kontrol / Input di Bawahnya) */}
            <section className="rounded-[2rem] border border-cocoa/15 bg-cream/60 p-5 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cocoa/12 pb-4">
                <div>
                  <p className="text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-cocoa">
                    03 · Gunakan Mannequin
                  </p>
                  <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-espresso">
                    Visualisasi {selectedGarmentType.name}
                  </h2>
                </div>
                <span className="rounded-full border border-cocoa/20 bg-ivory px-3 py-1 text-[0.625rem] font-medium uppercase tracking-[0.14em] text-cocoa">
                  Format {activeTemplate.shortLabel}
                </span>
              </div>

              <div className="mx-auto mt-5 aspect-[3/4] max-w-md rounded-2xl border border-cocoa/10 bg-ivory p-3">
                <MannequinPreview
                  activeFieldKey={null}
                  extraValues={draft.extraValues}
                  template={activeTemplate}
                  values={draft.values}
                />
              </div>
            </section>

            {/* Ringkasan Ukuran Aktual dari Tahap 02 + Simpan Profil */}
            <div className="flex flex-col gap-5">
              {/* Ringkasan Ukuran Otomatis dari Tahap 02 */}
              <section className="rounded-[1.5rem] border border-cocoa/15 bg-ivory p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-cocoa/12 pb-3.5">
                  <div>
                    <p className="text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-cocoa">
                      Ringkasan Ukuran
                    </p>
                    <h3 className="mt-0.5 font-[family-name:var(--font-display)] text-xl text-espresso">
                      {selectedGarmentType.name}
                    </h3>
                  </div>
                  <button
                    className="cursor-pointer text-xs font-medium text-cocoa underline underline-offset-4 hover:text-espresso"
                    onClick={() => {
                      setStatus(null);
                      setCurrentStep(2);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    type="button"
                  >
                    Ubah Ukuran
                  </button>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {summaryRows.map((row) => (
                    <div
                      className="rounded-xl border border-cocoa/12 bg-cream/45 px-3.5 py-3"
                      key={row.key}
                    >
                      <dt className="text-[0.625rem] uppercase tracking-[0.14em] text-muted">
                        {row.label}
                      </dt>
                      <dd className="mt-0.5 font-[family-name:var(--font-display)] text-lg text-espresso">
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>

              {/* Nama Profil, Catatan & Simpan untuk Pesanan */}
              <section className="rounded-[1.5rem] border border-cocoa/15 bg-cream/40 p-5 sm:p-6">
                <div className="border-b border-cocoa/12 pb-3.5">
                  <p className="text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-cocoa">
                    Simpan Profil Ukuran
                  </p>
                  <h3 className="mt-0.5 font-[family-name:var(--font-display)] text-xl text-espresso">
                    Lanjutkan ke profil tersimpan &amp; pesanan
                  </h3>
                </div>

                <div className="mt-4 flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label
                      className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-cocoa"
                      htmlFor="measurement-profile-label"
                    >
                      Nama Profil Ukuran *
                    </label>
                    <input
                      aria-invalid={Boolean(errors.label)}
                      className={inputClass}
                      id="measurement-profile-label"
                      maxLength={80}
                      onChange={(event) => handleChangeLabel(event.target.value)}
                      placeholder="Contoh: Ibu — Gamis Lebaran"
                      type="text"
                      value={draft.label}
                    />
                    {errors.label ? (
                      <p className="text-[0.6875rem] leading-relaxed text-rose" role="alert">
                        {errors.label}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-cocoa"
                      htmlFor="measurement-profile-notes"
                    >
                      Preferensi kelonggaran &amp; postur (opsional)
                    </label>
                    <textarea
                      aria-invalid={Boolean(errors.notes)}
                      className={`${inputClass} min-h-[5rem] resize-y`}
                      id="measurement-profile-notes"
                      maxLength={400}
                      onChange={(event) => handleChangeNotes(event.target.value)}
                      placeholder="Contoh: Suka potongan agak longgar di lengan dan pinggang."
                      value={draft.notes}
                    />
                    <div className="flex items-center justify-between text-[0.6875rem] text-muted">
                      <span>Catatan ikut terbawa ke formulir pemesanan.</span>
                      <span>{draft.notes.length}/400</span>
                    </div>
                    {errors.notes ? (
                      <p className="text-xs text-rose" role="alert">
                        {errors.notes}
                      </p>
                    ) : null}
                  </div>
                </div>

                {liveValidation.warnings.length > 0 ? (
                  <div
                    className="mt-4 rounded-xl border border-rose/35 bg-ivory/90 p-3.5 text-xs leading-relaxed text-espresso"
                    role="note"
                  >
                    <p className="font-semibold uppercase tracking-[0.14em] text-cocoa">
                      Cek Proporsi Ukuran
                    </p>
                    <ul className="mt-1 flex list-disc flex-col gap-1 pl-4 text-muted">
                      {liveValidation.warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="mt-5 flex flex-col-reverse gap-3 border-t border-cocoa/12 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    className={buttonClass("outline", "w-full cursor-pointer sm:w-fit")}
                    onClick={handlePrevStep}
                    type="button"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Ubah Ukuran
                  </button>

                  <button
                    className={buttonClass("solid", "w-full cursor-pointer sm:w-fit")}
                    disabled={isSaving}
                    onClick={() => void handleSaveProfile()}
                    type="button"
                  >
                    {isSaving
                      ? "Menyimpan..."
                      : draft.id
                        ? "Simpan Perubahan Profil"
                        : "Simpan Profil Ukuran"}
                    <CheckIcon className="h-4 w-4" />
                  </button>
                </div>
              </section>

              {status ? (
                <p
                  className={`rounded-xl border px-4 py-3 text-xs leading-relaxed ${statusClass(status.tone)}`}
                  role="status"
                >
                  {status.message}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
