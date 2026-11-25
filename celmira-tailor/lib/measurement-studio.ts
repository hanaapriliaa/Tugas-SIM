import { garmentCategories } from "./booking-options.ts";
import type {
  GarmentCategoryId,
  MeasurementExtraValues,
  MeasurementProfile,
  MeasurementStandardKey,
  MeasurementTemplateConfig,
  MeasurementTemplateField,
  MeasurementTemplateId,
  MeasurementValues,
} from "@/lib/types/tailor";

export const MAX_SAVED_MEASUREMENT_PROFILES = 16;
export const MAX_PROFILE_LABEL_LENGTH = 80;
export const MAX_PROFILE_NOTES_LENGTH = 400;

const DEFAULT_TEMPLATE_UPDATED_AT = "2026-11-25T00:00:00.000Z";

export const DEFAULT_MEASUREMENT_TEMPLATES: MeasurementTemplateConfig[] = [
  {
    id: "hijab",
    name: "Hijab & Mukena",
    shortLabel: "Hijab",
    tagline: "Lingkar wajah nyaman & jatuhan depan-belakang presisi",
    description:
      "Dirancang untuk mukena, khimar, dan hijab custom agar lingkar wajah tidak menekan serta panjang depan dan belakang menutup sesuai kebutuhan.",
    mannequinType: "hijab",
    defaultCategoryId: "mukena",
    supportedCategories: ["mukena", "custom-lainnya"],
    active: true,
    sortOrder: 1,
    updatedAt: DEFAULT_TEMPLATE_UPDATED_AT,
    fields: [
      {
        key: "neckCircumference",
        storageTarget: "standard",
        standardKey: "neckCircumference",
        label: "Lingkar wajah / bukaan muka",
        shortLabel: "Lingkar wajah",
        required: true,
        unit: "cm",
        min: 25,
        max: 40,
        step: 0.5,
        defaultValue: 28,
        guideTitle: "Cara mengukur lingkar wajah",
        guideSteps: [
          "Tempelkan pita ukur dari bagian bawah dagu naik melewati pipi dan dahi.",
          "Pastikan posisi pita berada di garis tepi hijab atau mukena yang biasa terasa nyaman.",
          "Sisakan ruang 1 jari agar tidak terlalu ketat saat dikenakan beribadah.",
        ],
        tip: "Ukuran 27–29 cm umum untuk dewasa; tambahkan 1 cm jika ingin lebih longgar di dagu.",
        mannequinAnchor: "face",
      },
      {
        key: "shoulderWidth",
        storageTarget: "standard",
        standardKey: "shoulderWidth",
        label: "Lebar bahu / jatuhan pundak",
        shortLabel: "Lebar bahu",
        required: false,
        unit: "cm",
        min: 30,
        max: 54,
        step: 0.5,
        defaultValue: 38,
        guideTitle: "Cara mengukur lebar bahu",
        guideSteps: [
          "Berdiri santai dengan posisi bahu rileks.",
          "Ukur mendatar dari ujung tulang bahu kiri ke ujung tulang bahu kanan melalui belakang leher.",
        ],
        tip: "Membantu tim Celmira mengatur potongan pundak mukena atau khimar agar jatuh rapi.",
        mannequinAnchor: "shoulder",
      },
      {
        key: "garmentLength",
        storageTarget: "standard",
        standardKey: "garmentLength",
        label: "Panjang depan hijab / mukena",
        shortLabel: "Panjang depan",
        required: true,
        unit: "cm",
        min: 45,
        max: 155,
        step: 1,
        defaultValue: 95,
        guideTitle: "Cara mengukur panjang depan",
        guideSteps: [
          "Mulai pita ukur tepat di bawah dagu (atau puncak kepala untuk mukena penuh).",
          "Tarik lurus ke bawah melewati dada hingga batas panjang depan yang diinginkan.",
        ],
        tip: "Untuk khimar harian biasanya 75–95 cm; untuk atasan mukena dewasa umumnya 115–130 cm.",
        mannequinAnchor: "length",
      },
      {
        key: "backLength",
        storageTarget: "extra",
        label: "Panjang belakang hijab / mukena",
        shortLabel: "Panjang belakang",
        required: true,
        unit: "cm",
        min: 60,
        max: 165,
        step: 1,
        defaultValue: 120,
        guideTitle: "Cara mengukur panjang belakang",
        guideSteps: [
          "Letakkan ujung pita di puncak kepala bagian belakang.",
          "Tarik turun lurus mengikuti punggung hingga batas panjang yang diinginkan.",
        ],
        tip: "Panjang belakang umumnya 15–30 cm lebih panjang dari panjang depan agar jatuh seimbang.",
        mannequinAnchor: "back-length",
      },
    ],
    sizePresets: [
      {
        id: "hijab-standar",
        label: "Standar",
        summary: "Khimar / hijab harian",
        values: { neckCircumference: 27.5, shoulderWidth: 37, garmentLength: 85 },
        extraValues: { backLength: 108 },
      },
      {
        id: "hijab-syari",
        label: "Syar'i",
        summary: "Menutup dada & punggung",
        values: { neckCircumference: 28, shoulderWidth: 38, garmentLength: 100 },
        extraValues: { backLength: 125 },
      },
      {
        id: "mukena-dewasa",
        label: "Mukena Dewasa",
        summary: "Potongan dewasa nyaman",
        values: { neckCircumference: 28.5, shoulderWidth: 40, garmentLength: 122 },
        extraValues: { backLength: 138 },
      },
    ],
  },
  {
    id: "atasan",
    name: "Atasan (Kebaya, Kemeja, Tunik)",
    shortLabel: "Atasan",
    tagline: "Proporsi bahu, lingkar badan, pinggang, dan panjang lengan",
    description:
      "Cocok untuk kebaya Kartini/modern, atasan brokat, tunik, maupun kemeja harian dengan fokus pada pas bahu, dada, pinggang, dan lengan.",
    mannequinType: "atasan",
    defaultCategoryId: "kebaya",
    supportedCategories: ["kebaya", "kemeja-pria", "busana-wisuda", "custom-lainnya"],
    active: true,
    sortOrder: 2,
    updatedAt: DEFAULT_TEMPLATE_UPDATED_AT,
    fields: [
      {
        key: "bust",
        storageTarget: "standard",
        standardKey: "bust",
        label: "Lingkar badan / dada",
        shortLabel: "Lingkar badan",
        required: true,
        unit: "cm",
        min: 68,
        max: 150,
        step: 0.5,
        defaultValue: 92,
        guideTitle: "Cara mengukur lingkar badan",
        guideSteps: [
          "Lingkarkan pita ukur sejajar lantai melewati bagian dada paling penuh dan bawah ketiak.",
          "Bernapaslah dengan normal, jangan menahan napas atau menarik pita terlalu kencang.",
          "Selipkan 2 jari di antara pita dan badan untuk kelonggaran dasar.",
        ],
        tip: "Kenakan pakaian dalam yang biasa dipakai bersama kebaya atau atasan saat mengukur.",
        mannequinAnchor: "bust",
      },
      {
        key: "waist",
        storageTarget: "standard",
        standardKey: "waist",
        label: "Lingkar pinggang",
        shortLabel: "Lingkar pinggang",
        required: true,
        unit: "cm",
        min: 54,
        max: 140,
        step: 0.5,
        defaultValue: 74,
        guideTitle: "Cara mengukur lingkar pinggang",
        guideSteps: [
          "Temukan lekuk pinggang terkecil, biasanya sekitar 2–3 cm di atas pusar.",
          "Lingkarkan pita ukur mendatar sejajar lantai tanpa menekan perut.",
        ],
        tip: "Jika lebih suka potongan tunik yang longgar, tulis catatan kelonggaran pada kolom catatan.",
        mannequinAnchor: "waist",
      },
      {
        key: "hip",
        storageTarget: "standard",
        standardKey: "hip",
        label: "Lingkar panggul",
        shortLabel: "Lingkar panggul",
        required: false,
        unit: "cm",
        min: 76,
        max: 160,
        step: 0.5,
        defaultValue: 98,
        guideTitle: "Cara mengukur lingkar panggul",
        guideSteps: [
          "Berdiri tegak dengan kedua kaki rapat.",
          "Lingkarkan pita ukur pada bagian panggul terlebar, sejajar dengan lantai.",
        ],
        tip: "Sangat disarankan diisi untuk kebaya panjang, peplum, dan tunik melewati pinggul.",
        mannequinAnchor: "hip",
      },
      {
        key: "shoulderWidth",
        storageTarget: "standard",
        standardKey: "shoulderWidth",
        label: "Lebar bahu",
        shortLabel: "Lebar bahu",
        required: true,
        unit: "cm",
        min: 30,
        max: 58,
        step: 0.5,
        defaultValue: 38,
        guideTitle: "Cara mengukur lebar bahu",
        guideSteps: [
          "Ukur dari bagian punggung atas, mulai dari ujung tulang bahu kiri ke ujung tulang bahu kanan.",
          "Biarkan pita sedikit mengikuti kontur pangkal leher belakang.",
        ],
        tip: "Lebar bahu yang akurat mencegah lengan kebaya terasa tertarik atau melorot.",
        mannequinAnchor: "shoulder",
      },
      {
        key: "sleeveLength",
        storageTarget: "standard",
        standardKey: "sleeveLength",
        label: "Panjang lengan",
        shortLabel: "Panjang lengan",
        required: true,
        unit: "cm",
        min: 18,
        max: 75,
        step: 0.5,
        defaultValue: 56,
        guideTitle: "Cara mengukur panjang lengan",
        guideSteps: [
          "Tekuk siku sedikit (sekitar 15 derajat) agar ukuran tidak kependekan saat bergerak.",
          "Ukur dari ujung tulang bahu melewati sisi luar siku sampai pergelangan tangan (atau batas lengan pendek/3/4).",
        ],
        tip: "Untuk lengan 3/4 biasanya 40–45 cm; lengan panjang penuh umumnya 54–60 cm.",
        mannequinAnchor: "sleeve",
      },
      {
        key: "garmentLength",
        storageTarget: "standard",
        standardKey: "garmentLength",
        label: "Panjang atasan",
        shortLabel: "Panjang atasan",
        required: true,
        unit: "cm",
        min: 48,
        max: 115,
        step: 1,
        defaultValue: 72,
        guideTitle: "Cara mengukur panjang atasan",
        guideSteps: [
          "Letakkan ujung pita di titik bahu tertinggi dekat pangkal leher.",
          "Tarik lurus melewati puncak dada hingga panjang bawah atasan yang diinginkan.",
        ],
        tip: "Kebaya pinggul umumnya 65–75 cm; tunik atau kebaya panjang berkisar 85–105 cm.",
        mannequinAnchor: "length",
      },
      {
        key: "neckCircumference",
        storageTarget: "standard",
        standardKey: "neckCircumference",
        label: "Lingkar leher",
        shortLabel: "Lingkar leher",
        required: false,
        unit: "cm",
        min: 28,
        max: 50,
        step: 0.5,
        defaultValue: 36,
        guideTitle: "Cara mengukur lingkar leher",
        guideSteps: [
          "Lingkarkan pita di pangkal leher tepat di atas tulang selangka.",
          "Sisakan ruang 1–2 jari agar kerah Shanghai atau kerah kemeja tetap lega.",
        ],
        tip: "Penting untuk model kerah Shanghai, kerah tegak, atau kebaya berkancing penuh.",
        mannequinAnchor: "neck",
      },
    ],
    sizePresets: [
      {
        id: "atasan-s",
        label: "S",
        summary: "LD 86 · LP 68",
        values: {
          bust: 86,
          waist: 68,
          hip: 92,
          shoulderWidth: 36,
          sleeveLength: 54,
          garmentLength: 68,
          neckCircumference: 34,
        },
      },
      {
        id: "atasan-m",
        label: "M",
        summary: "LD 92 · LP 74",
        values: {
          bust: 92,
          waist: 74,
          hip: 98,
          shoulderWidth: 38,
          sleeveLength: 56,
          garmentLength: 72,
          neckCircumference: 36,
        },
      },
      {
        id: "atasan-l",
        label: "L",
        summary: "LD 100 · LP 82",
        values: {
          bust: 100,
          waist: 82,
          hip: 106,
          shoulderWidth: 40,
          sleeveLength: 58,
          garmentLength: 75,
          neckCircumference: 38,
        },
      },
      {
        id: "atasan-xl",
        label: "XL",
        summary: "LD 108 · LP 90",
        values: {
          bust: 108,
          waist: 90,
          hip: 114,
          shoulderWidth: 42,
          sleeveLength: 59,
          garmentLength: 78,
          neckCircumference: 40,
        },
      },
    ],
  },
  {
    id: "gamis",
    name: "Gamis & Gaun Panjang",
    shortLabel: "Gamis",
    tagline: "Siluet mengalir penuh dari bahu hingga mata kaki",
    description:
      "Template menyeluruh untuk gamis harian, syar'i, maupun gaun pesta dengan perhatian pada kenyamanan lingkar badan, pinggul, lengan manset, dan panjang penuh.",
    mannequinType: "gamis",
    defaultCategoryId: "gamis",
    supportedCategories: ["gamis", "busana-pernikahan", "busana-wisuda"],
    active: true,
    sortOrder: 3,
    updatedAt: DEFAULT_TEMPLATE_UPDATED_AT,
    fields: [
      {
        key: "bust",
        storageTarget: "standard",
        standardKey: "bust",
        label: "Lingkar badan / dada",
        shortLabel: "Lingkar badan",
        required: true,
        unit: "cm",
        min: 70,
        max: 160,
        step: 0.5,
        defaultValue: 94,
        guideTitle: "Cara mengukur lingkar badan untuk gamis",
        guideSteps: [
          "Lingkarkan pita ukur sejajar lantai melewati bagian dada terlebar.",
          "Tambahkan ruang napas 2–3 jari agar potongan gamis jatuh anggun dan tidak ketat.",
        ],
        tip: "Untuk gamis syar'i, Anda bisa menambahkan 2–4 cm dari ukuran pas badan.",
        mannequinAnchor: "bust",
      },
      {
        key: "waist",
        storageTarget: "standard",
        standardKey: "waist",
        label: "Lingkar pinggang",
        shortLabel: "Lingkar pinggang",
        required: true,
        unit: "cm",
        min: 56,
        max: 150,
        step: 0.5,
        defaultValue: 78,
        guideTitle: "Cara mengukur lingkar pinggang",
        guideSteps: [
          "Ukur melingkar di lekuk pinggang secara santai tanpa menarik pita.",
          "Data ini tetap dibutuhkan sebagai acuan tinggi garis pinggang meskipun gamis berpotongan longgar.",
        ],
        tip: "Tim produksi akan menambah kelonggaran pola sesuai siluet gamis pilihan Anda.",
        mannequinAnchor: "waist",
      },
      {
        key: "hip",
        storageTarget: "standard",
        standardKey: "hip",
        label: "Lingkar panggul",
        shortLabel: "Lingkar panggul",
        required: true,
        unit: "cm",
        min: 78,
        max: 170,
        step: 0.5,
        defaultValue: 102,
        guideTitle: "Cara mengukur lingkar panggul",
        guideSteps: [
          "Berdiri tegak dengan kaki sejajar.",
          "Lingkarkan pita di titik terlebar panggul secara mendatar.",
        ],
        tip: "Memastikan bagian bawah gamis tidak membentuk lekuk saat duduk atau melangkah.",
        mannequinAnchor: "hip",
      },
      {
        key: "shoulderWidth",
        storageTarget: "standard",
        standardKey: "shoulderWidth",
        label: "Lebar bahu",
        shortLabel: "Lebar bahu",
        required: true,
        unit: "cm",
        min: 32,
        max: 58,
        step: 0.5,
        defaultValue: 39,
        guideTitle: "Cara mengukur lebar bahu",
        guideSteps: [
          "Ukur dari ujung bahu kiri ke ujung bahu kanan melewati bagian atas punggung.",
          "Pastikan posisi berdiri tegak dan bahu tidak terangkat.",
        ],
        tip: "Bahu yang pas membuat lipatan kain atau cape gamis jatuh simetris.",
        mannequinAnchor: "shoulder",
      },
      {
        key: "sleeveLength",
        storageTarget: "standard",
        standardKey: "sleeveLength",
        label: "Panjang lengan",
        shortLabel: "Panjang lengan",
        required: true,
        unit: "cm",
        min: 45,
        max: 75,
        step: 0.5,
        defaultValue: 58,
        guideTitle: "Cara mengukur panjang lengan gamis",
        guideSteps: [
          "Tekuk siku sedikit lalu ukur dari ujung bahu hingga tepat di tulang pergelangan tangan.",
          "Untuk model lengan balon/manset, tetap ukur panjang lurus ke pergelangan.",
        ],
        tip: "Tambahkan 1–2 cm jika menginginkan manset menutup pangkal punggung tangan.",
        mannequinAnchor: "sleeve",
      },
      {
        key: "garmentLength",
        storageTarget: "standard",
        standardKey: "garmentLength",
        label: "Panjang gamis",
        shortLabel: "Panjang gamis",
        required: true,
        unit: "cm",
        min: 115,
        max: 165,
        step: 1,
        defaultValue: 138,
        guideTitle: "Cara mengukur panjang gamis",
        guideSteps: [
          "Berdiri tegak tanpa alas kaki (atau kenakan tinggi hak yang akan dipakai saat acara).",
          "Ukur dari titik bahu tertinggi dekat leher lurus ke bawah hingga mata kaki atau lantai.",
        ],
        tip: "Sisakan jarak 1–2 cm dari lantai untuk gamis harian agar ujung kain tetap bersih.",
        mannequinAnchor: "length",
      },
      {
        key: "neckCircumference",
        storageTarget: "standard",
        standardKey: "neckCircumference",
        label: "Lingkar leher",
        shortLabel: "Lingkar leher",
        required: false,
        unit: "cm",
        min: 28,
        max: 48,
        step: 0.5,
        defaultValue: 36,
        guideTitle: "Cara mengukur lingkar leher",
        guideSteps: [
          "Lingkarkan pita di pangkal leher dengan ruang 2 jari.",
          "Opsional, bermanfaat untuk gamis berkerah tegak atau bukaan kancing depan.",
        ],
        tip: "Bantu hindari kerah terasa sempit saat dikenakan bersama inner hijab.",
        mannequinAnchor: "neck",
      },
    ],
    sizePresets: [
      {
        id: "gamis-s",
        label: "S",
        summary: "LD 90 · PB 134",
        values: {
          bust: 90,
          waist: 74,
          hip: 98,
          shoulderWidth: 37,
          sleeveLength: 56,
          garmentLength: 134,
          neckCircumference: 35,
        },
      },
      {
        id: "gamis-m",
        label: "M",
        summary: "LD 96 · PB 138",
        values: {
          bust: 96,
          waist: 80,
          hip: 104,
          shoulderWidth: 39,
          sleeveLength: 58,
          garmentLength: 138,
          neckCircumference: 36,
        },
      },
      {
        id: "gamis-l",
        label: "L",
        summary: "LD 104 · PB 142",
        values: {
          bust: 104,
          waist: 88,
          hip: 112,
          shoulderWidth: 41,
          sleeveLength: 59,
          garmentLength: 142,
          neckCircumference: 38,
        },
      },
      {
        id: "gamis-xl",
        label: "XL",
        summary: "LD 112 · PB 145",
        values: {
          bust: 112,
          waist: 96,
          hip: 120,
          shoulderWidth: 43,
          sleeveLength: 60,
          garmentLength: 145,
          neckCircumference: 40,
        },
      },
    ],
  },
  {
    id: "busana-formal",
    name: "Busana Formal (Blazer, Jas, Kemeja)",
    shortLabel: "Busana Formal",
    tagline: "Struktur bahu tegas, kerah presisi, dan jatuh lapel rapi",
    description:
      "Untuk blazer wanita/pria, kemeja formal, serta busana wisuda dan akad yang menuntut ketepatan lingkar kerah, lebar bahu, dada, dan panjang lengan manset.",
    mannequinType: "busana-formal",
    defaultCategoryId: "blazer",
    supportedCategories: ["blazer", "kemeja-pria", "busana-wisuda", "busana-pernikahan"],
    active: true,
    sortOrder: 4,
    updatedAt: DEFAULT_TEMPLATE_UPDATED_AT,
    fields: [
      {
        key: "bust",
        storageTarget: "standard",
        standardKey: "bust",
        label: "Lingkar dada / badan",
        shortLabel: "Lingkar dada",
        required: true,
        unit: "cm",
        min: 74,
        max: 160,
        step: 0.5,
        defaultValue: 96,
        guideTitle: "Cara mengukur lingkar dada formal",
        guideSteps: [
          "Kenakan kemeja tipis sebagai lapisan dalam saat mengukur blazer.",
          "Lingkarkan pita sejajar lantai pada bagian dada paling lebar dengan postur tegap alami.",
        ],
        tip: "Untuk blazer berfuring, pengukuran sambil mengenakan dalaman memastikan kancing depan tidak tertarik.",
        mannequinAnchor: "bust",
      },
      {
        key: "waist",
        storageTarget: "standard",
        standardKey: "waist",
        label: "Lingkar pinggang",
        shortLabel: "Lingkar pinggang",
        required: true,
        unit: "cm",
        min: 60,
        max: 150,
        step: 0.5,
        defaultValue: 82,
        guideTitle: "Cara mengukur lingkar pinggang formal",
        guideSteps: [
          "Ukur melingkar di garis pinggang tempat kancing utama blazer berada.",
          "Pastikan perut dalam kondisi rileks agar busana tetap nyaman saat duduk.",
        ],
        tip: "Catat di kolom preferensi jika menginginkan siluet slim-fit atau regular-fit.",
        mannequinAnchor: "waist",
      },
      {
        key: "hip",
        storageTarget: "standard",
        standardKey: "hip",
        label: "Lingkar panggul",
        shortLabel: "Lingkar panggul",
        required: true,
        unit: "cm",
        min: 80,
        max: 170,
        step: 0.5,
        defaultValue: 100,
        guideTitle: "Cara mengukur lingkar panggul",
        guideSteps: [
          "Berdiri tegak dengan saku celana kosong.",
          "Lingkarkan pita di bagian panggul terlebar agar belahan belakang (vent) blazer jatuh rata.",
        ],
        tip: "Penting agar bagian bawah blazer atau kemeja formal tidak menyempit di pinggul.",
        mannequinAnchor: "hip",
      },
      {
        key: "shoulderWidth",
        storageTarget: "standard",
        standardKey: "shoulderWidth",
        label: "Lebar bahu",
        shortLabel: "Lebar bahu",
        required: true,
        unit: "cm",
        min: 34,
        max: 64,
        step: 0.5,
        defaultValue: 42,
        guideTitle: "Cara mengukur lebar bahu blazer",
        guideSteps: [
          "Ukur di bagian punggung atas dari ujung tulang bahu kiri ke ujung tulang bahu kanan.",
          "Ikuti garis lengkung bahu secara alami tanpa menarik terlalu lurus.",
        ],
        tip: "Bahu adalah titik kunci blazer; ketepatan 0.5 cm sangat memengaruhi kerapian lengan jas.",
        mannequinAnchor: "shoulder",
      },
      {
        key: "sleeveLength",
        storageTarget: "standard",
        standardKey: "sleeveLength",
        label: "Panjang lengan",
        shortLabel: "Panjang lengan",
        required: true,
        unit: "cm",
        min: 45,
        max: 78,
        step: 0.5,
        defaultValue: 60,
        guideTitle: "Cara mengukur panjang lengan formal",
        guideSteps: [
          "Biarkan lengan turun santai di sisi badan dengan sedikit tekukan alami.",
          "Ukur dari ujung tulang bahu turun sampai tepat di tulang pergelangan tangan.",
        ],
        tip: "Untuk blazer di atas kemeja, ujung lengan blazer idealnya 1 cm lebih pendek dari manset kemeja.",
        mannequinAnchor: "sleeve",
      },
      {
        key: "garmentLength",
        storageTarget: "standard",
        standardKey: "garmentLength",
        label: "Panjang busana formal",
        shortLabel: "Panjang busana",
        required: true,
        unit: "cm",
        min: 58,
        max: 150,
        step: 1,
        defaultValue: 74,
        guideTitle: "Cara mengukur panjang blazer / kemeja",
        guideSteps: [
          "Ukur dari titik bahu tertinggi dekat kerah lurus ke bawah bagian depan.",
          "Hentikan pada batas bawah pinggul yang diinginkan (atau lebih panjang untuk setelan formal panjang).",
        ],
        tip: "Panjang blazer standar biasanya menutup seperdua hingga dua pertiga bagian pinggul.",
        mannequinAnchor: "length",
      },
      {
        key: "neckCircumference",
        storageTarget: "standard",
        standardKey: "neckCircumference",
        label: "Lingkar leher / kerah",
        shortLabel: "Lingkar kerah",
        required: true,
        unit: "cm",
        min: 30,
        max: 54,
        step: 0.5,
        defaultValue: 39,
        guideTitle: "Cara mengukur lingkar kerah",
        guideSteps: [
          "Lingkarkan pita pada pangkal leher tempat kerah kemeja mengancing.",
          "Selipkan 1 jari di dalam pita agar kerah tetap nyaman saat kancing teratas ditutup.",
        ],
        tip: "Wajib presisi untuk kemeja formal pria maupun blazer berkerah tegak.",
        mannequinAnchor: "neck",
      },
    ],
    sizePresets: [
      {
        id: "formal-s",
        label: "S",
        summary: "LD 90 · Bahu 40",
        values: {
          bust: 90,
          waist: 76,
          hip: 94,
          shoulderWidth: 40,
          sleeveLength: 58,
          garmentLength: 70,
          neckCircumference: 37,
        },
      },
      {
        id: "formal-m",
        label: "M",
        summary: "LD 96 · Bahu 42",
        values: {
          bust: 96,
          waist: 82,
          hip: 100,
          shoulderWidth: 42,
          sleeveLength: 60,
          garmentLength: 74,
          neckCircumference: 39,
        },
      },
      {
        id: "formal-l",
        label: "L",
        summary: "LD 104 · Bahu 45",
        values: {
          bust: 104,
          waist: 90,
          hip: 106,
          shoulderWidth: 45,
          sleeveLength: 62,
          garmentLength: 76,
          neckCircumference: 41,
        },
      },
      {
        id: "formal-xl",
        label: "XL",
        summary: "LD 112 · Bahu 47",
        values: {
          bust: 112,
          waist: 98,
          hip: 114,
          shoulderWidth: 47,
          sleeveLength: 63,
          garmentLength: 78,
          neckCircumference: 43,
        },
      },
    ],
  },
  {
    id: "bawahan",
    name: "Bawahan (Rok, Kain Lilit, Celana)",
    shortLabel: "Bawahan",
    tagline: "Fokus pinggang, panggul, panjang rok/celana, dan bukaan bawah",
    description:
      "Dirancang khusus untuk rok batik kebaya, rok A-line/span, kain lilit instan, maupun celana bahan agar jatuh rapi dan nyaman dipakai bergerak.",
    mannequinType: "bawahan",
    defaultCategoryId: "custom-lainnya",
    supportedCategories: ["custom-lainnya", "kebaya", "busana-wisuda", "busana-pernikahan"],
    active: true,
    sortOrder: 5,
    updatedAt: DEFAULT_TEMPLATE_UPDATED_AT,
    fields: [
      {
        key: "waist",
        storageTarget: "standard",
        standardKey: "waist",
        label: "Lingkar pinggang",
        shortLabel: "Lingkar pinggang",
        required: true,
        unit: "cm",
        min: 54,
        max: 145,
        step: 0.5,
        defaultValue: 74,
        guideTitle: "Cara mengukur lingkar pinggang bawahan",
        guideSteps: [
          "Tentukan tinggi ban pinggang yang biasa Anda pakai (high-waist atau tepat di lekuk pinggang).",
          "Lingkarkan pita sejajar lantai dengan ruang 1 jari agar tetap nyaman saat duduk.",
        ],
        tip: "Sebutkan di catatan jika menginginkan tambahan karet tersembunyi di sisi kanan-kiri pinggang.",
        mannequinAnchor: "waist",
      },
      {
        key: "hip",
        storageTarget: "standard",
        standardKey: "hip",
        label: "Lingkar panggul",
        shortLabel: "Lingkar panggul",
        required: true,
        unit: "cm",
        min: 76,
        max: 170,
        step: 0.5,
        defaultValue: 98,
        guideTitle: "Cara mengukur lingkar panggul",
        guideSteps: [
          "Berdiri tegak dengan kedua kaki dirapatkan.",
          "Lingkarkan pita di bagian panggul paling lebar (sekitar 18–20 cm di bawah pinggang).",
        ],
        tip: "Kunci kenyamanan rok span dan celana bahan agar jahitan samping tidak tertarik.",
        mannequinAnchor: "hip",
      },
      {
        key: "garmentLength",
        storageTarget: "standard",
        standardKey: "garmentLength",
        label: "Panjang rok / bawahan",
        shortLabel: "Panjang bawahan",
        required: true,
        unit: "cm",
        min: 45,
        max: 120,
        step: 1,
        defaultValue: 96,
        guideTitle: "Cara mengukur panjang bawahan",
        guideSteps: [
          "Ukur dari garis pinggang sisi samping turun lurus ke bawah hingga batas panjang yang diinginkan.",
          "Pertimbangkan tinggi sepatu atau sandal yang akan dikenakan bersama bawahan ini.",
        ],
        tip: "Rok midi umumnya 70–82 cm; rok panjang mata kaki berkisar 94–104 cm.",
        mannequinAnchor: "length",
      },
      {
        key: "thighCircumference",
        storageTarget: "extra",
        label: "Lingkar paha (opsional — celana)",
        shortLabel: "Lingkar paha",
        required: false,
        unit: "cm",
        min: 40,
        max: 95,
        step: 0.5,
        defaultValue: 58,
        guideTitle: "Cara mengukur lingkar paha",
        guideSteps: [
          "Berdiri santai dengan beban tubuh merata di kedua kaki.",
          "Lingkarkan pita di bagian paha atas yang terlebar, sejajar lantai.",
        ],
        tip: "Isi bila memesan celana bahan atau kulot; boleh dibiarkan default atau dikosongkan untuk rok.",
        mannequinAnchor: "thigh",
      },
      {
        key: "hemWidth",
        storageTarget: "extra",
        label: "Lingkar bawah / bukaan rok",
        shortLabel: "Bukaan bawah",
        required: false,
        unit: "cm",
        min: 40,
        max: 220,
        step: 2,
        defaultValue: 128,
        guideTitle: "Cara menentukan bukaan bawah rok",
        guideSteps: [
          "Tentukan seberapa lebar jatuhan ujung bawah rok yang diinginkan.",
          "Untuk rok span berkisar 92–106 cm (dengan belahan/wiru), sedangkan A-line 125–180 cm.",
        ],
        tip: "Ubah angka ini untuk melihat langsung perubahan siluet span, lurus, atau A-line pada mannequin.",
        mannequinAnchor: "hem",
      },
    ],
    sizePresets: [
      {
        id: "bawahan-s",
        label: "S",
        summary: "LP 68 · Panggul 92",
        values: { waist: 68, hip: 92, garmentLength: 94 },
        extraValues: { thighCircumference: 54, hemWidth: 120 },
      },
      {
        id: "bawahan-m",
        label: "M",
        summary: "LP 74 · Panggul 98",
        values: { waist: 74, hip: 98, garmentLength: 96 },
        extraValues: { thighCircumference: 58, hemWidth: 128 },
      },
      {
        id: "bawahan-l",
        label: "L",
        summary: "LP 82 · Panggul 106",
        values: { waist: 82, hip: 106, garmentLength: 98 },
        extraValues: { thighCircumference: 63, hemWidth: 138 },
      },
      {
        id: "bawahan-xl",
        label: "XL",
        summary: "LP 90 · Panggul 114",
        values: { waist: 90, hip: 114, garmentLength: 100 },
        extraValues: { thighCircumference: 68, hemWidth: 148 },
      },
    ],
  },
];

