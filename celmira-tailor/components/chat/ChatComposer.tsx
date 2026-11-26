"use client";

import type { ChangeEvent, FormEvent, KeyboardEvent } from "react";
import { formatFileSize, processChatImageFiles } from "@/lib/attachments";
import {
  MAX_CHAT_IMAGES_PER_MESSAGE,
  MAX_CHAT_MESSAGE_LENGTH,
} from "@/lib/chat";
import { CloseIcon, ImageIcon, SendIcon } from "@/components/ui/icons";
import type { ChatMessageAttachment } from "@/lib/types/tailor";

type ChatComposerProps = {
  draftText: string;
  attachments: ChatMessageAttachment[];
  errorMessage: string | null;
  placeholder?: string;
  submitLabel?: string;
  inputAriaLabel?: string;
  uploadInputId?: string;
  onChangeText: (value: string) => void;
  onAddAttachments: (files: ChatMessageAttachment[]) => void;
  onRemoveAttachment: (id: string) => void;
  onSetError: (message: string | null) => void;
  onSend: () => void;
};

export function ChatComposer({
  draftText,
  attachments,
  errorMessage,
  placeholder = "Tulis pertanyaan desain, bahan, ukuran, atau pesanan Anda...",
  submitLabel = "Kirim",
  inputAriaLabel = "Tulis pesan untuk tim Celmira",
  uploadInputId = "chat-image-upload",
  onChangeText,
  onAddAttachments,
  onRemoveAttachment,
  onSetError,
  onSend,
}: ChatComposerProps) {
  async function handleFileSelect(event: ChangeEvent<HTMLInputElement>) {
    onSetError(null);
    const result = await processChatImageFiles(event.target.files, attachments.length);
    event.target.value = "";
    if (result.error) {
      onSetError(result.error);
    }
    if (result.attachments.length > 0) {
      onAddAttachments(result.attachments);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSend();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSend();
  }

  const canSend = draftText.trim().length > 0 || attachments.length > 0;

  return (
    <form className="border-t border-cocoa/12 bg-ivory px-4 py-3.5 sm:px-6" onSubmit={handleSubmit}>
      {attachments.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((file) => (
            <div
              className="flex items-center gap-2 rounded-xl border border-cocoa/18 bg-cream/55 p-1.5 pr-2.5"
              key={file.id}
            >
              {file.previewDataUrl ? (
                <img
                  alt={file.name}
                  className="h-10 w-10 rounded-lg object-cover"
                  src={file.previewDataUrl}
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ivory text-cocoa">
                  <ImageIcon className="h-4 w-4" />
                </div>
              )}
              <div className="max-w-[9rem] text-[0.6875rem]">
                <p className="truncate font-medium text-espresso">{file.name}</p>
                <p className="text-[0.625rem] text-muted">{formatFileSize(file.size)}</p>
              </div>
              <button
                aria-label={`Hapus gambar ${file.name}`}
                className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-ivory hover:text-espresso"
                onClick={() => onRemoveAttachment(file.id)}
                type="button"
              >
                <CloseIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {errorMessage ? (
        <p
          className="mb-2.5 rounded-xl border border-rose/40 bg-rose/10 px-3 py-2 text-xs text-espresso"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}

      <div className="flex items-end gap-2.5">
        <label
          className={`inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-cocoa/25 bg-cream/45 text-espresso transition-colors hover:border-espresso hover:bg-cream ${
            attachments.length >= MAX_CHAT_IMAGES_PER_MESSAGE ? "pointer-events-none opacity-45" : ""
          }`}
          htmlFor={uploadInputId}
          title="Lampirkan gambar referensi (JPG, PNG, WEBP, maks 5 MB)"
        >
          <ImageIcon className="h-5 w-5" />
          <span className="sr-only">Upload gambar referensi desain</span>
          <input
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={attachments.length >= MAX_CHAT_IMAGES_PER_MESSAGE}
            id={uploadInputId}
            multiple
            onChange={handleFileSelect}
            type="file"
          />
        </label>

        <div className="min-w-0 flex-1">
          <textarea
            aria-label={inputAriaLabel}
            className="max-h-32 min-h-[2.75rem] w-full resize-none rounded-2xl border border-cocoa/25 bg-ivory px-4 py-2.5 text-sm text-espresso placeholder:text-muted/65 focus:border-espresso focus:outline-none"
            maxLength={MAX_CHAT_MESSAGE_LENGTH}
            onChange={(e) => onChangeText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            value={draftText}
          />
        </div>

        <button
          aria-label={submitLabel}
          className={`inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full px-5 text-xs font-medium uppercase tracking-[0.14em] transition-colors ${
            canSend
              ? "cursor-pointer bg-espresso text-ivory hover:bg-cocoa"
              : "cursor-not-allowed bg-sand text-muted"
          }`}
          disabled={!canSend}
          type="submit"
        >
          <span className="hidden sm:inline">{submitLabel}</span>
          <SendIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[0.625rem] text-muted">
        <span>
          Foto JPG/PNG/WEBP (maks 5 MB, {attachments.length}/{MAX_CHAT_IMAGES_PER_MESSAGE} lampiran)
        </span>
        <span>Enter untuk kirim · Shift+Enter baris baru</span>
      </div>
    </form>
  );
}
