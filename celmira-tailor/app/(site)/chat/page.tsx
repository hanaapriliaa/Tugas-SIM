import type { Metadata } from "next";
import { PageIntro } from "@/components/ui/PageIntro";

export const metadata: Metadata = {
  title: "Chat",
  description:
    "Ruang diskusi Celmira Tailor untuk membahas desain, bahan, ukuran, dan detail pesanan jahit custom.",
};

export default function ChatPage() {
  return (
    <PageIntro
      description="Ruang chat akan menjadi tempat Anda berdiskusi langsung dengan tim Celmira mengenai model, bahan, ukuran, dan detail pesanan."
      eyebrow="Chat"
      note="Fitur chat belum aktif dan belum ada nomor kontak resmi yang dicantumkan di aplikasi ini. Untuk sementara, gunakan kanal resmi Celmira Boutique."
      planned={[
        {
          title: "Diskusi dengan tim",
          description:
            "Percakapan terhubung dengan pesanan agar konteksnya tidak hilang.",
        },
        {
          title: "Lampiran referensi",
          description:
            "Mengirim foto model atau detail jahitan sebagai acuan produksi.",
        },
        {
          title: "Riwayat percakapan",
          description:
            "Semua kesepakatan tersimpan rapi dan dapat dibuka kembali.",
        },
      ]}
      primaryCta={{ href: "/orders", label: "Mulai Pesanan" }}
      secondaryCta={{ href: "/", label: "Kembali ke Beranda" }}
      status="Tahap pengembangan"
      title="Diskusi yang tersimpan, detail yang tidak terlewat."
    />
  );
}
