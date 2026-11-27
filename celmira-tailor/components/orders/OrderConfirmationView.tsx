"use client";

import Link from "next/link";
import { useEffect } from "react";
import { buttonClass } from "@/components/ui/ButtonLink";
import { ArrowRight, ChatIcon, CheckIcon } from "@/components/ui/icons";
import { buildChatHref } from "@/lib/chat";
import { markOrderVerifiedInSession } from "@/lib/storage/tailor-store";
import type { SubmittedOrder } from "@/lib/types/tailor";

type OrderConfirmationViewProps = {
  order: SubmittedOrder;
  onCreateAnother: () => void;
};

export function OrderConfirmationView({
  order,
  onCreateAnother,
}: OrderConfirmationViewProps) {
  useEffect(() => {
    markOrderVerifiedInSession(order.orderCode);
  }, [order.orderCode]);
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
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="text-[0.6875rem] uppercase tracking-[0.14em] text-muted">
                Kode Referensi Pesanan
              </p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-2xl text-espresso">
                {order.orderCode}
              </p>
            </div>
            <div>
              <p className="text-[0.6875rem] uppercase tracking-[0.14em] text-muted">
                Kode Akses Tracking
              </p>
              <p className="mt-1 font-mono text-lg font-semibold tracking-[0.16em] text-cocoa">
                {order.trackingAccessCode}
              </p>
            </div>
          </div>
          <span className="rounded-full border border-cocoa/25 bg-cream px-3 py-1 text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-cocoa">
            Menunggu Penawaran
          </span>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-muted">
          Simpan <strong className="font-medium text-espresso">Kode Referensi Pesanan</strong>{" "}
          beserta <strong className="font-medium text-espresso">Kode Akses Tracking</strong> (atau
          nomor WhatsApp terdaftar) untuk memantau status pesanan dan invoice di halaman Lacak
          Pesanan.
        </p>

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
        {order.persistenceMode === "cloudflare-d1" ? (
          <>
            <strong className="font-semibold text-espresso">Tersimpan di server Celmira Tailor:</strong>{" "}
            Pesanan Anda telah dicatat ke database server (Cloudflare D1) dan langsung terlihat di
            Panel Admin. Anda dapat memantau penawaran harga, invoice DP/pelunasan, dan progres
            produksi langsung dari halaman Lacak Pesanan di perangkat mana saja menggunakan Kode
            Referensi dan identitas verifikasi.
          </>
        ) : (
          <>
            <strong className="font-semibold text-espresso">Catatan penyimpanan lokal:</strong>{" "}
            Pengajuan ini tersimpan pada penyimpanan browser lokal perangkat Anda.
          </>
        )}
      </div>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Link
          className={buttonClass("solid")}
          href={`/track?code=${encodeURIComponent(order.orderCode)}`}
        >
          Lihat di Lacak Pesanan
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          className={buttonClass("outline")}
          href={buildChatHref({
            source: "orders",
            orderCode: order.orderCode,
            category: order.categoryId,
          })}
        >
          <ChatIcon className="h-4 w-4" />
          Tanya Pesanan di Chat
        </Link>
        <button className={buttonClass("outline")} onClick={onCreateAnother} type="button">
          Buat Pesanan Baru
        </button>
      </div>
    </div>
  );
}
