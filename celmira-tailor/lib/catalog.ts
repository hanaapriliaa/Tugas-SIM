import { celmiraDesignReferences, garmentCategories } from "./booking-options.ts";
import type { CelmiraDesignReference, GarmentCategoryId } from "@/lib/types/tailor";

export type CatalogFilter = GarmentCategoryId | "all";

export type CatalogFilterOption = {
  id: CatalogFilter;
  label: string;
  index: string;
};

export type CatalogMaterialNote = {
  material: string;
  description: string;
  recommendedFor: string;
};

export const catalogFilterOptions: CatalogFilterOption[] = [
  { id: "all", label: "Semua Kategori", index: "00" },
  ...garmentCategories.map((category) => ({
    id: category.id,
    label: category.name,
    index: category.index,
  })),
];

export const catalogMaterialNotes: CatalogMaterialNote[] = [
  {
    material: "Brokat & Lace",
    description:
      "Bertekstur dengan detail lace yang menjadi ciri kebaya. Perlu furing agar nyaman dan jatuhnya rapi.",
    recommendedFor: "Kebaya, busana pernikahan, busana wisuda",
  },
  {
    material: "Ceruti / Chiffon",
    description:
      "Ringan dan mengalir, cocok untuk siluet longgar. Warna tampak lembut dengan kilau tipis.",
    recommendedFor: "Gamis, busana pesta, layer",
  },
  {
    material: "Katun / Linen",
    description:
      "Adem, menyerap keringat, dan nyaman untuk pemakaian lama. Kerutan alami adalah karakter bahannya.",
    recommendedFor: "Kemeja, busana harian, mukena",
  },
  {
    material: "Semi-wool / Twill",
    description:
      "Struktur tegas dan tidak mudah kusut, sehingga bentuk blazer tetap rapi sepanjang hari.",
    recommendedFor: "Blazer, setelan formal, busana kerja",
  },
];

export function filterCatalogReferences(
  filter: CatalogFilter,
  references: readonly CelmiraDesignReference[] = celmiraDesignReferences
): CelmiraDesignReference[] {
  if (filter === "all") return [...references];
  return references.filter((reference) => reference.categoryId === filter);
}

export function countCatalogReferencesByCategory(categoryId: GarmentCategoryId): number {
  return celmiraDesignReferences.filter((reference) => reference.categoryId === categoryId).length;
}

export function buildCatalogOrderHref(
  categoryId: GarmentCategoryId,
  referenceId?: string
): string {
  const params = new URLSearchParams();
  params.set("category", categoryId);
  if (referenceId) {
    params.set("celmiraDesignId", referenceId);
  }
  return `/orders?${params.toString()}`;
}
