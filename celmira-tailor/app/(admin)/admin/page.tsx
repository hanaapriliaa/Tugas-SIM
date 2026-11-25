import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { ArrowRight } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Admin",
  description: "Area pengelolaan internal Celmira Tailor.",
  robots: { index: false, follow: false },
};

const modules = [
  {
    title: "Pesanan masuk",
    description:
      "Meninjau pengajuan pesanan, mengirim penawaran, dan memperbarui status produksi.",
  },
  {
    title: "Katalog jahit",
    description: "Mengelola kategori layanan, referensi model, dan catatan bahan.",
  },
  {
    title: "Produksi",
    description:
      "Menandai tahap pemotongan, penjahitan, finishing, hingga quality check.",
  },
  {
    title: "Ukuran pelanggan",
    description: "Menyimpan dan meninjau ukuran yang dikirim pelanggan.",
  },
];

export default function AdminPage() {
  return (
    <div className="shell py-16 sm:py-20 lg:py-24">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.24em] text-cocoa">
            Area Internal
          </p>
          <span className="rounded-full border border-cocoa/25 px-3 py-1 text-[0.625rem] font-medium uppercase tracking-[0.16em] text-cocoa">
            Tahap pengembangan
          </span>
        </div>
        <h1 className="max-w-2xl text-balance text-[2.25rem] leading-[1.1] text-espresso sm:text-[2.9rem]">
          Admin {site.name}
        </h1>
        <p className="max-w-xl text-pretty text-[0.9875rem] leading-[1.9] text-muted">
          Panel ini disiapkan untuk mengelola pesanan jahit, katalog, dan tahapan produksi. Belum
          ada data nyata yang dapat ditampilkan karena sistem pesanan dan autentikasi belum dibangun.
        </p>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        {modules.map((module) => (
          <section
            className="flex flex-col gap-2 rounded-[1.25rem] border border-cocoa/12 bg-cream/50 p-6"
            key={module.title}
          >
            <h2 className="text-[1.15rem] text-espresso">{module.title}</h2>
            <p className="text-sm leading-relaxed text-muted">{module.description}</p>
            <span className="mt-2 text-[0.5625rem] uppercase tracking-[0.18em] text-cocoa/60">
              Belum aktif
            </span>
          </section>
        ))}
      </div>

      <div className="mt-12 flex flex-col gap-4 rounded-[1.25rem] border border-cocoa/20 bg-ivory p-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm leading-relaxed text-muted">
          <strong className="font-medium text-espresso">Penting:</strong> halaman admin belum
          dilindungi autentikasi. Jangan memasukkan data pelanggan yang sebenarnya sampai lapisan
          keamanan tersedia.
        </p>
        <Link className="link-underline shrink-0" href="/">
          Kembali ke situs
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
