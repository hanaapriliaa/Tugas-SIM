import Image from "next/image";
import Link from "next/link";
import { navigation, site, studioNavigation } from "@/lib/site";
import { serviceCategories } from "@/lib/services";
import { ArrowUpRight, PinIcon } from "@/components/ui/icons";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-espresso text-ivory">
      <div className="shell py-16 sm:py-20">
        <div className="grid gap-14 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="flex flex-col gap-6">
            <Image
              alt="Celmira Boutique"
              className="h-9 w-auto self-start opacity-95"
              height={533}
              src="/images/logo.png"
              width={1600}
            />
            <p className="max-w-xs font-[family-name:var(--font-display)] text-lg italic leading-relaxed text-blush">
              {site.tagline}
            </p>
            <p className="max-w-xs text-sm leading-[1.8] text-ivory/70">
              Layanan jahit custom oleh Celmira Boutique — butik yang memproduksi sendiri koleksi
              fashion perempuan dan anak.
            </p>
          </div>

          <nav aria-label="Navigasi footer" className="flex flex-col gap-4">
            <h2 className="text-[0.625rem] font-semibold uppercase tracking-[0.24em] text-ivory/50">
              Jelajahi
            </h2>
            {navigation.map((item) => (
              <Link
                className="text-sm text-ivory/80 transition-colors duration-300 hover:text-ivory"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
            <Link
              className="text-sm text-ivory/80 transition-colors duration-300 hover:text-ivory"
              href="/admin"
            >
              Admin
            </Link>
          </nav>

          <div className="flex flex-col gap-4">
            <h2 className="text-[0.625rem] font-semibold uppercase tracking-[0.24em] text-ivory/50">
              Layanan
            </h2>
            {serviceCategories.slice(0, 6).map((service) => (
              <Link
                className="text-sm text-ivory/80 transition-colors duration-300 hover:text-ivory"
                href="/catalog"
                key={service.name}
              >
                {service.name}
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="text-[0.625rem] font-semibold uppercase tracking-[0.24em] text-ivory/50">
              Studio
            </h2>
            {studioNavigation.map((item) => (
              <Link
                className="text-sm text-ivory/80 transition-colors duration-300 hover:text-ivory"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
            <a
              className="mt-2 inline-flex items-center gap-2 text-sm text-blush transition-colors duration-300 hover:text-ivory"
              href={site.url}
              rel="noreferrer"
              target="_blank"
            >
              celmiraboutique.com
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        <div className="mt-14 grid gap-6 border-t border-ivory/12 pt-8 sm:grid-cols-2 sm:items-start">
          <div className="flex items-start gap-3 text-sm leading-relaxed text-ivory/70">
            <PinIcon className="mt-0.5 h-4 w-4 shrink-0 text-blush" />
            <div>
              <p className="text-[0.625rem] font-semibold uppercase tracking-[0.24em] text-ivory/50">
                {site.location.label}
              </p>
              <p className="mt-1.5">
                {site.location.address[0]}
                <br />
                {site.location.address[1]}
              </p>
              <a
                className="mt-2 inline-flex items-center gap-1.5 text-blush hover:text-ivory"
                href={site.location.mapsUrl}
                rel="noreferrer"
                target="_blank"
              >
                Lihat lokasi
                <ArrowUpRight className="h-3 w-3" />
              </a>
            </div>
          </div>

          <p className="text-xs leading-relaxed text-ivory/50 sm:text-right">
            Nomor kontak resmi belum dicantumkan pada tahap ini. Silakan gunakan tautan situs resmi
            Celmira Boutique untuk informasi terbaru.
          </p>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-ivory/12 pt-6 text-xs text-ivory/50 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {site.since}–{year} {site.brand}. All Rights Reserved.
          </p>
          <p className="tracking-[0.08em] uppercase">
            {site.name} — Tailor Atelier, {site.location.region}
          </p>
        </div>
      </div>
    </footer>
  );
}
