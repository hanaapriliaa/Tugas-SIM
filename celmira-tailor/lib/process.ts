export type ProcessStep = {
  step: string;
  title: string;
  description: string;
};

/**
 * Alur pemesanan yang direncanakan untuk Celmira Tailor.
 * Tahap ini hanya menjelaskan alur, belum menjalankan transaksi.
 */
export const processSteps: ProcessStep[] = [
  {
    step: "01",
    title: "Pilih desain",
    description:
      "Mulai dari kategori layanan, lalu tentukan model yang Anda inginkan — termasuk referensi dari koleksi Celmira.",
  },
  {
    step: "02",
    title: "Atur detail pakaian",
    description:
      "Tentukan bahan, warna, panjang lengan, kerah, dan detail finishing lain bersama tim kami.",
  },
  {
    step: "03",
    title: "Masukkan ukuran",
    description:
      "Isi ukuran badan atau replikasi dari baju contoh yang paling nyaman Anda pakai.",
  },
  {
    step: "04",
    title: "Ajukan pesanan",
    description:
      "Kirim ringkasan pesanan beserta catatan kebutuhan dan tenggat pemakaian.",
  },
  {
    step: "05",
    title: "Konfirmasi penawaran",
    description:
      "Tim Celmira meninjau detail pesanan, lalu mengirimkan penawaran untuk Anda setujui.",
  },
  {
    step: "06",
    title: "Pantau proses produksi",
    description:
      "Ikuti perkembangan pesanan dari pemotongan bahan hingga finishing dan quality check.",
  },
  {
    step: "07",
    title: "Terima pakaian",
    description:
      "Pesanan diselesaikan, dikemas, lalu dikirim atau diambil di toko sesuai kesepakatan.",
  },
];
