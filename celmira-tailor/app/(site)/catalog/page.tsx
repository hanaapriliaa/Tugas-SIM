import type { Metadata } from "next";
import { PageIntro } from "@/components/ui/PageIntro";

export const metadata: Metadata = {
  title: "Katalog Jahit",
  description:
    "Kategori layanan jahit custom Celmira Tailor: kebaya, gamis, kemeja pria, blazer, mukena, busana wisuda, busana pernikahan, dan custom lainnya.",
};

export default function CatalogPage() {
  return (
    <PageIntro
      description="Katalog Jahit akan menjadi tempat Anda menelusuri kategori layanan, melihat referensi model, dan memahami pilihan bahan sebelum berkonsultasi."
      eyebrow="Katalog Jahit"
      note="Katalog produk jadi Celmira Boutique tetap dapat dilihat di situs resmi. Halaman ini disiapkan khusus untuk layanan jahit custom."
      planned={[
        {
          title: "Filter kategori layanan",
          description:
            "Menelusuri delapan kategori jahit dengan deskripsi kebutuhan yang jelas.",
        },
        {
          title: "Referensi model",
          description:
            "Contoh potongan dan detail dari dokumentasi resmi Celmira Boutique.",
        },
        {
          title: "Catatan bahan",
          description:
            "Panduan karakter bahan agar pilihan sesuai pemakaian dan cuaca.",
        },
      ]}
      primaryCta={{ href: "/orders", label: "Mulai Pesanan" }}
      secondaryCta={{ href: "/", label: "Kembali ke Beranda" }}
      status="Tahap pengembangan"
      title="Delapan kategori jahit, satu standar pengerjaan."
    />
  );
}
