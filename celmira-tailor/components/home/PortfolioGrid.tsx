import Image from "next/image";
import { portfolioItems } from "@/lib/portfolio";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ArrowUpRight } from "@/components/ui/icons";
import { site } from "@/lib/site";

export function PortfolioGrid() {
  return (
    <section
      aria-labelledby="portofolio-title"
      className="border-y border-cocoa/10 bg-cream/45"
      id="portofolio"
    >
      <div className="shell py-20 sm:py-24 lg:py-28">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            description="Dokumentasi hasil jahitan yang dipublikasikan sendiri oleh Celmira Boutique. Kami tidak menampilkan karya yang bukan milik Celmira."
            eyebrow="Portofolio"
            title={<span id="portofolio-title">Pengerjaan yang bisa dilihat langsung.</span>}
          />
          <a
            className="link-underline shrink-0"
            href={site.tailorUrl}
            rel="noreferrer"
            target="_blank"
          >
            Dokumentasi lengkap
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-12 lg:gap-10">
          {portfolioItems.map((item, index) => (
            <figure
              className={`group flex flex-col gap-5 ${
                index === 0 ? "lg:col-span-7" : "lg:col-span-5 lg:pt-16"
              }`}
              key={item.src}
            >
              <div className="overflow-hidden rounded-[1.5rem] bg-sand/50">
                <Image
                  alt={item.alt}
                  className="h-auto w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.02]"
                  height={item.height}
                  sizes={index === 0 ? "(min-width: 1024px) 56vw, 92vw" : "(min-width: 1024px) 38vw, 92vw"}
                  src={item.src}
                  width={item.width}
                />
              </div>
              <figcaption className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="text-[1.15rem] text-espresso">{item.title}</h3>
                  <span className="text-[0.5625rem] uppercase tracking-[0.18em] text-cocoa/70">
                    Celmira Boutique
                  </span>
                </div>
                <p className="max-w-md text-sm leading-[1.75] text-muted">{item.caption}</p>
              </figcaption>
            </figure>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-5 rounded-[1.5rem] border border-cocoa/15 bg-ivory/70 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div>
            <p className="font-[family-name:var(--font-display)] text-lg text-espresso">
              Ingin melihat pengerjaan lain?
            </p>
            <p className="mt-1 max-w-lg text-sm leading-relaxed text-muted">
              Halaman Jasa Jahit Celmira Boutique memuat dokumentasi tambahan, termasuk pengerjaan
              kebaya brokat terbaru.
            </p>
          </div>
          <a
            className="link-underline shrink-0"
            href={site.tailorUrl}
            rel="noreferrer"
            target="_blank"
          >
            Buka halaman jasa jahit
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </section>
  );
}
