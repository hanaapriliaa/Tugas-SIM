import { ServiceCategoryCard } from "@/components/home/ServiceCategoryCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { buttonClass } from "@/components/ui/ButtonLink";
import Link from "next/link";
import { ArrowRight } from "@/components/ui/icons";
import { serviceCategories } from "@/lib/services";

export function ServiceGrid() {
  return (
    <section aria-labelledby="layanan-title" className="shell py-20 sm:py-24 lg:py-28" id="layanan">
      <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
        <SectionHeading
          description="Delapan kategori layanan jahit yang dapat disesuaikan dengan kebutuhan acara, pemakaian harian, maupun busana keluarga."
          eyebrow="Kategori Layanan"
          title={
            <span id="layanan-title">
              Satu atelier untuk <span className="italic text-cocoa">beragam kebutuhan</span>.
            </span>
          }
        />
        <Link className={buttonClass("outline", "w-fit shrink-0")} href="/catalog">
          Lihat Katalog Jahit
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {serviceCategories.map((service) => (
          <ServiceCategoryCard key={service.name} service={service} />
        ))}
      </div>

      <p className="mt-6 max-w-xl text-xs leading-relaxed text-muted/90">
        Daftar ini menjelaskan jenis pesanan yang dapat didiskusikan. Ketersediaan bahan, detail
        model, dan estimasi pengerjaan ditentukan setelah konsultasi.
      </p>
    </section>
  );
}