export type MeasurementGarmentTypeId =
  | "kebaya"
  | "gamis"
  | "kemeja-pria"
  | "blazer"
  | "mukena"
  | "hijab"
  | "rok-celana"
  | "busana-wisuda"
  | "busana-pernikahan"
  | "custom-lainnya";

export type MeasurementGarmentTypeOption = {
  id: MeasurementGarmentTypeId;
  index: string;
  name: string;
  description: string;
  categoryId: GarmentCategoryId;
  templateId: MeasurementTemplateId;
};

/**
 * Daftar satu pintu "Jenis Pakaian" untuk Tahap 01 Measurement Studio.
 * Setiap jenis pakaian dipetakan secara konsisten ke kategori pesanan dan
 * template pengukuran yang sesuai sehingga pelanggan tidak perlu memilih
 * template secara manual.
 */
export const MEASUREMENT_GARMENT_TYPES: MeasurementGarmentTypeOption[] = [
  {
    id: "kebaya",
    index: "01",
    name: "Kebaya",
    description: "Kartini, modern, maupun brokat formal",
    categoryId: "kebaya",
    templateId: "busana-formal",
  },
  {
    id: "gamis",
    index: "02",
    name: "Gamis",
    description: "Harian, syar'i, hingga gaun panjang pesta",
    categoryId: "gamis",
    templateId: "gamis",
  },
  {
    id: "kemeja-pria",
    index: "03",
    name: "Kemeja",
    description: "Kemeja formal, kerja, dan kasual",
    categoryId: "kemeja-pria",
    templateId: "atasan",
  },
  {
    id: "blazer",
    index: "04",
    name: "Blazer",
    description: "Struktur bahu rapi untuk kerja & acara resmi",
    categoryId: "blazer",
    templateId: "busana-formal",
  },
  {
    id: "mukena",
    index: "05",
    name: "Mukena",
    description: "Lingkar wajah nyaman dan jatuhan leluasa",
    categoryId: "mukena",
    templateId: "hijab",
  },
  {
    id: "hijab",
    index: "06",
    name: "Hijab",
    description: "Khimar & hijab custom depan-belakang presisi",
    categoryId: "mukena",
    templateId: "hijab",
  },
  {
    id: "rok-celana",
    index: "07",
    name: "Rok / Celana",
    description: "Rok batik, A-line, kain lilit, atau celana bahan",
    categoryId: "custom-lainnya",
    templateId: "bawahan",
  },
  {
    id: "busana-wisuda",
    index: "08",
    name: "Busana Wisuda",
    description: "Busana wisudawan dan pendamping serasi",
    categoryId: "busana-wisuda",
    templateId: "busana-formal",
  },
  {
    id: "busana-pernikahan",
    index: "09",
    name: "Busana Pernikahan",
    description: "Kebaya akad, resepsi, dan busana keluarga",
    categoryId: "busana-pernikahan",
    templateId: "busana-formal",
  },
  {
    id: "custom-lainnya",
    index: "10",
    name: "Custom Lainnya",
    description: "Tunik, seragam keluarga, atau model khusus",
    categoryId: "custom-lainnya",
    templateId: "atasan",
  },
];

