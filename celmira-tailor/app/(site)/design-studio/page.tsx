import type { Metadata } from "next";
import { PageIntro } from "@/components/ui/PageIntro";

export const metadata: Metadata = {
  title: "Design Studio",
  description:
    "Design Studio Celmira Tailor — susun siluet, bahan, warna, dan detail busana custom dalam satu tampilan.",
};

export default function DesignStudioPage() {
  return (
    <PageIntro
      description="Design Studio akan membantu Anda menyusun busana secara visual: memilih siluet, membandingkan bahan dan warna, lalu menyimpan ringkasan desain sebagai acuan konsultasi."
      eyebrow="Design Studio"
      note="Pratinjau antarmuka sudah tersedia di beranda. Penyimpanan desain belum aktif, sehingga belum ada data yang dikirim atau disimpan."
      planned={[
        {
          title: "Pemilihan siluet",
          description:
            "Kebaya, gamis, kemeja, blazer, hingga busana acara dengan detail yang dapat disesuaikan.",
        },
        {
          title: "Kombinasi bahan dan warna",
          description:
            "Membandingkan pilihan bahan serta warna dalam satu tampilan yang rapi.",
        },
        {
          title: "Ringkasan desain",
          description:
            "Hasil pilihan dirangkum menjadi catatan singkat untuk diajukan bersama pesanan.",
        },
      ]}
      primaryCta={{ href: "/orders", label: "Mulai Pesanan" }}
      secondaryCta={{ href: "/measurement-studio", label: "Measurement Studio" }}
      status="Tahap pengembangan"
      title="Rancang busana Anda sebelum jarum mulai bekerja."
    />
  );
}
