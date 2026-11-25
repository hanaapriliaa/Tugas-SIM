import assert from "node:assert/strict";
import test from "node:test";
import { celmiraDesignReferences, garmentCategories } from "../lib/booking-options.ts";
import {
  buildCatalogOrderHref,
  catalogFilterOptions,
  catalogMaterialNotes,
  countCatalogReferencesByCategory,
  filterCatalogReferences,
} from "../lib/catalog.ts";

test("filterCatalogReferences mengembalikan semua acuan untuk filter all", () => {
  const all = filterCatalogReferences("all");
  assert.equal(all.length, celmiraDesignReferences.length);
  assert.notEqual(all, celmiraDesignReferences, "hasil harus berupa salinan array");
});

test("filterCatalogReferences hanya mengembalikan kategori yang dipilih", () => {
  const kebaya = filterCatalogReferences("kebaya");
  assert.ok(kebaya.length > 0);
  assert.ok(kebaya.every((reference) => reference.categoryId === "kebaya"));

  const mukena = filterCatalogReferences("mukena");
  assert.ok(mukena.length > 0);
  assert.ok(mukena.every((reference) => reference.categoryId === "mukena"));
});

test("setiap kategori pada roadmap memiliki minimal satu acuan model", () => {
  for (const category of garmentCategories) {
    assert.ok(
      countCatalogReferencesByCategory(category.id) > 0,
      `Kategori ${category.id} belum memiliki acuan model`
    );
  }
});

test("opsi filter katalog memuat 'Semua' dan delapan kategori", () => {
  assert.equal(catalogFilterOptions.length, garmentCategories.length + 1);
  assert.equal(catalogFilterOptions[0].id, "all");
  assert.deepEqual(
    catalogFilterOptions.slice(1).map((option) => option.id),
    garmentCategories.map((category) => category.id)
  );
});

test("buildCatalogOrderHref menyusun tautan pesanan dengan kategori dan referensi", () => {
  assert.equal(
    buildCatalogOrderHref("kebaya", "celmira-kebaya-brokat-panjang"),
    "/orders?category=kebaya&celmiraDesignId=celmira-kebaya-brokat-panjang"
  );
  assert.equal(buildCatalogOrderHref("gamis"), "/orders?category=gamis");
});

test("catatan bahan memiliki deskripsi dan rekomendasi", () => {
  assert.ok(catalogMaterialNotes.length >= 4);
  for (const note of catalogMaterialNotes) {
    assert.ok(note.material.length > 0);
    assert.ok(note.description.length > 20);
    assert.ok(note.recommendedFor.length > 0);
  }
});