export type MeasurementStudioDraft = {
  id: string | null;
  label: string;
  garmentTypeId: MeasurementGarmentTypeId;
  templateId: MeasurementTemplateId;
  categoryHint: GarmentCategoryId;
  values: MeasurementValues;
  extraValues: MeasurementExtraValues;
  notes: string;
};

export type MeasurementValidationResult = {
  valid: boolean;
  errors: Record<string, string>;
  warnings: string[];
};

export type MannequinProportions = {
  neckScale: number;
  shoulderScale: number;
  bustScale: number;
  waistScale: number;
  hipScale: number;
  sleeveRatio: number;
  lengthRatio: number;
  backDropRatio: number;
  hemScale: number;
  thighScale: number;
};

export function createEmptyMeasurementValues(): MeasurementValues {
  return {
    bust: "",
    waist: "",
    hip: "",
    shoulderWidth: "",
    sleeveLength: "",
    garmentLength: "",
    neckCircumference: "",
  };
}

export function isMeasurementTemplateId(value: string): value is MeasurementTemplateId {
  return DEFAULT_MEASUREMENT_TEMPLATES.some((template) => template.id === value);
}

export function normalizeMeasurementTemplates(
  stored: MeasurementTemplateConfig[] | null | undefined
): MeasurementTemplateConfig[] {
  if (!Array.isArray(stored) || stored.length === 0) {
    return DEFAULT_MEASUREMENT_TEMPLATES.map(cloneTemplate);
  }

  const byId = new Map<MeasurementTemplateId, MeasurementTemplateConfig>();
  for (const fallback of DEFAULT_MEASUREMENT_TEMPLATES) {
    byId.set(fallback.id, cloneTemplate(fallback));
  }

  for (const candidate of stored) {
    if (!candidate || !isMeasurementTemplateId(candidate.id)) continue;
    const base = byId.get(candidate.id);
    if (!base) continue;

    const validFields =
      Array.isArray(candidate.fields) && candidate.fields.length > 0
        ? candidate.fields.map((field) => ({
            ...field,
            unit: "cm" as const,
            guideSteps: Array.isArray(field.guideSteps) ? [...field.guideSteps] : [],
          }))
        : base.fields;

    const validPresets =
      Array.isArray(candidate.sizePresets) && candidate.sizePresets.length > 0
        ? candidate.sizePresets.map((preset) => ({
            ...preset,
            values: { ...preset.values },
            extraValues: preset.extraValues ? { ...preset.extraValues } : undefined,
          }))
        : base.sizePresets;

    byId.set(candidate.id, {
      ...base,
      ...candidate,
      fields: validFields,
      sizePresets: validPresets,
      supportedCategories:
        Array.isArray(candidate.supportedCategories) && candidate.supportedCategories.length > 0
          ? [...candidate.supportedCategories]
          : base.supportedCategories,
    });
  }

  return Array.from(byId.values()).sort((a, b) => a.sortOrder - b.sortOrder);
}

