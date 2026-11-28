import Link from "next/link";
import { buttonClass } from "@/components/ui/ButtonLink";
import { ArrowRight } from "@/components/ui/icons";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ivory px-6 py-24 text-ink">
      <div className="mx-auto max-w-xl rounded-[2rem] border border-cocoa/15 bg-cream/45 p-8 text-center sm:p-12">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.24em] text-cocoa">
          404 · Halaman Tidak Ditemukan
        </p>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl leading-tight text-espresso sm:text-4xl">
          Tautan yang Anda tuju tidak tersedia.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Halaman mungkin telah dipindahkan atau alamat URL kurang tepat. Anda dapat kembali ke
          beranda Celmira Tailor, melihat katalog jahit, atau melacak pesanan yang sedang berjalan.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link className={buttonClass("solid")} href="/">
            Kembali ke Beranda
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link className={buttonClass("outline")} href="/track">
            Lacak Pesanan
          </Link>
          <Link className={buttonClass("outline")} href="/catalog">
            Katalog Jahit
          </Link>
        </div>
      </div>
    </main>
  );
}
