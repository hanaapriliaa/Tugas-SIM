import { processSteps } from "@/lib/process";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ArrowRight } from "@/components/ui/icons";

export function ProcessSteps() {
  return (
    <section aria-labelledby="cara-pemesanan-title" className="shell py-20 sm:py-24 lg:py-28" id="cara-pemesanan">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
        <div className="flex flex-col gap-8 lg:sticky lg:top-28 lg:self-start">
          <SectionHeading
            description="Tujuh langkah yang membuat pesanan custom tetap terukur — dari ide awal sampai busana diterima."
            eyebrow="Cara Pemesanan"
            title={<span id="cara-pemesanan-title">Alur yang jelas, dari ide sampai selesai.</span>}
          />
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <ButtonLink className="w-fit" href="/orders">
                Mulai Pesanan
                <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-1" />
              </ButtonLink>
              <ButtonLink className="w-fit" href="/cara-pemesanan" variant="outline">
                Panduan Lengkap
              </ButtonLink>
            </div>
            <p className="max-w-sm text-xs leading-relaxed text-muted/90">
              Belum ada tagihan saat pengajuan. Penawaran harga akhir, verifikasi DP 50%, dan
              pelacakan 10 tahap produksi tersedia langsung di platform ini.
            </p>
          </div>
        </div>

        <ol className="grid gap-x-10 gap-y-0 sm:grid-cols-2">
          {processSteps.map((step, index) => (
            <li
              className={`group flex flex-col gap-2 border-t border-cocoa/12 py-6 transition-colors duration-300 hover:border-cocoa/30 ${
                index === processSteps.length - 1 ? "sm:col-span-2" : ""
              }`}
              key={step.step}
            >
              <div className="flex items-baseline gap-4">
                <span className="font-[family-name:var(--font-display)] text-lg italic text-rose">
                  {step.step}
                </span>
                <h3 className="text-[1.05rem] font-medium text-espresso">{step.title}</h3>
              </div>
              <p className="pl-8 text-[0.875rem] leading-[1.8] text-muted">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
