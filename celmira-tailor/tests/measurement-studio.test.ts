import assert from "node:assert/strict";
import test from "node:test";
import { createInitialOrderDraft } from "../lib/booking-options.ts";
import { validateStep3 } from "../lib/booking-validation.ts";
import {
  DEFAULT_MEASUREMENT_TEMPLATES,
  MAX_SAVED_MEASUREMENT_PROFILES,
  MEASUREMENT_GARMENT_TYPES,
  applySizePresetToDraft,
  buildMeasurementOrderHref,
  buildMeasurementStudioHref,
  computeMannequinProportions,
  createMeasurementDraftForTemplate,
  createMeasurementDraftFromProfile,
  createSavedMeasurementProfile,
  getDefaultTemplateForCategory,
  getMeasurementGarmentTypeById,
  getMeasurementTemplateById,
  normalizeMeasurementTemplates,
  removeMeasurementProfile,
  setTemplateFieldValue,
  stepMeasurementValue,
  summarizeMeasurementProfile,
  switchDraftTemplate,
  upsertMeasurementProfile,
  upsertMeasurementTemplate,
  validateMeasurementDraft,
} from "../lib/measurement-studio.ts";

const FIXED_DATE = new Date("2026-11-25T14:00:00.000Z");

test("tersedia 5 template kategori lengkap dengan field berbeda dan satuan cm", () => {
  const ids = DEFAULT_MEASUREMENT_TEMPLATES.map((template) => template.id);
  assert.deepEqual(ids, ["hijab", "atasan", "gamis", "busana-formal", "bawahan"]);

  for (const template of DEFAULT_MEASUREMENT_TEMPLATES) {
    assert.equal(template.mannequinType, template.id);
    assert.ok(template.fields.length >= 4);
    assert.ok(template.sizePresets.length >= 3);
    for (const field of template.fields) {
      assert.equal(field.unit, "cm");
      assert.ok(field.min < field.defaultValue && field.defaultValue < field.max);
      assert.ok(field.guideSteps.length > 0);
      assert.ok(field.tip.length > 0);
    }
  }

  const hijabKeys = getMeasurementTemplateById("hijab").fields.map((f) => f.key);
  const bawahanKeys = getMeasurementTemplateById("bawahan").fields.map((f) => f.key);
  assert.ok(hijabKeys.includes("neckCircumference"));
  assert.ok(hijabKeys.includes("backLength"));
  assert.ok(!hijabKeys.includes("bust"));

  assert.ok(bawahanKeys.includes("waist"));
  assert.ok(bawahanKeys.includes("hip"));
  assert.ok(bawahanKeys.includes("hemWidth"));
  assert.ok(!bawahanKeys.includes("bust"));
  assert.ok(!bawahanKeys.includes("sleeveLength"));
});

test("stepMeasurementValue menambah/mengurangi secara presisi dan mematuhi batas min/max", () => {
  const field = { min: 50, max: 120, defaultValue: 80 };
  assert.equal(stepMeasurementValue("80", 0.5, field), "80.5");
  assert.equal(stepMeasurementValue("80.5", -0.5, field), "80");
  assert.equal(stepMeasurementValue("50", -1, field), "50");
  assert.equal(stepMeasurementValue("120", 2, field), "120");
  assert.equal(stepMeasurementValue("", 1, field), "81");
});

test("applySizePresetToDraft mengisi nilai acuan standar dan extra secara konsisten", () => {
  const draft = createMeasurementDraftForTemplate("hijab");
  const updated = applySizePresetToDraft(draft, "mukena-dewasa");
  assert.equal(updated.values.neckCircumference, "28.5");
  assert.equal(updated.values.garmentLength, "122");
  assert.equal(updated.extraValues.backLength, "138");

  const unchanged = applySizePresetToDraft(draft, "preset-tidak-ada");
  assert.deepEqual(unchanged, draft);
});

test("switchDraftTemplate mengganti template sambil mempertahankan nilai yang kompatibel", () => {
  const draft = createMeasurementDraftForTemplate("atasan");
  draft.label = "Profil Ibu";
  draft.notes = "Lengan agak longgar";
  draft.values.bust = "102";

  const switched = switchDraftTemplate(draft, "gamis");
  assert.equal(switched.templateId, "gamis");
  assert.equal(switched.label, "Profil Ibu");
  assert.equal(switched.notes, "Lengan agak longgar");
  assert.equal(switched.values.bust, "102");
  assert.equal(switched.values.garmentLength, "138");

  const switchedToHijab = switchDraftTemplate(switched, "hijab");
  assert.equal(switchedToHijab.values.garmentLength, "95");
  assert.equal(switchedToHijab.values.neckCircumference, "28");
  assert.equal(validateMeasurementDraft(switchedToHijab).warnings.length, 0);
});

