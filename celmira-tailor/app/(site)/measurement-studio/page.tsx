import type { Metadata } from "next";
import { PageIntro } from "@/components/ui/PageIntro";

export const metadata: Metadata = {
  title: "Measurement Studio",
  description:
    "Measurement Studio Celmira Tailor — panduan mengukur badan dengan urutan yang benar dan penyimpanan ukuran untuk pesanan berikutnya.",
};

export default function MeasurementStudioPage() {
  return (
    <PageIntro
      description="Measurement Studio akan memandu Anda mengukur badan langkah demi langkah, menyimpan hasilnya, dan melampirkan ukuran tersebut saat mengajukan pesanan."
      eyebrow="Measurement Studio"
      note="Belum ada data ukuran yang disimpan. Semua pengukuran pada tahap ini masih dilakukan bersama tim produksi."
      planned={[
        {
          title: "Panduan pengukuran",
          description:
            "Urutan lingkar badan, pinggang, panggul, bahu, lengan, dan panjang busana.",
        },
        {
          title: "Profil ukuran",
          description:
            "Menyimpan ukuran per anggota keluarga agar tidak perlu diulang setiap pesanan.",
        },
        {
          title: "Pemeriksaan tim produksi",
          description:
            "Hasil ukuran ditinjau kembali sebelum pemotongan bahan dilakukan.",
        },
      ]}
      primaryCta={{ href: "/orders", label: "Mulai Pesanan" }}
      secondaryCta={{ href: "/design-studio", label: "Design Studio" }}
      status="Tahap pengembangan"
      title="Ukuran yang tepat dimulai dari proses yang teliti."
    />
  );
}
