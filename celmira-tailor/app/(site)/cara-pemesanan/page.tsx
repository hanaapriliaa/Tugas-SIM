import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { PageIntro } from "@/components/ui/PageIntro";
import { ArrowRight, CheckIcon } from "@/components/ui/icons";
import { PRODUCTION_STAGES } from "@/lib/order-tracking";
import { processSteps } from "@/lib/process";

export const metadata: Metadata = {
  title: "Cara Pemesanan",
  description:
    "Panduan lengkap pemesanan jahit custom di Celmira Tailor: Design Studio, Measurement Studio, penawaran harga, DP 50%, 10 tahap produksi, hingga pelunasan.",
};

const paymentHighlights = [
  "Pengajuan pesanan tidak langsung menimbulkan tagihan — admin meninjau desain, bahan, dan ukuran terlebih dahulu.",
  "Setelah penawaran harga akhir disetujui pelanggan, Invoice DP sebesar 50% biaya jahit diterbitkan dengan batas waktu 24 jam.",
  "Pembayaran dilakukan melalui QRIS resmi yang ditampilkan pada halaman Lacak Pesanan, lalu bukti pembayaran diunggah untuk diverifikasi manual oleh admin.",
  "Pesanan masuk antrean produksi setelah pembayaran DP diverifikasi admin.",
  "Biaya pengiriman dipisahkan dari biaya jahit dan ditagihkan pada tahap pelunasan (sisa 50% biaya jahit + ongkos kirim bila menggunakan kurir).",
];

export default function CaraPemesananPage() {
  return (
    <div>
      <PageIntro
        description="Ikuti alur terukur dari perancangan desain, pencatatan ukuran, konfirmasi penawaran harga, pembayaran DP 50%, hingga pelacakan 10 tahap produksi."
        eyebrow="Cara Pemesanan"
        title="Langkah jelas dari ide sampai busana siap dipakai."
      />

      <div className="shell space-y-16 pb-20">
        {/* 7 Langkah Pemesanan */}
        <section aria-labelledby="langkah-pemesanan-heading">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow">Alur Utama</p>
              <h2
                className="mt-1 font-[family-name:var(--font-display)] text-2xl text-espresso sm:text-3xl"
                id="langkah-pemesanan-heading"
              >
                7 langkah pemesanan custom
              </h2>
            </div>
            <ButtonLink href="/orders">
              Mulai Pesanan Sekarang
              <ArrowRight className="h-4 w-4" />
            </ButtonLink>
          </div>

          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {processSteps.map((item) => (
              <li
                className="flex flex-col gap-2 rounded-2xl border border-cocoa/14 bg-ivory p-5"
                key={item.step}
              >
                <span className="font-[family-name:var(--font-display)] text-xl italic text-rose">
                  {item.step}
                </span>
                <h3 className="text-base font-medium text-espresso">{item.title}</h3>
                <p className="text-xs leading-relaxed text-muted">{item.description}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Studio Pendukung */}
        <section className="grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-cocoa/14 bg-cream/55 p-6">
            <p className="text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-cocoa">
              Design Studio
            </p>
            <h3 className="mt-2 font-[family-name:var(--font-display)] text-xl text-espresso">
              Simpan konsep &amp; referensi
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Pilih kategori, model, kain, warna, detail finishing, dan unggah foto/PDF referensi.
              Desain tersimpan di server dan dapat langsung dipilih saat memesan.
            </p>
            <Link className="link-underline mt-4" href="/design-studio">
              Buka Design Studio
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="rounded-2xl border border-cocoa/14 bg-cream/55 p-6">
            <p className="text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-cocoa">
              Measurement Studio
            </p>
            <h3 className="mt-2 font-[family-name:var(--font-display)] text-xl text-espresso">
              Panduan mannequin 2D
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Catat ukuran tubuh dalam sentimeter (cm) dengan 5 template pakaian dan panduan tiap
              titik ukur. Profil dapat dipakai ulang tanpa mengubah snapshot pesanan lama.
            </p>
            <Link className="link-underline mt-4" href="/measurement-studio">
              Buka Measurement Studio
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="rounded-2xl border border-cocoa/14 bg-cream/55 p-6">
            <p className="text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-cocoa">
              Lacak Pesanan
            </p>
            <h3 className="mt-2 font-[family-name:var(--font-display)] text-xl text-espresso">
              Verifikasi 2 faktor
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Gunakan nomor pesanan beserta nomor WhatsApp terdaftar atau Kode Akses Tracking untuk
              menyetujui penawaran, mengunggah bukti QRIS, dan memantau progres.
            </p>
            <Link className="link-underline mt-4" href="/track">
              Buka Lacak Pesanan
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>

        {/* Skema Penawaran & Pembayaran */}
        <section className="rounded-[1.75rem] border border-cocoa/14 bg-cream/45 p-6 sm:p-9">
          <p className="eyebrow">Penawaran &amp; Pembayaran</p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-espresso sm:text-3xl">
            Aturan Invoice DP 50% &amp; Pelunasan
          </h2>
          <ul className="mt-5 flex flex-col gap-3">
            {paymentHighlights.map((text) => (
              <li className="flex items-start gap-3 text-sm leading-relaxed text-muted" key={text}>
                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-cocoa" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-xs text-muted">
            Baca ketentuan lengkap pada halaman{" "}
            <Link className="font-medium text-espresso underline underline-offset-4" href="/syarat-ketentuan">
              Syarat &amp; Ketentuan
            </Link>
            .
          </p>
        </section>

        {/* 10 Tahap Produksi */}
        <section aria-labelledby="sepuluh-tahap-heading">
          <p className="eyebrow">Transparansi Produksi</p>
          <h2
            className="mt-1 font-[family-name:var(--font-display)] text-2xl text-espresso sm:text-3xl"
            id="sepuluh-tahap-heading"
          >
            10 tahap produksi Celmira Tailor
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Setiap pesanan yang telah diverifikasi pembayarannya akan melewati tahapan berikut yang
            dapat dipantau secara real-time di halaman Lacak Pesanan.
          </p>

          <ol className="mt-6 grid gap-3 sm:grid-cols-2">
            {PRODUCTION_STAGES.map((stage) => (
              <li
                className="flex items-start gap-3.5 rounded-2xl border border-cocoa/12 bg-ivory p-4"
                key={stage.id}
              >
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cream font-mono text-xs font-semibold text-cocoa">
                  {String(stage.step).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-espresso">{stage.label}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{stage.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
