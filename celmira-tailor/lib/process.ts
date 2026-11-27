export type ProcessStep = {
  step: string;
  title: string;
  description: string;
};

/**
 * Alur pemesanan aktif pada platform Celmira Tailor,
 * selaras dengan Design Studio, Measurement Studio, Booking Flow, Invoice DP/Pelunasan, & Tracking 10 Tahap.
 */
export const processSteps: ProcessStep[] = [
  {
    step: "01",
    title: "Pilih atau rancang desain",
    description:
      "Pilih dari katalog referensi Celmira, unggah foto/sketsa/PDF milik Anda, atau susun siluet, warna, dan bahan di Design Studio.",
  },
  {
    step: "02",
    title: "Atur detail pakaian",
    description:
      "Tentukan bahan, warna, model lengan, kerah, panjang busana, serta detail renda, bordir, kancing, dan resleting.",
  },
  {
    step: "03",
    title: "Masukkan atau gunakan profil ukuran",
    description:
      "Isi ukuran badan secara manual, gunakan profil tersimpan dari Measurement Studio, atau pilih replikasi dari baju contoh.",
  },
  {
    step: "04",
    title: "Ajukan pesanan custom",
    description:
      "Kirim ringkasan pesanan, metode serah terima (ambil di butik atau kirim kurir), dan target tanggal pemakaian untuk ditinjau tim Celmira.",
  },
  {
    step: "05",
    title: "Konfirmasi penawaran & DP 50%",
    description:
      "Admin meninjau pesanan dan mengirim penawaran harga akhir. Setelah disetujui, DP 50% biaya jahit dibayarkan via QRIS resmi (batas 24 jam) dengan verifikasi manual admin.",
  },
  {
    step: "06",
    title: "Pantau 10 tahap produksi",
    description:
      "Setelah DP terverifikasi, pantau setiap tahap produksi secara real-time di halaman Lacak Pesanan hingga selesai dikerjakan dan quality control.",
  },
  {
    step: "07",
    title: "Pelunasan & terima pakaian",
    description:
      "Lunasi sisa 50% biaya jahit (beserta ongkos kirim terpisah bila dikirim). Setelah diverifikasi, busana dikirim dengan resi resmi atau siap diambil di butik.",
  },
];
