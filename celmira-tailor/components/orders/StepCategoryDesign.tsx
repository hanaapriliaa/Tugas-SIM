"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ChangeEvent, type DragEvent } from "react";
import {
  celmiraDesignReferences,
  garmentCategories,
} from "@/lib/booking-options";
import { MAX_ATTACHMENTS_COUNT } from "@/lib/booking-validation";
import { formatFileSize, processAttachmentFiles } from "@/lib/attachments";
import { CheckIcon, FileTextIcon, TrashIcon, UploadIcon } from "@/components/ui/icons";
import type {
  CelmiraDesignReference,
  DesignSourceType,
  DesignStudioSavedConfig,
  GarmentCategoryId,
  OrderDraft,
  ReferenceAttachment,
} from "@/lib/types/tailor";

type StepCategoryDesignProps = {
  draft: OrderDraft;
  savedDesigns: DesignStudioSavedConfig[];
  errors: Record<string, string>;
  onSelectCategory: (categoryId: GarmentCategoryId) => void;
  onChangeDesignSource: (source: DesignSourceType) => void;
  onSelectCelmiraDesign: (design: CelmiraDesignReference) => void;
  onSelectStudioDesign: (design: DesignStudioSavedConfig) => void;
  onUpdateCustomTitle: (title: string) => void;
  onAddAttachments: (files: ReferenceAttachment[]) => void;
  onRemoveAttachment: (id: string) => void;
  onUpdateAttachmentNote: (id: string, note: string) => void;
};

