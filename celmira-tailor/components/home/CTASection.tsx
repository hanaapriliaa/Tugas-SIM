import { ButtonLink } from "@/components/ui/ButtonLink";
import { ArrowRight } from "@/components/ui/icons";
import { site } from "@/lib/site";

export function CTASection() {
  return (
    <section aria-labelledby="cta-title" className="shell pb-20 sm:pb-24 lg:pb-28">
      <div className="relative overflow-hidden rounded-[2rem] bg-espresso px-6 py-16 text-center sm:px-12 sm:py-20 lg:py-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-cocoa/40 blur-[80px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-blush/20 blur-[90px]"
        />

        <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-6">
          <p className="text-[0.625rem] font-semibold uppercase tracking-[0.26em] text-blush">
            Mulai dari konsultasi
          </p>
          <h2
            className="text-balance text-[2.1rem] leading-[1.12] text-ivory sm:text-[2.8rem] lg:text-[3.2rem]"
            id="cta-title"
          >
            Ceritakan busana yang Anda bayangkan.
          </h2>
          <p className="max-w-xl text-pretty text-[0.9875rem] leading-[1.9] text-ivory/70">
            Tentukan desain, bahan, warna, dan ukuran bersama tim produksi {site.brand}. Kami akan
            membantu menerjemahkan kebutuhan Anda menjadi busana yang pas dipakai.
          </p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <ButtonLink
              className="bg-ivory text-espresso hover:bg-blush focus-visible:bg-blush"
              href="/orders"
            >
              Mulai Pesanan
              <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-1" />
            </ButtonLink>
            <ButtonLink
              className="border border-ivory/35 text-ivory hover:border-ivory/70 hover:bg-ivory/10"
              href="/chat"
              variant="outline"
            >
              Tanya dulu
            </ButtonLink>
          </div>
          <p className="mt-2 text-[0.625rem] uppercase tracking-[0.2em] text-ivory/65">
            Design Studio · Measurement Studio · Pemesanan &amp; Chat Aktif
          </p>
        </div>
      </div>
    </section>
  );
}
