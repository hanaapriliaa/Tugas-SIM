import Image from "next/image";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ArrowRight, ArrowUpRight } from "@/components/ui/icons";
import { site } from "@/lib/site";

const highlights = [
  "Produksi sendiri",
  "Custom ukuran",
  "Konsultasi model",
  "Finishing rapi",
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pb-16 pt-12 sm:pb-20 sm:pt-16 lg:pb-24 lg:pt-20">
      {/* Cahaya lembut sebagai latar editorial */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 -top-40 h-[38rem] w-[38rem] rounded-full bg-blush/25 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-52 top-1/2 h-[30rem] w-[30rem] rounded-full bg-cream blur-[100px]"
      />

      <div className="shell relative">
        <div className="grid items-end gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16">
          <div className="flex flex-col gap-8 lg:pb-6">
            <p className="eyebrow fade">{site.brand} · Tailor Atelier</p>

            <h1 className="rise text-balance text-[2.75rem] leading-[1.06] text-espresso sm:text-[3.5rem] lg:text-[4.15rem]">
              Dijahit untuk Anda,
              <span className="block italic text-cocoa">hingga ke detail terkecil.</span>
            </h1>

            <p
              className="rise max-w-lg text-pretty text-[1.0125rem] leading-[1.9] text-muted"
              style={{ animationDelay: "120ms" }}
            >
              Celmira Tailor menerima pesanan busana custom — dari kebaya brokat untuk hari besar
              hingga kemeja yang menemani hari biasa. Anda menentukan desain, bahan, warna, dan
              ukuran; tim produksi Celmira Boutique yang mengerjakannya.
            </p>

            <div
              className="rise flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4"
              style={{ animationDelay: "220ms" }}
            >
              <ButtonLink href="/orders">
                Mulai Pesanan
                <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-1" />
              </ButtonLink>
              <ButtonLink href="/catalog" variant="outline">
                Lihat Koleksi
              </ButtonLink>
            </div>

            <dl
              className="rise mt-2 grid grid-cols-2 gap-y-4 border-t border-cocoa/12 pt-6 sm:grid-cols-4 sm:gap-x-6"
              style={{ animationDelay: "320ms" }}
            >
              {highlights.map((item) => (
                <div key={item}>
                  <dt className="text-[0.6875rem] font-medium uppercase leading-relaxed tracking-[0.14em] text-cocoa">
                    {item}
                  </dt>
                  <dd className="mt-1 h-px w-6 bg-blush" />
                </div>
              ))}
            </dl>
          </div>

          <div className="relative">
            <div className="relative mx-auto max-w-[26rem] lg:ml-auto lg:max-w-[27.5rem]">
              <div
                aria-hidden="true"
                className="absolute -inset-3 rounded-t-[14rem] rounded-b-[2rem] border border-cocoa/15 sm:-inset-4"
              />
              <div className="relative overflow-hidden rounded-t-[13rem] rounded-b-[1.75rem] bg-cream">
                <Image
                  alt="Model mengenakan gamis berbahan flowy warna dusty rose dengan hijab senada, koleksi Celmira Boutique."
                  className="h-auto w-full object-cover"
                  height={1672}
                  priority
                  sizes="(min-width: 1024px) 44vw, (min-width: 640px) 70vw, 92vw"
                  src="/images/hero.png"
                  width={941}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-espresso/25 via-transparent to-transparent"
                />
              </div>

              <div className="absolute -bottom-6 left-2 max-w-[15rem] rounded-2xl border border-cocoa/10 bg-ivory/95 p-4 shadow-[0_24px_50px_-35px_rgba(59,43,37,0.6)] backdrop-blur-sm sm:-left-6 sm:p-5">
                <p className="text-[0.5625rem] font-semibold uppercase tracking-[0.24em] text-cocoa">
                  Koleksi Celmira
                </p>
                <p className="mt-1.5 font-[family-name:var(--font-display)] text-base leading-snug text-espresso">
                  Gamis flowy dengan detail layer, diproduksi sendiri oleh Celmira Boutique.
                </p>
              </div>
            </div>

            <div className="mt-12 flex items-center justify-between gap-6 lg:mt-10">
              <p className="text-[0.625rem] uppercase leading-relaxed tracking-[0.22em] text-muted">
                Est. {site.since} · {site.location.region}
              </p>
              <a
                className="link-underline"
                href={site.tailorUrl}
                rel="noreferrer"
                target="_blank"
              >
                Situs resmi
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
