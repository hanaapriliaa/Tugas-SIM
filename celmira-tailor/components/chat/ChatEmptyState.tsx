"use client";

import Link from "next/link";
import { buttonClass } from "@/components/ui/ButtonLink";
import { ArrowRight, ChatIcon } from "@/components/ui/icons";

type ChatEmptyStateProps = {
  onStartNewConsultation: () => void;
  hasLocalOrders: boolean;
  onStartOrderConsultation: () => void;
};

export function ChatEmptyState({
  onStartNewConsultation,
  hasLocalOrders,
  onStartOrderConsultation,
}: ChatEmptyStateProps) {
  return (
    <div className="flex h-full min-h-[24rem] flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-cocoa/25 bg-cream/40 px-6 py-12 text-center sm:px-10">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-cocoa/20 bg-ivory text-cocoa">
        <ChatIcon className="h-6 w-6" />
      </span>

      <p className="mt-5 text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-cocoa">
        Belum Ada Percakapan
      </p>
      <h2 className="mt-2 max-w-md font-[family-name:var(--font-display)] text-2xl text-espresso sm:text-[1.75rem]">
        Mulai konsultasi jahit bersama tim Celmira.
      </h2>
      <p className="mt-2.5 max-w-lg text-sm leading-relaxed text-muted">
        Anda dapat menanyakan kesesuaian bahan, detail model, panduan ukuran, mengirim gambar
        referensi busana, atau mendiskusikan pesanan yang sedang berjalan.
      </p>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          className={buttonClass("solid", "cursor-pointer")}
          onClick={onStartNewConsultation}
          type="button"
        >
          Mulai Konsultasi Baru
          <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-1" />
        </button>

        {hasLocalOrders ? (
          <button
            className={buttonClass("outline", "cursor-pointer")}
            onClick={onStartOrderConsultation}
            type="button"
          >
            Tanya Soal Pesanan
          </button>
        ) : (
          <Link className={buttonClass("outline")} href="/orders">
            Buat Pesanan Custom
          </Link>
        )}
      </div>

      <div className="mt-8 grid w-full max-w-xl gap-3 text-left sm:grid-cols-3">
        {[
          {
            title: "Model & Kain",
            desc: "Kirim foto inspirasi untuk memastikan bahan dan potongannya.",
          },
          {
            title: "Ukuran Badan",
            desc: "Diskusikan kelonggaran atau cara ukur sebelum pemotongan kain.",
          },
          {
            title: "Konteks Pesanan",
            desc: "Tautkan nomor pesanan agar tim langsung melihat detailnya.",
          },
        ].map((item) => (
          <div
            className="rounded-2xl border border-cocoa/12 bg-ivory/80 p-3.5 text-xs leading-relaxed"
            key={item.title}
          >
            <p className="font-semibold text-espresso">{item.title}</p>
            <p className="mt-1 text-muted">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
