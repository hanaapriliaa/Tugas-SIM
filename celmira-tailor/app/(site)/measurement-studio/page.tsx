import type { Metadata } from "next";
import { Suspense } from "react";
import { MeasurementStudio } from "@/components/measurement-studio/MeasurementStudio";

export const metadata: Metadata = {
  title: "Measurement Studio",
  description:
    "Measurement Studio Celmira Tailor — mannequin 2D interaktif, panduan mengukur badan dalam cm, template kategori pakaian, dan penyimpanan profil ukuran untuk pesanan custom.",
};

export default function MeasurementStudioPage() {
  return (
    <Suspense
      fallback={
        <div className="shell py-16">
          <p className="text-sm text-muted">Memuat Measurement Studio Celmira Tailor...</p>
        </div>
      }
    >
      <MeasurementStudio />
    </Suspense>
  );
}
