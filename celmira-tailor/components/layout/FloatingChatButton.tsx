"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ArrowUpRight,
  ChatIcon,
  CheckDoubleIcon,
  CheckIcon,
  CloseIcon,
  SendIcon,
} from "@/components/ui/icons";
import {
  MAX_CHAT_MESSAGE_LENGTH,
  appendCustomerMessage,
  buildChatHref,
  buildOfficialWhatsappHref,
  createChatThread,
  createDefaultAdminChatConfig,
  findMatchingContextThread,
  formatChatTime,
  getTotalUnreadForCustomer,
} from "@/lib/chat";
import { site } from "@/lib/site";
import {
  CHAT_UPDATED_EVENT,
  loadAdminChatConfig,
  loadChatThreads,
  upsertChatThread,
} from "@/lib/storage/tailor-store";
import type {
  AdminChatConfig,
  ChatThread,
  ChatThreadSource,
} from "@/lib/types/tailor";

function resolveRouteSource(pathname: string): ChatThreadSource {
  if (pathname.startsWith("/design-studio")) return "design-studio";
  if (pathname.startsWith("/measurement-studio")) return "measurement-studio";
  if (pathname.startsWith("/orders")) return "orders";
  if (pathname.startsWith("/track")) return "track";
  return "general";
}

/**
 * Tombol chat mengambang untuk seluruh halaman pelanggan (otomatis tersembunyi di /chat).
 * Terhubung ke chat store lokal, menampilkan pratinjau cepat, dan menyediakan kirim cepat.
 */
