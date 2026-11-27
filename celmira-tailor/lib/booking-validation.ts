import type { GarmentCategoryId, MeasurementValues, OrderDraft } from "@/lib/types/tailor";

export type StepValidationResult = {
  valid: boolean;
  errors: Record<string, string>;
};

export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_ATTACHMENTS_COUNT = 5;

export function validateAttachmentFile(file: {
  name: string;
  size: number;
  type: string;
}): string | null {
  const normalizedType = file.type.toLowerCase();
  const isAllowed = (ALLOWED_ATTACHMENT_MIME_TYPES as readonly string[]).includes(normalizedType);

  if (!isAllowed) {
    return `File "${file.name}" harus berupa gambar (JPG, PNG, WEBP) atau dokumen PDF.`;
  }

  if (file.size <= 0) {
    return `File "${file.name}" kosong dan tidak dapat diunggah.`;
  }

  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return `Ukuran "${file.name}" melebihi batas maksimal 5 MB per file.`;
  }

  return null;
}

export function validateStep1(draft: OrderDraft): StepValidationResult {
  const errors: Record<string, string> = {};

  if (!draft.categoryId) {
    errors.categoryId = "Pilih salah satu kategori busana terlebih dahulu.";
  }

  if (draft.designSource === "celmira") {
    if (!draft.selectedCelmiraDesignId) {
      errors.design = "Pilih salah satu referensi desain Celmira.";
    }
  } else if (draft.designSource === "design-studio") {
    if (!draft.selectedStudioDesignId) {
      errors.design = "Pilih konfigurasi tersimpan dari Design Studio atau ganti sumber desain.";
    }
  } else if (draft.designSource === "custom-upload") {
    if (draft.attachments.length === 0) {
      errors.attachments =
        "Unggah minimal 1 foto referensi, sketsa, atau PDF untuk desain custom Anda.";
    }
    if (!draft.customDesignTitle.trim()) {
      errors.customDesignTitle = "Berikan nama singkat model yang Anda inginkan.";
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateStep2(draft: OrderDraft): StepValidationResult {
  const errors: Record<string, string> = {};
  const specs = draft.specifications;

  if (!specs.fabric.trim()) {
    errors.fabric = "Pilih jenis kain atau pilih opsi konsultasi.";
  }

  if (!specs.colorName.trim()) {
    errors.colorName = "Tentukan warna utama busana.";
  }

  if (!specs.sleeveStyle.trim()) {
    errors.sleeveStyle = "Pilih model lengan.";
  }

  if (!specs.collarStyle.trim()) {
    errors.collarStyle = "Pilih model kerah.";
  }

  if (!specs.lengthOption.trim()) {
    errors.lengthOption = "Pilih panjang busana.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

type MeasurementRule = {
  key: keyof MeasurementValues;
  label: string;
  min: number;
  max: number;
};

const MEASUREMENT_RULES: MeasurementRule[] = [
  { key: "bust", label: "Lingkar badan/dada", min: 50, max: 180 },
  { key: "waist", label: "Lingkar pinggang", min: 40, max: 170 },
  { key: "hip", label: "Lingkar panggul", min: 50, max: 190 },
  { key: "shoulderWidth", label: "Lebar bahu", min: 25, max: 70 },
  { key: "sleeveLength", label: "Panjang lengan", min: 15, max: 90 },
  { key: "garmentLength", label: "Panjang busana", min: 35, max: 185 },
  { key: "neckCircumference", label: "Lingkar leher", min: 25, max: 60 },
];

export function getRequiredMeasurementKeys(
  categoryId: GarmentCategoryId | ""
): Array<keyof MeasurementValues> {
  if (categoryId === "mukena") {
    return ["garmentLength"];
  }

  if (categoryId === "kemeja-pria" || categoryId === "custom-lainnya") {
    return ["bust", "waist", "shoulderWidth", "sleeveLength", "garmentLength"];
  }

  return ["bust", "waist", "hip", "shoulderWidth", "sleeveLength", "garmentLength"];
}

export function validateStep3(draft: OrderDraft): StepValidationResult {
  const errors: Record<string, string> = {};
  const { measurements } = draft;

  if (measurements.mode === "sample_garment") {
    if (measurements.sampleGarmentNote.trim().length < 8) {
      errors.sampleGarmentNote =
        "Jelaskan baju contoh yang akan dipakai sebagai acuan ukuran (minimal 8 karakter).";
    }
    return {
      valid: Object.keys(errors).length === 0,
      errors,
    };
  }

  if (measurements.mode === "profile" && !measurements.profileId) {
    errors.profileId = "Pilih profil ukuran tersimpan atau isi ukuran secara manual.";
  }

  const requiredKeys = getRequiredMeasurementKeys(draft.categoryId);

  for (const rule of MEASUREMENT_RULES) {
    const raw = String(measurements.values?.[rule.key] ?? "").trim();
    const isRequired = requiredKeys.includes(rule.key);

    if (!raw) {
      if (isRequired) {
        errors[rule.key] = `${rule.label} wajib diisi (cm).`;
      }
      continue;
    }

    const numeric = Number(raw);
    if (!Number.isFinite(numeric) || numeric < rule.min || numeric > rule.max) {
      errors[rule.key] = `${rule.label} harus di antara ${rule.min}–${rule.max} cm.`;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function normalizeWhatsappNumber(value: string): string {
  return value.replace(/[\s\-()]/g, "").trim();
}

export function isValidWhatsappNumber(value: string): boolean {
  const cleaned = normalizeWhatsappNumber(value);
  return /^(\+62|62|0)8[1-9][0-9]{7,12}$/.test(cleaned);
}

export function isValidOptionalEmail(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export function getMinimumTargetDate(referenceDate: Date = new Date()): string {
  const minDate = new Date(
    Date.UTC(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate() + 3)
  );
  return minDate.toISOString().slice(0, 10);
}

export function validateStep4(
  draft: OrderDraft,
  referenceDate: Date = new Date()
): StepValidationResult {
  const errors: Record<string, string> = {};

  if (draft.customer.fullName.trim().length < 2) {
    errors.fullName = "Masukkan nama lengkap Anda (minimal 2 karakter).";
  }

  if (!draft.customer.whatsapp.trim()) {
    errors.whatsapp = "Nomor WhatsApp wajib diisi untuk koordinasi penawaran.";
  } else if (!isValidWhatsappNumber(draft.customer.whatsapp)) {
    errors.whatsapp = "Gunakan nomor WhatsApp Indonesia yang valid (contoh: 081234567890).";
  }

  if (!isValidOptionalEmail(draft.customer.email)) {
    errors.email = "Format email tidak valid.";
  }

  if (draft.delivery.method === "shipping") {
    if (draft.delivery.addressLine.trim().length < 10) {
      errors.addressLine = "Masukkan alamat pengiriman lengkap (jalan, RT/RW, kecamatan).";
    }
    if (draft.delivery.city.trim().length < 3) {
      errors.city = "Masukkan kota/kabupaten tujuan pengiriman.";
    }
    if (draft.delivery.postalCode.trim() && !/^[0-9]{5}$/.test(draft.delivery.postalCode.trim())) {
      errors.postalCode = "Kode pos harus terdiri dari 5 digit angka.";
    }
  }

  if (!draft.targetDate) {
    errors.targetDate = "Pilih target tanggal selesai yang diharapkan.";
  } else {
    const minDate = getMinimumTargetDate(referenceDate);
    if (draft.targetDate < minDate) {
      errors.targetDate = `Target tanggal minimal ${minDate} (3 hari dari sekarang).`;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateStep5(draft: OrderDraft, referenceDate: Date = new Date()): StepValidationResult {
  const step1 = validateStep1(draft);
  const step2 = validateStep2(draft);
  const step3 = validateStep3(draft);
  const step4 = validateStep4(draft, referenceDate);

  const errors: Record<string, string> = {
    ...step1.errors,
    ...step2.errors,
    ...step3.errors,
    ...step4.errors,
  };

  if (!draft.agreedToTerms) {
    errors.agreedToTerms =
      "Setujui ketentuan pengajuan pesanan dan alur penawaran terlebih dahulu.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