test("validateMeasurementDraft menolak label kosong / ukuran di luar rentang dan memberi peringatan proporsi", () => {
  const draft = createMeasurementDraftForTemplate("gamis");
  assert.equal(validateMeasurementDraft(draft).valid, false);
  assert.ok(validateMeasurementDraft(draft).errors.label);

  draft.label = "Gamis Pesta Nadia";
  assert.equal(validateMeasurementDraft(draft).valid, true);

  draft.values.bust = "250";
  const outOfRange = validateMeasurementDraft(draft);
  assert.equal(outOfRange.valid, false);
  assert.ok(outOfRange.errors.bust);

  draft.values.bust = "86";
  draft.values.waist = "110";
  const withWarning = validateMeasurementDraft(draft);
  assert.equal(withWarning.valid, true);
  assert.ok(withWarning.warnings.length > 0);
});

test("computeMannequinProportions merespons perubahan ukuran secara langsung", () => {
  const baseDraft = createMeasurementDraftForTemplate("gamis");
  const baseProps = computeMannequinProportions("gamis", baseDraft.values, baseDraft.extraValues);

  const largerDraft = {
    ...baseDraft,
    values: {
      ...baseDraft.values,
      bust: "130",
      waist: "110",
      garmentLength: "160",
    },
  };
  const largerProps = computeMannequinProportions(
    "gamis",
    largerDraft.values,
    largerDraft.extraValues
  );

  assert.ok(largerProps.bustScale > baseProps.bustScale);
  assert.ok(largerProps.waistScale > baseProps.waistScale);
  assert.ok(largerProps.lengthRatio > baseProps.lengthRatio);

  const skirtBase = createMeasurementDraftForTemplate("bawahan");
  const skirtWide = setTemplateFieldValue(
    skirtBase,
    getMeasurementTemplateById("bawahan").fields.find((f) => f.key === "hemWidth")!,
    "200"
  );
  assert.ok(
    computeMannequinProportions("bawahan", skirtWide.values, skirtWide.extraValues).hemScale >
      computeMannequinProportions("bawahan", skirtBase.values, skirtBase.extraValues).hemScale
  );
});

test("profil ukuran mendukung simpan, round-trip, upsert batas maksimum, dan hapus", () => {
  const draft = createMeasurementDraftForTemplate("busana-formal");
  draft.label = "  Blazer Wisuda  ";
  draft.notes = "  Suka bahu tegas  ";

  const saved = createSavedMeasurementProfile(draft, DEFAULT_MEASUREMENT_TEMPLATES, FIXED_DATE);
  assert.match(saved.id, /^measure-/);
  assert.equal(saved.label, "Blazer Wisuda");
  assert.equal(saved.notes, "Suka bahu tegas");
  assert.equal(saved.updatedAt, FIXED_DATE.toISOString());

  const restored = createMeasurementDraftFromProfile(saved);
  assert.equal(restored.id, saved.id);
  assert.equal(restored.templateId, "busana-formal");
  assert.deepEqual(restored.values, saved.values);

  let many = upsertMeasurementProfile([], saved);
  assert.equal(many.length, 1);

  const edited = { ...saved, label: "Blazer Wisuda Revisi" };
  many = upsertMeasurementProfile(many, edited);
  assert.equal(many.length, 1);
  assert.equal(many[0].label, "Blazer Wisuda Revisi");

  for (let i = 0; i < MAX_SAVED_MEASUREMENT_PROFILES + 4; i += 1) {
    many = upsertMeasurementProfile(many, {
      ...saved,
      id: `measure-extra-${i}`,
      label: `Profil ${i}`,
    });
  }
  assert.equal(many.length, MAX_SAVED_MEASUREMENT_PROFILES);

  const targetId = many[0].id;
  const afterRemove = removeMeasurementProfile(many, targetId);
  assert.equal(afterRemove.length, MAX_SAVED_MEASUREMENT_PROFILES - 1);
  assert.ok(!afterRemove.some((item) => item.id === targetId));
});

