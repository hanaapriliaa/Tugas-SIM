"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ButtonLink, buttonClass } from "@/components/ui/ButtonLink";
import { ArrowRight, CheckIcon, TrashIcon } from "@/components/ui/icons";
import { DesignStudioForm } from "@/components/design-studio/DesignStudioForm";
import { SilhouettePreview } from "@/components/design-studio/SilhouettePreview";
import { garmentCategories } from "@/lib/booking-options";
import {
  MAX_SAVED_DESIGNS,
  buildDesignOrderHref,
  createDesignDraftFromReference,
  createDesignDraftFromSaved,
  createEmptyDesignDraft,
  createSavedDesignConfig,
  formatSavedDate,
  getCategoryName,
  getModelOptions,
  removeSavedDesign,
  summarizeSpecifications,
  upsertSavedDesign,
  validateDesignDraft,
  type DesignStudioDraft,
} from "@/lib/design-studio";
import { loadSavedDesigns, saveSavedDesigns } from "@/lib/storage/tailor-store";
import { processAttachmentFiles } from "@/lib/attachments";
import type {
  DesignStudioSavedConfig,
  GarmentCategoryId,
  GarmentSpecifications,
} from "@/lib/types/tailor";

type StatusTone = "success" | "error" | "info";

type StatusMessage = {
  tone: StatusTone;
  message: string;
};

const smallAction =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-cocoa/25 px-4 py-2 text-[0.625rem] font-medium uppercase tracking-[0.12em] text-espresso transition-colors hover:border-cocoa hover:bg-cream/70";

const smallPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-espresso px-4 py-2 text-[0.625rem] font-medium uppercase tracking-[0.12em] text-ivory transition-colors hover:bg-cocoa";

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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const stored = loadSavedDesigns();
    setSavedDesigns(stored);

    const referenceParam = searchParams.get("reference");
    const categoryParam = searchParams.get("category");

    let nextDraft: DesignStudioDraft | null = null;

    if (referenceParam) {
      nextDraft = createDesignDraftFromReference(referenceParam);
      if (nextDraft) {
        setStatus({
          tone: "info",
          message: `Dimulai dari referensi "${nextDraft.modelName}". Lengkapi detail lalu simpan.`,
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

    if (nextDraft) setDraft(nextDraft);
    setHydrated(true);
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

  function updateField<K extends keyof DesignStudioDraft>(key: K, value: DesignStudioDraft[K]) {
    setDraft((previous) => ({ ...previous, [key]: value }));
    clearErrors(String(key));
  }

  function updateSpecification<K extends keyof GarmentSpecifications>(
    key: K,
    value: GarmentSpecifications[K]
  ) {
    setDraft((previous) => ({
      ...previous,
      specifications: { ...previous.specifications, [key]: value },
    }));
    clearErrors(String(key));
  }

  function handleCategoryChange(categoryId: GarmentCategoryId) {
    setDraft((previous) => ({
      ...previous,
      categoryId,
      modelName: getModelOptions(categoryId)[0] ?? previous.modelName,
    }));
    clearErrors("categoryId", "modelName");
  }

  function handleColorChange(name: string, hex: string) {
    setDraft((previous) => ({
      ...previous,
      specifications: { ...previous.specifications, colorName: name, colorHex: hex },
    }));
    clearErrors("colorName", "colorHex");
  }

  async function handleFilesSelected(fileList: FileList | null) {
    setUploadError(null);
    const { attachments, error } = await processAttachmentFiles(
      fileList,
      draft.attachments.length
    );
    if (error) setUploadError(error);
    if (attachments.length > 0) {
      setDraft((previous) => ({
        ...previous,
        attachments: [...previous.attachments, ...attachments],
      }));
    }
  }

  function handleRemoveAttachment(id: string) {
    setDraft((previous) => ({
      ...previous,
      attachments: previous.attachments.filter((attachment) => attachment.id !== id),
    }));
  }

  function handleSave() {
    const result = validateDesignDraft(draft);
    if (!result.valid) {
      setErrors(result.errors);
      setStatus({
        tone: "error",
        message: "Lengkapi bagian yang ditandai sebelum menyimpan desain.",
      });
      return;
    }

    const config = createSavedDesignConfig(draft);
    const next = upsertSavedDesign(savedDesigns, config);
    saveSavedDesigns(next);
    setSavedDesigns(next);
    setDraft(createDesignDraftFromSaved(config));
    setErrors({});
    setStatus({
      tone: "success",
      message: `Desain "${config.title}" tersimpan di browser ini.`,
    });
  }

  function handleLoad(config: DesignStudioSavedConfig) {
    setDraft(createDesignDraftFromSaved(config));
    setErrors({});
    setUploadError(null);
    setStatus({ tone: "info", message: `Memuat desain "${config.title}".` });
  }

  function handleDelete(config: DesignStudioSavedConfig) {
    if (!window.confirm(`Hapus desain "${config.title}" dari browser ini?`)) return;

    const next = removeSavedDesign(savedDesigns, config.id);
    saveSavedDesigns(next);
    setSavedDesigns(next);

    if (draft.id === config.id) {
      setDraft(createEmptyDesignDraft(draft.categoryId));
      setErrors({});
    }

    setStatus({ tone: "info", message: "Desain dihapus dari browser ini." });
  }

  function handleNewDesign() {
    setDraft(createEmptyDesignDraft());
    setErrors({});
    setUploadError(null);
    setStatus({ tone: "info", message: "Draft desain baru siap diisi." });
  }

  const summaryRows = summarizeSpecifications(draft.specifications);

  return (
    <div>
      <section className="shell pb-8 pt-12 sm:pt-16">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex max-w-2xl flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <p className="eyebrow">Design Studio</p>
              <span className="rounded-full border border-cocoa/25 px-3 py-1 text-[0.625rem] font-medium uppercase tracking-[0.16em] text-cocoa">
                Tahap 2
              </span>
            </div>
            <h1 className="text-balance text-[2.2rem] leading-[1.1] text-espresso sm:text-[2.9rem]">
              Rancang busana, lihat perubahannya langsung.
            </h1>
            <p className="max-w-xl text-pretty text-sm leading-relaxed text-muted sm:text-[0.95rem]">
              Pilih kategori, bahan, warna, dan detail jahit. Pratinjau di samping akan mengikuti
              pilihan Anda. Simpan konfigurasi untuk diajukan bersama pesanan custom.
            </p>
          </div>

          <button className={buttonClass("outline", "w-fit shrink-0")} onClick={handleNewDesign} type="button">
            Desain Baru
          </button>
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
              onFilesSelected={handleFilesSelected}
              onRemoveAttachment={handleRemoveAttachment}
              uploadError={uploadError}
            />

            <div className="mt-6 flex flex-col gap-4 rounded-[1.5rem] border border-cocoa/15 bg-cream/45 p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-md text-xs leading-relaxed text-muted">
                Desain disimpan di browser perangkat ini, bukan di server Celmira. Anda dapat
                memuatnya kembali kapan saja dari daftar desain tersimpan.
              </p>
              <button className={buttonClass("solid", "w-fit shrink-0")} onClick={handleSave} type="button">
                Simpan Desain
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

              <div className="mt-5">
                {draft.id ? (
                  <ButtonLink className="w-full" href={buildDesignOrderHref(draft.id)}>
                    Gunakan di Pesanan
                    <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-1" />
                  </ButtonLink>
                ) : (
                  <p className="rounded-xl border border-cocoa/12 bg-ivory/85 px-4 py-3 text-[0.6875rem] leading-relaxed text-muted">
                    Simpan desain terlebih dahulu untuk dapat mengajukannya bersama pesanan custom.
                  </p>
                )}
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
              <p className="eyebrow">Koleksi Lokal</p>
              <h2
                className="text-balance text-[1.75rem] leading-[1.15] text-espresso sm:text-[2.1rem]"
                id="saved-designs-title"
              >
                Desain tersimpan
              </h2>
              <p className="max-w-xl text-sm leading-relaxed text-muted">
                Konfigurasi tersimpan di browser ini dan dapat dipakai ulang di halaman pemesanan.
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
                Lengkapi formulir di atas, lalu tekan “Simpan Desain”. Desain pertama Anda akan
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
                      <p className="mt-0.5 truncate text-xs text-muted">{config.modelName}</p>
                    </div>
                    <span
                      aria-hidden="true"
                      className="mt-1 h-6 w-6 shrink-0 rounded-full border border-cocoa/25"
                      style={{ backgroundColor: config.specifications.colorHex }}
                    />
                  </div>

                  <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted">
                    Diperbarui {formatSavedDate(config.updatedAt)} · {config.attachments.length}{" "}
                    lampiran
                  </p>

                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                    <button className={smallAction} onClick={() => handleLoad(config)} type="button">
                      Muat
                    </button>
                    <Link className={smallPrimary} href={buildDesignOrderHref(config.id)}>
                      Gunakan
                    </Link>
                    <button
                      aria-label={`Hapus ${config.title}`}
                      className="ml-auto rounded-full border border-cocoa/15 p-2 text-cocoa transition-colors hover:border-rose/60 hover:text-rose"
                      onClick={() => handleDelete(config)}
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
