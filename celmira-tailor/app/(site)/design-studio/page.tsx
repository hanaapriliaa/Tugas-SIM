import type { Metadata } from "next";
import { Suspense } from "react";
import { DesignStudio } from "@/components/design-studio/DesignStudio";

export const metadata: Metadata = {
  title: "Design Studio",
  description:
    "Susun siluet, bahan, warna, dan detail busana custom Celmira Tailor secara visual, lalu simpan konfigurasi untuk diajukan bersama pesanan.",
};

export default function DesignStudioPage() {
  return (
    <Suspense
      fallback={
        <div className="shell py-16">
          <p className="text-sm text-muted">Memuat Design Studio Celmira Tailor...</p>
        </div>
      }
    >
      <DesignStudio />
    </Suspense>
  );
}
