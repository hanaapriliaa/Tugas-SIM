import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminDashboardShell } from "@/components/admin/AdminDashboardShell";

export const metadata: Metadata = {
  title: "Admin — Pengelolaan Pesanan, Pembayaran & Chat",
  description:
    "Area pengelolaan internal Celmira Tailor untuk penawaran harga, verifikasi pembayaran DP & pelunasan, tahapan produksi, dan balasan chat pelanggan.",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="shell py-16">
          <p className="text-sm text-muted">Memuat Dashboard Admin Celmira Tailor...</p>
        </div>
      }
    >
      <AdminDashboardShell />
    </Suspense>
  );
}
