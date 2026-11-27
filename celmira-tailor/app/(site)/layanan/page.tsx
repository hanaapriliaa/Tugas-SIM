import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { PageIntro } from "@/components/ui/PageIntro";
import { ArrowRight, CheckIcon } from "@/components/ui/icons";
import { advantages } from "@/lib/advantages";
import { garmentCategories } from "@/lib/booking-options";
import { buildDesignStudioHref } from "@/lib/design-studio";
import { buildMeasurementStudioHref } from "@/lib/measurement-studio";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Informasi Layanan",
  description:
    "Delapan kategori layanan jahit custom Celmira Tailor: kebaya, gamis, kemeja pria, blazer, mukena, busana wisuda, busana pernikahan, dan custom lainnya.",
};

export default function LayananPage() {
  return (
    <div>
      <PageIntro
        description={`Delapan kategori layanan jahit custom oleh tim produksi ${site.brand}. Pilih kategori untuk langsung merancang di Design Studio, mengukur di Measurement Studio, atau mengajukan pesanan.`}
        eyebrow="Informasi Layanan"
        title="Layanan jahit custom Celmira Tailor."
      />

      <div className="shell space-y-16 pb-20">
        <section aria-labelledby="daftar-layanan-heading">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow">8 Kategori Layanan</p>
              <h2
                className="mt-1 font-[family-name:var(--font-display)] text-2xl text-espresso sm:text-3xl"
                id="daftar-layanan-heading"
              >
                Pilih kategori sesuai kebutuhan acara &amp; harian
              </h2>
            </div>
            <ButtonLink href="/catalog" variant="outline">
              Buka Katalog Jahit
              <ArrowRight className="h-4 w-4" />
            </ButtonLink>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {garmentCategories.map((category) => (
              <article
                className="flex flex-col justify-between gap-4 rounded-2xl border border-cocoa/14 bg-ivory p-5"
                key={category.id}
              >
                <div>
                  <span className="text-[0.6875rem] font-medium tracking-[0.2em] text-rose">
                    {category.index}
                  </span>
                  <h3 className="mt-2 font-[family-name:var(--font-display)] text-xl text-espresso">
                    {category.name}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted">
                    {category.description}
                  </p>
                  <p className="mt-2 text-[0.6875rem] uppercase tracking-[0.12em] text-cocoa">
                    {category.detail}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 border-t border-cocoa/10 pt-3 text-[0.6875rem] font-medium">
                  <Link
                    className="rounded-full bg-espresso px-3 py-1.5 text-ivory transition-colors hover:bg-cocoa"
                    href={`/orders?category=${encodeURIComponent(category.id)}`}
                  >
                    Pesan
                  </Link>
                  <Link
                    className="rounded-full border border-cocoa/25 px-3 py-1.5 text-espresso transition-colors hover:border-espresso"
                    href={buildDesignStudioHref({ categoryId: category.id })}
                  >
                    Design Studio
                  </Link>
                  <Link
                    className="rounded-full border border-cocoa/20 px-3 py-1.5 text-muted transition-colors hover:border-espresso hover:text-espresso"
                    href={buildMeasurementStudioHref({ categoryId: category.id })}
                  >
                    Ukur
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <p className="mt-6 rounded-2xl border border-cocoa/12 bg-cream/50 p-4 text-xs leading-relaxed text-muted">
            <strong className="font-semibold text-espresso">Catatan layanan:</strong> Ketersediaan
            bahan, rincian model, biaya jahit akhir, dan estimasi waktu pengerjaan tidak dipatok
            sama untuk setiap pesanan — seluruhnya ditetapkan melalui penawaran resmi setelah tim
            Celmira meninjau detail pesanan Anda.
          </p>
        </section>

        <section className="rounded-[1.75rem] border border-cocoa/14 bg-cream/45 p-6 sm:p-9">
          <p className="eyebrow">Keunggulan Celmira Tailor</p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-espresso sm:text-3xl">
            Mengapa memesan di {site.name}
          </h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {advantages.map((item) => (
              <div className="flex items-start gap-3" key={item.title}>
                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-cocoa" />
                <div>
                  <h3 className="text-sm font-semibold text-espresso">{item.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <ButtonLink href="/orders">
              Mulai Pesanan Custom
              <ArrowRight className="h-4 w-4" />
            </ButtonLink>
            <ButtonLink href="/cara-pemesanan" variant="outline">
              Lihat Cara Pemesanan
            </ButtonLink>
          </div>
        </section>
      </div>
    </div>
  );
}
