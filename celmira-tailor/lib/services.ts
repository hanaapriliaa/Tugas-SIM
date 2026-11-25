export type ServiceCategory = {
  index: string;
  name: string;
  description: string;
  detail: string;
};

/**
 * Kategori layanan jahit. Deskripsi bersifat umum dan tidak menjanjikan
 * harga, waktu pengerjaan, atau ketersediaan bahan tertentu.
 */
export const serviceCategories: ServiceCategory[] = [
  {
    index: "01",
    name: "Kebaya",
    description: "Brokat, lace, dan detail bordir untuk acara yang istimewa.",
    detail: "Kartini, modern, maupun potongan klasik",
  },
  {
    index: "02",
    name: "Gamis",
    description: "Potongan longgar yang nyaman, dari bahan harian hingga pesta.",
    detail: "Harian, syar'i, dan model pesta",
  },
  {
    index: "03",
    name: "Kemeja Pria",
    description: "Kerah, manset, dan ukuran yang presisi untuk pemakaian formal.",
    detail: "Formal, kerja, dan kasual",
  },
  {
    index: "04",
    name: "Blazer",
    description: "Struktur rapi untuk kerja, wisuda, dan acara resmi.",
    detail: "Wanita dan pria",
  },
  {
    index: "05",
    name: "Mukena",
    description: "Bahan yang adem dengan finishing nyaman untuk beribadah.",
    detail: "Harian, travel, dan hadiah",
  },
  {
    index: "06",
    name: "Busana Wisuda",
    description: "Busana wisudawan dan pendamping dalam satu koordinasi.",
    detail: "Kebaya wisuda dan toga",
  },
  {
    index: "07",
    name: "Busana Pernikahan",
    description: "Kebaya akad, gaun, dan busana keluarga untuk hari sakral.",
    detail: "Akad, resepsi, dan busana keluarga",
  },
  {
    index: "08",
    name: "Custom Lainnya",
    description: "Seragam keluarga, busana anak, hingga kebutuhan kelompok.",
    detail: "Sesuai kebutuhan Anda",
  },
];
