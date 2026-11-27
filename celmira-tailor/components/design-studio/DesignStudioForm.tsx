"use client";

import type { ChangeEvent, DragEvent, ReactNode } from "react";
import {
  buttonOptions,
  collarOptions,
  colorPaletteOptions,
  embroideryOptions,
  fabricOptions,
  garmentCategories,
  laceOptions,
  lengthOptions,
  sleeveOptions,
  zipperOptions,
} from "@/lib/booking-options";
import { getModelOptions, type DesignStudioDraft } from "@/lib/design-studio";
import type {
  GarmentCategoryId,
  GarmentSpecifications,
  ReferenceAttachment,
} from "@/lib/types/tailor";
import { formatFileSize } from "@/lib/attachments";
import { FileTextIcon, TrashIcon, UploadIcon } from "@/components/ui/icons";

type DesignStudioFormProps = {
  draft: DesignStudioDraft;
  errors: Record<string, string>;
  uploadError: string | null;
  isDragging: boolean;
  onChangeField: <K extends keyof DesignStudioDraft>(key: K, value: DesignStudioDraft[K]) => void;
  onChangeSpec: <K extends keyof GarmentSpecifications>(
    key: K,
    value: GarmentSpecifications[K]
  ) => void;
  onChangeColor: (name: string, hex: string) => void;
  onCategoryChange: (categoryId: GarmentCategoryId) => void;
  onFilesSelected: (files: FileList | null) => void;
  onDragStateChange: (isDragging: boolean) => void;
  onRemoveAttachment: (id: string) => void;
};

const inputClass =
  "w-full rounded-xl border border-cocoa/20 bg-ivory px-3.5 py-2.5 text-sm text-espresso outline-none transition-colors focus:border-cocoa/60";

