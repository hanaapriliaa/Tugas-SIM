import { CheckIcon, LockIcon, TruckIcon } from "@/components/ui/icons";
import {
  PRODUCTION_STAGES,
  formatDateOnlyId,
  formatDateTimeId,
  getProductionStageIndex,
  isPaymentVerified,
} from "@/lib/order-tracking";
import { site } from "@/lib/site";
import type { SubmittedOrder } from "@/lib/types/tailor";

type ProductionTimelineProps = {
  order: SubmittedOrder;
};

export function ProductionTimeline({ order }: ProductionTimelineProps) {
  const currentIndex = getProductionStageIndex(order.productionStage);
  const dpVerified = isPaymentVerified(order, "dp");
  const settlementVerified = isPaymentVerified(order, "pelunasan");
  const isCancelled = order.status === "dibatalkan";
  const isCompleted = order.status === "selesai";

  return (
    <section className="rounded-[1.75rem] border border-cocoa/14 bg-ivory p-6 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-cocoa/10 pb-5">
        <div>
          <p className="text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-cocoa">
            Tahapan Produksi & Serah Terima
          </p>
          <h3 className="mt-1 font-[family-name:var(--font-display)] text-xl text-espresso sm:text-2xl">
            Progres Pengerjaan Busana
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Setiap tahapan diperbarui langsung oleh admin Celmira Tailor berdasarkan progres nyata
            di butik.
          </p>
        </div>

        <div className="rounded-2xl border border-cocoa/14 bg-cream/65 px-4 py-3 text-right">
          <p className="text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-cocoa">
            Estimasi Penyelesaian
          </p>
          <p className="mt-1 text-sm font-medium text-espresso">
            {formatDateOnlyId(order.estimatedCompletionDate)}
          </p>
          <p className="mt-0.5 text-[0.6875rem] text-muted">
            Target pelanggan: {formatDateOnlyId(order.targetDate)}
          </p>
        </div>
      </div>

      {isCancelled ? (
        <div className="mt-5 rounded-2xl border border-red-800/20 bg-red-50/80 p-4 text-xs leading-relaxed text-red-900">
          <strong className="font-semibold">Pesanan dibatalkan:</strong>{" "}
          {order.cancellationReason || "Dibatalkan oleh admin."}
          {order.cancelledAt ? ` (${formatDateTimeId(order.cancelledAt)})` : ""}
        </div>
      ) : null}

      {!isCancelled && !dpVerified ? (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-cocoa/15 bg-cream/70 p-4 text-xs leading-relaxed text-muted">
          <LockIcon className="mt-0.5 h-4 w-4 shrink-0 text-cocoa" />
          <p>
            <strong className="font-medium text-espresso">Produksi belum dimulai.</strong> Sesuai
            aturan Celmira Tailor, persiapan bahan dan penjahitan baru dapat dimulai setelah
            pembayaran DP 50% diverifikasi secara manual oleh admin.
          </p>
        </div>
      ) : null}

      <ol className="mt-6 space-y-3">
        {PRODUCTION_STAGES.map((stage, index) => {
          const isReached =
            !isCancelled && (isCompleted ? true : index < currentIndex);
          const isCurrent = !isCancelled && !isCompleted && index === currentIndex;
          const isLockedByDp = !isCancelled && stage.requiresDpVerified && !dpVerified;
          const isLockedBySettlement =
            !isCancelled && stage.requiresSettlementVerified && !settlementVerified;
          const isLocked = isLockedByDp || isLockedBySettlement;

          const stageTimestamp = [...order.history]
            .reverse()
            .find((event) => event.productionStage === stage.id)?.timestamp;

          return (
            <li
              className={`relative flex gap-4 rounded-2xl border p-4 transition-colors ${
                isCurrent
                  ? "border-espresso/35 bg-cream/90"
                  : isReached
                    ? "border-cocoa/15 bg-ivory"
                    : "border-cocoa/10 bg-ivory/60"
              }`}
              key={stage.id}
            >
              <div className="flex flex-col items-center">
                <span
                  className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                    isReached
                      ? "border-espresso bg-espresso text-ivory"
                      : isCurrent
                        ? "border-espresso bg-cream text-espresso ring-4 ring-blush/35"
                        : "border-cocoa/20 bg-cream/50 text-muted"
                  }`}
                >
                  {isReached ? (
                    <CheckIcon className="h-4 w-4" />
                  ) : isLocked ? (
                    <LockIcon className="h-3.5 w-3.5" />
                  ) : (
                    stage.step
                  )}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-cocoa">
                      Tahap {stage.step}
                    </span>
                    <h4
                      className={`font-[family-name:var(--font-sans)] text-sm font-semibold ${
                        isCurrent || isReached ? "text-espresso" : "text-muted"
                      }`}
                    >
                      {stage.label}
                    </h4>
                  </div>

                  {isCurrent ? (
                    <span className="rounded-full bg-espresso px-2.5 py-0.5 text-[0.625rem] font-medium uppercase tracking-[0.14em] text-ivory">
                      Tahap Aktif
                    </span>
                  ) : isReached ? (
                    <span className="text-[0.6875rem] font-medium text-emerald-800">
                      Selesai{stageTimestamp ? ` · ${formatDateTimeId(stageTimestamp)}` : ""}
                    </span>
                  ) : isLockedByDp ? (
                    <span className="text-[0.6875rem] text-muted">Menunggu DP terverifikasi</span>
                  ) : isLockedBySettlement ? (
                    <span className="text-[0.6875rem] text-muted">
                      Menunggu pelunasan terverifikasi
                    </span>
                  ) : (
                    <span className="text-[0.6875rem] text-muted">Menunggu giliran</span>
                  )}
                </div>

                <p className="mt-1.5 text-xs leading-relaxed text-muted">{stage.description}</p>
              </div>
            </li>
          );
        })}
      </ol>

      {(order.courierName ||
        order.trackingNumber ||
        order.pickupReadyNote ||
        order.productionStage === "dalam_pengiriman_atau_siap_diambil" ||
        order.productionStage === "pesanan_selesai") && (
        <div className="mt-6 rounded-2xl border border-cocoa/18 bg-cream/65 p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-cocoa">
            <TruckIcon className="h-4 w-4" />
            <span>
              {order.delivery.method === "shipping"
                ? "Informasi Pengiriman"
                : "Informasi Pengambilan di Butik"}
            </span>
          </div>

          {order.delivery.method === "shipping" ? (
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted">
                  Jasa Pengiriman
                </dt>
                <dd className="mt-0.5 font-medium text-espresso">
                  {order.courierName || "Menunggu input admin"}
                </dd>
              </div>
              <div>
                <dt className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted">
                  Nomor Resi
                </dt>
                <dd className="mt-0.5 font-mono text-sm font-medium text-espresso">
                  {order.trackingNumber || "Belum tersedia"}
                </dd>
              </div>
              <div>
                <dt className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted">
                  Alamat Tujuan
                </dt>
                <dd className="mt-0.5 text-xs leading-relaxed text-espresso">
                  {order.delivery.addressLine}, {order.delivery.city}
                  {order.delivery.postalCode ? ` ${order.delivery.postalCode}` : ""}
                </dd>
              </div>
            </dl>
          ) : (
            <div className="mt-3 space-y-1 text-xs leading-relaxed text-espresso">
              <p className="font-medium">{site.location.address.join(", ")}</p>
              {order.pickupReadyNote ? (
                <p className="text-muted">Catatan admin: {order.pickupReadyNote}</p>
              ) : null}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
