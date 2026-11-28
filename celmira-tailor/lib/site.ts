/**
 * Sumber kebenaran tunggal untuk identitas Celmira Tailor.
 * Semua informasi di sini berasal dari situs resmi Celmira Boutique
 * (https://celmiraboutique.com). Jangan menambahkan kontak yang belum terverifikasi.
 */
export const site = {
  name: "Celmira Tailor",
  brand: "Celmira Boutique",
  tagline: "Fashion for a Kinder, Brighter You",
  description:
    "Layanan jahit custom Celmira Boutique untuk kebaya, gamis, kemeja, blazer, mukena, busana wisuda, dan busana pernikahan. Desain, bahan, warna, dan ukuran sesuai kebutuhan Anda.",
  url: "https://celmiraboutique.com",
  tailorUrl: "https://celmiraboutique.com/jahit",
  catalogUrl: "https://celmiraboutique.com/katalog",
  location: {
    label: "Official Store",
    address: ["Bayen RT 2, Purwomartani, Kalasan", "Sleman, D.I. Yogyakarta"],
    mapsUrl: "https://maps.app.goo.gl/B8g1g5mdJvgM3d79A",
    region: "Yogyakarta, Indonesia",
  },
  since: 2018,
} as const;

export const navigation = [
  { label: "Beranda", href: "/" },
  { label: "Layanan", href: "/layanan" },
  { label: "Katalog Jahit", href: "/catalog" },
  { label: "Cara Pemesanan", href: "/cara-pemesanan" },
  { label: "Lacak Pesanan", href: "/track" },
  { label: "Tentang Kami", href: "/tentang-kami" },
  { label: "Kontak", href: "/kontak" },
] as const;

export const studioNavigation = [
  { label: "Design Studio", href: "/design-studio" },
  { label: "Measurement Studio", href: "/measurement-studio" },
  { label: "Lacak Pesanan", href: "/track" },
  { label: "Chat", href: "/chat" },
] as const;

export const infoNavigation = [
  { label: "Tentang Kami", href: "/tentang-kami" },
  { label: "Informasi Layanan", href: "/layanan" },
  { label: "Cara Pemesanan", href: "/cara-pemesanan" },
  { label: "Kontak & Lokasi", href: "/kontak" },
] as const;

export const legalNavigation = [
  { label: "Kebijakan Privasi", href: "/kebijakan-privasi" },
  { label: "Syarat & Ketentuan", href: "/syarat-ketentuan" },
] as const;
