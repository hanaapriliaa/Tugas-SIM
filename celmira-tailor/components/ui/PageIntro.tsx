import Link from "next/link";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ArrowRight } from "@/components/ui/icons";

type PlannedItem = {
  title: string;
  description: string;
};

type PageIntroProps = {
  eyebrow: string;
  title: string;
  description: string;
  status?: string;
  planned?: PlannedItem[];
  note?: string;
  primaryCta?: { href: string; label: string };
  secondaryCta?: { href: string; label: string };
};

/**
 * Kerangka halaman untuk route yang fiturnya belum dibangun.
 * Tujuannya menjelaskan rencana secara jujur — bukan mensimulasikan fitur.
 */
export function PageIntro({
  eyebrow,
  title,
  description,
  status = "Tahap pengembangan",
  planned = [],
  note,
  primaryCta,
  secondaryCta,
}: PageIntroProps) {
  return (
    <div className="shell py-20 sm:py-24 lg:py-28">
      <div className="grid gap-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-20">
        <div className="flex flex-col gap-7">
          <div className="flex flex-wrap items-center gap-4">
            <p className="eyebrow">{eyebrow}</p>
            <span className="rounded-full border border-cocoa/25 px-3 py-1 text-[0.625rem] font-medium uppercase tracking-[0.18em] text-cocoa">
              {status}
            </span>
          </div>

          <h1 className="text-balance text-[2.4rem] leading-[1.08] text-espresso sm:text-[3.2rem] lg:text-[3.6rem]">
            {title}
          </h1>

          <p className="max-w-xl text-pretty text-[1.0125rem] leading-[1.9] text-muted">
            {description}
          </p>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:gap-4">
            {primaryCta ? (
              <ButtonLink href={primaryCta.href}>
                {primaryCta.label}
                <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-1" />
              </ButtonLink>
            ) : null}
            {secondaryCta ? (
              <ButtonLink href={secondaryCta.href} variant="outline">
                {secondaryCta.label}
              </ButtonLink>
            ) : null}
          </div>

          {note ? (
            <p className="max-w-xl border-l border-blush/70 pl-4 text-sm leading-relaxed text-muted">
              {note}
            </p>
          ) : null}
        </div>

        {planned.length > 0 ? (
          <aside className="lg:pt-4">
            <div className="rounded-[1.75rem] border border-cocoa/12 bg-cream/60 p-7 sm:p-9">
              <h2 className="text-[1.35rem] text-espresso">Yang sedang disiapkan</h2>
              <ul className="mt-6 flex flex-col divide-y divide-cocoa/10">
                {planned.map((item) => (
                  <li className="flex flex-col gap-1.5 py-4 first:pt-0 last:pb-0" key={item.title}>
                    <span className="text-[0.9375rem] font-medium text-espresso">{item.title}</span>
                    <span className="text-sm leading-relaxed text-muted">{item.description}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-7 text-xs leading-relaxed tracking-wide text-muted/90">
                Belum ada data, transaksi, atau akun yang dibuat pada tahap ini.
              </p>
            </div>
          </aside>
        ) : null}
      </div>

      <div className="rule mt-16 flex flex-col gap-4 pt-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-md text-sm leading-relaxed text-muted">
          Sementara fitur ini disiapkan, pesanan custom dapat didiskusikan langsung dengan tim
          Celmira Boutique.
        </p>
        <Link
          className="link-underline"
          href="https://celmiraboutique.com/jahit"
          rel="noreferrer"
          target="_blank"
        >
          Layanan jahit Celmira
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
