"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { celmiraDesignReferences, getCategoryById } from "@/lib/booking-options";
import {
  buildCatalogOrderHref,
  catalogFilterOptions,
  catalogMaterialNotes,
  countCatalogReferencesByCategory,
  filterCatalogReferences,
  type CatalogFilter,
} from "@/lib/catalog";
import { buildDesignStudioHref } from "@/lib/design-studio";
import { buttonClass } from "@/components/ui/ButtonLink";
import { ArrowRight, ArrowUpRight } from "@/components/ui/icons";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { CelmiraDesignReference } from "@/lib/types/tailor";

const smallAction =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-cocoa/25 px-4 py-2 text-[0.625rem] font-medium uppercase tracking-[0.12em] text-espresso transition-colors hover:border-cocoa hover:bg-cream/70";

const smallPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-espresso px-4 py-2 text-[0.625rem] font-medium uppercase tracking-[0.12em] text-ivory transition-colors hover:bg-cocoa";

function CatalogReferenceCard({ reference }: { reference: CelmiraDesignReference }) {
  const category = getCategoryById(reference.categoryId);

  return (
    <article className="flex flex-col overflow-hidden rounded-[1.5rem] border border-cocoa/15 bg-ivory transition-colors duration-500 hover:border-cocoa/30">
      <div className="relative aspect-[4/3] overflow-hidden bg-sand/40">
        {reference.imageSrc ? (
          <Image
            alt={reference.imageAlt ?? reference.title}
            className="h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02]"
            height={480}
            sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
            src={reference.imageSrc}
            width={640}
          />
        ) : (
          <div className="flex h-full w-full flex-col justify-between bg-gradient-to-br from-cream to-sand/70 p-5">
            <span className="font-[family-name:var(--font-display)] text-[2.75rem] leading-none text-cocoa/30">
              {category?.index ?? "—"}
            </span>
            <div>
              <p className="text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-cocoa/70">
                {category?.name ?? "Kategori"}
              </p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-xl leading-snug text-espresso">
                {reference.title}
              </p>
            </div>
          </div>
        )}

        <span className="absolute left-4 top-4 rounded-full bg-ivory/90 px-3 py-1 text-[0.5625rem] font-medium uppercase tracking-[0.14em] text-cocoa shadow-sm">
          {category?.index} · {category?.name}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl leading-snug text-espresso">
            {reference.title}
          </h2>
          <p className="mt-1.5 text-[0.8125rem] leading-[1.7] text-muted">
            {reference.description}
          </p>
        </div>

        <dl className="grid gap-2 text-xs">
          <div className="flex items-baseline justify-between gap-3 border-t border-cocoa/10 pt-2">
            <dt className="uppercase tracking-[0.12em] text-muted">Bahan</dt>
            <dd className="text-right font-medium text-espresso">{reference.defaults.fabric}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 border-t border-cocoa/10 pt-2">
            <dt className="uppercase tracking-[0.12em] text-muted">Warna</dt>
            <dd className="flex items-center gap-2 text-right font-medium text-espresso">
              <span
                aria-hidden="true"
                className="h-3 w-3 rounded-full border border-cocoa/20"
                style={{ backgroundColor: reference.defaults.colorHex }}
              />
              {reference.defaults.colorName}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 border-t border-cocoa/10 pt-2">
            <dt className="uppercase tracking-[0.12em] text-muted">Kerah</dt>
            <dd className="text-right font-medium text-espresso">{reference.defaults.collarStyle}</dd>
          </div>
        </dl>

        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          <Link
            className={smallPrimary}
            href={buildCatalogOrderHref(reference.categoryId, reference.id)}
          >
            Pesan model ini
          </Link>
          <Link
            className={smallAction}
            href={buildDesignStudioHref({ referenceId: reference.id })}
          >
            Kustomisasi
          </Link>
        </div>

        <p className="text-[0.625rem] leading-relaxed text-muted/80">{reference.sourceNote}</p>
      </div>
    </article>
  );
}

