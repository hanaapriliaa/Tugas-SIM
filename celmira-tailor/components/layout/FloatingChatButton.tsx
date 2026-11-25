"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChatIcon, CloseIcon } from "@/components/ui/icons";
import { site } from "@/lib/site";

/**
 * Tombol chat mengambang untuk halaman customer.
 * Fitur chat belum dibangun — panel hanya menjelaskan status dan
 * mengarahkan ke kanal resmi yang memang tersedia.
 */
export function FloatingChatButton() {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    const onPointerDown = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
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

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3 sm:bottom-7 sm:right-7">
      <div
        aria-hidden={!isOpen}
        aria-live="polite"
        className={`w-[min(20rem,calc(100vw-2.5rem))] origin-bottom-right rounded-[1.5rem] border border-cocoa/12 bg-ivory p-6 shadow-[0_30px_70px_-40px_rgba(59,43,37,0.55)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isOpen
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none translate-y-3 scale-95 opacity-0"
        }`}
        id="floating-chat-panel"
        inert={!isOpen}
        ref={panelRef}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.625rem] font-semibold uppercase tracking-[0.24em] text-cocoa">
              Chat Celmira
            </p>
            <h2 className="mt-2 text-[1.35rem] leading-snug text-espresso">
              Fitur chat sedang dikembangkan
            </h2>
          </div>
          <button
            aria-label="Tutup panel chat"
            className="-mr-1 -mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:text-espresso"
            onClick={() => setIsOpen(false)}
            type="button"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-muted">
          Kami sedang menyiapkan ruang diskusi langsung di dalam aplikasi. Nomor kontak baru akan
          dicantumkan setelah terverifikasi.
        </p>

        <div className="mt-5 flex flex-col gap-2 border-t border-cocoa/10 pt-4">
          <Link
            className="flex items-center justify-between text-sm text-espresso transition-colors hover:text-cocoa"
            href="/chat"
            onClick={() => setIsOpen(false)}
          >
            Lihat halaman Chat
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
          <a
            className="flex items-center justify-between text-sm text-espresso transition-colors hover:text-cocoa"
            href={site.tailorUrl}
            rel="noreferrer"
            target="_blank"
          >
            Layanan jahit di situs resmi
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      <button
        aria-controls="floating-chat-panel"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Tutup panel chat" : "Buka panel chat"}
        className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-espresso text-ivory shadow-[0_18px_40px_-18px_rgba(59,43,37,0.7)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.04] hover:bg-cocoa"
        onClick={() => setIsOpen((value) => !value)}
        type="button"
      >
        {isOpen ? <CloseIcon /> : <ChatIcon />}
      </button>
    </div>
  );
}
