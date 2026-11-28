"use client";

import Link from "next/link";
import { useEffect } from "react";
import { buttonClass } from "@/components/ui/ButtonLink";

export default function GlobalAppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Celmira Tailor Error Boundary]", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-ivory px-6 py-24 text-ink">
      <div className="mx-auto max-w-xl rounded-[2rem] border border-rose/35 bg-cream/55 p-8 text-center sm:p-12">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.24em] text-cocoa">
          Gangguan Sementara
        </p>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl leading-tight text-espresso sm:text-4xl">
          Terjadi kendala saat memuat halaman.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Data pesanan dan studio Anda yang sudah tersimpan tetap aman. Silakan muat ulang halaman
          atau kembali ke beranda Celmira Tailor.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            className={buttonClass("solid")}
            onClick={() => reset()}
            type="button"
          >
            Coba Muat Ulang
          </button>
          <Link className={buttonClass("outline")} href="/">
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </main>
  );
}
