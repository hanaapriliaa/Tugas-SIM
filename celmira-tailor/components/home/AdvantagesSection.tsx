import { advantages } from "@/lib/advantages";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function AdvantagesSection() {
  return (
    <section aria-labelledby="keunggulan-title" className="shell py-20 sm:py-24 lg:py-28">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-20">
        <SectionHeading
          description="Layanan jahit ini lahir dari proses produksi yang memang dikerjakan Celmira Boutique setiap hari — bukan sekadar menerima pesanan."
          eyebrow="Keunggulan"
          title={
            <span id="keunggulan-title">
              Alasan pesanan custom <span className="italic text-cocoa">terasa berbeda</span>.
            </span>
          }
        />

        <div className="grid gap-x-10 gap-y-0 sm:grid-cols-2">
          {advantages.map((item, index) => (
            <article className="flex flex-col gap-2.5 border-t border-cocoa/12 py-6" key={item.title}>
              <span className="text-[0.625rem] font-medium uppercase tracking-[0.22em] text-rose">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="text-[1.05rem] font-medium text-espresso">{item.title}</h3>
              <p className="text-[0.875rem] leading-[1.8] text-muted">{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
