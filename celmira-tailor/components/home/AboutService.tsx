import { SectionHeading } from "@/components/ui/SectionHeading";
import { CheckIcon } from "@/components/ui/icons";
import { site } from "@/lib/site";

const facts = [
  "Desain dan model dibicarakan sebelum pengerjaan dimulai.",
  "Bahan dan warna dipilih sesuai kebutuhan pemakaian.",
  "Ukuran badan diambil langsung atau direplikasi dari baju contoh.",
  "Detail finishing disesuaikan dengan karakter busana.",
];

export function AboutService() {
  return (
    <section
      aria-labelledby="tentang-title"
      className="border-y border-cocoa/10 bg-cream/50"
      id="tentang"
    >
      <div className="shell grid gap-12 py-20 sm:py-24 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20 lg:py-28">
        <div className="order-2 lg:order-1">
          <div className="relative">
            <div className="rounded-[1.75rem] border border-cocoa/12 bg-ivory p-8 sm:p-10">
              <p className="text-[0.625rem] font-semibold uppercase tracking-[0.26em] text-cocoa">
                Produksi Celmira
              </p>
              <blockquote className="mt-5 font-[family-name:var(--font-display)] text-[1.65rem] italic leading-[1.4] text-espresso sm:text-[1.9rem]">
                “Kualitas bukan sekadar slogan. Kami membuat produk sendiri, satu demi satu.”
              </blockquote>
              <p className="mt-5 text-sm leading-[1.85] text-muted">
                Prinsip itu yang dibawa ke layanan jahit custom: kain dipotong dengan perhitungan
                kampuh, ukuran diperiksa, dan finishing dirapikan sebelum busana sampai ke tangan
                Anda.
              </p>
            </div>
            <div
              aria-hidden="true"
              className="absolute -bottom-4 -right-3 hidden h-24 w-24 rounded-br-[1.75rem] border-b border-r border-cocoa/20 sm:block"
            />
          </div>
        </div>

        <div className="order-1 flex flex-col gap-7 lg:order-2">
          <SectionHeading
            description="Anda tidak memilih dari ukuran standar. Setiap pesanan disusun dari kebutuhan Anda sendiri — dari potongan, bahan, warna, sampai ukuran badan."
            eyebrow="Tentang Layanan"
            title={
              <span id="tentang-title">
                Pesanan yang disusun <span className="italic text-cocoa">dari kebutuhan Anda</span>,
                bukan dari stok.
              </span>
            }
          />

          <ul className="mt-2 flex flex-col divide-y divide-cocoa/10 border-y border-cocoa/10">
            {facts.map((fact) => (
              <li className="flex items-start gap-3 py-4" key={fact}>
                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-cocoa" />
                <span className="text-[0.9375rem] leading-relaxed text-muted">{fact}</span>
              </li>
            ))}
          </ul>

          <p className="text-sm leading-relaxed text-muted">
            Untuk pelanggan yang berada jauh dari {site.location.region.split(",")[0]}, ukuran dapat
            direplikasi dari baju yang paling nyaman dipakai. Detail teknisnya akan dikonfirmasi
            bersama tim produksi.
          </p>
        </div>
      </div>
    </section>
  );
}
