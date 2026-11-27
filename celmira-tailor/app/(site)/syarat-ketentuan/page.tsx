import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/ui/PageIntro";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan",
  description:
    "Syarat dan ketentuan layanan jahit custom Celmira Tailor mengenai pengajuan pesanan, penawaran harga, DP 50%, verifikasi manual, ukuran, dan pengiriman.",
};

const termsSections = [
  {
    title: "1. Pengajuan Pesanan & Penawaran Harga",
    points: [
      "Pengajuan pesanan custom melalui halaman Pemesanan bersifat permintaan peninjauan dan belum menimbulkan kewajiban pembayaran otomatis.",
      "Tim admin Celmira Tailor akan meninjau desain, bahan, detail pengerjaan, serta ukuran sebelum menetapkan dan mengirimkan penawaran biaya jahit akhir serta estimasi tanggal selesai.",
      "Pelanggan berhak menyetujui atau menolak penawaran melalui halaman Lacak Pesanan.",
    ],
  },
  {
    title: "2. Skema Pembayaran DP 50% & Batas Waktu 24 Jam",
    points: [
      "Setelah penawaran disetujui pelanggan, Invoice DP sebesar 50% dari biaya jahit diterbitkan dengan batas waktu pembayaran 24 jam (atau sesuai pengaturan resmi pada invoice).",
      "Pembayaran dilakukan melalui QRIS resmi Celmira Boutique yang tampil pada invoice, dan pelanggan wajib mengunggah bukti pembayaran pada halaman Lacak Pesanan.",
      "Seluruh bukti pembayaran diverifikasi secara manual oleh admin — sistem tidak menganggap pembayaran lunas secara otomatis tanpa pemeriksaan admin.",
      "Apabila batas waktu DP terlewati tanpa unggahan bukti pembayaran, status pesanan berubah menjadi Perlu Tinjauan Admin. Jika pelanggan sudah mengunggah bukti pembayaran sebelum tenggat, pesanan tidak dibatalkan otomatis selama menunggu verifikasi admin.",
    ],
  },
  {
    title: "3. Produksi & Snapshot Ukuran",
    points: [
      "Proses produksi (10 tahap produksi Celmira Tailor) hanya dimulai setelah pembayaran DP 50% berstatus terverifikasi oleh admin.",
      "Pratinjau siluet pada Design Studio dan mannequin 2D pada Measurement Studio berfungsi sebagai ilustrasi acuan, bukan foto hasil akhir busana.",
      "Saat pesanan diajukan, angka ukuran dan detail desain dikunci sebagai snapshot khusus pesanan tersebut. Perubahan profil ukuran di Measurement Studio pada kemudian hari tidak mengubah ukuran pesanan yang sudah diajukan.",
      "Tim produksi tetap meninjau kelayakan ukuran sebelum pemotongan bahan dan dapat menghubungi pelanggan melalui Chat bila diperlukan klarifikasi.",
    ],
  },
  {
    title: "4. Pelunasan & Penyerahan / Pengiriman",
    points: [
      "Setelah jahitan selesai dan lulus tahap Finishing & Quality Control, admin menerbitkan Invoice Pelunasan sebesar sisa 50% biaya jahit.",
      "Biaya pengiriman (jika memilih metode kirim kurir) dipisahkan dari biaya jahit dan ditagihkan pada tahap pelunasan. Pengambilan langsung di Official Store Celmira Boutique tidak dikenakan biaya pengiriman (Rp 0).",
      "Pesanan hanya diserahkan atau dikirim dengan nomor resi resmi setelah bukti pelunasan diverifikasi manual oleh admin.",
    ],
  },
  {
    title: "5. Ketentuan Tambahan & Konsultasi",
    points: [
      "Hal-hal teknis khusus di luar alur standar di atas (seperti penyesuaian jadwal mendesak, perubahan detail setelah produksi dimulai, atau penanganan kendala pengiriman) disepakati secara tertulis bersama admin melalui Chat Pelanggan.",
      `Ketentuan ini merangkum aturan operasional yang aktif di platform ${site.name} dan dapat diperbarui mengikuti kebijakan resmi ${site.brand}.`,
    ],
  },
];

export default function SyaratKetentuanPage() {
  return (
    <div>
      <PageIntro
        description={`Ketentuan operasional pemesanan jahit custom, penawaran harga, pembayaran DP 50%, produksi, dan pelunasan pada platform ${site.name}.`}
        eyebrow="Syarat & Ketentuan"
        title="Ketentuan layanan jahit custom Celmira Tailor."
      />

      <div className="shell pb-20">
        <div className="mx-auto max-w-3xl space-y-6">
          {termsSections.map((section) => (
            <section
              className="rounded-[1.5rem] border border-cocoa/14 bg-ivory p-6 sm:p-7"
              key={section.title}
            >
              <h2 className="font-[family-name:var(--font-display)] text-xl text-espresso">
                {section.title}
              </h2>
              <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-muted">
                {section.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </section>
          ))}

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-cocoa/12 pt-6 text-xs text-muted">
            <p>
              Lihat juga{" "}
              <Link
                className="font-medium text-espresso underline underline-offset-4"
                href="/kebijakan-privasi"
              >
                Kebijakan Privasi
              </Link>{" "}
              dan{" "}
              <Link
                className="font-medium text-espresso underline underline-offset-4"
                href="/cara-pemesanan"
              >
                Cara Pemesanan
              </Link>
              .
            </p>
            <Link
              className="font-medium text-espresso underline underline-offset-4"
              href="/orders"
            >
              Mulai Pesanan →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
