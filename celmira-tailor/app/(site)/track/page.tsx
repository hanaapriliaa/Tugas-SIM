import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderTrackingWorkspace } from "@/components/track/OrderTrackingWorkspace";

export const metadata: Metadata = {
  title: "Lacak Pesanan & Invoice",
  description:
    "Pantau tahapan produksi pesanan jahit custom Celmira Tailor, tinjau penawaran harga, invoice DP 50%, dan invoice pelunasan secara transparan.",
};

export default function TrackPage() {
  return (
    <Suspense
      fallback={
        <div className="shell py-16">
          <p className="text-sm text-muted">Memuat halaman Lacak Pesanan...</p>
        </div>
      }
    >
      <OrderTrackingWorkspace />
    </Suspense>
  );
}
