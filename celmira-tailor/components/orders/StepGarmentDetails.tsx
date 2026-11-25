"use client";

import {
  buttonOptions,
  collarOptions,
  colorPaletteOptions,
  embroideryOptions,
  fabricOptions,
  laceOptions,
  lengthOptions,
  sleeveOptions,
  zipperOptions,
} from "@/lib/booking-options";
import type { GarmentSpecifications } from "@/lib/types/tailor";

type StepGarmentDetailsProps = {
  specifications: GarmentSpecifications;
  errors: Record<string, string>;
  onChange: (patch: Partial<GarmentSpecifications>) => void;
};

function OptionGroup({
  id,
  label,
  options,
  value,
  error,
  onSelect,
}: {
  id: string;
  label: string;
  options: readonly string[];
  value: string;
  error?: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <label className="text-xs font-semibold uppercase tracking-[0.16em] text-cocoa" htmlFor={id}>
        {label}
      </label>
      <div className="flex flex-wrap gap-2" id={id}>
        {options.map((option) => {
          const active = value === option;
          return (
            <button
              aria-pressed={active}
              className={`cursor-pointer rounded-full border px-4 py-2 text-xs transition-all duration-300 ${
                active
                  ? "border-espresso bg-espresso text-ivory"
                  : "border-cocoa/20 bg-ivory text-espresso hover:border-cocoa/50 hover:bg-cream/60"
              }`}
              key={option}
              onClick={() => onSelect(option)}
              type="button"
            >
              {option}
            </button>
          );
        })}
      </div>
      {error ? (
        <p className="text-xs text-espresso" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function StepGarmentDetails({
  specifications,
  errors,
  onChange,
}: StepGarmentDetailsProps) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="eyebrow">Langkah 2</p>
        <h2 className="text-2xl text-espresso sm:text-[1.75rem]">
          Detail kain, warna, potongan &amp; finishing
        </h2>
        <p className="text-sm leading-relaxed text-muted">
          Sesuaikan bahan, warna, lengan, kerah, panjang, hingga detail renda, bordir, kancing, dan
          resleting. Semua detail akan dikonfirmasi kembali bersama tim Celmira.
        </p>
      </div>

      {/* Jenis Kain */}
      <div className="flex flex-col gap-3 rounded-2xl border border-cocoa/12 bg-cream/35 p-5">
        <OptionGroup
          error={errors.fabric}
          id="spec-fabric"
          label="Pilihan Kain *"
          onSelect={(fabric) => onChange({ fabric })}
          options={fabricOptions}
          value={specifications.fabric}
        />

        <div>
          <label className="block text-xs font-medium text-muted" htmlFor="spec-fabric-note">
            Catatan kain tambahan (opsional — misal nama bahan khusus atau kain bawa sendiri)
          </label>
          <input
            className="mt-1.5 w-full rounded-xl border border-cocoa/20 bg-ivory px-3.5 py-2.5 text-sm text-espresso placeholder:text-muted/60 focus:border-espresso focus:outline-none"
            id="spec-fabric-note"
            onChange={(e) => onChange({ customFabricNote: e.target.value })}
            placeholder="Contoh: Brokat tile mutiara + furing maxmara adem"
            type="text"
            value={specifications.customFabricNote}
          />
        </div>
      </div>

      {/* Warna */}
      <div className="flex flex-col gap-3 rounded-2xl border border-cocoa/12 bg-cream/35 p-5">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-cocoa">
          Warna Utama *
        </span>
        <div className="flex flex-wrap items-center gap-3">
          {colorPaletteOptions.map((swatch) => {
            const active =
              specifications.colorName.toLowerCase() === swatch.name.toLowerCase();
            return (
              <button
                aria-label={swatch.name}
                aria-pressed={active}
                className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-all ${
                  active
                    ? "border-espresso bg-espresso text-ivory"
                    : "border-cocoa/20 bg-ivory text-espresso hover:border-cocoa/50"
                }`}
                key={swatch.name}
                onClick={() => onChange({ colorName: swatch.name, colorHex: swatch.hex })}
                type="button"
              >
                <span
                  className="h-4 w-4 rounded-full border border-cocoa/25"
                  style={{ backgroundColor: swatch.hex }}
                />
                {swatch.name}
              </button>
            );
          })}
        </div>

        <div className="mt-1 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <label className="block text-xs font-medium text-muted" htmlFor="spec-color-name">
              Nama warna pilihan / warna khusus
            </label>
            <input
              aria-invalid={Boolean(errors.colorName)}
              className="mt-1.5 w-full rounded-xl border border-cocoa/20 bg-ivory px-3.5 py-2.5 text-sm text-espresso placeholder:text-muted/60 focus:border-espresso focus:outline-none"
              id="spec-color-name"
              onChange={(e) => onChange({ colorName: e.target.value })}
              placeholder="Contoh: Dusty Rose, Champagne, atau Emerald"
              type="text"
              value={specifications.colorName}
            />
          </div>
          <label className="flex items-center gap-2.5 rounded-xl border border-cocoa/20 bg-ivory px-3 py-2 text-xs text-muted">
            <span>Swatches</span>
            <input
              aria-label="Pilih warna acuan"
              className="h-7 w-9 cursor-pointer border-0 bg-transparent p-0"
              onChange={(e) => onChange({ colorHex: e.target.value })}
              type="color"
              value={specifications.colorHex || "#d9bdb2"}
            />
          </label>
        </div>
        {errors.colorName ? (
          <p className="text-xs text-espresso" role="alert">
            {errors.colorName}
          </p>
        ) : null}
      </div>

      {/* Potongan Lengan, Kerah, Panjang */}
      <div className="flex flex-col gap-6 rounded-2xl border border-cocoa/12 bg-ivory p-5">
        <OptionGroup
          error={errors.sleeveStyle}
          id="spec-sleeve"
          label="Model Lengan *"
          onSelect={(sleeveStyle) => onChange({ sleeveStyle })}
          options={sleeveOptions}
          value={specifications.sleeveStyle}
        />

        <OptionGroup
          error={errors.collarStyle}
          id="spec-collar"
          label="Model Kerah *"
          onSelect={(collarStyle) => onChange({ collarStyle })}
          options={collarOptions}
          value={specifications.collarStyle}
        />

        <OptionGroup
          error={errors.lengthOption}
          id="spec-length"
          label="Panjang Busana *"
          onSelect={(lengthOption) => onChange({ lengthOption })}
          options={lengthOptions}
          value={specifications.lengthOption}
        />
      </div>

      {/* Detail Finishing */}
      <div className="flex flex-col gap-5 rounded-2xl border border-cocoa/12 bg-cream/35 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cocoa">
          Detail Finishing &amp; Pelengkap
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-espresso" htmlFor="spec-lace">
              Renda / Lace
            </label>
            <select
              className="mt-1.5 w-full rounded-xl border border-cocoa/25 bg-ivory px-3.5 py-2.5 text-sm text-espresso focus:border-espresso focus:outline-none"
              id="spec-lace"
              onChange={(e) => onChange({ laceDetail: e.target.value })}
              value={specifications.laceDetail}
            >
              {laceOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-espresso" htmlFor="spec-embroidery">
              Bordir / Payet
            </label>
            <select
              className="mt-1.5 w-full rounded-xl border border-cocoa/25 bg-ivory px-3.5 py-2.5 text-sm text-espresso focus:border-espresso focus:outline-none"
              id="spec-embroidery"
              onChange={(e) => onChange({ embroideryDetail: e.target.value })}
              value={specifications.embroideryDetail}
            >
              {embroideryOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-espresso" htmlFor="spec-buttons">
              Kancing
            </label>
            <select
              className="mt-1.5 w-full rounded-xl border border-cocoa/25 bg-ivory px-3.5 py-2.5 text-sm text-espresso focus:border-espresso focus:outline-none"
              id="spec-buttons"
              onChange={(e) => onChange({ buttonStyle: e.target.value })}
              value={specifications.buttonStyle}
            >
              {buttonOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-espresso" htmlFor="spec-zipper">
              Resleting
            </label>
            <select
              className="mt-1.5 w-full rounded-xl border border-cocoa/25 bg-ivory px-3.5 py-2.5 text-sm text-espresso focus:border-espresso focus:outline-none"
              id="spec-zipper"
              onChange={(e) => onChange({ zipperStyle: e.target.value })}
              value={specifications.zipperStyle}
            >
              {zipperOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-espresso" htmlFor="spec-notes">
            Catatan Khusus Penjahit (Opsional)
          </label>
          <textarea
            className="mt-1.5 min-h-[5.5rem] w-full rounded-xl border border-cocoa/25 bg-ivory px-3.5 py-2.5 text-sm text-espresso placeholder:text-muted/60 focus:border-espresso focus:outline-none"
            id="spec-notes"
            onChange={(e) => onChange({ notes: e.target.value })}
            placeholder="Contoh: Minta furing sampai bawah agar tidak menerawang, serta saku kanan tersembunyi."
            value={specifications.notes}
          />
        </div>
      </div>
    </div>
  );
}
