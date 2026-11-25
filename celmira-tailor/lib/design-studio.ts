import {
  celmiraDesignReferences,
  colorPaletteOptions,
  createInitialSpecifications,
  garmentCategories,
} from "./booking-options.ts";
import type {
  DesignStudioSavedConfig,
  GarmentCategoryId,
  GarmentSpecifications,
  ReferenceAttachment,
} from "@/lib/types/tailor";

export const MAX_SAVED_DESIGNS = 12;
export const MAX_DESIGN_TITLE_LENGTH = 80;
export const MAX_DESIGN_NOTES_LENGTH = 500;

export const designModelOptionsByCategory: Record<GarmentCategoryId, readonly string[]> = {
  kebaya: ["Kebaya Kartini", "Kebaya Modern", "Kebaya Akad", "Atasan Kebaya"],
  gamis: ["Gamis Flowy", "Gamis Syar'i", "Gamis Pesta", "Gamis Harian"],
  "kemeja-pria": ["Kemeja Formal", "Kemeja Kerja", "Kemeja Kasual"],
  blazer: ["Blazer Wanita", "Blazer Pria", "Blazer Wisuda"],
  mukena: ["Mukena Dewasa", "Mukena Travel", "Mukena Anak"],
  "busana-wisuda": ["Kebaya Wisuda", "Setelan Wisuda", "Busana Pendamping"],
  "busana-pernikahan": ["Kebaya Akad", "Gaun Resepsi", "Busana Keluarga"],
  "custom-lainnya": ["Seragam Keluarga", "Busana Anak", "Tunik Custom"],
};

export type DesignStudioDraft = {
  id: string | null;
  title: string;
  categoryId: GarmentCategoryId;
  modelName: string;
  specifications: GarmentSpecifications;
  attachments: ReferenceAttachment[];
};

export type DesignValidationResult = {
  valid: boolean;
  errors: Record<string, string>;
};

export function getModelOptions(categoryId: GarmentCategoryId): readonly string[] {
  return designModelOptionsByCategory[categoryId] ?? designModelOptionsByCategory["custom-lainnya"];
}

export function getCategoryName(categoryId: GarmentCategoryId): string {
  return garmentCategories.find((category) => category.id === categoryId)?.name ?? categoryId;
}

function getDefaultSpecificationsForCategory(categoryId: GarmentCategoryId): GarmentSpecifications {
  const initial = createInitialSpecifications();
  const reference = celmiraDesignReferences.find((item) => item.categoryId === categoryId);
  if (!reference) return initial;
  return { ...initial, ...reference.defaults };
}

export function createEmptyDesignDraft(
  categoryId: GarmentCategoryId = "kebaya"
): DesignStudioDraft {
  return {
    id: null,
    title: "",
    categoryId,
    modelName: getModelOptions(categoryId)[0] ?? "Model custom",
    specifications: getDefaultSpecificationsForCategory(categoryId),
    attachments: [],
  };
}

export function createDesignDraftFromReference(referenceId: string): DesignStudioDraft | null {
  const reference = celmiraDesignReferences.find((item) => item.id === referenceId);
  if (!reference) return null;

  return {
    id: null,
    title: `${reference.title} — Kustom`,
    categoryId: reference.categoryId,
    modelName: reference.title,
    specifications: {
      ...createInitialSpecifications(),
      ...reference.defaults,
    },
    attachments: [],
  };
}

export function createDesignDraftFromSaved(config: DesignStudioSavedConfig): DesignStudioDraft {
  return {
    id: config.id,
    title: config.title,
    categoryId: config.categoryId,
    modelName: config.modelName,
    specifications: { ...config.specifications },
    attachments: config.attachments.map((attachment) => ({ ...attachment })),
  };
}

