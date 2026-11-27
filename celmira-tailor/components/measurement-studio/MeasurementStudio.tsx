"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { MannequinPreview } from "@/components/measurement-studio/MannequinPreview";
import {
  MeasurementStudioForm,
  type MeasurementStudioStep,
} from "@/components/measurement-studio/MeasurementStudioForm";
import { SavedProfileView } from "@/components/measurement-studio/SavedProfileView";
import { AutoSyncStatusBar } from "@/components/studio/AutoSyncStatusBar";
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
  migrateLegacyStudioDataIfNeeded,
  saveMeasurementProfileApi,
  type AutoSyncState,
  type CustomerIdentitySummary,
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

const AUTOSYNC_DEBOUNCE_MS = 900;

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
  const [isSaving, setIsSaving] = useState(false);
  const [syncState, setSyncState] = useState<AutoSyncState>("idle");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [activeFieldKey, setActiveFieldKey] = useState<string | null>(
    DEFAULT_MEASUREMENT_TEMPLATES.find((item) => item.id === "gamis")?.fields[0]?.key ?? null
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<StatusMessage | null>(null);

  const draftRef = useRef<MeasurementStudioDraft>(draft);
  const templatesRef = useRef<MeasurementTemplateConfig[]>(templates);
  const latestRevisionRef = useRef(0);
  const savedRevisionRef = useRef(0);
  const inFlightRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    templatesRef.current = templates;
  }, [templates]);

  const flushAutoSave = useCallback(async (navigateToSavedOnSuccess = false) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const currentDraft = draftRef.current;
    const currentTemplates = templatesRef.current;
    const validation = validateMeasurementDraft(currentDraft, currentTemplates);

    if (!validation.valid) {
      if (navigateToSavedOnSuccess) {
        setErrors(validation.errors);
        const tpl = getMeasurementTemplateById(currentDraft.templateId, currentTemplates);
        const hasFieldError = tpl.fields.some((field) => Boolean(validation.errors[field.key]));
        if (hasFieldError) {
          setCurrentStep(2);
        }
        setStatus({
          tone: "error",
          message: "Periksa kembali bagian yang ditandai sebelum menyimpan profil ukuran.",
        });
      }
      return;
    }

    if (inFlightRef.current) {
      return;
    }

    const targetRevision = latestRevisionRef.current;
    inFlightRef.current = true;
    setIsSaving(true);
    setSyncState("saving");
    setSyncError(null);

    try {
      const wasUpdate = Boolean(currentDraft.id && currentDraft.id.startsWith("mprof-"));
      const { profile } = await saveMeasurementProfileApi(currentDraft);

      savedRevisionRef.current = Math.max(savedRevisionRef.current, targetRevision);
      setSavedProfiles((previous) => upsertMeasurementProfile(previous, profile));
      setSavedProfile(profile);
      setLastSavedAt(profile.updatedAt);
      setErrors({});

      setDraft((previous) => {
        if (latestRevisionRef.current === targetRevision) {
          return createMeasurementDraftFromProfile(profile, currentTemplates);
        }
        return previous.id ? previous : { ...previous, id: profile.id };
      });

      if (navigateToSavedOnSuccess) {
        setStatus({
          tone: "success",
          message: wasUpdate
            ? `Profil ukuran "${profile.label}" diperbarui di server. Snapshot ukuran pada pesanan lama tetap terjaga.`
            : `Profil ukuran "${profile.label}" tersimpan di server dan siap digunakan untuk pesanan.`,
        });
        setView("saved");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }

      if (latestRevisionRef.current > savedRevisionRef.current) {
        inFlightRef.current = false;
        setIsSaving(false);
        void flushAutoSave(false);
        return;
      }

      // Status "Tersimpan" hanya ditampilkan setelah server mengonfirmasi revisi terakhir
      setSyncState("saved");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Gagal menyimpan profil ukuran ke server. Silakan coba lagi.";
      if (err instanceof StudioApiError && err.errors && navigateToSavedOnSuccess) {
        setErrors(err.errors);
      }
      setSyncState("error");
      setSyncError(message);
      if (navigateToSavedOnSuccess) {
        setStatus({ tone: "error", message });
      }
    } finally {
      inFlightRef.current = false;
      setIsSaving(false);
    }
  }, []);

  const scheduleAutoSave = useCallback(
    (nextDraft: MeasurementStudioDraft) => {
      draftRef.current = nextDraft;
      latestRevisionRef.current += 1;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      const validation = validateMeasurementDraft(nextDraft, templatesRef.current);
      if (!validation.valid) {
        return;
      }

      setSyncState("saving");
      setSyncError(null);
      debounceTimerRef.current = setTimeout(() => {
        void flushAutoSave(false);
      }, AUTOSYNC_DEBOUNCE_MS);
    },
    [flushAutoSave]
  );

  // Otomatis retry saat koneksi kembali online jika penyimpanan sebelumnya gagal
  useEffect(() => {
    function handleOnline() {
      if (latestRevisionRef.current > savedRevisionRef.current) {
        void flushAutoSave(false);
      }
    }
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [flushAutoSave]);

  useEffect(() => {
    let active = true;
    const loadedTemplates = loadMeasurementTemplates();
    templatesRef.current = loadedTemplates;
    setTemplates(loadedTemplates);

    async function bootstrap() {
      let storedProfiles: MeasurementProfile[] = [];
      try {
        const migrated = await migrateLegacyStudioDataIfNeeded().catch(() => ({ ran: false }));
        if (!active) return;

        if (migrated.ran && "profiles" in migrated && Array.isArray(migrated.profiles)) {
          storedProfiles = migrated.profiles;
        } else {
          const res = await fetchMeasurementProfilesApi();
          if (!active) return;
          storedProfiles = res.profiles;
        }
        setSavedProfiles(storedProfiles);
      } catch (err) {
        if (!active) return;
        setSyncState("error");
        setSyncError(
          err instanceof Error
            ? err.message
            : "Gagal memuat profil ukuran tersimpan dari server."
        );
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
          setLastSavedAt(matched.updatedAt);
          setSyncState("saved");
          initialStep = 2;
          setView("editor");
          setStatus({
            tone: "info",
            message: `Memuat profil "${matched.label}" untuk diperbarui.`,
          });
        }
      }

      if (!nextDraft && viewParam === "saved" && primarySaved) {
        setLastSavedAt(primarySaved.updatedAt);
        setSyncState("saved");
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
        draftRef.current = nextDraft;
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

  function applyDraftChange(updater: (previous: MeasurementStudioDraft) => MeasurementStudioDraft) {
    setDraft((previous) => {
      const next = updater(previous);
      scheduleAutoSave(next);
      return next;
    });
  }

  function handleSelectGarmentType(option: MeasurementGarmentTypeOption) {
    const shouldSwitchTemplate = draft.templateId !== option.templateId;
    applyDraftChange((previous) =>
      shouldSwitchTemplate
        ? {
            ...switchDraftTemplate(previous, option.templateId, templates),
            garmentTypeId: option.id,
            categoryHint: option.categoryId,
          }
        : {
            ...previous,
            garmentTypeId: option.id,
            categoryHint: option.categoryId,
          }
    );

    if (shouldSwitchTemplate) {
      const nextTemplate = getMeasurementTemplateById(option.templateId, templates);
      setActiveFieldKey(nextTemplate.fields[0]?.key ?? null);
      setErrors({});
    }
    setStatus(null);
  }

  function handleChangeLabel(label: string) {
    applyDraftChange((previous) => ({ ...previous, label }));
    setErrors((previous) => {
      const next = { ...previous };
      delete next.label;
      return next;
    });
  }

  function handleApplyPreset(presetId: string) {
    const preset = activeTemplate.sizePresets.find((item) => item.id === presetId);
    if (!preset) return;

    applyDraftChange((previous) => applySizePresetToDraft(previous, presetId, templates));
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
    applyDraftChange((previous) => setTemplateFieldValue(previous, field, value));
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
    applyDraftChange((previous) => ({ ...previous, notes }));
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

  function handleCreateNewProfile() {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    const fresh = createMeasurementDraftForTemplate(draft.templateId, templates);
    draftRef.current = fresh;
    savedRevisionRef.current = latestRevisionRef.current;
    setDraft(fresh);
    setErrors({});
    setSyncState("idle");
    setSyncError(null);
    setLastSavedAt(null);
    setCurrentStep(1);
    setView("editor");
    setStatus({
      tone: "info",
      message: "Siap membuat profil ukuran baru. Pilih jenis pakaian dan masukkan ukuran.",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleEditSavedProfile(profile: MeasurementProfile) {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    const restored = createMeasurementDraftFromProfile(profile, templates);
    const matchedTemplate = getMeasurementTemplateById(restored.templateId, templates);
    draftRef.current = restored;
    savedRevisionRef.current = latestRevisionRef.current;
    setDraft(restored);
    setSavedProfile(profile);
    setLastSavedAt(profile.updatedAt);
    setSyncState("saved");
    setSyncError(null);
    setActiveFieldKey(matchedTemplate.fields[0]?.key ?? null);
    setCurrentStep(2);
    setErrors({});
    setStatus({
      tone: "info",
      message: `Mengubah profil "${profile.label}". Perubahan tersimpan otomatis dan tidak mengubah ukuran pesanan lama.`,
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
        const nextDraft = createMeasurementDraftFromProfile(nextPrimary, templates);
        draftRef.current = nextDraft;
        setDraft(nextDraft);
        setLastSavedAt(nextPrimary.updatedAt);
        setView("saved");
      } else {
        const fresh = createMeasurementDraftForTemplate(draft.templateId, templates);
        draftRef.current = fresh;
        setDraft(fresh);
        setSyncState("idle");
        setLastSavedAt(null);
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

  function handleAccountSynced(payload: {
    customer: CustomerIdentitySummary | null;
    profiles?: MeasurementProfile[];
  }) {
    if (payload.profiles) {
      setSavedProfiles(payload.profiles);
      const first = payload.profiles[0] ?? null;
      setSavedProfile(first);
      if (first) {
        const restored = createMeasurementDraftFromProfile(first, templates);
        draftRef.current = restored;
        setDraft(restored);
        setLastSavedAt(first.updatedAt);
        setSyncState("saved");
        setView("saved");
      } else if (!payload.customer) {
        const fresh = createMeasurementDraftForTemplate("gamis", templates);
        draftRef.current = fresh;
        setDraft(fresh);
        setSyncState("idle");
        setLastSavedAt(null);
        setView("editor");
        setCurrentStep(1);
      }
    }
    if (payload.customer) {
      setStatus({
        tone: "success",
        message: `Masuk sebagai ${payload.customer.fullName || payload.customer.email}. Profil ukuran tersimpan telah disinkronkan.`,
      });
    }
  }

  // =========================================================================
  // TAMPILAN PROFIL UKURAN TERSIMPAN
  // =========================================================================
  if (view === "saved" && savedProfile) {
    return (
      <SavedProfileView
        lastSavedAt={lastSavedAt}
        onAccountSynced={handleAccountSynced}
        onCreateNewProfile={handleCreateNewProfile}
        onDeleteProfile={(p) => void handleDeleteProfile(p)}
        onEditProfile={handleEditSavedProfile}
        onSelectProfile={(p) => {
          setSavedProfile(p);
          const restored = createMeasurementDraftFromProfile(p, templates);
          draftRef.current = restored;
          setDraft(restored);
          setLastSavedAt(p.updatedAt);
          setStatus(null);
        }}
        profile={savedProfile}
        profiles={savedProfiles}
        statusMessage={status?.message ?? null}
        syncError={syncError}
        syncState={syncState}
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
              (cm), lalu tinjau pada mannequin. Perubahan profil ukuran tersimpan otomatis.
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
          <AutoSyncStatusBar
            lastSavedAt={lastSavedAt}
            onAccountSynced={handleAccountSynced}
            onRetry={() => void flushAutoSave(false)}
            syncError={syncError}
            syncState={syncState}
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
        {/* TAHAP 01 — JENIS PAKAIAN */}
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

        {/* TAHAP 02 — PILIH & ISI UKURAN */}
        {currentStep === 2 ? (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-10">
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

        {/* TAHAP 03 — GUNAKAN MANNEQUIN */}
        {currentStep === 3 ? (
          <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-10">
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

            <div className="flex flex-col gap-5">
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
                      <span>Perubahan tersimpan otomatis dan ikut terbawa ke pesanan.</span>
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
                    onClick={() => void flushAutoSave(true)}
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