export function CatalogExplorer() {
  const [activeFilter, setActiveFilter] = useState<CatalogFilter>("all");
  const references = filterCatalogReferences(activeFilter);

  return (
    <div>
      <section className="shell pb-8 pt-12 sm:pt-16">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex max-w-2xl flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <p className="eyebrow">Katalog Jahit</p>
              <span className="rounded-full border border-cocoa/25 px-3 py-1 text-[0.625rem] font-medium uppercase tracking-[0.16em] text-cocoa">
                8 kategori · Tahap 2
              </span>
            </div>
            <h1 className="text-balance text-[2.2rem] leading-[1.1] text-espresso sm:text-[2.9rem]">
              Delapan kategori jahit, satu standar pengerjaan.
            </h1>
            <p className="max-w-xl text-pretty text-sm leading-relaxed text-muted sm:text-[0.95rem]">
              Telusuri acuan model dari dokumentasi Celmira Boutique, pahami karakter bahan, lalu
              mulai pesanan atau lanjutkan kustomisasi di Design Studio.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Link className={buttonClass("solid", "w-fit shrink-0")} href="/orders">
              Mulai Pesanan
              <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-1" />
            </Link>
            <a
              className="link-underline shrink-0"
              href="https://celmiraboutique.com/katalog"
              rel="noreferrer"
              target="_blank"
            >
              Katalog produk resmi
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </section>

      <div className="shell">
        <div className="flex flex-col gap-3 border-y border-cocoa/12 py-4">
          <div aria-label="Filter kategori katalog" className="flex flex-wrap gap-2" role="group">
            {catalogFilterOptions.map((option) => {
              const active = activeFilter === option.id;
              const count =
                option.id === "all"
                  ? celmiraDesignReferences.length
                  : countCatalogReferencesByCategory(option.id);

              return (
                <button
                  aria-pressed={active}
                  className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs transition-colors duration-300 ${
                    active
                      ? "border-cocoa bg-cocoa text-ivory"
                      : "border-cocoa/20 text-muted hover:border-cocoa/45 hover:text-espresso"
                  }`}
                  key={option.id}
                  onClick={() => setActiveFilter(option.id)}
                  type="button"
                >
                  <span className={`text-[0.5625rem] tracking-[0.16em] ${active ? "text-ivory/60" : "text-cocoa/50"}`}>
                    {option.index}
                  </span>
                  {option.label}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[0.5625rem] ${
                      active ? "bg-ivory/15 text-ivory" : "bg-cocoa/8 text-cocoa/70"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <p aria-live="polite" className="text-[0.6875rem] uppercase tracking-[0.14em] text-muted">
            Menampilkan {references.length} acuan model
            {activeFilter === "all"
              ? ""
              : ` · ${catalogFilterOptions.find((option) => option.id === activeFilter)?.label}`}
          </p>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {references.map((reference) => (
            <CatalogReferenceCard key={reference.id} reference={reference} />
          ))}
        </div>

        <p className="mt-6 max-w-2xl text-xs leading-relaxed text-muted/90">
          Katalog ini memuat acuan model untuk layanan jahit custom, bukan katalog produk jadi.
          Ketersediaan bahan, detail akhir, harga, dan estimasi pengerjaan ditentukan setelah
          konsultasi dengan tim Celmira.
        </p>
      </div>

      <section aria-labelledby="material-notes-title" className="shell pb-20 pt-16 sm:pb-24 sm:pt-20">
        <SectionHeading
          description="Panduan awal sebelum berkonsultasi. Karakter bahan memengaruhi jatuh kain, kenyamanan, dan detail yang bisa dikerjakan."
          eyebrow="Catatan Bahan"
          title={<span id="material-notes-title">Bahan menentukan jatuh dan kenyamanan.</span>}
        />

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {catalogMaterialNotes.map((note) => (
            <article
              className="flex flex-col gap-3 rounded-[1.5rem] border border-cocoa/12 bg-cream/40 p-5"
              key={note.material}
            >
              <h3 className="font-[family-name:var(--font-display)] text-lg leading-snug text-espresso">
                {note.material}
              </h3>
              <p className="text-[0.8125rem] leading-[1.75] text-muted">{note.description}</p>
              <p className="mt-auto border-t border-cocoa/10 pt-3 text-[0.625rem] uppercase tracking-[0.12em] text-cocoa/70">
                {note.recommendedFor}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-4 rounded-[1.5rem] border border-cocoa/15 bg-ivory/70 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <p className="max-w-xl text-sm leading-relaxed text-muted">
            Sudah punya gambaran desain? Susun kombinasi bahan, warna, dan detail di Design Studio,
            lalu ajukan bersama pesanan custom.
          </p>
          <Link className={buttonClass("outline", "w-fit shrink-0")} href="/design-studio">
            Buka Design Studio
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
