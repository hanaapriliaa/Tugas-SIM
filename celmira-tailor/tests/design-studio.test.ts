import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_SAVED_DESIGNS,
  buildDesignOrderHref,
  buildDesignStudioHref,
  createDesignDraftFromReference,
  createDesignDraftFromSaved,
  createEmptyDesignDraft,
  createSavedDesignConfig,
  getModelOptions,
  removeSavedDesign,
  summarizeSpecifications,
  upsertSavedDesign,
  validateDesignDraft,
} from "../lib/design-studio.ts";

const FIXED_DATE = new Date("2026-11-25T10:00:00.000Z");

test("createEmptyDesignDraft menghasilkan draft yang belum valid", () => {
  const draft = createEmptyDesignDraft("kebaya");
  assert.equal(draft.id, null);
  assert.equal(draft.title, "");
  assert.equal(draft.categoryId, "kebaya");
  assert.ok(draft.modelName.length > 0);
  assert.equal(validateDesignDraft(draft).valid, false);
});

test("validateDesignDraft menerima draft lengkap dan menolak field wajib yang kosong", () => {
  const draft = createEmptyDesignDraft("gamis");
  draft.title = "Gamis Keluarga";
  assert.equal(validateDesignDraft(draft).valid, true);

  draft.title = "ab";
  assert.ok(validateDesignDraft(draft).errors.title);

  draft.title = "Gamis Keluarga";
  draft.specifications.colorHex = "bukan-hex";
  assert.ok(validateDesignDraft(draft).errors.colorHex);

  draft.specifications.colorHex = "#d9bdb2";
  draft.specifications.sleeveStyle = "";
  assert.ok(validateDesignDraft(draft).errors.sleeveStyle);
});

test("validateDesignDraft mewajibkan catatan saat bahan milik pelanggan", () => {
  const draft = createEmptyDesignDraft("kebaya");
  draft.title = "Kebaya Kain Keluarga";
  draft.specifications.fabric = "Bahan dari pelanggan sendiri";
  draft.specifications.customFabricNote = "";

  const result = validateDesignDraft(draft);
  assert.equal(result.valid, false);
  assert.ok(result.errors.customFabricNote);

  draft.specifications.customFabricNote = "Brokat maroon";
  assert.equal(validateDesignDraft(draft).valid, true);
});

test("createDesignDraftFromReference menyalin acuan Celmira", () => {
  const draft = createDesignDraftFromReference("celmira-kebaya-brokat-panjang");
  assert.ok(draft);
  assert.equal(draft.categoryId, "kebaya");
  assert.equal(draft.specifications.fabric, "Brokat & Lace + Furing");
  assert.equal(draft.specifications.colorName, "Maroon");
  assert.equal(createDesignDraftFromReference("referensi-tidak-ada"), null);
});

test("createSavedDesignConfig merapikan teks dan mempertahankan id yang ada", () => {
  const draft = createEmptyDesignDraft("kebaya");
  draft.title = "  Kebaya Akad  ";
  draft.specifications.notes = "  detail belakang  ";

  const config = createSavedDesignConfig(draft, FIXED_DATE);
  assert.match(config.id, /^design-/);
  assert.equal(config.title, "Kebaya Akad");
  assert.equal(config.specifications.notes, "detail belakang");
  assert.equal(config.updatedAt, FIXED_DATE.toISOString());

  draft.id = "design-tetap";
  draft.title = "Kebaya Akad Revisi";
  const updated = createSavedDesignConfig(draft, FIXED_DATE);
  assert.equal(updated.id, "design-tetap");
});

test("upsertSavedDesign memperbarui tanpa duplikat dan membatasi jumlah", () => {
  const draft = createEmptyDesignDraft("kebaya");
  draft.title = "Desain A";
  const first = createSavedDesignConfig(draft, FIXED_DATE);

  const one = upsertSavedDesign([], first);
  assert.equal(one.length, 1);

  const updated = { ...first, title: "Desain A Revisi" };
  const two = upsertSavedDesign(one, updated);
  assert.equal(two.length, 1);
  assert.equal(two[0].title, "Desain A Revisi");

  let many = [] as typeof one;
  for (let index = 0; index < MAX_SAVED_DESIGNS + 3; index += 1) {
    many = upsertSavedDesign(many, {
      ...first,
      id: `design-${index}`,
      title: `Desain ${index}`,
    });
  }
  assert.equal(many.length, MAX_SAVED_DESIGNS);
});

test("removeSavedDesign menghapus berdasarkan id", () => {
  const draft = createEmptyDesignDraft("kebaya");
  draft.title = "Desain A";
  const first = createSavedDesignConfig(draft, FIXED_DATE);
  const second = { ...first, id: "design-kedua", title: "Desain B" };

  assert.deepEqual(
    removeSavedDesign([first, second], first.id).map((design) => design.id),
    ["design-kedua"]
  );
});

test("tautan desain dan studio di-encode dengan benar", () => {
  assert.equal(buildDesignOrderHref("design-1"), "/orders?designId=design-1");
  assert.equal(buildDesignOrderHref("desain satu"), "/orders?designId=desain%20satu");
  assert.equal(
    buildDesignStudioHref({ referenceId: "celmira-kebaya-brokat-panjang" }),
    "/design-studio?reference=celmira-kebaya-brokat-panjang"
  );
  assert.equal(
    buildDesignStudioHref({ categoryId: "kebaya" }),
    "/design-studio?category=kebaya"
  );
  assert.equal(buildDesignStudioHref({}), "/design-studio");
});

test("createDesignDraftFromSaved melakukan round-trip konfigurasi", () => {
  const draft = createEmptyDesignDraft("blazer");
  draft.title = "Blazer Kerja";
  const config = createSavedDesignConfig(draft, FIXED_DATE);

  const restored = createDesignDraftFromSaved(config);
  assert.equal(restored.id, config.id);
  assert.equal(restored.title, "Blazer Kerja");
  assert.equal(restored.categoryId, "blazer");
  assert.deepEqual(restored.specifications, config.specifications);
});

test("getModelOptions dan summarizeSpecifications menyediakan data tampilan", () => {
  assert.ok(getModelOptions("kebaya").length > 0);
  const draft = createEmptyDesignDraft("kebaya");
  const rows = summarizeSpecifications(draft.specifications);
  assert.ok(rows.some((row) => row.label === "Bahan"));
  assert.ok(rows.some((row) => row.label === "Warna"));
});
