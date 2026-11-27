import type { Metadata } from "next";
import Link from "next/link";
import { ContactAvailabilityCard } from "@/components/info/ContactAvailabilityCard";
import { PageIntro } from "@/components/ui/PageIntro";
import { ArrowUpRight, PinIcon } from "@/components/ui/icons";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Kontak & Lokasi",
  description:
    "Alamat Official Store Celmira Boutique di Yogyakarta, saluran Chat Pelanggan resmi, dan tautan situs resmi Celmira Tailor.",
};

export default function KontakPage() {
  return (
    <div>
      <PageIntro
        description="Hubungi tim Celmira Tailor melalui Chat Pelanggan di platform ini atau kunjungi Official Store Celmira Boutique di Yogyakarta."
        eyebrow="Kontak & Lokasi"
        title="Terhubung langsung dengan atelier kami."
      />

      <div className="shell pb-20">
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <ContactAvailabilityCard />
          </div>

          <aside className="space-y-6 lg:col-span-5">
            <section className="rounded-[1.75rem] border border-cocoa/15 bg-ivory p-6 sm:p-8">
              <p className="text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-cocoa">
                {site.location.label}
              </p>
              <div className="mt-4 flex items-start gap-3 text-sm leading-relaxed text-muted">
                <PinIcon className="mt-0.5 h-5 w-5 shrink-0 text-cocoa" />
                <div>
                  <p className="font-medium text-espresso">{site.brand}</p>
                  <p className="mt-1">
                    {site.location.address[0]}
                    <br />
                    {site.location.address[1]}
                  </p>
                  <p className="mt-1 text-xs text-muted">{site.location.region}</p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-4 border-t border-cocoa/10 pt-4">
                <a
                  className="link-underline"
                  href={site.location.mapsUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Lihat di Google Maps
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
                <a
                  className="link-underline"
                  href={site.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  celmiraboutique.com
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-cocoa/14 bg-cream/45 p-6 text-xs leading-relaxed text-muted">
              <p className="text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-cocoa">
                Pelanggan di Luar Yogyakarta
              </p>
              <p className="mt-2">
                Pemesanan custom tetap dapat dilakukan dari luar kota. Anda dapat mengisi ukuran
                melalui{" "}
                <Link
                  className="font-medium text-espresso underline underline-offset-4"
                  href="/measurement-studio"
                >
                  Measurement Studio
                </Link>{" "}
                atau memilih metode replikasi dari baju contoh saat mengajukan pesanan di{" "}
                <Link
                  className="font-medium text-espresso underline underline-offset-4"
                  href="/orders"
                >
                  halaman pemesanan
                </Link>
                .
              </p>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