function Field({
  children,
  className = "",
  error,
  hint,
  htmlFor,
  label,
}: {
  children: ReactNode;
  className?: string;
  error?: string;
  hint?: string;
  htmlFor?: string;
  label: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`.trim()}>
      <label className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-cocoa" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && !error ? <p className="text-[0.6875rem] leading-relaxed text-muted">{hint}</p> : null}
      {error ? <p className="text-[0.6875rem] leading-relaxed text-rose">{error}</p> : null}
    </div>
  );
}

function AttachmentRow({
  attachment,
  onRemove,
}: {
  attachment: ReferenceAttachment;
  onRemove: (id: string) => void;
}) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-cocoa/12 bg-ivory/80 p-3">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-sand/40 text-cocoa">
        {attachment.kind === "image" && (attachment.url || attachment.previewDataUrl) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={attachment.name}
            className="h-full w-full object-cover"
            src={attachment.url ?? attachment.previewDataUrl}
          />
        ) : (
          <FileTextIcon className="h-5 w-5" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-espresso">{attachment.name}</span>
        <span className="block text-[0.6875rem] uppercase tracking-[0.12em] text-muted">
          {formatFileSize(attachment.size)} · {attachment.kind === "pdf" ? "PDF" : "Gambar"}
        </span>
      </span>
      <button
        aria-label={`Hapus ${attachment.name}`}
        className="shrink-0 rounded-full border border-cocoa/15 p-2 text-cocoa transition-colors hover:border-rose/60 hover:text-rose"
        onClick={() => onRemove(attachment.id)}
        type="button"
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    </li>
  );
}

export function DesignStudioForm({
  draft,
  errors,
  uploadError,
  isDragging,
  onChangeField,
  onChangeSpec,
  onChangeColor,
  onCategoryChange,
  onFilesSelected,
  onDragStateChange,
  onRemoveAttachment,
}: DesignStudioFormProps) {
  const specs = draft.specifications;
  const modelOptions = getModelOptions(draft.categoryId);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    onFilesSelected(event.target.files);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    onDragStateChange(false);
    onFilesSelected(event.dataTransfer.files);
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-[1.5rem] border border-cocoa/15 bg-cream/45 p-5 sm:p-6">
        <div className="flex flex-col gap-1.5 border-b border-cocoa/12 pb-4">
          <p className="text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-cocoa">
            01 · Identitas Desain
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-xl text-espresso">
            Beri nama dan pilih kategori
          </h2>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field
            className="sm:col-span-2"
            error={errors.title}
            hint="Contoh: Kebaya Akad Maroon untuk Acara Keluarga"
            htmlFor="design-title"
            label="Nama desain"
          >
            <input
              aria-invalid={Boolean(errors.title)}
              className={inputClass}
              id="design-title"
              maxLength={80}
              onChange={(event) => onChangeField("title", event.target.value)}
              placeholder="Beri nama desain Anda"
              value={draft.title}
            />
          </Field>

          <Field error={errors.categoryId} htmlFor="design-category" label="Kategori busana">
            <select
              aria-invalid={Boolean(errors.categoryId)}
              className={inputClass}
              id="design-category"
              onChange={(event) => onCategoryChange(event.target.value as GarmentCategoryId)}
              value={draft.categoryId}
            >
              {garmentCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.index} · {category.name}
                </option>
              ))}
            </select>
          </Field>

          <Field error={errors.modelName} htmlFor="design-model" label="Siluet / model">
            <select
              aria-invalid={Boolean(errors.modelName)}
              className={inputClass}
              id="design-model"
              onChange={(event) => onChangeField("modelName", event.target.value)}
              value={draft.modelName}
            >
              {modelOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-cocoa/15 bg-cream/45 p-5 sm:p-6">
        <div className="flex flex-col gap-1.5 border-b border-cocoa/12 pb-4">
          <p className="text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-cocoa">
            02 · Bahan &amp; Warna
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-xl text-espresso">
            Tentukan karakter kain
          </h2>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field error={errors.fabric} htmlFor="design-fabric" label="Bahan utama">
            <select
              aria-invalid={Boolean(errors.fabric)}
              className={inputClass}
              id="design-fabric"
              onChange={(event) => onChangeSpec("fabric", event.target.value)}
              value={specs.fabric}
            >
              {fabricOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>

          <Field
            error={errors.customFabricNote}
            hint="Diisi jika bahan berasal dari Anda."
            htmlFor="design-fabric-note"
            label="Catatan bahan"
          >
            <input
              aria-invalid={Boolean(errors.customFabricNote)}
              className={inputClass}
              id="design-fabric-note"
              maxLength={120}
              onChange={(event) => onChangeSpec("customFabricNote", event.target.value)}
              placeholder="Contoh: brokat maroon dari kain keluarga"
              value={specs.customFabricNote}
            />
          </Field>

          <div className="sm:col-span-2">
            <Field error={errors.colorName ?? errors.colorHex} hint="Pilih warna yang paling mendekati." label="Warna utama">
              <div className="mt-1 flex flex-wrap items-center gap-2.5">
                {colorPaletteOptions.map((option) => {
                  const active = specs.colorName === option.name;
                  return (
                    <button
                      aria-label={option.name}
                      aria-pressed={active}
                      className={`h-9 w-9 rounded-full border border-cocoa/20 transition-transform duration-300 hover:scale-105 ${
                        active ? "ring-1 ring-cocoa ring-offset-2 ring-offset-cream" : ""
                      }`}
                      key={option.name}
                      onClick={() => onChangeColor(option.name, option.hex)}
                      style={{ backgroundColor: option.hex }}
                      title={option.name}
                      type="button"
                    />
                  );
                })}

                <label className="ml-1 flex cursor-pointer items-center gap-2 rounded-full border border-cocoa/20 bg-ivory px-3 py-1.5">
                  <span
                    className="h-5 w-5 rounded-full border border-cocoa/20"
                    style={{ backgroundColor: specs.colorHex }}
                  />
                  <span className="text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-cocoa">
                    Warna kustom
                  </span>
                  <input
                    aria-label="Pilih warna kustom"
                    className="h-6 w-6 cursor-pointer border-0 bg-transparent p-0"
                    onChange={(event) => onChangeColor("Warna kustom", event.target.value)}
                    type="color"
                    value={specs.colorHex}
                  />
                </label>
              </div>
            </Field>
          </div>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-cocoa/15 bg-cream/45 p-5 sm:p-6">
        <div className="flex flex-col gap-1.5 border-b border-cocoa/12 pb-4">
          <p className="text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-cocoa">
            03 · Potongan &amp; Detail
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-xl text-espresso">
            Susun siluet dan finishing
          </h2>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field error={errors.sleeveStyle} htmlFor="design-sleeve" label="Model lengan">
            <select
              aria-invalid={Boolean(errors.sleeveStyle)}
              className={inputClass}
              id="design-sleeve"
              onChange={(event) => onChangeSpec("sleeveStyle", event.target.value)}
              value={specs.sleeveStyle}
            >
              {sleeveOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>

          <Field error={errors.collarStyle} htmlFor="design-collar" label="Model kerah">
            <select
              aria-invalid={Boolean(errors.collarStyle)}
              className={inputClass}
              id="design-collar"
              onChange={(event) => onChangeSpec("collarStyle", event.target.value)}
              value={specs.collarStyle}
            >
              {collarOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>

          <Field error={errors.lengthOption} htmlFor="design-length" label="Panjang busana">
            <select
              aria-invalid={Boolean(errors.lengthOption)}
              className={inputClass}
              id="design-length"
              onChange={(event) => onChangeSpec("lengthOption", event.target.value)}
              value={specs.lengthOption}
            >
              {lengthOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>

          <Field htmlFor="design-lace" label="Renda">
            <select
              className={inputClass}
              id="design-lace"
              onChange={(event) => onChangeSpec("laceDetail", event.target.value)}
              value={specs.laceDetail}
            >
              {laceOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>

          <Field htmlFor="design-embroidery" label="Bordir / payet">
            <select
              className={inputClass}
              id="design-embroidery"
              onChange={(event) => onChangeSpec("embroideryDetail", event.target.value)}
              value={specs.embroideryDetail}
            >
              {embroideryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>

          <Field htmlFor="design-button" label="Kancing">
            <select
              className={inputClass}
              id="design-button"
              onChange={(event) => onChangeSpec("buttonStyle", event.target.value)}
              value={specs.buttonStyle}
            >
              {buttonOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>

          <Field htmlFor="design-zipper" label="Resleting">
            <select
              className={inputClass}
              id="design-zipper"
              onChange={(event) => onChangeSpec("zipperStyle", event.target.value)}
              value={specs.zipperStyle}
            >
              {zipperOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>

          <Field
            className="sm:col-span-2"
            error={errors.notes}
            hint={`${specs.notes.length}/${500} karakter`}
            htmlFor="design-notes"
            label="Catatan tambahan"
          >
            <textarea
              aria-invalid={Boolean(errors.notes)}
              className={`${inputClass} min-h-24 resize-y`}
              id="design-notes"
              maxLength={500}
              onChange={(event) => onChangeSpec("notes", event.target.value)}
              placeholder="Contoh: ingin ada belahan belakang, panjang lengan sedikit di atas pergelangan."
              value={specs.notes}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-cocoa/15 bg-cream/45 p-5 sm:p-6">
        <div className="flex flex-col gap-1.5 border-b border-cocoa/12 pb-4">
          <p className="text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-cocoa">
            04 · Referensi Visual
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-xl text-espresso">
            Unggah foto, sketsa, atau PDF
          </h2>
        </div>

        <label
          className={`mt-5 flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed px-5 py-8 text-center transition-colors ${
            isDragging
              ? "border-cocoa bg-ivory"
              : "border-cocoa/25 bg-ivory/60 hover:border-cocoa/50 hover:bg-ivory"
          }`}
          htmlFor="design-reference-upload"
          onDragEnter={(event) => {
            event.preventDefault();
            onDragStateChange(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            onDragStateChange(false);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        >
          <UploadIcon className="h-6 w-6 text-cocoa" />
          <span className="text-sm font-medium text-espresso">
            Tarik file ke sini atau klik untuk memilih
          </span>
          <span className="text-[0.6875rem] leading-relaxed text-muted">
            JPG, PNG, WEBP, atau PDF · maksimal 5 file · 5 MB per file
          </span>
          <input
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="sr-only"
            id="design-reference-upload"
            multiple
            onChange={handleFileChange}
            type="file"
          />
        </label>

        {uploadError ? (
          <p className="mt-3 rounded-xl border border-rose/30 bg-rose/10 px-3 py-2 text-xs leading-relaxed text-rose">
            {uploadError}
          </p>
        ) : null}

        {draft.attachments.length > 0 ? (
          <ul className="mt-4 flex flex-col gap-2.5">
            {draft.attachments.map((attachment) => (
              <AttachmentRow
                attachment={attachment}
                key={attachment.id}
                onRemove={onRemoveAttachment}
              />
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-[0.6875rem] leading-relaxed text-muted">
            Belum ada file referensi. Lampiran bersifat opsional.
          </p>
        )}
      </section>
    </div>
  );
}
