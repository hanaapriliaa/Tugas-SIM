import type {
  CelmiraDesignReference,
  GarmentCategoryId,
  GarmentCategoryOption,
  GarmentSpecifications,
  OrderDraft,
} from "@/lib/types/tailor";

export const garmentCategories: GarmentCategoryOption[] = [
  {
    id: "kebaya",
    index: "01",
    name: "Kebaya",
    description: "Brokat, lace, dan detail bordir untuk acara yang istimewa.",
    detail: "Kartini, modern, maupun potongan klasik",
    defaultLengthLabel: "Midi / selutut",
  },
  {
    id: "gamis",
    index: "02",
    name: "Gamis",
    description: "Potongan longgar yang nyaman, dari bahan harian hingga pesta.",
    detail: "Harian, syar'i, dan model pesta",
    defaultLengthLabel: "Maxi / semata kaki",
  },
  {
    id: "kemeja-pria",
    index: "03",
    name: "Kemeja Pria",
    description: "Kerah, manset, dan ukuran yang presisi untuk pemakaian formal.",
    detail: "Formal, kerja, dan kasual",
    defaultLengthLabel: "Reguler pinggul",
  },
  {
    id: "blazer",
    index: "04",
    name: "Blazer",
    description: "Struktur rapi untuk kerja, wisuda, dan acara resmi.",
    detail: "Wanita dan pria",
    defaultLengthLabel: "Pinggul / semi-panjang",
  },
  {
    id: "mukena",
    index: "05",
    name: "Mukena",
    description: "Bahan yang adem dengan finishing nyaman untuk beribadah.",
    detail: "Harian, travel, dan hadiah",
    defaultLengthLabel: "Dewasa standar / custom",
  },
  {
    id: "busana-wisuda",
    index: "06",
    name: "Busana Wisuda",
    description: "Busana wisudawan dan pendamping dalam satu koordinasi.",
    detail: "Kebaya wisuda dan toga",
    defaultLengthLabel: "Midi / maxi",
  },
  {
    id: "busana-pernikahan",
    index: "07",
    name: "Busana Pernikahan",
    description: "Kebaya akad, gaun, dan busana keluarga untuk hari sakral.",
    detail: "Akad, resepsi, dan busana keluarga",
    defaultLengthLabel: "Maxi / ekor",
  },
  {
    id: "custom-lainnya",
    index: "08",
    name: "Custom Lainnya",
    description: "Seragam keluarga, busana anak, hingga kebutuhan kelompok.",
    detail: "Sesuai kebutuhan Anda",
    defaultLengthLabel: "Sesuai model",
  },
];

