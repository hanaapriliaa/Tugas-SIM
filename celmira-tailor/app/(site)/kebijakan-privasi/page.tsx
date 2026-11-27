import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/ui/PageIntro";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description:
    "Penjelasan transparan mengenai data yang dikumpulkan, disimpan, dan dilindungi oleh platform digital Celmira Tailor.",
};

const sections = [
  {
    title: "1. Data yang Dikumpulkan",
    points: [
      "Identitas pesanan: nama lengkap, nomor WhatsApp, alamat email (opsional), dan alamat pengiriman bila memilih pengiriman via kurir.",
      "Data kustomisasi: konfigurasi Design Studio (kategori, model, kain, warna, detail jahit, catatan) serta file referensi visual (JPG, PNG, WEBP, atau PDF) yang Anda unggah.",
      "Data pengukuran: profil ukuran badan (cm), template pakaian, catatan postur/kelonggaran, atau keterangan baju contoh.",
      "Data transaksi & komunikasi: riwayat penawaran harga, bukti pembayaran QRIS yang diunggah, riwayat tahapan produksi, serta pesan dan lampiran gambar pada Chat Pelanggan.",
    ],
  },
  {
    title: "2. Tujuan Penggunaan Data",
    points: [
      "Meninjau kelayakan desain, ketersediaan bahan, dan menyusun penawaran harga akhir serta estimasi penyelesaian.",
      "Memproduksi busana sesuai snapshot ukuran dan spesifikasi yang disepakati pada masing-masing pesanan.",
      "Memverifikasi pembayaran DP 50% dan pelunasan secara manual oleh admin, serta mengatur serah terima atau pengiriman pesanan.",
      "Memungkinkan Anda melanjutkan desain, profil ukuran, percakapan chat, dan pelacakan pesanan dari sesi browser Anda atau melalui verifikasi pesanan di halaman Lacak Pesanan.",
    ],
  },
  {
    title: "3. Penyimpanan & Perlindungan Akses",
    points: [
      "Data pesanan, chat, desain tersimpan, dan profil ukuran disimpan pada database Cloudflare D1, sedangkan file biner (referensi desain, lampiran chat, dan bukti pembayaran) disimpan di penyimpanan privat Cloudflare R2.",
      "Akses sesi menggunakan cookie HttpOnly (celmira_chat_session untuk sesi pelanggan dan celmira_track_session untuk akses pelacakan terverifikasi). Draft formulir pesanan yang belum dikirim dapat tersimpan sementara di browser Anda agar tidak hilang saat pengisian.",
      "Pelacakan pesanan dilindungi verifikasi dua faktor (nomor pesanan disertai nomor WhatsApp terdaftar atau Kode Akses Tracking). Akses file privat hanya diberikan kepada pemilik sesi, pemegang verifikasi tracking pesanan terkait, atau admin terautentikasi.",
      "Celmira Tailor tidak mewajibkan pendaftaran atau kata sandi bagi pelanggan. Data Design Studio dan Measurement Studio tersimpan otomatis ke server berdasarkan sesi browser Anda (cookie HttpOnly celmira_chat_session). Untuk membuka kembali pesanan dan memulihkan akses sesi setelah pemesanan, pelanggan dapat menggunakan verifikasi dua faktor pada halaman Lacak Pesanan.",
    ],
  },
  {
    title: "4. Hak & Pertanyaan Privasi",
    points: [
      "Anda dapat mengedit atau menghapus desain tersimpan di Design Studio serta profil ukuran di Measurement Studio kapan saja. Data snapshot pada pesanan yang sudah diajukan tetap dipertahankan sebagai catatan pengerjaan dan riwayat transaksi.",
      "Untuk pertanyaan atau permintaan terkait data pesanan Anda, silakan hubungi tim kami melalui halaman Chat Pelanggan atau kunjungi Official Store Celmira Boutique di Yogyakarta.",
    ],
  },
];

export default function KebijakanPrivasiPage() {
  return (
    <div>
      <PageIntro
        description={`Penjelasan mengenai cara platform digital ${site.name} (${site.brand}) mengumpulkan, menyimpan, dan menjaga data pesanan, desain, ukuran, serta percakapan Anda.`}
        eyebrow="Kebijakan Privasi"
        title="Perlindungan data pesanan & ukuran Anda."
      />

      <div className="shell pb-20">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="rounded-2xl border border-cocoa/15 bg-cream/55 p-5 text-xs leading-relaxed text-muted">
            <p className="font-semibold uppercase tracking-[0.14em] text-cocoa">
              Catatan Keterbukaan
            </p>
            <p className="mt-1.5">
              Halaman ini menjelaskan praktik pengelolaan data yang benar-benar diterapkan pada
              platform digital {site.name}. Kami tidak mencantumkan alamat email, nomor telepon,
              atau klaim sertifikasi eksternal yang belum terverifikasi secara resmi oleh{" "}
              {site.brand}.
            </p>
          </div>

          {sections.map((section) => (
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
                href="/syarat-ketentuan"
              >
                Syarat &amp; Ketentuan Layanan
              </Link>
              .
            </p>
            <Link
              className="font-medium text-espresso underline underline-offset-4"
              href="/kontak"
            >
              Hubungi Celmira Tailor →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