export function validateDesignDraft(draft: DesignStudioDraft): DesignValidationResult {
  const errors: Record<string, string> = {};
  const title = draft.title.trim();
  const specs = draft.specifications;

  if (title.length < 3) {
    errors.title = "Beri nama desain minimal 3 karakter agar mudah ditemukan kembali.";
  } else if (title.length > MAX_DESIGN_TITLE_LENGTH) {
    errors.title = `Nama desain maksimal ${MAX_DESIGN_TITLE_LENGTH} karakter.`;
  }

  if (!garmentCategories.some((category) => category.id === draft.categoryId)) {
    errors.categoryId = "Pilih kategori busana yang valid.";
  }

  if (!draft.modelName.trim()) {
    errors.modelName = "Pilih atau tuliskan nama model busana.";
  }

  if (!specs.fabric.trim()) {
    errors.fabric = "Pilih bahan utama busana.";
  }

  if (specs.fabric === "Bahan dari pelanggan sendiri" && specs.customFabricNote.trim().length < 3) {
    errors.customFabricNote = "Sebutkan jenis bahan yang akan Anda bawa.";
  }

  if (!specs.colorName.trim()) {
    errors.colorName = "Tentukan warna utama busana.";
  }

  if (!/^#[0-9a-f]{6}$/i.test(specs.colorHex)) {
    errors.colorHex = "Kode warna tidak valid.";
  }

  if (!specs.sleeveStyle.trim()) errors.sleeveStyle = "Pilih model lengan.";
  if (!specs.collarStyle.trim()) errors.collarStyle = "Pilih model kerah.";
  if (!specs.lengthOption.trim()) errors.lengthOption = "Pilih panjang busana.";

  if (specs.notes.length > MAX_DESIGN_NOTES_LENGTH) {
    errors.notes = `Catatan maksimal ${MAX_DESIGN_NOTES_LENGTH} karakter.`;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function generateDesignId(now: Date = new Date()): string {
  return `design-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`;
}

function trimSpecifications(specs: GarmentSpecifications): GarmentSpecifications {
  return {
    fabric: specs.fabric.trim(),
    customFabricNote: specs.customFabricNote.trim(),
    colorName: specs.colorName.trim(),
    colorHex: specs.colorHex.trim(),
    sleeveStyle: specs.sleeveStyle.trim(),
    collarStyle: specs.collarStyle.trim(),
    lengthOption: specs.lengthOption.trim(),
    laceDetail: specs.laceDetail.trim(),
    embroideryDetail: specs.embroideryDetail.trim(),
    buttonStyle: specs.buttonStyle.trim(),
    zipperStyle: specs.zipperStyle.trim(),
    notes: specs.notes.trim(),
  };
}

export function createSavedDesignConfig(
  draft: DesignStudioDraft,
  now: Date = new Date()
): DesignStudioSavedConfig {
  return {
    id: draft.id ?? generateDesignId(now),
    title: draft.title.trim(),
    categoryId: draft.categoryId,
    modelName: draft.modelName.trim(),
    specifications: trimSpecifications(draft.specifications),
    attachments: draft.attachments.map((attachment) => ({
      ...attachment,
      note: attachment.note?.trim() ?? "",
    })),
    updatedAt: now.toISOString(),
  };
}

export function upsertSavedDesign(
  designs: DesignStudioSavedConfig[],
  config: DesignStudioSavedConfig
): DesignStudioSavedConfig[] {
  const rest = designs.filter((design) => design.id !== config.id);
  return [config, ...rest].slice(0, MAX_SAVED_DESIGNS);
}

export function removeSavedDesign(
  designs: DesignStudioSavedConfig[],
  id: string
): DesignStudioSavedConfig[] {
  return designs.filter((design) => design.id !== id);
}

export function buildDesignOrderHref(id: string): string {
  return `/orders?designId=${encodeURIComponent(id)}`;
}

export function buildDesignStudioHref(options: {
  categoryId?: GarmentCategoryId;
  referenceId?: string;
}): string {
  const params = new URLSearchParams();
  if (options.referenceId) {
    params.set("reference", options.referenceId);
  } else if (options.categoryId) {
    params.set("category", options.categoryId);
  }
  const query = params.toString();
  return query ? `/design-studio?${query}` : "/design-studio";
}

export function summarizeSpecifications(specs: GarmentSpecifications): Array<{
  label: string;
  value: string;
}> {
  return [
    {
      label: "Bahan",
      value: specs.customFabricNote
        ? `${specs.fabric} (${specs.customFabricNote})`
        : specs.fabric,
    },
    { label: "Warna", value: specs.colorName },
    { label: "Lengan", value: specs.sleeveStyle },
    { label: "Kerah", value: specs.collarStyle },
    { label: "Panjang", value: specs.lengthOption },
  ];
}

export function formatSavedDate(iso: string): string {
  const parts = iso.slice(0, 10).split("-");
  if (parts.length !== 3) return "-";
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}

export function resolveColorOption(name: string): { name: string; hex: string } {
  return (
    colorPaletteOptions.find((option) => option.name === name) ?? {
      name,
      hex: "#d9bdb2",
    }
  );
}
