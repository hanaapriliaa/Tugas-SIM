import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { PageIntro } from "@/components/ui/PageIntro";
import { ArrowRight, ArrowUpRight, CheckIcon, PinIcon } from "@/components/ui/icons";
import { advantages } from "@/lib/advantages";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Tentang Kami",
  description:
    "Mengenal Celmira Tailor oleh Celmira Boutique — layanan jahit custom yang dikerjakan langsung oleh tim produksi sendiri di Yogyakarta sejak 2018.",
};

const craftPrinciples = [
  "Desain, model, bahan, warna, dan detail finishing didiskusikan sebelum proses penjahitan dimulai.",
  "Ukuran diperhitungkan bersama kampuh jahitan agar hasil setelah finishing tetap mendekati ukuran yang disepakati.",
  "Seluruh pengerjaan ditangani langsung oleh tim produksi Celmira Boutique, bukan dialihkan ke pihak lain.",
  "Untuk pelanggan di luar Yogyakarta, ukuran dapat direplikasi dari baju contoh yang paling nyaman dipakai.",
];

export default function TentangKamiPage() {
  return (
    <div>
      <PageIntro
        description={`Celmira Tailor merupakan layanan jahit custom dari ${site.brand} yang berdiri sejak ${site.since}. Setiap busana disusun berdasarkan kebutuhan Anda — bukan dari ukuran stok massal.`}
        eyebrow="Tentang Kami"
        title="Dikerjakan tim produksi sendiri, satu demi satu."
      />

      <div className="shell space-y-14 pb-20">
        <section className="grid gap-8 lg:grid-cols-12">
          <div className="rounded-[1.75rem] border border-cocoa/14 bg-cream/55 p-7 sm:p-9 lg:col-span-7">
            <p className="text-[0.625rem] font-semibold uppercase tracking-[0.24em] text-cocoa">
              Identitas {site.brand}
            </p>
            <blockquote className="mt-4 font-[family-name:var(--font-display)] text-2xl italic leading-snug text-espresso sm:text-3xl">
              “{site.tagline}”
            </blockquote>
            <p className="mt-5 text-sm leading-[1.85] text-muted">
              {site.brand} adalah butik di {site.location.region} yang memproduksi sendiri koleksi
              fashion perempuan dan anak. Prinsip produksi yang sama kami bawa ke{" "}
              <strong className="font-medium text-espresso">{site.name}</strong> untuk melayani
              pesanan jahit custom — mulai dari kebaya, gamis, kemeja pria, blazer, mukena, busana
              wisuda, hingga busana pernikahan dan seragam keluarga.
            </p>

            <ul className="mt-6 flex flex-col divide-y divide-cocoa/10 border-y border-cocoa/10">
              {craftPrinciples.map((item) => (
                <li className="flex items-start gap-3 py-3.5 text-sm leading-relaxed text-muted" key={item}>
                  <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-cocoa" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <aside className="flex flex-col justify-between gap-6 rounded-[1.75rem] border border-cocoa/14 bg-ivory p-7 sm:p-9 lg:col-span-5">
            <div className="space-y-4">
              <p className="text-[0.625rem] font-semibold uppercase tracking-[0.24em] text-cocoa">
                {site.location.label}
              </p>
              <div className="flex items-start gap-3 text-sm leading-relaxed text-muted">
                <PinIcon className="mt-0.5 h-4 w-4 shrink-0 text-cocoa" />
                <div>
                  <p className="font-medium text-espresso">{site.brand}</p>
                  <p className="mt-1">
                    {site.location.address[0]}
                    <br />
                    {site.location.address[1]}
                  </p>
                </div>
              </div>
              <a
                className="link-underline"
                href={site.location.mapsUrl}
                rel="noreferrer"
                target="_blank"
              >
                Buka peta lokasi resmi
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="space-y-3 border-t border-cocoa/12 pt-5 text-xs leading-relaxed text-muted">
              <p className="font-semibold uppercase tracking-[0.16em] text-cocoa">
                Tautan Resmi {site.brand}
              </p>
              <div className="flex flex-col gap-2">
                <a className="link-underline" href={site.url} rel="noreferrer" target="_blank">
                  Situs utama celmiraboutique.com
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
                <a className="link-underline" href={site.tailorUrl} rel="noreferrer" target="_blank">
                  Halaman Jasa Jahit resmi
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
                <a className="link-underline" href={site.catalogUrl} rel="noreferrer" target="_blank">
                  Katalog resmi Celmira Boutique
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </aside>
        </section>

        <section aria-labelledby="tentang-keunggulan">
          <div className="flex flex-col gap-2">
            <p className="eyebrow">Keunggulan Produksi</p>
            <h2
              className="font-[family-name:var(--font-display)] text-2xl text-espresso sm:text-3xl"
              id="tentang-keunggulan"
            >
              Standar pengerjaan Celmira Tailor
            </h2>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {advantages.map((item, index) => (
              <article
                className="rounded-2xl border border-cocoa/14 bg-ivory p-5"
                key={item.title}
              >
                <span className="text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-rose">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 font-[family-name:var(--font-display)] text-lg text-espresso">
                  {item.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-muted">{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-5 rounded-[1.75rem] border border-cocoa/14 bg-espresso px-6 py-9 text-ivory sm:flex-row sm:items-center sm:justify-between sm:px-9">
          <div className="max-w-xl">
            <p className="text-[0.625rem] font-semibold uppercase tracking-[0.24em] text-blush">
              Siap Mulai Merancang?
            </p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl sm:text-3xl">
              Susun desain, atur ukuran, atau konsultasikan kebutuhan Anda.
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink
              className="bg-ivory text-espresso hover:bg-blush"
              href="/orders"
            >
              Mulai Pesanan
              <ArrowRight className="h-4 w-4" />
            </ButtonLink>
            <Link
              className="inline-flex items-center justify-center rounded-full border border-ivory/35 px-5 py-3 text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-ivory transition-colors hover:border-ivory"
              href="/kontak"
            >
              Kontak &amp; Lokasi
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
