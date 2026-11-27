"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DesignStudioForm } from "@/components/design-studio/DesignStudioForm";
import { SilhouettePreview } from "@/components/design-studio/SilhouettePreview";
import { AutoSyncStatusBar } from "@/components/studio/AutoSyncStatusBar";
import { ButtonLink, buttonClass } from "@/components/ui/ButtonLink";
import { ArrowRight, ChatIcon, CheckIcon, TrashIcon } from "@/components/ui/icons";
import { garmentCategories } from "@/lib/booking-options";
import { MAX_ATTACHMENTS_COUNT, validateAttachmentFile } from "@/lib/booking-validation";
import { buildChatHref } from "@/lib/chat";
import {
  MAX_SAVED_DESIGNS,
  buildDesignOrderHref,
  createDesignDraftFromReference,
  createDesignDraftFromSaved,
  createEmptyDesignDraft,
  formatSavedDate,
  getCategoryName,
  getModelOptions,
  removeSavedDesign,
  summarizeSpecifications,
  upsertSavedDesign,
  validateDesignDraft,
  type DesignStudioDraft,
} from "@/lib/design-studio";
import {
  StudioApiError,
  deleteDesignApi,
  fetchSavedDesignsApi,
  migrateLegacyStudioDataIfNeeded,
  saveDesignApi,
  uploadStudioReferenceFileApi,
  type AutoSyncState,
} from "@/lib/studio-client";
import type {
  DesignStudioSavedConfig,
  GarmentCategoryId,
  GarmentSpecifications,
  ReferenceAttachment,
} from "@/lib/types/tailor";

type StatusTone = "success" | "error" | "info";

type StatusMessage = {
  tone: StatusTone;
  message: string;
};

const AUTOSYNC_DEBOUNCE_MS = 900;

const smallAction =
  "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full border border-cocoa/25 px-4 py-2 text-[0.625rem] font-medium uppercase tracking-[0.12em] text-espresso transition-colors hover:border-cocoa hover:bg-cream/70";

const smallPrimary =
  "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full bg-espresso px-4 py-2 text-[0.625rem] font-medium uppercase tracking-[0.12em] text-ivory transition-colors hover:bg-cocoa";

function statusClass(tone: StatusTone): string {
  if (tone === "error") return "border-rose/30 bg-rose/10 text-rose";
  if (tone === "success") return "border-cocoa/25 bg-cream/70 text-espresso";
  return "border-cocoa/15 bg-ivory text-muted";
}