export const celmiraDesignReferences: CelmiraDesignReference[] = [
  {
    id: "celmira-kebaya-brokat-panjang",
    title: "Kebaya Brokat Panjang",
    categoryId: "kebaya",
    subtitle: "Dokumentasi resmi Celmira Boutique",
    description:
      "Potongan panjang dengan detail bordir brokat penuh, kerah Shanghai, dan tepi lace scallop di bagian bawah.",
    imageSrc: "/images/portfolio/jahit-10.jpeg",
    imageAlt:
      "Kebaya brokat warna maroon dengan detail bordir dan bagian bawah lace transparan, hasil jahitan Celmira Boutique.",
    sourceNote: "Arsip portofolio celmiraboutique.com/jahit",
    defaults: {
      fabric: "Brokat & Lace + Furing",
      colorName: "Maroon",
      colorHex: "#6a2733",
      sleeveStyle: "Lengan Panjang Scallop",
      collarStyle: "Kerah Shanghai",
      lengthOption: "Midi / Bawah Lutut",
    },
  },
  {
    id: "celmira-kebaya-puff-lace",
    title: "Atasan Kebaya Lengan Puff",
    categoryId: "kebaya",
    subtitle: "Dokumentasi resmi Celmira Boutique",
    description:
      "Atasan kebaya brokat dengan bahu puff lembut, kerah Shanghai, dan pinggiran lace scallop manual.",
    imageSrc: "/images/portfolio/jahit-11.jpeg",
    imageAlt:
      "Atasan kebaya brokat warna maroon dengan lengan puff dan tepi lace scallop, hasil jahitan Celmira Boutique.",
    sourceNote: "Arsip portofolio celmiraboutique.com/jahit",
    defaults: {
      fabric: "Brokat & Lace + Furing",
      colorName: "Maroon",
      colorHex: "#6a2733",
      sleeveStyle: "Lengan Puff",
      collarStyle: "Kerah Shanghai",
      lengthOption: "Pinggul / Tunik Pendek",
    },
  },
  {
    id: "celmira-gamis-layer-flowy",
    title: "Gamis Flowy Detail Layer",
    categoryId: "gamis",
    subtitle: "Referensi siluet Celmira Boutique",
    description:
      "Siluet gamis longgar berjatuh dengan aksen cape/layer bahu lembut dan manset rapi.",
    imageSrc: "/images/hero.png",
    imageAlt:
      "Model mengenakan gamis berbahan flowy warna dusty rose dengan hijab senada, koleksi Celmira Boutique.",
    sourceNote: "Koleksi Celmira Boutique",
    defaults: {
      fabric: "Ceruti / Chiffon + Furing",
      colorName: "Dusty Rose",
      colorHex: "#d9bdb2",
      sleeveStyle: "Lengan Balon + Manset",
      collarStyle: "Kerah Bulat",
      lengthOption: "Maxi / Semata Kaki",
    },
  },
  {
    id: "celmira-kemeja-klasik",
    title: "Kemeja Formal Presisi",
    categoryId: "kemeja-pria",
    subtitle: "Acuan potongan Celmira Tailor",
    description:
      "Potongan kemeja formal dengan kerah terstruktur, plaket kancing rapi, dan manset yang pas di pergelangan.",
    sourceNote: "Acuan standar atelier Celmira",
    defaults: {
      fabric: "Katun / Dobby",
      colorName: "Ivory",
      colorHex: "#f3e9de",
      sleeveStyle: "Lengan Panjang + Manset",
      collarStyle: "Kerah Kemeja Klasik",
      lengthOption: "Reguler Pinggul",
    },
  },
  {
    id: "celmira-blazer-atelier",
    title: "Blazer Terstruktur",
    categoryId: "blazer",
    subtitle: "Acuan potongan Celmira Tailor",
    description:
      "Blazer berfuring dengan garis bahu tegas dan lapel rapi untuk agenda kerja, sidang, maupun wisuda.",
    sourceNote: "Acuan standar atelier Celmira",
    defaults: {
      fabric: "Semi-wool / Twill + Furing",
      colorName: "Espresso",
      colorHex: "#3b2b25",
      sleeveStyle: "Lengan Panjang Jas",
      collarStyle: "Kerah Lapel",
      lengthOption: "Pinggul",
    },
  },
  {
    id: "celmira-mukena-adem",
    title: "Mukena Renda Lembut",
    categoryId: "mukena",
    subtitle: "Acuan potongan Celmira Tailor",
    description:
      "Set mukena dengan lingkar wajah nyaman dan finishing renda halus pada tepi atasan maupun rok.",
    sourceNote: "Acuan standar atelier Celmira",
    defaults: {
      fabric: "Katun / Silk Lembut",
      colorName: "Ivory",
      colorHex: "#f3e9de",
      sleeveStyle: "Potongan Mukena",
      collarStyle: "Tanpa Kerah (Lingkar Wajah)",
      lengthOption: "Dewasa Standar",
    },
  },
  {
    id: "celmira-wisuda-serasi",
    title: "Busana Wisuda & Pendamping",
    categoryId: "busana-wisuda",
    subtitle: "Acuan potongan Celmira Tailor",
    description:
      "Koordinasi kebaya wisuda atau setelan formal keluarga dengan palet warna senada.",
    imageSrc: "/images/portfolio/jahit-10.jpeg",
    imageAlt: "Kebaya brokat maroon hasil jahitan Celmira Boutique.",
    sourceNote: "Acuan standar atelier Celmira",
    defaults: {
      fabric: "Brokat & Lace + Furing",
      colorName: "Cocoa",
      colorHex: "#704f46",
      sleeveStyle: "Lengan Panjang",
      collarStyle: "Kerah Kartini / V-Neck",
      lengthOption: "Midi / Bawah Lutut",
    },
  },
  {
    id: "celmira-pernikahan-sakral",
    title: "Kebaya Akad & Busana Keluarga",
    categoryId: "busana-pernikahan",
    subtitle: "Acuan potongan Celmira Tailor",
    description:
      "Busana akad, resepsi, maupun seragam keluarga dengan pengerjaan detail bordir dan payet sesuai konsultasi.",
    imageSrc: "/images/portfolio/jahit-11.jpeg",
    imageAlt: "Atasan kebaya brokat detail bordir hasil jahitan Celmira Boutique.",
    sourceNote: "Acuan standar atelier Celmira",
    defaults: {
      fabric: "Brokat & Lace + Furing",
      colorName: "Ivory",
      colorHex: "#f3e9de",
      sleeveStyle: "Lengan Panjang Scallop",
      collarStyle: "Kerah Shanghai",
      lengthOption: "Maxi / Semata Kaki",
    },
  },
  {
    id: "celmira-custom-keluarga",
    title: "Busana Custom & Seragam",
    categoryId: "custom-lainnya",
    subtitle: "Acuan potongan Celmira Tailor",
    description:
      "Kebutuhan jahit di luar kategori standar seperti busana anak, tunik keluarga, atau setelan acara khusus.",
    sourceNote: "Acuan standar atelier Celmira",
    defaults: {
      fabric: "Katun / Linen",
      colorName: "Sage",
      colorHex: "#a8b3a1",
      sleeveStyle: "Lengan Panjang",
      collarStyle: "Kerah Bulat",
      lengthOption: "Sesuai Model",
    },
  },
];

