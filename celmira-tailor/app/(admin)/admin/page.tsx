import type { Metadata } from "next";
import { AdminOrderManagement } from "@/components/admin/AdminOrderManagement";

export const metadata: Metadata = {
  title: "Admin — Pengelolaan Pesanan & Pembayaran",
  description:
    "Area pengelolaan internal Celmira Tailor untuk penawaran harga, verifikasi pembayaran DP & pelunasan, serta pembaruan tahapan produksi.",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminOrderManagement />;
}
