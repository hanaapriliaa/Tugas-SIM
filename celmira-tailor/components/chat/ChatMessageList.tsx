"use client";

import { useEffect, useRef, useState } from "react";
import { formatFileSize } from "@/lib/attachments";
import { formatChatDateDivider, formatChatTime } from "@/lib/chat";
import {
  CheckDoubleIcon,
  CheckIcon,
  CloseIcon,
  ImageIcon,
} from "@/components/ui/icons";
import type { ChatMessage, ChatMessageAttachment } from "@/lib/types/tailor";

type ChatMessageListProps = {
  messages: ChatMessage[];
  emptyHint?: string;
};

export function ChatMessageList({ messages, emptyHint }: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [lightboxImage, setLightboxImage] = useState<ChatMessageAttachment | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  useEffect(() => {
    if (!lightboxImage) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightboxImage(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightboxImage]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <p className="font-[family-name:var(--font-display)] text-lg text-espresso">
          Ruang percakapan siap digunakan
        </p>
        <p className="mt-1.5 max-w-md text-xs leading-relaxed text-muted">
          {emptyHint ??
            "Tulis pertanyaan Anda atau lampirkan foto referensi desain di bawah ini. Tim Celmira akan meninjaunya setelah terhubung ke dashboard admin."}
        </p>
      </div>
    );
  }

  let lastDateLabel = "";

  return (
    <>
      <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-4 py-5 sm:px-6">
        {messages.map((message) => {
          const dateLabel = formatChatDateDivider(message.createdAt);
          const showDateDivider = dateLabel && dateLabel !== lastDateLabel;
          if (showDateDivider) lastDateLabel = dateLabel;

          if (message.sender === "system") {
            return (
              <div className="space-y-3" key={message.id}>
                {showDateDivider ? (
                  <div className="flex justify-center">
                    <span className="rounded-full border border-cocoa/12 bg-cream/70 px-3 py-0.5 text-[0.625rem] font-medium uppercase tracking-[0.14em] text-muted">
                      {dateLabel}
                    </span>
                  </div>
                ) : null}
                <div className="mx-auto max-w-md rounded-2xl border border-cocoa/12 bg-cream/60 px-4 py-2.5 text-center text-xs leading-relaxed text-muted">
                  {message.body}
                </div>
              </div>
            );
          }

          const isCustomer = message.sender === "customer";

          return (
            <div className="space-y-3" key={message.id}>
              {showDateDivider ? (
                <div className="flex justify-center">
                  <span className="rounded-full border border-cocoa/12 bg-cream/70 px-3 py-0.5 text-[0.625rem] font-medium uppercase tracking-[0.14em] text-muted">
                    {dateLabel}
                  </span>
                </div>
              ) : null}

              <div className={`flex flex-col ${isCustomer ? "items-end" : "items-start"}`}>
                <span className="mb-1 px-1 text-[0.625rem] font-medium uppercase tracking-[0.12em] text-muted">
                  {message.senderName}
                </span>

                <div
                  className={`max-w-[88%] rounded-[1.35rem] px-4 py-3 text-sm leading-relaxed sm:max-w-[76%] ${
                    isCustomer
                      ? "rounded-br-sm bg-espresso text-ivory"
                      : "rounded-bl-sm border border-cocoa/15 bg-cream/75 text-espresso"
                  }`}
                >
                  {message.attachments.length > 0 ? (
                    <div
                      className={`grid gap-2 ${
                        message.attachments.length > 1 ? "grid-cols-2" : "grid-cols-1"
                      } ${message.body ? "mb-2.5" : ""}`}
                    >
                      {message.attachments.map((att) =>
                        att.previewDataUrl ? (
                          <button
                            className="group relative overflow-hidden rounded-xl border border-ivory/20 bg-ivory/10 text-left"
                            key={att.id}
                            onClick={() => setLightboxImage(att)}
                            type="button"
                          >
                            <img
                              alt={`Lampiran ${att.name}`}
                              className="max-h-52 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                              src={att.previewDataUrl}
                            />
                            <span className="block truncate px-2 py-1 text-[0.625rem] opacity-85">
                              {att.name}
                            </span>
                          </button>
                        ) : (
                          <div
                            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${
                              isCustomer
                                ? "border-ivory/20 bg-ivory/10 text-ivory/90"
                                : "border-cocoa/15 bg-ivory text-espresso"
                            }`}
                            key={att.id}
                          >
                            <ImageIcon className="h-4 w-4 shrink-0" />
                            <div className="min-w-0">
                              <p className="truncate font-medium">{att.name}</p>
                              <p className="text-[0.625rem] opacity-75">
                                {formatFileSize(att.size)} · Pratinjau dilepas untuk hemat kuota
                              </p>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  ) : null}

                  {message.body ? (
                    <p className="whitespace-pre-wrap break-words">{message.body}</p>
                  ) : null}

                  <div
                    className={`mt-1.5 flex items-center justify-end gap-1.5 text-[0.625rem] ${
                      isCustomer ? "text-ivory/75" : "text-muted"
                    }`}
                  >
                    <span>{formatChatTime(message.createdAt)}</span>
                    {isCustomer ? (
                      <span
                        aria-label={
                          message.status === "dibaca" ? "Pesan terbaca" : "Pesan terkirim"
                        }
                        className="inline-flex items-center gap-1"
                      >
                        {message.status === "dibaca" ? (
                          <>
                            <CheckDoubleIcon className="h-3.5 w-3.5 text-blush" />
                            <span>Terbaca</span>
                          </>
                        ) : (
                          <>
                            <CheckIcon className="h-3 w-3" />
                            <span>Terkirim</span>
                          </>
                        )}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Modal Pratinjau Gambar */}
      {lightboxImage?.previewDataUrl ? (
        <div
          aria-label={`Pratinjau ${lightboxImage.name}`}
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/75 p-4 backdrop-blur-sm"
          onClick={() => setLightboxImage(null)}
          role="dialog"
        >
          <div
            className="relative max-h-[90vh] max-w-2xl overflow-hidden rounded-[1.5rem] border border-cocoa/20 bg-ivory p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-4">
              <p className="truncate text-xs font-medium text-espresso">
                {lightboxImage.name} ({formatFileSize(lightboxImage.size)})
              </p>
              <button
                aria-label="Tutup pratinjau gambar"
                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-cocoa/20 text-espresso hover:border-espresso"
                onClick={() => setLightboxImage(null)}
                type="button"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
            <img
              alt={lightboxImage.name}
              className="max-h-[75vh] w-auto rounded-xl object-contain"
              src={lightboxImage.previewDataUrl}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
