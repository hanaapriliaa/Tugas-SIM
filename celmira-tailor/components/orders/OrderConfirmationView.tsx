"use client";

import Link from "next/link";
import { buttonClass } from "@/components/ui/ButtonLink";
import { ArrowRight, CheckIcon } from "@/components/ui/icons";
import type { SubmittedOrder } from "@/lib/types/tailor";

type OrderConfirmationViewProps = {
  order: SubmittedOrder;
  onCreateAnother: () => void;
};

export function OrderConfirmationView({
  order,
  onCreateAnother,
}: OrderConfirmationViewProps) {
  return (
    <div className="mx-auto max-w-3xl rounded-[2rem] border border-cocoa/15 bg-cream/55 p-7 sm:p-10">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-espresso text-ivory">
          <CheckIcon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-cocoa">
            Pengajuan Tersimpan
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-espresso sm:text-3xl">
            Pesanan custom siap ditinjau
          </h2>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-cocoa/15 bg-ivory p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-cocoa/10 pb-4">
          <div>
            <p className="text-[0.6875rem] uppercase tracking-[0.14em] text-muted">
              Kode Referensi Pesanan
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-2xl text-espresso">
              {order.orderCode}
            </p>
          </div>
          <span className="rounded-full border border-cocoa/25 bg-cream px-3 py-1 text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-cocoa">
            Menunggu Penawaran
          </span>
        </div>

        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted">Kategori</dt>
            <dd className="font-medium text-espresso">{order.categoryName}</dd>
          </div>
          <div>
            <dt className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted">Desain</dt>
            <dd className="font-medium text-espresso">{order.designTitle}</dd>
          </div>
          <div>
            <dt className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted">Pelanggan</dt>
            <dd className="text-espresso">
              {order.customer.fullName} ({order.customer.whatsapp})
            </dd>
          </div>
          <div>
            <dt className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted">
              Target Selesai
            </dt>
            <dd className="text-espresso">{order.targetDate}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-5 rounded-2xl border border-cocoa/15 bg-ivory/80 p-4 text-xs leading-relaxed text-muted">
        <strong className="font-semibold text-espresso">Catatan penyimpanan lokal:</strong>{" "}
        Pengajuan ini tersimpan pada penyimpanan browser lokal perangkat Anda untuk alur aplikasi
        saat ini. Integrasi server, database PostgreSQL, dan notifikasi WhatsApp resmi akan aktif
        pada tahap backend.
      </div>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link className={buttonClass("solid")} href="/track">
          Lihat di Lacak Pesanan
          <ArrowRight className="h-4 w-4" />
        </Link>
        <button className={buttonClass("outline")} onClick={onCreateAnother} type="button">
          Buat Pesanan Baru
        </button>
      </div>
    </div>
  );
}
