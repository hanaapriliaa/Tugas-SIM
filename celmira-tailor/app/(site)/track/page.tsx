import type { Metadata } from "next";
import { PageIntro } from "@/components/ui/PageIntro";

export const metadata: Metadata = {
  title: "Lacak Pesanan",
  description:
    "Pantau tahapan produksi pesanan jahit custom Celmira Tailor — dari pemotongan bahan hingga quality check.",
};

export default function TrackPage() {
  return (
    <PageIntro
      description="Halaman Lacak Pesanan akan menampilkan status produksi secara transparan, sehingga Anda tahu pesanan sedang berada di tahap mana."
      eyebrow="Lacak Pesanan"
      note="Belum ada sistem pesanan yang berjalan, sehingga belum ada kode pesanan yang dapat dilacak."
      planned={[
        {
          title: "Status per tahap",
          description:
            "Pemotongan bahan, penjahitan, finishing, quality check, dan pengiriman.",
        },
        {
          title: "Riwayat pesanan",
          description:
            "Daftar pesanan sebelumnya beserta catatan ukuran dan desain.",
        },
        {
          title: "Notifikasi",
          description:
            "Pemberitahuan ketika pesanan berpindah ke tahap berikutnya.",
        },
      ]}
      primaryCta={{ href: "/orders", label: "Mulai Pesanan" }}
      secondaryCta={{ href: "/chat", label: "Halaman Chat" }}
      status="Tahap pengembangan"
      title="Ikuti perjalanan busana Anda sampai selesai."
    />
  );
}
