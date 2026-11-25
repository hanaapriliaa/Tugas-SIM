import { ButtonLink } from "@/components/ui/ButtonLink";
import { ArrowRight, CheckIcon } from "@/components/ui/icons";

const fields = [
  { label: "Lingkar badan", hint: "diukur pada bagian terlebar" },
  { label: "Lingkar pinggang", hint: "tanpa menarik pita ukur" },
  { label: "Lingkar panggul", hint: "diukur sejajar lantai" },
  { label: "Panjang bahu", hint: "dari titik bahu ke bahu" },
  { label: "Panjang lengan", hint: "sesuai model yang dipilih" },
  { label: "Panjang busana", hint: "ditentukan dari garis bahu" },
];

const benefits = [
  "Panduan urutan pengukuran langkah demi langkah.",
  "Ukuran tersimpan per anggota keluarga, siap dipakai ulang.",
  "Ringkasan ukuran ikut terlampir saat mengajukan pesanan.",
];

export function MeasurementStudioPreview() {
  return (
    <section aria-labelledby="measurement-studio-title" className="shell py-20 sm:py-24 lg:py-28">
      <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-20">
        <div className="order-2 lg:order-1">
          <div className="relative rounded-[1.75rem] border border-cocoa/12 bg-cream/60 p-6 sm:p-8">
            <div className="flex items-center justify-between border-b border-cocoa/12 pb-4">
              <div>
                <p className="text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-cocoa">
                  Measurement Studio
                </p>
                <p className="mt-1 font-[family-name:var(--font-display)] text-lg text-espresso">
                  Ukuran badan
                </p>
              </div>
              <span className="rounded-full border border-cocoa/20 bg-ivory/70 px-2.5 py-1 text-[0.5625rem] font-medium uppercase tracking-[0.16em] text-cocoa">
                Pratinjau
              </span>
            </div>

            <dl className="mt-2 divide-y divide-cocoa/10">
              {fields.map((field) => (
                <div
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3"
                  key={field.label}
                >
                  <dt className="text-sm text-espresso">{field.label}</dt>
                  <dd className="flex items-baseline gap-3">
                    <span className="hidden text-[0.625rem] uppercase tracking-[0.12em] text-muted/80 sm:inline">
                      {field.hint}
                    </span>
                    <span className="inline-block w-14 border-b border-dashed border-cocoa/30 text-right text-sm text-muted">
                      cm
                    </span>
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-ivory/80 p-3.5">
              <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cocoa" />
              <p className="text-xs leading-relaxed text-muted">
                Ukuran dapat diisi sendiri di rumah, lalu diperiksa kembali oleh tim produksi
                sebelum pemotongan bahan.
              </p>
            </div>
          </div>
        </div>

        <div className="order-1 flex flex-col gap-7 lg:order-2">
          <p className="eyebrow">Measurement Studio</p>
          <h2
            className="text-balance text-[2rem] leading-[1.15] text-espresso sm:text-[2.6rem]"
            id="measurement-studio-title"
          >
            Ukuran yang rapi, <span className="italic text-cocoa">tanpa mengulang dari awal</span>.
          </h2>
          <p className="max-w-lg text-pretty text-[0.9875rem] leading-[1.9] text-muted">
            Measurement Studio memandu Anda mengukur badan dengan urutan yang benar dan menyimpan
            hasilnya. Jika Anda memesan lagi untuk orang yang sama, ukuran tinggal dipakai kembali.
          </p>

          <ul className="flex flex-col gap-3 border-t border-cocoa/12 pt-6">
            {benefits.map((benefit) => (
              <li className="flex items-start gap-3 text-sm leading-relaxed text-muted" key={benefit}>
                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-cocoa" />
                {benefit}
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <ButtonLink href="/measurement-studio">
              Coba Measurement Studio
              <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-1" />
            </ButtonLink>
            <span className="text-[0.625rem] uppercase tracking-[0.2em] text-muted">
              Tahap pengembangan
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