test("profil tersimpan kompatibel langsung dengan validasi Langkah 3 alur pemesanan", () => {
  const gamisDraft = createMeasurementDraftForTemplate("gamis");
  gamisDraft.label = "Gamis Lebaran";
  const gamisProfile = createSavedMeasurementProfile(
    gamisDraft,
    DEFAULT_MEASUREMENT_TEMPLATES,
    FIXED_DATE
  );

  const orderDraft = createInitialOrderDraft();
  orderDraft.categoryId = "gamis";
  orderDraft.measurements = {
    mode: "profile",
    profileId: gamisProfile.id,
    profileName: gamisProfile.label,
    templateId: gamisProfile.templateId,
    values: { ...gamisProfile.values },
    extraValues: gamisProfile.extraValues,
    sampleGarmentNote: "",
    fitPreferenceNote: gamisProfile.notes,
  };
  assert.equal(validateStep3(orderDraft).valid, true);

  const hijabDraft = createMeasurementDraftForTemplate("hijab");
  hijabDraft.label = "Mukena Harian";
  const hijabProfile = createSavedMeasurementProfile(
    hijabDraft,
    DEFAULT_MEASUREMENT_TEMPLATES,
    FIXED_DATE
  );
  const mukenaOrder = createInitialOrderDraft();
  mukenaOrder.categoryId = "mukena";
  mukenaOrder.measurements = {
    mode: "profile",
    profileId: hijabProfile.id,
    profileName: hijabProfile.label,
    templateId: hijabProfile.templateId,
    values: { ...hijabProfile.values },
    extraValues: hijabProfile.extraValues,
    sampleGarmentNote: "",
    fitPreferenceNote: "",
  };
  assert.equal(validateStep3(mukenaOrder).valid, true);
  assert.ok(summarizeMeasurementProfile(hijabProfile).some((row) => row.key === "backLength"));
});

test("struktur template siap dikelola admin melalui normalize & upsert", () => {
  const original = getMeasurementTemplateById("gamis");
  const edited = {
    ...original,
    tagline: "Siluet gamis diperbarui admin",
    fields: original.fields.map((field) =>
      field.key === "garmentLength" ? { ...field, max: 175 } : field
    ),
  };

  const updatedList = upsertMeasurementTemplate(DEFAULT_MEASUREMENT_TEMPLATES, edited);
  const normalized = normalizeMeasurementTemplates(updatedList);
  const loadedGamis = getMeasurementTemplateById("gamis", normalized);

  assert.equal(loadedGamis.tagline, "Siluet gamis diperbarui admin");
  assert.equal(
    loadedGamis.fields.find((field) => field.key === "garmentLength")?.max,
    175
  );
  assert.equal(normalized.length, 5);
});

test("pemetaan jenis pakaian, kategori, dan tautan query URL berfungsi dengan benar", () => {
  assert.equal(getDefaultTemplateForCategory("mukena"), "hijab");
  assert.equal(getDefaultTemplateForCategory("kebaya"), "busana-formal");
  assert.equal(getDefaultTemplateForCategory("gamis"), "gamis");
  assert.equal(getDefaultTemplateForCategory("kemeja-pria"), "atasan");
  assert.equal(getDefaultTemplateForCategory("blazer"), "busana-formal");
  assert.equal(getDefaultTemplateForCategory("custom-lainnya"), "atasan");

  assert.equal(getMeasurementGarmentTypeById("kebaya").templateId, "busana-formal");
  assert.equal(getMeasurementGarmentTypeById("gamis").templateId, "gamis");
  assert.equal(getMeasurementGarmentTypeById("kemeja-pria").templateId, "atasan");
  assert.equal(getMeasurementGarmentTypeById("blazer").templateId, "busana-formal");
  assert.equal(getMeasurementGarmentTypeById("rok-celana").templateId, "bawahan");
  assert.equal(getMeasurementGarmentTypeById("hijab").templateId, "hijab");
  assert.equal(getMeasurementGarmentTypeById("mukena").templateId, "hijab");

  // Seluruh 5 template harus tercakup oleh daftar Jenis Pakaian
  const coveredTemplates = new Set(MEASUREMENT_GARMENT_TYPES.map((item) => item.templateId));
  for (const template of DEFAULT_MEASUREMENT_TEMPLATES) {
    assert.ok(coveredTemplates.has(template.id));
  }

  assert.equal(buildMeasurementOrderHref("measure-1"), "/orders?measurementId=measure-1");
  assert.equal(
    buildMeasurementStudioHref({ profileId: "measure-1" }),
    "/measurement-studio?profile=measure-1"
  );
  assert.equal(
    buildMeasurementStudioHref({ templateId: "bawahan" }),
    "/measurement-studio?template=bawahan"
  );
  assert.equal(
    buildMeasurementStudioHref({ categoryId: "kebaya" }),
    "/measurement-studio?category=kebaya"
  );
  assert.equal(buildMeasurementStudioHref({}), "/measurement-studio");
});