export function FloatingChatButton() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [chatConfig, setChatConfig] = useState<AdminChatConfig>(createDefaultAdminChatConfig);
  const [quickText, setQuickText] = useState("");
  const [quickError, setQuickError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const isChatRoute = pathname === "/chat" || pathname.startsWith("/chat/");
  const routeSource = resolveRouteSource(pathname);

  useEffect(() => {
    const sync = () => {
      setThreads(loadChatThreads());
      setChatConfig(loadAdminChatConfig());
    };
    sync();

    window.addEventListener("storage", sync);
    window.addEventListener(CHAT_UPDATED_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(CHAT_UPDATED_EVENT, sync);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onPointerDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onPointerDown);
    };
  }, [isOpen]);

  const activePreviewThread = useMemo(() => {
    if (threads.length === 0) return null;
    const contextMatch = findMatchingContextThread(threads, { source: routeSource });
    return contextMatch ?? threads[0];
  }, [threads, routeSource]);

  const previewMessages = useMemo(() => {
    if (!activePreviewThread) return [];
    return activePreviewThread.messages.slice(-3);
  }, [activePreviewThread]);

  const unreadCount = useMemo(() => getTotalUnreadForCustomer(threads), [threads]);
  const fullChatHref = buildChatHref({ source: routeSource });
  const officialWhatsappHref = buildOfficialWhatsappHref(chatConfig.officialWhatsappNumber);

  if (isChatRoute) {
    return null;
  }

  function handleQuickSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuickError(null);

    const targetThread =
      activePreviewThread ??
      createChatThread({
        context: { source: routeSource },
      });

    const result = appendCustomerMessage(targetThread, {
      body: quickText,
      attachments: [],
      senderName: "Anda",
    });

    if (!result.ok) {
      setQuickError(result.error);
      return;
    }

    const next = upsertChatThread(result.thread);
    setThreads(next);
    setQuickText("");
  }

  return (
    <div
      className="pointer-events-none fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3 sm:bottom-7 sm:right-7"
      ref={containerRef}
    >
      <div
        aria-hidden={!isOpen}
        aria-live="polite"
        className={`flex max-h-[min(32rem,calc(100dvh-7rem))] w-[min(22rem,calc(100vw-2.5rem))] origin-bottom-right flex-col overflow-hidden rounded-[1.5rem] border border-cocoa/15 bg-ivory shadow-[0_30px_70px_-40px_rgba(59,43,37,0.55)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isOpen
            ? "pointer-events-auto visible translate-y-0 scale-100 opacity-100"
            : "pointer-events-none invisible translate-y-3 scale-95 opacity-0"
        }`}
        id="floating-chat-panel"
        inert={!isOpen}
      >
        {/* Header Panel */}
        <div className="flex items-start justify-between gap-3 border-b border-cocoa/12 bg-cream/65 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-cocoa">
              {chatConfig.adminDisplayName}
            </p>
            <h2 className="mt-1 truncate font-[family-name:var(--font-display)] text-lg leading-snug text-espresso">
              {activePreviewThread ? activePreviewThread.title : "Konsultasi Jahit Custom"}
            </h2>
            <p className="mt-0.5 text-[0.6875rem] text-muted">{chatConfig.statusLabel}</p>
          </div>
          <button
            aria-label="Tutup panel chat"
            className="-mr-1 -mt-1 inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-ivory hover:text-espresso"
            onClick={() => setIsOpen(false)}
            type="button"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Pratinjau 3 Pesan Terakhir */}
        <div className="flex-1 space-y-2.5 overflow-y-auto px-4 py-3.5">
          {previewMessages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-cocoa/20 bg-cream/35 p-4 text-xs leading-relaxed text-muted">
              Belum ada percakapan. Tulis pertanyaan singkat di bawah ini atau buka ruang chat penuh
              untuk melampirkan gambar referensi.
            </div>
          ) : (
            previewMessages.map((msg) => {
              const isCustomer = msg.sender === "customer";
              return (
                <div
                  className={`flex flex-col ${isCustomer ? "items-end" : "items-start"}`}
                  key={msg.id}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                      isCustomer
                        ? "rounded-br-sm bg-espresso text-ivory"
                        : "rounded-bl-sm border border-cocoa/12 bg-cream/75 text-espresso"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">
                      {msg.body || `${msg.attachments.length} gambar referensi`}
                    </p>
                    <div
                      className={`mt-1 flex items-center justify-end gap-1 text-[0.5625rem] ${
                        isCustomer ? "text-ivory/70" : "text-muted"
                      }`}
                    >
                      <span>{formatChatTime(msg.createdAt)}</span>
                      {isCustomer ? (
                        msg.status === "dibaca" ? (
                          <CheckDoubleIcon className="h-3 w-3 text-blush" />
                        ) : (
                          <CheckIcon className="h-2.5 w-2.5" />
                        )
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Kirim Cepat */}
        <form
          className="border-t border-cocoa/12 bg-ivory px-4 py-3"
          onSubmit={handleQuickSend}
        >
          {quickError ? (
            <p className="mb-2 text-[0.6875rem] text-rose" role="alert">
              {quickError}
            </p>
          ) : null}
          <div className="flex items-center gap-2">
            <input
              aria-label="Tulis pesan cepat"
              className="min-w-0 flex-1 rounded-full border border-cocoa/25 bg-ivory px-3.5 py-2 text-xs text-espresso placeholder:text-muted/65 focus:border-espresso focus:outline-none"
              maxLength={MAX_CHAT_MESSAGE_LENGTH}
              onChange={(e) => setQuickText(e.target.value)}
              placeholder="Tulis pesan singkat..."
              type="text"
              value={quickText}
            />
            <button
              aria-label="Kirim pesan cepat"
              className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-espresso text-ivory transition-colors hover:bg-cocoa disabled:cursor-not-allowed disabled:bg-sand disabled:text-muted"
              disabled={!quickText.trim()}
              type="submit"
            >
              <SendIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>

        {/* Tautan Ruang Chat Penuh & Kanal Resmi */}
        <div className="flex flex-col gap-2 border-t border-cocoa/10 bg-cream/45 px-5 py-3 text-xs">
          <Link
            className="flex items-center justify-between font-medium text-espresso transition-colors hover:text-cocoa"
            href={fullChatHref}
            onClick={() => setIsOpen(false)}
          >
            Buka Ruang Chat &amp; Upload Gambar
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>

          {officialWhatsappHref ? (
            <a
              className="flex items-center justify-between text-muted transition-colors hover:text-espresso"
              href={officialWhatsappHref}
              rel="noreferrer"
              target="_blank"
            >
              Alternatif WhatsApp Resmi
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          ) : (
            <a
              className="flex items-center justify-between text-muted transition-colors hover:text-espresso"
              href={site.tailorUrl}
              rel="noreferrer"
              target="_blank"
            >
              Situs Resmi Celmira Boutique
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>

      <button
        aria-controls="floating-chat-panel"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Tutup panel chat" : "Buka panel chat"}
        className="pointer-events-auto relative inline-flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-espresso text-ivory shadow-[0_18px_40px_-18px_rgba(59,43,37,0.7)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.04] hover:bg-cocoa"
        onClick={() => setIsOpen((value) => !value)}
        type="button"
      >
        {isOpen ? <CloseIcon /> : <ChatIcon />}
        {!isOpen && unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-ivory bg-rose px-1 text-[0.625rem] font-bold text-espresso">
            {unreadCount}
          </span>
        ) : null}
      </button>
    </div>
  );
}
