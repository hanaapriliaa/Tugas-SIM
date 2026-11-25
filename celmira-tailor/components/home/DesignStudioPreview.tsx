"use client";

import { useState } from "react";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ArrowRight } from "@/components/ui/icons";

const silhouettes = [
  {
    name: "Kebaya",
    heading: "Kebaya custom",
    model: "Kebaya Kartini",
    fabric: "Brokat / lace",
    length: "Midi",
  },
  {
    name: "Gamis",
    heading: "Gamis custom",
    model: "Potongan longgar",
    fabric: "Bahan harian / pesta",
    length: "Penuh",
  },
  {
    name: "Kemeja",
    heading: "Kemeja custom",
    model: "Kemeja formal pria",
    fabric: "Sesuai konsultasi",
    length: "Reguler",
  },
  {
    name: "Blazer",
    heading: "Blazer custom",
    model: "Struktur rapi",
    fabric: "Sesuai konsultasi",
    length: "Pinggul",
  },
] as const;

const swatches = [
  { name: "Dusty rose", className: "bg-[#d9bdb2]" },
  { name: "Cocoa", className: "bg-[#704f46]" },
  { name: "Ivory", className: "bg-[#f3e9de]" },
  { name: "Sage", className: "bg-[#a8b3a1]" },
] as const;

export function DesignStudioPreview() {
  const [selectedSilhouetteIndex, setSelectedSilhouetteIndex] = useState(0);
  const [selectedSwatchIndex, setSelectedSwatchIndex] = useState(0);

  const activeSilhouette = silhouettes[selectedSilhouetteIndex];
  const activeSwatch = swatches[selectedSwatchIndex];

  const summary = [
    ["Model", activeSilhouette.model],
    ["Bahan", activeSilhouette.fabric],
    ["Warna", activeSwatch.name],
    ["Panjang", activeSilhouette.length],
  ];

  return (
    <section aria-labelledby="design-studio-title" className="bg-espresso text-ivory">
      <div className="shell grid gap-14 py-20 sm:py-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-20 lg:py-28">
        <div className="flex flex-col gap-7">
          <p className="eyebrow text-blush">Design Studio</p>
          <h2
            className="text-balance text-[2rem] leading-[1.15] text-ivory sm:text-[2.6rem] lg:text-[3rem]"
            id="design-studio-title"
          >
            Susun busana Anda <span className="italic text-blush">secara visual</span>.
          </h2>
          <p className="max-w-lg text-pretty text-[0.9875rem] leading-[1.9] text-ivory/70">
            Design Studio dirancang untuk membantu Anda menyusun siluet, bahan, warna, dan detail
            sebelum berkonsultasi. Ringkasan pilihan akan menjadi acuan awal bagi tim produksi,
            sehingga diskusi tidak dimulai dari nol.
          </p>

          <ul className="flex flex-col gap-3 border-t border-ivory/15 pt-6 text-sm text-ivory/70">
            <li>Pilih siluet dan detail busana dalam satu tampilan.</li>
            <li>Bandingkan kombinasi bahan dan warna.</li>
            <li>Simpan ringkasan desain untuk diajukan bersama pesanan.</li>
          </ul>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <ButtonLink
              className="bg-ivory text-espresso hover:bg-blush focus-visible:bg-blush"
              href="/design-studio"
            >
              Coba Design Studio
              <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-1" />
            </ButtonLink>
            <span className="text-[0.625rem] uppercase tracking-[0.2em] text-ivory/50">
              Tahap pengembangan
            </span>
          </div>
        </div>

        <div className="relative">
          <div
            aria-hidden="true"
            className="absolute -inset-3 rounded-[2rem] border border-ivory/12 sm:-inset-4"
          />
          <div className="relative rounded-[1.6rem] bg-ivory p-6 text-espresso shadow-[0_40px_80px_-50px_rgba(0,0,0,0.8)] sm:p-8">
            <div className="flex items-center justify-between border-b border-cocoa/12 pb-4">
              <div>
                <p className="text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-cocoa">
                  Design Studio
                </p>
                <p className="mt-1 font-[family-name:var(--font-display)] text-lg">
                  {activeSilhouette.heading}
                </p>
              </div>
              <span className="rounded-full border border-cocoa/20 px-2.5 py-1 text-[0.5625rem] font-medium uppercase tracking-[0.16em] text-cocoa">
                Pratinjau
              </span>
            </div>

            <div className="mt-5">
              <p className="text-[0.625rem] font-medium uppercase tracking-[0.18em] text-muted">
                Siluet
              </p>
              <div aria-label="Pilih siluet pratinjau" className="mt-2 flex flex-wrap gap-2" role="group">
                {silhouettes.map((item, index) => (
                  <button
                    aria-pressed={index === selectedSilhouetteIndex}
                    className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs transition-colors duration-300 ${
                      index === selectedSilhouetteIndex
                        ? "border-cocoa bg-cocoa text-ivory"
                        : "border-cocoa/20 text-muted hover:border-cocoa/45 hover:text-espresso"
                    }`}
                    key={item.name}
                    onClick={() => setSelectedSilhouetteIndex(index)}
                    type="button"
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <p className="text-[0.625rem] font-medium uppercase tracking-[0.18em] text-muted">
                Warna bahan
              </p>
              <div aria-label="Pilih warna pratinjau" className="mt-2 flex gap-2.5" role="group">
                {swatches.map((swatch, index) => (
                  <button
                    aria-label={swatch.name}
                    aria-pressed={index === selectedSwatchIndex}
                    className={`h-8 w-8 cursor-pointer rounded-full border border-cocoa/15 transition-transform duration-300 hover:scale-105 ${swatch.className} ${
                      index === selectedSwatchIndex
                        ? "ring-1 ring-cocoa ring-offset-2 ring-offset-ivory"
                        : ""
                    }`}
                    key={swatch.name}
                    onClick={() => setSelectedSwatchIndex(index)}
                    title={swatch.name}
                    type="button"
                  />
                ))}
              </div>
            </div>

            <dl className="mt-6 divide-y divide-cocoa/10 border-t border-cocoa/10">
              {summary.map(([label, value]) => (
                <div className="flex items-center justify-between gap-4 py-2.5" key={label}>
                  <dt className="text-[0.6875rem] uppercase tracking-[0.14em] text-muted">
                    {label}
                  </dt>
                  <dd className="text-sm text-espresso">{value}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-4 text-[0.625rem] leading-relaxed text-muted">
              Pratinjau antarmuka. Pilihan di atas belum dapat disimpan pada tahap ini.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
