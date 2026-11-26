import { formatDateTimeId } from "@/lib/order-tracking";
import type { OrderHistoryEvent } from "@/lib/types/tailor";

type OrderHistoryLogProps = {
  history: OrderHistoryEvent[];
  title?: string;
};

const ACTOR_LABELS: Record<OrderHistoryEvent["actor"], string> = {
  admin: "Admin Celmira",
  customer: "Pelanggan",
  system: "Sistem",
};

const CATEGORY_LABELS: Record<OrderHistoryEvent["category"], string> = {
  pesanan: "Pesanan",
  penawaran: "Penawaran",
  pembayaran: "Pembayaran",
  produksi: "Produksi",
  pengiriman: "Serah Terima",
  pembatalan: "Pembatalan",
};

export function OrderHistoryLog({
  history,
  title = "Riwayat Perubahan Status & Transaksi",
}: OrderHistoryLogProps) {
  const ordered = [...history].reverse();

  return (
    <section className="rounded-[1.75rem] border border-cocoa/14 bg-ivory p-6 sm:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-cocoa/10 pb-4">
        <div>
          <p className="text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-cocoa">
            Log Transparan
          </p>
          <h3 className="mt-1 font-[family-name:var(--font-display)] text-xl text-espresso">
            {title}
          </h3>
        </div>
        <span className="text-xs text-muted">{ordered.length} catatan tercatat</span>
      </div>

      {ordered.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Belum ada catatan riwayat pada pesanan ini.</p>
      ) : (
        <ol className="mt-5 space-y-4">
          {ordered.map((event, index) => (
            <li
              className="relative flex gap-4 pb-4 last:pb-0"
              key={event.id}
            >
              {index !== ordered.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="absolute left-[0.55rem] top-5 h-[calc(100%-0.75rem)] w-px bg-cocoa/15"
                />
              ) : null}
              <span
                aria-hidden="true"
                className={`mt-1.5 h-4 w-4 shrink-0 rounded-full border-2 ${
                  index === 0
                    ? "border-espresso bg-espresso"
                    : "border-cocoa/35 bg-cream"
                }`}
              />
              <div className="min-w-0 flex-1 rounded-2xl border border-cocoa/10 bg-cream/45 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-cocoa/15 bg-ivory px-2.5 py-0.5 text-[0.625rem] font-medium uppercase tracking-[0.12em] text-cocoa">
                      {CATEGORY_LABELS[event.category]}
                    </span>
                    <span className="text-[0.6875rem] font-medium text-muted">
                      oleh {ACTOR_LABELS[event.actor]}
                    </span>
                  </div>
                  <time className="text-[0.6875rem] text-muted">
                    {formatDateTimeId(event.timestamp)}
                  </time>
                </div>
                <p className="mt-2 text-sm font-medium text-espresso">{event.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">{event.description}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
