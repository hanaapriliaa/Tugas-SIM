export type PortfolioItem = {
  src: string;
  alt: string;
  title: string;
  caption: string;
  width: number;
  height: number;
};

/**
 * Dokumentasi hasil jahitan resmi Celmira Boutique.
 * Sumber: https://celmiraboutique.com/jahit
 * Hanya karya yang dipublikasikan sendiri oleh Celmira yang ditampilkan.
 */
export const portfolioItems: PortfolioItem[] = [
  {
    src: "/images/portfolio/jahit-10.jpeg",
    alt: "Kebaya brokat warna maroon dengan detail bordir dan bagian bawah lace transparan, hasil jahitan Celmira Boutique.",
    title: "Kebaya Brokat",
    caption: "Potongan panjang dengan detail bordir dan finishing lace di bagian bawah.",
    width: 1254,
    height: 1254,
  },
  {
    src: "/images/portfolio/jahit-11.jpeg",
    alt: "Atasan kebaya brokat warna maroon dengan lengan puff dan tepi lace scallop, hasil jahitan Celmira Boutique.",
    title: "Kebaya Brokat — Atasan",
    caption: "Lengan puff, kerah Shanghai, dan tepi lace scallop yang dikerjakan manual.",
    width: 1254,
    height: 1254,
  },
];
