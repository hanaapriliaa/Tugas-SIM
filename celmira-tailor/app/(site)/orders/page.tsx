import type { Metadata } from "next";
import { Suspense } from "react";
import { CustomerBookingFlow } from "@/components/orders/CustomerBookingFlow";

export const metadata: Metadata = {
  title: "Mulai Pesanan",
  description:
    "Ajukan pesanan jahit custom Celmira Tailor — pilih kategori, desain atau unggah referensi, atur bahan, warna, ukuran, dan jadwal selesai.",
};

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="shell py-16">
          <p className="text-sm text-muted">Memuat formulir pemesanan Celmira Tailor...</p>
        </div>
      }
    >
      <CustomerBookingFlow />
    </Suspense>
  );
}