function cloneTemplate(template: MeasurementTemplateConfig): MeasurementTemplateConfig {
  return {
    ...template,
    supportedCategories: [...template.supportedCategories],
    fields: template.fields.map((field) => ({
      ...field,
      guideSteps: [...field.guideSteps],
    })),
    sizePresets: template.sizePresets.map((preset) => ({
      ...preset,
      values: { ...preset.values },
      extraValues: preset.extraValues ? { ...preset.extraValues } : undefined,
    })),
  };
}

export function upsertMeasurementTemplate(
  templates: MeasurementTemplateConfig[],
  updated: MeasurementTemplateConfig
): MeasurementTemplateConfig[] {
  const normalized = normalizeMeasurementTemplates(templates);
  const next = normalized.map((template) => (template.id === updated.id ? cloneTemplate(updated) : template));
  return next.sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getMeasurementTemplateById(
  templateId: MeasurementTemplateId,
  templates: MeasurementTemplateConfig[] = DEFAULT_MEASUREMENT_TEMPLATES
): MeasurementTemplateConfig {
  return (
    templates.find((template) => template.id === templateId) ??
    DEFAULT_MEASUREMENT_TEMPLATES.find((template) => template.id === templateId) ??
    DEFAULT_MEASUREMENT_TEMPLATES[0]
  );
}

export function getDefaultTemplateForCategory(
  categoryId: GarmentCategoryId | ""
): MeasurementTemplateId {
  switch (categoryId) {
    case "mukena":
      return "hijab";
    case "gamis":
      return "gamis";
    case "kebaya":
    case "blazer":
    case "busana-wisuda":
    case "busana-pernikahan":
      return "busana-formal";
    case "kemeja-pria":
    case "custom-lainnya":
      return "atasan";
    default:
      return "gamis";
  }
}

export function getMeasurementGarmentTypeById(
  id: MeasurementGarmentTypeId
): MeasurementGarmentTypeOption {
  return (
    MEASUREMENT_GARMENT_TYPES.find((item) => item.id === id) ?? MEASUREMENT_GARMENT_TYPES[1]
  );
}

export function resolveMeasurementGarmentType(
  templateId: MeasurementTemplateId,
  categoryId?: GarmentCategoryId
): MeasurementGarmentTypeOption {
  if (categoryId) {
    const exact = MEASUREMENT_GARMENT_TYPES.find(
      (item) => item.categoryId === categoryId && item.templateId === templateId
    );
    if (exact) return exact;
  }

  const byTemplate = MEASUREMENT_GARMENT_TYPES.find((item) => item.templateId === templateId);
  if (byTemplate) return byTemplate;

  if (categoryId) {
    const byCategory = MEASUREMENT_GARMENT_TYPES.find((item) => item.categoryId === categoryId);
    if (byCategory) return byCategory;
  }

  return MEASUREMENT_GARMENT_TYPES[1];
}

export function formatMeasurementNumber(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function parseMeasurementNumeric(raw: string | undefined, fallback: number): number {
  if (!raw || !raw.trim()) return fallback;
  const parsed = Number(raw.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getTemplateFieldValue(
  draft: Pick<MeasurementStudioDraft, "values" | "extraValues">,
  field: MeasurementTemplateField
): string {
  if (field.storageTarget === "standard" && field.standardKey) {
    return draft.values[field.standardKey] ?? "";
  }
  return draft.extraValues[field.key] ?? "";
}

export function setTemplateFieldValue(
  draft: MeasurementStudioDraft,
  field: MeasurementTemplateField,
  value: string
): MeasurementStudioDraft {
  if (field.storageTarget === "standard" && field.standardKey) {
    return {
      ...draft,
      values: {
        ...draft.values,
        [field.standardKey]: value,
      },
    };
  }
  return {
    ...draft,
    extraValues: {
      ...draft.extraValues,
      [field.key]: value,
    },
  };
}

export function stepMeasurementValue(
  currentRaw: string,
  delta: number,
  field: Pick<MeasurementTemplateField, "min" | "max" | "defaultValue">
): string {
  const base = parseMeasurementNumeric(currentRaw, field.defaultValue);
  const clamped = Math.min(field.max, Math.max(field.min, base + delta));
  return formatMeasurementNumber(clamped);
}

export function createMeasurementDraftForTemplate(
  templateId: MeasurementTemplateId = "gamis",
  templates: MeasurementTemplateConfig[] = DEFAULT_MEASUREMENT_TEMPLATES
): MeasurementStudioDraft {
  const template = getMeasurementTemplateById(templateId, templates);
  const values = createEmptyMeasurementValues();
  const extraValues: MeasurementExtraValues = {};

  for (const field of template.fields) {
    const formatted = formatMeasurementNumber(field.defaultValue);
    if (field.storageTarget === "standard" && field.standardKey) {
      values[field.standardKey] = formatted;
    } else {
      extraValues[field.key] = formatted;
    }
  }

  const resolvedGarmentType = resolveMeasurementGarmentType(
    template.id,
    template.defaultCategoryId
  );

  return {
    id: null,
    label: "",
    garmentTypeId: resolvedGarmentType.id,
    templateId: template.id,
    categoryHint: template.defaultCategoryId,
    values,
    extraValues,
    notes: "",
  };
}

export function switchDraftTemplate(
  draft: MeasurementStudioDraft,
  nextTemplateId: MeasurementTemplateId,
  templates: MeasurementTemplateConfig[] = DEFAULT_MEASUREMENT_TEMPLATES
): MeasurementStudioDraft {
  const nextTemplate = getMeasurementTemplateById(nextTemplateId, templates);
  const base = createMeasurementDraftForTemplate(nextTemplate.id, templates);

  // Pertahankan ukuran tubuh anatomis bersama (dada, pinggang, panggul, bahu, lengan)
  // jika masih dalam rentang template baru, sedangkan panjang busana & lingkar wajah/leher
  // mengikuti default template baru agar konteks ukurannya selalu tepat.
  const sharedBodyKeys = new Set<MeasurementStandardKey>([
    "bust",
    "waist",
    "hip",
    "shoulderWidth",
    "sleeveLength",
  ]);

  for (const field of nextTemplate.fields) {
    if (
      field.storageTarget === "standard" &&
      field.standardKey &&
      sharedBodyKeys.has(field.standardKey)
    ) {
      const existingRaw = draft.values[field.standardKey];
      const existingNum = Number(existingRaw);
      if (
        existingRaw &&
        Number.isFinite(existingNum) &&
        existingNum >= field.min &&
        existingNum <= field.max
      ) {
        base.values[field.standardKey] = existingRaw;
      }
    }
  }

  return {
    ...base,
    id: draft.id,
    label: draft.label,
    notes: draft.notes,
  };
}

export function createMeasurementDraftFromProfile(
  profile: MeasurementProfile,
  templates: MeasurementTemplateConfig[] = DEFAULT_MEASUREMENT_TEMPLATES
): MeasurementStudioDraft {
  const template = getMeasurementTemplateById(profile.templateId, templates);
  const categoryHint = profile.categoryHint ?? template.defaultCategoryId;
  const resolvedGarmentType = resolveMeasurementGarmentType(template.id, categoryHint);
  return {
    id: profile.id,
    label: profile.label,
    garmentTypeId: resolvedGarmentType.id,
    templateId: template.id,
    categoryHint,
    values: {
      ...createEmptyMeasurementValues(),
      ...profile.values,
    },
    extraValues: { ...(profile.extraValues ?? {}) },
    notes: profile.notes ?? "",
  };
}

export function applySizePresetToDraft(
  draft: MeasurementStudioDraft,
  presetId: string,
  templates: MeasurementTemplateConfig[] = DEFAULT_MEASUREMENT_TEMPLATES
): MeasurementStudioDraft {
  const template = getMeasurementTemplateById(draft.templateId, templates);
  const preset = template.sizePresets.find((item) => item.id === presetId);
  if (!preset) return draft;

  const nextValues: MeasurementValues = { ...draft.values };
  for (const [key, val] of Object.entries(preset.values)) {
    if (typeof val === "number") {
      nextValues[key as MeasurementStandardKey] = formatMeasurementNumber(val);
    }
  }

  const nextExtra: MeasurementExtraValues = { ...draft.extraValues };
  if (preset.extraValues) {
    for (const [key, val] of Object.entries(preset.extraValues)) {
      nextExtra[key] = formatMeasurementNumber(val);
    }
  }

  return {
    ...draft,
    values: nextValues,
    extraValues: nextExtra,
  };
}

export function validateMeasurementField(
  raw: string,
  field: MeasurementTemplateField
): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return field.required ? `${field.label} wajib diisi (${field.min}–${field.max} cm).` : null;
  }

  const numeric = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(numeric)) {
    return `${field.label} harus berupa angka dalam cm.`;
  }

  if (numeric < field.min || numeric > field.max) {
    return `${field.label} harus berada di rentang ${field.min}–${field.max} cm.`;
  }

  return null;
}

export function validateMeasurementDraft(
  draft: MeasurementStudioDraft,
  templates: MeasurementTemplateConfig[] = DEFAULT_MEASUREMENT_TEMPLATES
): MeasurementValidationResult {
  const errors: Record<string, string> = {};
  const warnings: string[] = [];

  const label = draft.label.trim();
  if (label.length < 2) {
    errors.label = "Beri nama profil ukuran minimal 2 karakter (contoh: Ibu — Gamis Lebaran).";
  } else if (label.length > MAX_PROFILE_LABEL_LENGTH) {
    errors.label = `Nama profil maksimal ${MAX_PROFILE_LABEL_LENGTH} karakter.`;
  }

  if (draft.notes.length > MAX_PROFILE_NOTES_LENGTH) {
    errors.notes = `Catatan maksimal ${MAX_PROFILE_NOTES_LENGTH} karakter.`;
  }

  const template = getMeasurementTemplateById(draft.templateId, templates);
  if (!template) {
    errors.templateId = "Pilih template kategori ukuran yang valid.";
  } else {
    for (const field of template.fields) {
      const raw = getTemplateFieldValue(draft, field);
      const fieldError = validateMeasurementField(raw, field);
      if (fieldError) {
        errors[field.key] = fieldError;
      }
    }

    // Peringatan proporsi non-pemblokir untuk membantu pengguna mengecek ulang angka.
    const bust = parseMeasurementNumeric(draft.values.bust, 0);
    const waist = parseMeasurementNumeric(draft.values.waist, 0);
    const hip = parseMeasurementNumeric(draft.values.hip, 0);
    const front = parseMeasurementNumeric(draft.values.garmentLength, 0);
    const back = parseMeasurementNumeric(draft.extraValues.backLength, 0);

    if (bust > 0 && waist > 0 && waist > bust + 12) {
      warnings.push(
        "Lingkar pinggang lebih besar lebih dari 12 cm dibanding lingkar badan. Pastikan kedua angka tidak tertukar."
      );
    }

    if (waist > 0 && hip > 0 && waist > hip + 8) {
      warnings.push(
        "Lingkar pinggang tercatat lebih besar dari lingkar panggul. Periksa kembali jika tidak disengaja."
      );
    }

    if (template.id === "hijab" && front > 0 && back > 0 && back < front) {
      warnings.push(
        "Panjang belakang hijab/mukena lebih pendek dari panjang depan. Pastikan sudah sesuai model yang diinginkan."
      );
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    warnings,
  };
}

export function generateMeasurementProfileId(now: Date = new Date()): string {
  return `measure-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createSavedMeasurementProfile(
  draft: MeasurementStudioDraft,
  templates: MeasurementTemplateConfig[] = DEFAULT_MEASUREMENT_TEMPLATES,
  now: Date = new Date()
): MeasurementProfile {
  const template = getMeasurementTemplateById(draft.templateId, templates);
  const cleanValues = createEmptyMeasurementValues();
  const cleanExtra: MeasurementExtraValues = {};

  for (const field of template.fields) {
    const raw = getTemplateFieldValue(draft, field).trim();
    if (!raw) continue;
    const numeric = Number(raw.replace(",", "."));
    const formatted = Number.isFinite(numeric) ? formatMeasurementNumber(numeric) : raw;

    if (field.storageTarget === "standard" && field.standardKey) {
      cleanValues[field.standardKey] = formatted;
    } else {
      cleanExtra[field.key] = formatted;
    }
  }

  return {
    id: draft.id ?? generateMeasurementProfileId(now),
    label: draft.label.trim(),
    templateId: template.id,
    categoryHint: draft.categoryHint,
    values: cleanValues,
    extraValues: Object.keys(cleanExtra).length > 0 ? cleanExtra : undefined,
    notes: draft.notes.trim(),
    updatedAt: now.toISOString(),
  };
}

export function upsertMeasurementProfile(
  profiles: MeasurementProfile[],
  profile: MeasurementProfile
): MeasurementProfile[] {
  const rest = profiles.filter((item) => item.id !== profile.id);
  return [profile, ...rest].slice(0, MAX_SAVED_MEASUREMENT_PROFILES);
}

export function removeMeasurementProfile(
  profiles: MeasurementProfile[],
  id: string
): MeasurementProfile[] {
  return profiles.filter((item) => item.id !== id);
}

export function buildMeasurementOrderHref(id: string): string {
  return `/orders?measurementId=${encodeURIComponent(id)}`;
}

export function buildMeasurementStudioHref(options: {
  templateId?: MeasurementTemplateId;
  categoryId?: GarmentCategoryId | "";
  profileId?: string;
}): string {
  const params = new URLSearchParams();
  if (options.profileId) {
    params.set("profile", options.profileId);
  } else if (options.templateId) {
    params.set("template", options.templateId);
  } else if (options.categoryId) {
    params.set("category", options.categoryId);
  }
  const query = params.toString();
  return query ? `/measurement-studio?${query}` : "/measurement-studio";
}

export function summarizeMeasurementProfile(
  profile: Pick<MeasurementProfile, "templateId" | "values" | "extraValues">,
  templates: MeasurementTemplateConfig[] = DEFAULT_MEASUREMENT_TEMPLATES
): Array<{ key: string; label: string; value: string }> {
  const template = getMeasurementTemplateById(profile.templateId, templates);
  const rows: Array<{ key: string; label: string; value: string }> = [];

  for (const field of template.fields) {
    const raw =
      field.storageTarget === "standard" && field.standardKey
        ? profile.values[field.standardKey]
        : profile.extraValues?.[field.key] ?? "";
    if (raw && raw.trim().length > 0) {
      rows.push({
        key: field.key,
        label: field.shortLabel,
        value: `${raw.trim()} cm`,
      });
    }
  }

  return rows;
}

export function getMeasurementCategoryName(categoryId?: GarmentCategoryId): string {
  if (!categoryId) return "Semua kategori";
  return garmentCategories.find((item) => item.id === categoryId)?.name ?? categoryId;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function ratioFromField(
  raw: string | undefined,
  field: MeasurementTemplateField | undefined,
  fallbackRatio = 0.5
): number {
  if (!field) return fallbackRatio;
  const numeric = parseMeasurementNumeric(raw, field.defaultValue);
  if (field.max <= field.min) return fallbackRatio;
  return clamp01((numeric - field.min) / (field.max - field.min));
}

/**
 * Mengonversi angka ukuran tubuh (cm) menjadi faktor proporsi visual
 * agar SVG mannequin 2D merespons setiap perubahan ukuran secara halus.
 */
export function computeMannequinProportions(
  templateId: MeasurementTemplateId,
  values: MeasurementValues,
  extraValues: MeasurementExtraValues = {},
  templates: MeasurementTemplateConfig[] = DEFAULT_MEASUREMENT_TEMPLATES
): MannequinProportions {
  const template = getMeasurementTemplateById(templateId, templates);
  const findField = (key: string) => template.fields.find((field) => field.key === key);

  const neckR = ratioFromField(values.neckCircumference, findField("neckCircumference"), 0.42);
  const shoulderR = ratioFromField(values.shoulderWidth, findField("shoulderWidth"), 0.45);
  const bustR = ratioFromField(values.bust, findField("bust"), 0.42);
  const waistR = ratioFromField(values.waist, findField("waist"), 0.38);
  const hipR = ratioFromField(values.hip, findField("hip"), 0.42);
  const sleeveR = ratioFromField(values.sleeveLength, findField("sleeveLength"), 0.65);
  const lengthR = ratioFromField(values.garmentLength, findField("garmentLength"), 0.55);
  const backR = ratioFromField(extraValues.backLength, findField("backLength"), 0.58);
  const hemR = ratioFromField(extraValues.hemWidth, findField("hemWidth"), 0.48);
  const thighR = ratioFromField(extraValues.thighCircumference, findField("thighCircumference"), 0.42);

  return {
    neckScale: 0.84 + neckR * 0.34,
    shoulderScale: 0.82 + shoulderR * 0.38,
    bustScale: 0.8 + bustR * 0.42,
    waistScale: 0.76 + waistR * 0.48,
    hipScale: 0.8 + hipR * 0.44,
    sleeveRatio: 0.35 + sleeveR * 0.65,
    lengthRatio: 0.38 + lengthR * 0.62,
    backDropRatio: 0.42 + backR * 0.58,
    hemScale: 0.68 + hemR * 0.68,
    thighScale: 0.82 + thighR * 0.36,
  };
}
