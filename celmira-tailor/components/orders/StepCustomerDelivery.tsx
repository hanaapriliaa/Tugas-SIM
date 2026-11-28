"use client";

import { getMinimumTargetDate } from "@/lib/booking-validation";
import { formatDateOnlyId } from "@/lib/order-tracking";
import { site } from "@/lib/site";
import { ArrowUpRight, PinIcon } from "@/components/ui/icons";
import type {
  BlockedProductionDate,
  CustomerIdentity,
  DeliveryDetails,
  DeliveryMethod,
  GarmentCategoryId,
} from "@/lib/types/tailor";

export type PublicProductionScheduleInfo = {
  standardLeadDays: number;
  categoryLeadDays: Partial<Record<GarmentCategoryId, number>>;
  blockedDates: BlockedProductionDate[];
  operationalNote: string;
};

type StepCustomerDeliveryProps = {
  categoryId?: GarmentCategoryId | "";
  customer: CustomerIdentity;
  delivery: DeliveryDetails;
  targetDate: string;
  productionSchedule?: PublicProductionScheduleInfo | null;
  errors: Record<string, string>;
  onChangeCustomer: (patch: Partial<CustomerIdentity>) => void;
  onChangeDelivery: (patch: Partial<DeliveryDetails>) => void;
  onChangeTargetDate: (date: string) => void;
};

