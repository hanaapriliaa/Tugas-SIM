import type { Metadata } from "next";
import { PageIntro } from "@/components/ui/PageIntro";

export const metadata: Metadata = {
  title: "Mulai Pesanan",
  description:
    "Ajukan pesanan jahit custom Celmira Tailor — pilih desain, atur detail, masukkan ukuran, lalu kirim untuk penawaran.",
};

export default function OrdersPage() {
  return (
    <PageIntro
      description="Halaman ini akan menjadi pintu masuk pengajuan pesanan custom: ringkasan desain, detail bahan dan warna, ukuran, serta catatan tenggat pemakaian."
      eyebrow="Pesanan"
      note="Belum ada pesanan, pembayaran, atau akun yang dibuat pada tahap ini. Formulir pengajuan akan tersedia setelah tahap fondasi selesai."
      planned={[
        {
          title: "Formulir pesanan",
          description:
            "Kategori layanan, model, bahan, warna, dan detail finishing dalam satu alur.",
        },
        {
          title: "Ukuran dan referensi",
          description:
            "Lampiran ukuran dari Measurement Studio serta foto referensi model.",
        },
        {
          title: "Penawaran dan status",
          description:
            "Peninjauan oleh tim Celmira, penawaran, lalu pemantauan proses produksi.",
        },
      ]}
      primaryCta={{ href: "/measurement-studio", label: "Siapkan Ukuran" }}
      secondaryCta={{ href: "/catalog", label: "Lihat Katalog Jahit" }}
      status="Tahap pengembangan"
      title="Tujuh langkah, satu pesanan yang terukur."
    />
  );
}
