"use client";

import {
  CHAT_SOURCE_LABELS,
  formatChatTime,
} from "@/lib/chat";
import { ChatIcon, SearchIcon } from "@/components/ui/icons";
import type { ChatThread, ChatThreadSource } from "@/lib/types/tailor";

type ChatThreadListProps = {
  threads: ChatThread[];
  activeThreadId: string | null;
  searchQuery: string;
  sourceFilter: ChatThreadSource | "all";
  onChangeSearch: (query: string) => void;
  onChangeSourceFilter: (source: ChatThreadSource | "all") => void;
  onSelectThread: (threadId: string) => void;
  onOpenNewThreadModal: () => void;
};

const FILTER_OPTIONS: Array<{ id: ChatThreadSource | "all"; label: string }> = [
  { id: "all", label: "Semua" },
  { id: "track", label: "Pesanan" },
  { id: "design-studio", label: "Desain" },
  { id: "measurement-studio", label: "Ukuran" },
  { id: "general", label: "Umum" },
];

export function ChatThreadList({
  threads,
  activeThreadId,
  searchQuery,
  sourceFilter,
  onChangeSearch,
  onChangeSourceFilter,
  onSelectThread,
  onOpenNewThreadModal,
}: ChatThreadListProps) {
  return (
    <aside className="flex flex-col rounded-[1.75rem] border border-cocoa/15 bg-cream/50 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 border-b border-cocoa/12 pb-3.5">
        <div>
          <p className="text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-cocoa">
            Daftar Pesan
          </p>
          <h2 className="mt-0.5 font-[family-name:var(--font-display)] text-xl text-espresso">
            Percakapan
          </h2>
        </div>
        <button
          className="cursor-pointer rounded-full bg-espresso px-3.5 py-2 text-[0.625rem] font-medium uppercase tracking-[0.14em] text-ivory transition-colors hover:bg-cocoa"
          onClick={onOpenNewThreadModal}
          type="button"
        >
          + Konsultasi
        </button>
      </div>

      {/* Pencarian */}
      <div className="relative mt-3.5">
        <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          aria-label="Cari percakapan atau nomor pesanan"
          className="w-full rounded-xl border border-cocoa/20 bg-ivory py-2 pl-9 pr-3 text-xs text-espresso placeholder:text-muted/65 focus:border-espresso focus:outline-none"
          onChange={(e) => onChangeSearch(e.target.value)}
          placeholder="Cari topik atau CT-..."
          type="search"
          value={searchQuery}
        />
      </div>

      {/* Filter Sumber */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {FILTER_OPTIONS.map((opt) => {
          const active = sourceFilter === opt.id;
          return (
            <button
              aria-pressed={active}
              className={`cursor-pointer rounded-full border px-2.5 py-1 text-[0.625rem] font-medium uppercase tracking-[0.1em] transition-colors ${
                active
                  ? "border-espresso bg-espresso text-ivory"
                  : "border-cocoa/18 bg-ivory/80 text-muted hover:border-cocoa/45 hover:text-espresso"
              }`}
              key={opt.id}
              onClick={() => onChangeSourceFilter(opt.id)}
              type="button"
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Daftar Thread */}
      <div className="mt-4 flex-1 space-y-2 overflow-y-auto lg:max-h-[34rem]">
        {threads.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-cocoa/20 bg-ivory/65 px-4 py-7 text-center">
            <ChatIcon className="mx-auto h-5 w-5 text-cocoa/60" />
            <p className="mt-2 text-xs font-medium text-espresso">
              {searchQuery.trim()
                ? "Tidak ada percakapan yang cocok."
                : "Belum ada riwayat percakapan."}
            </p>
            <p className="mt-1 text-[0.6875rem] leading-relaxed text-muted">
              Tekan tombol + Konsultasi untuk membuka ruang diskusi baru.
            </p>
          </div>
        ) : (
          threads.map((thread) => {
            const isSelected = thread.id === activeThreadId;
            const lastMessage = thread.messages[thread.messages.length - 1];
            const previewText = lastMessage
              ? lastMessage.body ||
                `${lastMessage.attachments.length} gambar referensi`
              : "Belum ada pesan terkirim";

            return (
              <button
                className={`flex w-full cursor-pointer flex-col gap-1.5 rounded-2xl border p-3.5 text-left transition-all ${
                  isSelected
                    ? "border-espresso bg-ivory shadow-sm ring-1 ring-espresso/20"
                    : "border-cocoa/12 bg-ivory/70 hover:border-cocoa/35 hover:bg-ivory"
                }`}
                key={thread.id}
                onClick={() => onSelectThread(thread.id)}
                type="button"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="inline-flex rounded-full border border-cocoa/20 bg-cream/70 px-2 py-0.5 text-[0.5625rem] font-semibold uppercase tracking-[0.12em] text-cocoa">
                    {thread.context.orderCode
                      ? thread.context.orderCode
                      : CHAT_SOURCE_LABELS[thread.source]}
                  </span>
                  <span className="shrink-0 text-[0.625rem] text-muted">
                    {formatChatTime(thread.updatedAt)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-[family-name:var(--font-display)] text-[0.98rem] text-espresso">
                    {thread.title}
                  </p>
                  {thread.unreadByCustomer > 0 ? (
                    <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-espresso px-1.5 text-[0.625rem] font-semibold text-ivory">
                      {thread.unreadByCustomer}
                    </span>
                  ) : null}
                </div>

                <p className="truncate text-xs text-muted">{previewText}</p>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