export const fabricOptions = [
  "Brokat & Lace + Furing",
  "Ceruti / Chiffon + Furing",
  "Satin / Silk",
  "Katun / Linen",
  "Katun / Dobby",
  "Semi-wool / Twill + Furing",
  "Bahan dari pelanggan sendiri",
  "Konsultasi dengan tim Celmira",
] as const;

export const colorPaletteOptions = [
  { name: "Dusty Rose", hex: "#d9bdb2" },
  { name: "Cocoa", hex: "#704f46" },
  { name: "Espresso", hex: "#3b2b25" },
  { name: "Ivory", hex: "#f3e9de" },
  { name: "Maroon", hex: "#6a2733" },
  { name: "Sage", hex: "#a8b3a1" },
  { name: "Hitam", hex: "#231f20" },
  { name: "Navy", hex: "#243046" },
] as const;

export const sleeveOptions = [
  "Lengan Panjang",
  "Lengan Panjang Scallop",
  "Lengan Puff",
  "Lengan Balon + Manset",
  "Lengan 3/4",
  "Lengan Pendek",
  "Lengan Panjang Jas",
  "Potongan Mukena",
  "Sesuai Referensi Foto",
] as const;

export const collarOptions = [
  "Kerah Shanghai",
  "Kerah Kartini / V-Neck",
  "Kerah Bulat",
  "Kerah Kemeja Klasik",
  "Kerah Lapel",
  "Tanpa Kerah (Lingkar Wajah)",
  "Sesuai Referensi Foto",
] as const;

export const lengthOptions = [
  "Pinggul / Tunik Pendek",
  "Reguler Pinggul",
  "Midi / Bawah Lutut",
  "Maxi / Semata Kaki",
  "Dewasa Standar",
  "Sesuai Model",
] as const;

export const laceOptions = [
  "Tanpa renda tambahan",
  "Tepi lace scallop di ujung lengan & bawah",
  "Aplikasi renda tipis di dada / manset",
  "Renda mukena keliling",
  "Diskusikan saat konsultasi",
] as const;

export const embroideryOptions = [
  "Tanpa bordir tambahan",
  "Bordir motif floral halus",
  "Aplikasi payet / mutiara ringan",
  "Bordir menyesuaikan kain brokat",
  "Diskusikan saat konsultasi",
] as const;

export const buttonOptions = [
  "Tanpa kancing (polos)",
  "Kancing bungkus kain senada",
  "Kancing depan standar rapi",
  "Kancing mutiara / hias",
  "Kancing jas / blazer",
] as const;

export const zipperOptions = [
  "Resleting jepang belakang",
  "Resleting depan (busui friendly)",
  "Resleting samping tersembunyi",
  "Tanpa resleting (kancing penuh)",
  "Resleting lengan / manset",
] as const;

export function createInitialSpecifications(): GarmentSpecifications {
  return {
    fabric: "Brokat & Lace + Furing",
    customFabricNote: "",
    colorName: "Dusty Rose",
    colorHex: "#d9bdb2",
    sleeveStyle: "Lengan Panjang",
    collarStyle: "Kerah Shanghai",
    lengthOption: "Midi / Bawah Lutut",
    laceDetail: "Tanpa renda tambahan",
    embroideryDetail: "Tanpa bordir tambahan",
    buttonStyle: "Kancing bungkus kain senada",
    zipperStyle: "Resleting jepang belakang",
    notes: "",
  };
}

export function createInitialOrderDraft(): OrderDraft {
  return {
    categoryId: "",
    designSource: "celmira",
    selectedCelmiraDesignId: "",
    selectedStudioDesignId: "",
    customDesignTitle: "",
    attachments: [],
    specifications: createInitialSpecifications(),
    measurements: {
      mode: "manual",
      values: {
        bust: "",
        waist: "",
        hip: "",
        shoulderWidth: "",
        sleeveLength: "",
        garmentLength: "",
        neckCircumference: "",
      },
      sampleGarmentNote: "",
      fitPreferenceNote: "",
    },
    customer: {
      fullName: "",
      whatsapp: "",
      email: "",
    },
    delivery: {
      method: "pickup",
      addressLine: "",
      city: "",
      postalCode: "",
      courierNote: "",
    },
    targetDate: "",
    agreedToTerms: false,
    updatedAt: "",
  };
}

export function getCategoryById(id: GarmentCategoryId | ""): GarmentCategoryOption | undefined {
  return garmentCategories.find((item) => item.id === id);
}