export function StepCategoryDesign({
  draft,
  savedDesigns,
  errors,
  onSelectCategory,
  onChangeDesignSource,
  onSelectCelmiraDesign,
  onSelectStudioDesign,
  onUpdateCustomTitle,
  onAddAttachments,
  onRemoveAttachment,
  onUpdateAttachmentNote,
}: StepCategoryDesignProps) {
  const [showAllReferences, setShowAllReferences] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const filteredReferences =
    !draft.categoryId || showAllReferences
      ? celmiraDesignReferences
      : celmiraDesignReferences.filter((item) => item.categoryId === draft.categoryId);

  async function processFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploadError(null);

    const { attachments, error } = await processAttachmentFiles(
      fileList,
      draft.attachments.length
    );
    if (error) setUploadError(error);
    if (attachments.length > 0) {
      onAddAttachments(attachments);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    void processFiles(event.target.files);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    void processFiles(event.dataTransfer.files);
  }

  const sourceTabs: Array<{ id: DesignSourceType; label: string; hint: string }> = [
    { id: "celmira", label: "Desain Celmira", hint: "Pilih referensi & acuan Celmira" },
    { id: "custom-upload", label: "Upload Desain Sendiri", hint: "Foto referensi, sketsa, atau PDF" },
    { id: "design-studio", label: "Dari Design Studio", hint: `${savedDesigns.length} tersimpan` },
  ];

  return (
    <div className="flex flex-col gap-10">
      {/* 1. Kategori Busana */}
      <section aria-labelledby="step1-category-heading">
        <div className="flex flex-col gap-2">
          <p className="eyebrow">Langkah 1A</p>
          <h2 className="text-2xl text-espresso sm:text-[1.75rem]" id="step1-category-heading">
            Pilih kategori busana
          </h2>
          <p className="text-sm leading-relaxed text-muted">
            Pilih kategori layanan yang paling mendekati busana yang ingin Anda jahit.
          </p>
        </div>

        {errors.categoryId ? (
          <p
            className="mt-3 rounded-xl border border-rose/60 bg-cream px-4 py-2.5 text-sm text-espresso"
            role="alert"
          >
            {errors.categoryId}
          </p>
        ) : null}

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {garmentCategories.map((category) => {
            const isSelected = draft.categoryId === category.id;
            return (
              <button
                aria-pressed={isSelected}
                className={`flex cursor-pointer flex-col justify-between gap-3 rounded-2xl border p-4 text-left transition-all duration-300 ${
                  isSelected
                    ? "border-espresso bg-espresso text-ivory shadow-sm"
                    : "border-cocoa/15 bg-ivory text-espresso hover:border-cocoa/45 hover:bg-cream/55"
                }`}
                key={category.id}
                onClick={() => onSelectCategory(category.id)}
                type="button"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-[0.6875rem] font-medium tracking-[0.22em] ${
                      isSelected ? "text-blush" : "text-rose"
                    }`}
                  >
                    {category.index}
                  </span>
                  {isSelected ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-ivory/15 px-2.5 py-0.5 text-[0.625rem] uppercase tracking-[0.14em] text-ivory">
                      <CheckIcon className="h-3 w-3" />
                      Dipilih
                    </span>
                  ) : null}
                </div>
                <div>
                  <p className="font-[family-name:var(--font-display)] text-lg leading-snug">
                    {category.name}
                  </p>
                  <p
                    className={`mt-1 text-xs leading-relaxed ${
                      isSelected ? "text-ivory/80" : "text-muted"
                    }`}
                  >
                    {category.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. Sumber Desain */}
      <section aria-labelledby="step1-design-heading" className="border-t border-cocoa/12 pt-8">
        <div className="flex flex-col gap-2">
          <p className="eyebrow">Langkah 1B</p>
          <h2 className="text-2xl text-espresso sm:text-[1.75rem]" id="step1-design-heading">
            Tentukan acuan desain
          </h2>
          <p className="text-sm leading-relaxed text-muted">
            Gunakan referensi dari Celmira, unggah foto/sketsa/PDF milik Anda, atau muat rancangan
            dari Design Studio.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-3" role="tablist">
          {sourceTabs.map((tab) => {
            const active = draft.designSource === tab.id;
            return (
              <button
                aria-selected={active}
                className={`cursor-pointer rounded-2xl border px-4 py-3 text-left transition-all duration-300 ${
                  active
                    ? "border-cocoa bg-cream text-espresso ring-1 ring-cocoa/35"
                    : "border-cocoa/15 bg-ivory text-muted hover:border-cocoa/35 hover:text-espresso"
                }`}
                key={tab.id}
                onClick={() => onChangeDesignSource(tab.id)}
                role="tab"
                type="button"
              >
                <span className="block text-sm font-medium text-espresso">{tab.label}</span>
                <span className="mt-0.5 block text-[0.6875rem] text-muted">{tab.hint}</span>
              </button>
            );
          })}
        </div>

        {errors.design ? (
          <p
            className="mt-4 rounded-xl border border-rose/60 bg-cream px-4 py-2.5 text-sm text-espresso"
            role="alert"
          >
            {errors.design}
          </p>
        ) : null}

        {/* Panel: Referensi Celmira */}
        {draft.designSource === "celmira" ? (
          <div className="mt-6 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted">
                {draft.categoryId && !showAllReferences
                  ? "Menampilkan referensi sesuai kategori yang Anda pilih."
                  : "Menampilkan seluruh referensi model Celmira."}
              </p>
              {draft.categoryId ? (
                <button
                  className="text-xs font-medium text-cocoa underline underline-offset-4 hover:text-espresso"
                  onClick={() => setShowAllReferences((prev) => !prev)}
                  type="button"
                >
                  {showAllReferences ? "Filter sesuai kategori" : "Lihat semua referensi"}
                </button>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {filteredReferences.map((design) => {
                const isSelected = draft.selectedCelmiraDesignId === design.id;
                return (
                  <button
                    aria-pressed={isSelected}
                    className={`flex cursor-pointer flex-col overflow-hidden rounded-2xl border text-left transition-all duration-300 ${
                      isSelected
                        ? "border-espresso bg-cream/85 ring-1 ring-espresso"
                        : "border-cocoa/15 bg-ivory hover:border-cocoa/45"
                    }`}
                    key={design.id}
                    onClick={() => onSelectCelmiraDesign(design)}
                    type="button"
                  >
                    {design.imageSrc ? (
                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-sand/40">
                        <Image
                          alt={design.imageAlt ?? design.title}
                          className="h-full w-full object-cover object-top"
                          height={800}
                          src={design.imageSrc}
                          width={800}
                        />
                      </div>
                    ) : (
                      <div className="flex aspect-[4/3] w-full flex-col justify-between bg-cream/70 p-5">
                        <span className="text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-cocoa">
                          {design.subtitle}
                        </span>
                        <p className="font-[family-name:var(--font-display)] text-xl italic text-espresso">
                          {design.title}
                        </p>
                      </div>
                    )}

                    <div className="flex flex-1 flex-col justify-between gap-3 p-4">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-[family-name:var(--font-display)] text-lg text-espresso">
                            {design.title}
                          </h3>
                          {isSelected ? (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-espresso px-2.5 py-0.5 text-[0.625rem] uppercase tracking-[0.12em] text-ivory">
                              <CheckIcon className="h-3 w-3" />
                              Dipilih
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1.5 text-xs leading-relaxed text-muted">
                          {design.description}
                        </p>
                      </div>
                      <p className="border-t border-cocoa/10 pt-2.5 text-[0.6875rem] text-cocoa">
                        {design.defaults.fabric} · {design.defaults.collarStyle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Panel: Upload Desain Sendiri */}
        {draft.designSource === "custom-upload" ? (
          <div className="mt-6 flex flex-col gap-5 rounded-2xl border border-cocoa/15 bg-cream/40 p-5 sm:p-6">
            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-[0.16em] text-cocoa"
                htmlFor="custom-design-title"
              >
                Nama / Konsep Model Busana *
              </label>
              <input
                aria-invalid={Boolean(errors.customDesignTitle)}
                className="mt-2 w-full rounded-xl border border-cocoa/25 bg-ivory px-4 py-3 text-sm text-espresso placeholder:text-muted/60 focus:border-espresso focus:outline-none"
                id="custom-design-title"
                onChange={(e) => onUpdateCustomTitle(e.target.value)}
                placeholder="Contoh: Kebaya akad payet mutiara atau gamis seragam keluarga"
                type="text"
                value={draft.customDesignTitle}
              />
              {errors.customDesignTitle ? (
                <p className="mt-1.5 text-xs text-espresso" role="alert">
                  {errors.customDesignTitle}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Panel: Dari Design Studio */}
        {draft.designSource === "design-studio" ? (
          <div className="mt-6">
            {savedDesigns.length === 0 ? (
              <div className="rounded-2xl border border-cocoa/15 bg-cream/45 p-6">
                <p className="font-[family-name:var(--font-display)] text-lg text-espresso">
                  Belum ada konfigurasi tersimpan dari Design Studio
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Anda dapat merancang kombinasi siluet, warna, dan kain di Design Studio terlebih
                  dahulu, atau langsung gunakan tab Desain Celmira / Upload Desain Sendiri di atas.
                </p>
                <Link
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-cocoa/35 px-5 py-2.5 text-xs font-medium uppercase tracking-[0.14em] text-espresso transition-colors hover:border-espresso hover:bg-ivory"
                  href="/design-studio"
                >
                  Buka Design Studio
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {savedDesigns.map((item) => {
                  const isSelected = draft.selectedStudioDesignId === item.id;
                  return (
                    <button
                      aria-pressed={isSelected}
                      className={`cursor-pointer rounded-2xl border p-4 text-left transition-all ${
                        isSelected
                          ? "border-espresso bg-cream ring-1 ring-espresso"
                          : "border-cocoa/15 bg-ivory hover:border-cocoa/45"
                      }`}
                      key={item.id}
                      onClick={() => onSelectStudioDesign(item)}
                      type="button"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-[family-name:var(--font-display)] text-lg text-espresso">
                          {item.title}
                        </span>
                        <span
                          className="h-5 w-5 rounded-full border border-cocoa/20"
                          style={{ backgroundColor: item.specifications.colorHex }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {item.modelName} · {item.specifications.fabric} ·{" "}
                        {item.specifications.colorName}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}

        {/* Multi-File Upload Area (wajib untuk custom-upload, opsional pendukung untuk lainnya) */}
        <div className="mt-6">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cocoa">
              {draft.designSource === "custom-upload"
                ? "Upload Foto Referensi, Sketsa, atau PDF *"
                : "Lampiran Foto Referensi Tambahan (Opsional)"}
            </p>
            <span className="text-[0.6875rem] text-muted">
              {draft.attachments.length}/{MAX_ATTACHMENTS_COUNT} file
            </span>
          </div>

          <label
            className={`mt-2.5 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-6 py-7 text-center transition-colors ${
              isDragging
                ? "border-espresso bg-cream/80"
                : "border-cocoa/35 bg-cream/35 hover:border-cocoa hover:bg-cream/60"
            }`}
            htmlFor="booking-reference-upload"
            onDragLeave={() => setIsDragging(false)}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDrop={handleDrop}
          >
            <UploadIcon className="h-6 w-6 text-cocoa" />
            <span className="text-sm font-medium text-espresso">
              Klik untuk memilih atau seret file ke area ini
            </span>
            <span className="text-xs text-muted">
              Mendukung JPG, PNG, WEBP, atau PDF (maksimal 5 MB per file, hingga{" "}
              {MAX_ATTACHMENTS_COUNT} file).
            </span>
            <input
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="sr-only"
              id="booking-reference-upload"
              multiple
              onChange={handleFileChange}
              type="file"
            />
          </label>

          {errors.attachments ? (
            <p className="mt-2 text-xs font-medium text-espresso" role="alert">
              {errors.attachments}
            </p>
          ) : null}

          {uploadError ? (
            <p className="mt-2 text-xs font-medium text-espresso" role="alert">
              {uploadError}
            </p>
          ) : null}

          {draft.attachments.length > 0 ? (
            <ul className="mt-4 flex flex-col gap-3">
              {draft.attachments.map((file) => (
                <li
                  className="flex flex-col gap-3 rounded-2xl border border-cocoa/15 bg-ivory p-3.5 sm:flex-row sm:items-center"
                  key={file.id}
                >
                  <div className="flex items-center gap-3 sm:min-w-0 sm:flex-1">
                    {file.kind === "image" && file.previewDataUrl ? (
                      <img
                        alt={`Pratinjau ${file.name}`}
                        className="h-14 w-14 shrink-0 rounded-xl border border-cocoa/15 object-cover"
                        src={file.previewDataUrl}
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-cocoa/15 bg-cream text-cocoa">
                        <FileTextIcon className="h-5 w-5" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-espresso">{file.name}</p>
                      <p className="text-[0.6875rem] uppercase tracking-[0.1em] text-muted">
                        {file.kind === "pdf" ? "PDF" : "Gambar"} · {formatFileSize(file.size)}
                      </p>
                      <input
                        aria-label={`Catatan untuk ${file.name}`}
                        className="mt-1.5 w-full rounded-lg border border-cocoa/20 bg-ivory px-2.5 py-1 text-xs text-espresso placeholder:text-muted/60 focus:border-cocoa focus:outline-none"
                        onChange={(e) => onUpdateAttachmentNote(file.id, e.target.value)}
                        placeholder="Catatan bagian yang ditiru (misal: model kerah atau lengan)"
                        type="text"
                        value={file.note ?? ""}
                      />
                    </div>
                  </div>
                  <button
                    aria-label={`Hapus lampiran ${file.name}`}
                    className="inline-flex items-center justify-center gap-1.5 self-end rounded-full border border-cocoa/20 px-3 py-1.5 text-xs text-muted transition-colors hover:border-espresso hover:text-espresso sm:self-center"
                    onClick={() => onRemoveAttachment(file.id)}
                    type="button"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                    Hapus
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>
    </div>
  );
}