export function DesignStudio() {
  const searchParams = useSearchParams();
  const [draft, setDraft] = useState<DesignStudioDraft>(() => createEmptyDesignDraft());
  const [savedDesigns, setSavedDesigns] = useState<DesignStudioSavedConfig[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [syncState, setSyncState] = useState<AutoSyncState>("idle");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Refs untuk debounce & coalescing penyimpanan otomatis tanpa race condition
  const draftRef = useRef<DesignStudioDraft>(draft);
  const latestRevisionRef = useRef(0);
  const savedRevisionRef = useRef(0);
  const inFlightRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const flushAutoSave = useCallback(async (forceManualFeedback = false) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const currentDraft = draftRef.current;
    const validation = validateDesignDraft(currentDraft);

    if (!validation.valid) {
      if (forceManualFeedback) {
        setErrors(validation.errors);
        setStatus({
          tone: "error",
          message: "Lengkapi bagian yang ditandai sebelum menyimpan desain.",
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
      const wasUpdate = Boolean(currentDraft.id && currentDraft.id.startsWith("dsn-"));
      const { design } = await saveDesignApi(currentDraft);

      savedRevisionRef.current = Math.max(savedRevisionRef.current, targetRevision);
      setSavedDesigns((previous) => upsertSavedDesign(previous, design));
      setLastSavedAt(design.updatedAt);
      setErrors({});

      // Tetapkan ID server tanpa menimpa ketikan terbaru jika pengguna sedang mengetik lagi
      setDraft((previous) => {
        if (latestRevisionRef.current === targetRevision) {
          return createDesignDraftFromSaved(design);
        }
        return previous.id ? previous : { ...previous, id: design.id };
      });

      if (forceManualFeedback) {
        setStatus({
          tone: "success",
          message: wasUpdate
            ? `Perubahan desain "${design.title}" tersimpan di server Celmira.`
            : `Desain "${design.title}" tersimpan di server Celmira dan siap digunakan di pesanan.`,
        });
      }

      if (latestRevisionRef.current > savedRevisionRef.current) {
        inFlightRef.current = false;
        setIsSaving(false);
        void flushAutoSave(false);
        return;
      }

      // Status "Tersimpan" hanya ditampilkan setelah server benar-benar mengonfirmasi revisi terakhir
      setSyncState("saved");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Gagal menyimpan desain ke server. Coba lagi.";
      if (err instanceof StudioApiError && err.errors && forceManualFeedback) {
        setErrors(err.errors);
      }
      setSyncState("error");
      setSyncError(message);
      if (forceManualFeedback) {
        setStatus({ tone: "error", message });
      }
    } finally {
      inFlightRef.current = false;
      setIsSaving(false);
    }
  }, []);

  const scheduleAutoSave = useCallback(
    (nextDraft: DesignStudioDraft) => {
      draftRef.current = nextDraft;
      latestRevisionRef.current += 1;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      const validation = validateDesignDraft(nextDraft);
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

    async function bootstrap() {
      let stored: DesignStudioSavedConfig[] = [];
      try {
        const migrated = await migrateLegacyStudioDataIfNeeded().catch(() => ({ ran: false }));
        if (!active) return;

        if (migrated.ran && "designs" in migrated && Array.isArray(migrated.designs)) {
          stored = migrated.designs;
        } else {
          const res = await fetchSavedDesignsApi();
          if (!active) return;
          stored = res.designs;
        }
        setSavedDesigns(stored);
      } catch (err) {
        if (!active) return;
        setSyncState("error");
        setSyncError(
          err instanceof Error
            ? err.message
            : "Gagal memuat daftar desain tersimpan dari server."
        );
      }

      const urlParams =
        typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const getParam = (key: string) => searchParams.get(key) ?? urlParams?.get(key) ?? null;

      const designIdParam = getParam("designId");
      const referenceParam = getParam("reference");
      const categoryParam = getParam("category");

      let nextDraft: DesignStudioDraft | null = null;

      if (designIdParam) {
        const matched = stored.find((item) => item.id === designIdParam);
        if (matched) {
          nextDraft = createDesignDraftFromSaved(matched);
          setLastSavedAt(matched.updatedAt);
          setSyncState("saved");
          setStatus({
            tone: "info",
            message: `Memuat desain tersimpan "${matched.title}" untuk diedit.`,
          });
        }
      }

      if (!nextDraft && referenceParam) {
        nextDraft = createDesignDraftFromReference(referenceParam);
        if (nextDraft) {
          setStatus({
            tone: "info",
            message: `Dimulai dari referensi "${nextDraft.modelName}". Perubahan Anda akan tersimpan otomatis.`,
          });
        }
      }

      if (
        !nextDraft &&
        categoryParam &&
        garmentCategories.some((category) => category.id === categoryParam)
      ) {
        nextDraft = createEmptyDesignDraft(categoryParam as GarmentCategoryId);
      }

      if (nextDraft) {
        draftRef.current = nextDraft;
        setDraft(nextDraft);
      }
      setHydrated(true);
    }

    void bootstrap();
    return () => {
      active = false;
    };
    // Query hanya dibaca saat pertama dibuka agar isian pengguna tidak ter-reset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clearErrors(...keys: string[]) {
    setErrors((previous) => {
      const next = { ...previous };
      for (const key of keys) delete next[key];
      return next;
    });
  }

  function applyDraftChange(updater: (previous: DesignStudioDraft) => DesignStudioDraft) {
    setDraft((previous) => {
      const next = updater(previous);
      scheduleAutoSave(next);
      return next;
    });
  }

  function updateField<K extends keyof DesignStudioDraft>(key: K, value: DesignStudioDraft[K]) {
    applyDraftChange((previous) => ({ ...previous, [key]: value }));
    clearErrors(String(key));
  }

  function updateSpecification<K extends keyof GarmentSpecifications>(
    key: K,
    value: GarmentSpecifications[K]
  ) {
    applyDraftChange((previous) => ({
      ...previous,
      specifications: { ...previous.specifications, [key]: value },
    }));
    clearErrors(String(key));
  }

  function handleCategoryChange(categoryId: GarmentCategoryId) {
    applyDraftChange((previous) => ({
      ...previous,
      categoryId,
      modelName: getModelOptions(categoryId)[0] ?? previous.modelName,
    }));
    clearErrors("categoryId", "modelName");
  }

  function handleColorChange(name: string, hex: string) {
    applyDraftChange((previous) => ({
      ...previous,
      specifications: { ...previous.specifications, colorName: name, colorHex: hex },
    }));
    clearErrors("colorName", "colorHex");
  }

  async function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploadError(null);

    const remainingSlots = MAX_ATTACHMENTS_COUNT - draftRef.current.attachments.length;
    if (remainingSlots <= 0) {
      setUploadError(`Maksimal ${MAX_ATTACHMENTS_COUNT} file referensi per desain.`);
      return;
    }

    const candidates = Array.from(fileList).slice(0, remainingSlots);
    const rejectedMessages: string[] = [];
    const uploadedAttachments: ReferenceAttachment[] = [];

    setIsUploading(true);
    try {
      for (const file of candidates) {
        const localErr = validateAttachmentFile(file);
        if (localErr) {
          rejectedMessages.push(localErr);
          continue;
        }
        try {
          const res = await uploadStudioReferenceFileApi(file, draftRef.current.id);
          uploadedAttachments.push(res.attachment);
        } catch (err) {
          rejectedMessages.push(
            err instanceof Error ? err.message : `Gagal mengunggah "${file.name}".`
          );
        }
      }

      if (uploadedAttachments.length > 0) {
        applyDraftChange((previous) => ({
          ...previous,
          attachments: [...previous.attachments, ...uploadedAttachments],
        }));
      }
      if (rejectedMessages.length > 0) {
        setUploadError(rejectedMessages.join(" "));
      }
    } finally {
      setIsUploading(false);
    }
  }

  function handleRemoveAttachment(id: string) {
    applyDraftChange((previous) => ({
      ...previous,
      attachments: previous.attachments.filter((attachment) => attachment.id !== id),
    }));
  }

  function handleLoad(config: DesignStudioSavedConfig) {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    const restored = createDesignDraftFromSaved(config);
    draftRef.current = restored;
    savedRevisionRef.current = latestRevisionRef.current;
    setDraft(restored);
    setErrors({});
    setUploadError(null);
    setSyncState("saved");
    setSyncError(null);
    setLastSavedAt(config.updatedAt);
    setStatus({ tone: "info", message: `Memuat desain "${config.title}" untuk diedit.` });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(config: DesignStudioSavedConfig) {
    if (!window.confirm(`Hapus desain "${config.title}" dari daftar tersimpan?`)) return;

    try {
      await deleteDesignApi(config.id);
      setSavedDesigns((previous) => removeSavedDesign(previous, config.id));

      if (draftRef.current.id === config.id) {
        const empty = createEmptyDesignDraft(draftRef.current.categoryId);
        draftRef.current = empty;
        setDraft(empty);
        setErrors({});
        setSyncState("idle");
        setLastSavedAt(null);
      }

      setStatus({
        tone: "info",
        message: `Desain "${config.title}" telah dihapus. Pesanan lama yang menggunakan desain ini tetap aman.`,
      });
    } catch (err) {
      setStatus({
        tone: "error",
        message: err instanceof Error ? err.message : "Gagal menghapus desain di server.",
      });
    }
  }

  function handleNewDesign() {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    const empty = createEmptyDesignDraft();
    draftRef.current = empty;
    savedRevisionRef.current = latestRevisionRef.current;
    setDraft(empty);
    setErrors({});
    setUploadError(null);
    setSyncState("idle");
    setSyncError(null);
    setLastSavedAt(null);
    setStatus({ tone: "info", message: "Draft desain baru siap diisi." });
  }

  const summaryRows = summarizeSpecifications(draft.specifications);

  return (
    <div>
      <section className="shell pb-8 pt-12 sm:pt-16">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex max-w-2xl flex-col gap-3">
            <p className="eyebrow">Design Studio</p>
            <h1 className="text-balance text-[2.2rem] leading-[1.1] text-espresso sm:text-[2.9rem]">
              Rancang busana, lihat perubahannya langsung.
            </h1>
            <p className="max-w-xl text-pretty text-sm leading-relaxed text-muted sm:text-[0.95rem]">
              Pilih kategori, bahan, warna, dan detail jahit serta unggah gambar referensi.
              Perubahan desain tersimpan otomatis ke server Celmira dan langsung terhubung ke
              halaman pemesanan serta panel admin.
            </p>
          </div>

          <button
            className={buttonClass("outline", "w-fit shrink-0 cursor-pointer")}
            onClick={handleNewDesign}
            type="button"
          >
            Desain Baru
          </button>
        </div>

        <div className="mt-6">
          <AutoSyncStatusBar
            lastSavedAt={lastSavedAt}
            onAccountSynced={({ customer, designs }) => {
              if (designs) {
                setSavedDesigns(designs);
              }
              if (customer) {
                setStatus({
                  tone: "success",
                  message: `Masuk sebagai ${customer.fullName || customer.email}. Daftar desain tersimpan telah disinkronkan.`,
                });
              } else {
                const empty = createEmptyDesignDraft();
                draftRef.current = empty;
                setDraft(empty);
                setSyncState("idle");
                setLastSavedAt(null);
              }
            }}
            onRetry={() => void flushAutoSave(false)}
            syncError={syncError}
            syncState={syncState}
          />
        </div>
      </section>

      <div className="shell pb-16 sm:pb-20">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-10">
          <div>
            <DesignStudioForm
              draft={draft}
              errors={errors}
              isDragging={isDragging}
              onCategoryChange={handleCategoryChange}
              onChangeColor={handleColorChange}
              onChangeField={updateField}
              onChangeSpec={updateSpecification}
              onDragStateChange={setIsDragging}
              onFilesSelected={(files) => void handleFilesSelected(files)}
              onRemoveAttachment={handleRemoveAttachment}
              uploadError={
                isUploading ? "Mengunggah file referensi ke penyimpanan aman..." : uploadError
              }
            />

            <div className="mt-6 flex flex-col gap-4 rounded-[1.5rem] border border-cocoa/15 bg-cream/45 p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-md text-xs leading-relaxed text-muted">
                Desain dan lampiran referensi tersimpan otomatis ke server Celmira setelah nama
                desain diisi. Anda juga dapat menekan tombol di samping untuk memastikan
                penyimpanan segera.
              </p>
              <button
                className={buttonClass("solid", "w-fit shrink-0 cursor-pointer")}
                disabled={isSaving || isUploading}
                onClick={() => void flushAutoSave(true)}
                type="button"
              >
                {isSaving
                  ? "Menyimpan..."
                  : draft.id
                    ? "Simpan Perubahan Desain"
                    : "Simpan Desain"}
                <CheckIcon className="h-4 w-4" />
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

          <aside className="flex flex-col gap-4 lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-[1.75rem] border border-cocoa/15 bg-cream/65 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4 border-b border-cocoa/12 pb-4">
                <div>
                  <p className="text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-cocoa">
                    Pratinjau Desain
                  </p>
                  <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl leading-snug text-espresso">
                    {draft.title.trim() || "Desain tanpa nama"}
                  </h2>
                  <p className="mt-1 text-[0.6875rem] uppercase tracking-[0.14em] text-muted">
                    {getCategoryName(draft.categoryId)} · {draft.modelName}
                  </p>
                </div>
                <span
                  aria-label={`Warna ${draft.specifications.colorName}`}
                  className="h-7 w-7 shrink-0 rounded-full border border-cocoa/25"
                  style={{ backgroundColor: draft.specifications.colorHex }}
                  title={draft.specifications.colorName}
                />
              </div>

              <div className="mt-4 aspect-[220/340] w-full rounded-2xl border border-cocoa/10 bg-ivory p-3">
                <SilhouettePreview
                  buttonStyle={draft.specifications.buttonStyle}
                  categoryId={draft.categoryId}
                  collarStyle={draft.specifications.collarStyle}
                  colorHex={draft.specifications.colorHex}
                  embroideryDetail={draft.specifications.embroideryDetail}
                  laceDetail={draft.specifications.laceDetail}
                  lengthOption={draft.specifications.lengthOption}
                  sleeveStyle={draft.specifications.sleeveStyle}
                  zipperStyle={draft.specifications.zipperStyle}
                />
              </div>

              <dl className="mt-4 divide-y divide-cocoa/10 text-sm">
                {summaryRows.map((row) => (
                  <div className="flex items-baseline justify-between gap-4 py-2.5" key={row.label}>
                    <dt className="shrink-0 text-[0.6875rem] uppercase tracking-[0.14em] text-muted">
                      {row.label}
                    </dt>
                    <dd className="text-right font-medium text-espresso">{row.value}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-5 flex flex-col gap-2.5">
                {draft.id ? (
                  <ButtonLink className="w-full" href={buildDesignOrderHref(draft.id)}>
                    Gunakan di Pesanan
                    <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-1" />
                  </ButtonLink>
                ) : (
                  <p className="rounded-xl border border-cocoa/12 bg-ivory/85 px-4 py-3 text-[0.6875rem] leading-relaxed text-muted">
                    Beri nama desain agar tersimpan otomatis dan dapat langsung digunakan di
                    pesanan custom.
                  </p>
                )}

                <ButtonLink
                  className="w-full"
                  href={buildChatHref({
                    source: "design-studio",
                    category: draft.categoryId,
                    designId: draft.id || undefined,
                  })}
                  variant="outline"
                >
                  <ChatIcon className="h-4 w-4" />
                  Konsultasi Desain di Chat
                </ButtonLink>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-cocoa/12 bg-ivory/70 p-5 text-[0.6875rem] leading-relaxed text-muted">
              <p className="font-semibold uppercase tracking-[0.14em] text-cocoa">Catatan</p>
              <p className="mt-1.5">
                Pratinjau ini adalah ilustrasi pilihan Anda, bukan hasil akhir jahitan. Detail
                bahan, jatuh kain, dan kenyamanan tetap dikonfirmasi saat konsultasi.
              </p>
            </div>
          </aside>
        </div>

        <section aria-labelledby="saved-designs-title" className="mt-14">
          <div className="flex flex-col gap-3 border-t border-cocoa/12 pt-8 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-2">
              <p className="eyebrow">Koleksi Desain Anda</p>
              <h2
                className="text-balance text-[1.75rem] leading-[1.15] text-espresso sm:text-[2.1rem]"
                id="saved-designs-title"
              >
                Desain tersimpan
              </h2>
              <p className="max-w-xl text-sm leading-relaxed text-muted">
                Desain tersimpan otomatis dan dapat dibuka kembali untuk diedit atau dipakai
                langsung pada formulir pemesanan.
              </p>
            </div>
            <span className="w-fit rounded-full border border-cocoa/20 px-3 py-1 text-[0.625rem] font-medium uppercase tracking-[0.16em] text-cocoa">
              {savedDesigns.length}/{MAX_SAVED_DESIGNS} tersimpan
            </span>
          </div>

          {!hydrated ? (
            <p className="mt-6 text-sm text-muted">Memuat desain tersimpan...</p>
          ) : savedDesigns.length === 0 ? (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-cocoa/25 bg-cream/35 px-6 py-10 text-center">
              <p className="font-[family-name:var(--font-display)] text-lg text-espresso">
                Belum ada desain tersimpan
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
                Lengkapi nama dan detail desain di atas. Desain Anda akan otomatis tersimpan dan
                muncul di sini.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {savedDesigns.map((config) => (
                <article
                  className="flex flex-col gap-3 rounded-[1.25rem] border border-cocoa/15 bg-ivory p-5 transition-colors hover:border-cocoa/30"
                  key={config.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[0.5625rem] font-semibold uppercase tracking-[0.18em] text-cocoa/70">
                        {getCategoryName(config.categoryId)}
                      </p>
                      <h3 className="mt-1 truncate font-[family-name:var(--font-display)] text-lg text-espresso">
                        {config.title}
                      </h3>
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {config.modelName} · {config.specifications.fabric}
                      </p>
                    </div>
                    <span
                      aria-hidden="true"
                      className="mt-1 h-6 w-6 shrink-0 rounded-full border border-cocoa/25"
                      style={{ backgroundColor: config.specifications.colorHex }}
                    />
                  </div>

                  {config.attachments.some((att) => att.kind === "image" && att.url) ? (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {config.attachments
                        .filter((att) => att.kind === "image" && att.url)
                        .slice(0, 3)
                        .map((att) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            alt={att.name}
                            className="h-14 w-14 shrink-0 rounded-xl border border-cocoa/15 object-cover"
                            key={att.id}
                            src={att.url}
                          />
                        ))}
                    </div>
                  ) : null}

                  <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted">
                    Diperbarui {formatSavedDate(config.updatedAt)} · {config.attachments.length}{" "}
                    lampiran
                  </p>

                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                    <button
                      className={smallAction}
                      onClick={() => handleLoad(config)}
                      type="button"
                    >
                      Edit / Muat
                    </button>
                    <Link className={smallPrimary} href={buildDesignOrderHref(config.id)}>
                      Gunakan
                    </Link>
                    <button
                      aria-label={`Hapus ${config.title}`}
                      className="ml-auto cursor-pointer rounded-full border border-cocoa/15 p-2 text-cocoa transition-colors hover:border-rose/60 hover:text-rose"
                      onClick={() => void handleDelete(config)}
                      type="button"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
