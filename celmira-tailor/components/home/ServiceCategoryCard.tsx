import Link from "next/link";
import type { ServiceCategory } from "@/lib/services";
import { ArrowUpRight } from "@/components/ui/icons";

type ServiceCategoryCardProps = {
  service: ServiceCategory;
};

export function ServiceCategoryCard({ service }: ServiceCategoryCardProps) {
  return (
    <article className="h-full">
      <Link
        aria-label={`Lihat kategori ${service.name} di katalog jahit`}
        className="group relative flex h-full flex-col justify-between gap-10 overflow-hidden rounded-[1.5rem] border border-cocoa/12 bg-ivory p-6 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-cocoa/30 hover:bg-cream/60 sm:p-7"
        href="/catalog"
      >
        <div className="flex items-start justify-between gap-4">
          <span className="text-[0.6875rem] font-medium tracking-[0.24em] text-rose">
            {service.index}
          </span>
          <ArrowUpRight className="h-4 w-4 text-cocoa/40 transition-all duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-cocoa" />
        </div>

        <div className="flex flex-col gap-2.5">
          <h3 className="text-[1.4rem] leading-snug text-espresso">{service.name}</h3>
          <p className="text-pretty text-[0.875rem] leading-[1.75] text-muted">
            {service.description}
          </p>
          <p className="mt-1 text-[0.6875rem] uppercase tracking-[0.14em] text-cocoa/70">
            {service.detail}
          </p>
        </div>
      </Link>
    </article>
  );
}