export function StepCustomerDelivery({
  categoryId,
  customer,
  delivery,
  targetDate,
  productionSchedule,
  errors,
  onChangeCustomer,
  onChangeDelivery,
  onChangeTargetDate,
}: StepCustomerDeliveryProps) {
  const minDate = getMinimumTargetDate();
  const recommendedLeadDays =
    (categoryId && productionSchedule?.categoryLeadDays?.[categoryId]) ||
    productionSchedule?.standardLeadDays ||
    null;
  const blockedDates = productionSchedule?.blockedDates ?? [];
  const blockedMatch = targetDate
    ? blockedDates.find((item) => item.date === targetDate)
    : undefined;

  const deliveryOptions: Array<{ id: DeliveryMethod; title: string; subtitle: string }> = [
    {
      id: "pickup",
      title: "Ambil di Butik Celmira",
      subtitle: "Fitting langsung atau ambil di Official Store Yogyakarta",
    },
    {
      id: "shipping",
      title: "Kirim ke Alamat",
      subtitle: "Dikirim setelah pelunasan; ongkos kirim ditagihkan terpisah",
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="eyebrow">Langkah 4</p>
        <h2 className="text-2xl text-espresso sm:text-[1.75rem]">
          Identitas, penyerahan &amp; target selesai
        </h2>
        <p className="text-sm leading-relaxed text-muted">
          Data ini digunakan untuk menghubungi Anda saat penawaran siap serta mengatur pengambilan
          atau pengiriman busana.
        </p>
      </div>

      {/* Identitas Pelanggan */}
      <div className="flex flex-col gap-4 rounded-2xl border border-cocoa/15 bg-cream/35 p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cocoa">
          Identitas Pelanggan
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-espresso" htmlFor="cust-name">
              Nama Lengkap *
            </label>
            <input
              aria-invalid={Boolean(errors.fullName)}
              autoComplete="name"
              className="mt-1.5 w-full rounded-xl border border-cocoa/25 bg-ivory px-4 py-2.5 text-sm text-espresso placeholder:text-muted/60 focus:border-espresso focus:outline-none"
              id="cust-name"
              onChange={(e) => onChangeCustomer({ fullName: e.target.value })}
              placeholder="Nama lengkap pemesan"
              type="text"
              value={customer.fullName}
            />
            {errors.fullName ? (
              <p className="mt-1 text-xs text-espresso" role="alert">
                {errors.fullName}
              </p>
            ) : null}
          </div>

          <div>
            <label className="block text-xs font-medium text-espresso" htmlFor="cust-wa">
              Nomor WhatsApp Aktif *
            </label>
            <input
              aria-invalid={Boolean(errors.whatsapp)}
              autoComplete="tel"
              className="mt-1.5 w-full rounded-xl border border-cocoa/25 bg-ivory px-4 py-2.5 text-sm text-espresso placeholder:text-muted/60 focus:border-espresso focus:outline-none"
              id="cust-wa"
              inputMode="tel"
              onChange={(e) => onChangeCustomer({ whatsapp: e.target.value })}
              placeholder="081234567890"
              type="tel"
              value={customer.whatsapp}
            />
            {errors.whatsapp ? (
              <p className="mt-1 text-xs text-espresso" role="alert">
                {errors.whatsapp}
              </p>
            ) : null}
          </div>

          <div>
            <label className="block text-xs font-medium text-espresso" htmlFor="cust-email">
              Email (Opsional)
            </label>
            <input
              aria-invalid={Boolean(errors.email)}
              autoComplete="email"
              className="mt-1.5 w-full rounded-xl border border-cocoa/25 bg-ivory px-4 py-2.5 text-sm text-espresso placeholder:text-muted/60 focus:border-espresso focus:outline-none"
              id="cust-email"
              onChange={(e) => onChangeCustomer({ email: e.target.value })}
              placeholder="nama@email.com"
              type="email"
              value={customer.email}
            />
            {errors.email ? (
              <p className="mt-1 text-xs text-espresso" role="alert">
                {errors.email}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Pengambilan atau Pengiriman */}
      <div className="flex flex-col gap-4 rounded-2xl border border-cocoa/15 bg-ivory p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cocoa">
          Metode Penyerahan Busana *
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {deliveryOptions.map((opt) => {
            const active = delivery.method === opt.id;
            return (
              <button
                aria-pressed={active}
                className={`cursor-pointer rounded-2xl border p-4 text-left transition-all ${
                  active
                    ? "border-espresso bg-espresso text-ivory"
                    : "border-cocoa/20 bg-cream/35 text-espresso hover:border-cocoa/45"
                }`}
                key={opt.id}
                onClick={() => onChangeDelivery({ method: opt.id })}
                type="button"
              >
                <span className="block text-sm font-medium">{opt.title}</span>
                <span
                  className={`mt-1 block text-xs leading-relaxed ${
                    active ? "text-ivory/80" : "text-muted"
                  }`}
                >
                  {opt.subtitle}
                </span>
              </button>
            );
          })}
        </div>

        {delivery.method === "pickup" ? (
          <div className="flex items-start gap-3 rounded-xl border border-cocoa/12 bg-cream/55 p-4 text-sm">
            <PinIcon className="mt-0.5 h-4 w-4 shrink-0 text-cocoa" />
            <div>
              <p className="font-medium text-espresso">{site.location.label} Celmira Boutique</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                {site.location.address[0]}, {site.location.address[1]}
              </p>
              <a
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-cocoa underline underline-offset-4 hover:text-espresso"
                href={site.location.mapsUrl}
                rel="noreferrer"
                target="_blank"
              >
                Buka lokasi di Maps
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 rounded-xl border border-cocoa/12 bg-cream/40 p-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-espresso" htmlFor="deliv-address">
                Alamat Lengkap Pengiriman *
              </label>
              <textarea
                aria-invalid={Boolean(errors.addressLine)}
                className="mt-1.5 min-h-[4.5rem] w-full rounded-xl border border-cocoa/25 bg-ivory px-3.5 py-2.5 text-sm text-espresso placeholder:text-muted/60 focus:border-espresso focus:outline-none"
                id="deliv-address"
                onChange={(e) => onChangeDelivery({ addressLine: e.target.value })}
                placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan, dan kecamatan"
                value={delivery.addressLine}
              />
              {errors.addressLine ? (
                <p className="mt-1 text-xs text-espresso" role="alert">
                  {errors.addressLine}
                </p>
              ) : null}
            </div>

            <div>
              <label className="block text-xs font-medium text-espresso" htmlFor="deliv-city">
                Kota / Kabupaten *
              </label>
              <input
                aria-invalid={Boolean(errors.city)}
                className="mt-1.5 w-full rounded-xl border border-cocoa/25 bg-ivory px-3.5 py-2.5 text-sm text-espresso placeholder:text-muted/60 focus:border-espresso focus:outline-none"
                id="deliv-city"
                onChange={(e) => onChangeDelivery({ city: e.target.value })}
                placeholder="Contoh: Sleman, D.I. Yogyakarta"
                type="text"
                value={delivery.city}
              />
              {errors.city ? (
                <p className="mt-1 text-xs text-espresso" role="alert">
                  {errors.city}
                </p>
              ) : null}
            </div>

            <div>
              <label className="block text-xs font-medium text-espresso" htmlFor="deliv-postal">
                Kode Pos (Opsional)
              </label>
              <input
                aria-invalid={Boolean(errors.postalCode)}
                className="mt-1.5 w-full rounded-xl border border-cocoa/25 bg-ivory px-3.5 py-2.5 text-sm text-espresso placeholder:text-muted/60 focus:border-espresso focus:outline-none"
                id="deliv-postal"
                inputMode="numeric"
                maxLength={5}
                onChange={(e) => onChangeDelivery({ postalCode: e.target.value })}
                placeholder="55571"
                type="text"
                value={delivery.postalCode}
              />
              {errors.postalCode ? (
                <p className="mt-1 text-xs text-espresso" role="alert">
                  {errors.postalCode}
                </p>
              ) : null}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-espresso" htmlFor="deliv-courier">
                Catatan Kurir / Pengemasan (Opsional)
              </label>
              <input
                className="mt-1.5 w-full rounded-xl border border-cocoa/25 bg-ivory px-3.5 py-2.5 text-sm text-espresso placeholder:text-muted/60 focus:border-espresso focus:outline-none"
                id="deliv-courier"
                onChange={(e) => onChangeDelivery({ courierNote: e.target.value })}
                placeholder="Contoh: Preferensi ekspedisi reguler/instan"
                type="text"
                value={delivery.courierNote}
              />
              <p className="mt-2 text-xs text-muted">
                Biaya pengiriman dipisahkan dari biaya jahit dan ditagihkan bersama pelunasan 50%
                setelah pengerjaan selesai.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Target Tanggal Selesai */}
      <div className="flex flex-col gap-3 rounded-2xl border border-cocoa/15 bg-cream/35 p-5 sm:p-6">
        <label
          className="text-xs font-semibold uppercase tracking-[0.16em] text-cocoa"
          htmlFor="target-date"
        >
          Target Tanggal Selesai / Dipakai *
        </label>
        <input
          aria-invalid={Boolean(errors.targetDate)}
          className="w-full max-w-xs rounded-xl border border-cocoa/25 bg-ivory px-4 py-2.5 text-sm text-espresso focus:border-espresso focus:outline-none"
          id="target-date"
          min={minDate}
          onChange={(e) => onChangeTargetDate(e.target.value)}
          type="date"
          value={targetDate}
        />
        <p className="text-xs leading-relaxed text-muted">
          Tanggal ini menjadi acuan kebutuhan acara Anda. Kepastian jadwal penyelesaian mengikuti
          kapasitas produksi saat penawaran dikonfirmasi tim Celmira.
          {recommendedLeadDays ? (
            <>
              {" "}
              Estimasi pengerjaan standar kategori ini sekitar{" "}
              <strong className="text-espresso">{recommendedLeadDays} hari kerja</strong>.
            </>
          ) : null}
        </p>

        {productionSchedule?.operationalNote ? (
          <p className="rounded-xl border border-cocoa/15 bg-ivory px-3.5 py-2.5 text-xs leading-relaxed text-espresso">
            <strong className="font-semibold">Info Jadwal Celmira:</strong>{" "}
            {productionSchedule.operationalNote}
          </p>
        ) : null}

        {blockedDates.length > 0 ? (
          <div className="rounded-xl border border-cocoa/15 bg-ivory px-3.5 py-2.5 text-xs text-muted">
            <p className="font-medium text-espresso">Tanggal libur / slot penuh (tidak tersedia):</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {blockedDates.slice(0, 8).map((item) => (
                <span
                  className="rounded-full border border-cocoa/20 bg-cream/60 px-2.5 py-0.5 text-[0.6875rem] text-espresso"
                  key={item.date}
                >
                  {formatDateOnlyId(item.date)} · {item.reason}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {blockedMatch ? (
          <p
            className="rounded-xl border border-rose/45 bg-rose/10 px-3.5 py-2 text-xs font-medium text-espresso"
            role="alert"
          >
            Tanggal {formatDateOnlyId(blockedMatch.date)} tidak tersedia ({blockedMatch.reason}).
            Silakan pilih tanggal target lainnya.
          </p>
        ) : null}

        {errors.targetDate ? (
          <p className="text-xs text-espresso" role="alert">
            {errors.targetDate}
          </p>
        ) : null}
      </div>
    </div>
  );
}
