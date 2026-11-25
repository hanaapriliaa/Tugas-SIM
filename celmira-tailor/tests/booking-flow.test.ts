import assert from "node:assert/strict";
import test from "node:test";
import { createInitialOrderDraft } from "../lib/booking-options.ts";
import {
  getMinimumTargetDate,
  isValidOptionalEmail,
  isValidWhatsappNumber,
  validateAttachmentFile,
  validateStep1,
  validateStep2,
  validateStep3,
  validateStep4,
  validateStep5,
} from "../lib/booking-validation.ts";

test("validateAttachmentFile menerima JPG/PNG/WEBP/PDF <= 5 MB dan menolak selainnya", () => {
  assert.equal(
    validateAttachmentFile({ name: "kebaya.jpg", size: 1024 * 500, type: "image/jpeg" }),
    null
  );
  assert.equal(
    validateAttachmentFile({ name: "sketsa.pdf", size: 1024 * 1024, type: "application/pdf" }),
    null
  );
  assert.ok(
    validateAttachmentFile({ name: "doc.exe", size: 1000, type: "application/x-msdownload" })
  );
  assert.ok(validateAttachmentFile({ name: "empty.png", size: 0, type: "image/png" }));
  assert.ok(
    validateAttachmentFile({ name: "besar.png", size: 6 * 1024 * 1024, type: "image/png" })
  );
});

test("validateStep1 mewajibkan kategori dan acuan desain atau lampiran upload", () => {
  const draft = createInitialOrderDraft();
  const emptyResult = validateStep1(draft);
  assert.equal(emptyResult.valid, false);
  assert.ok(emptyResult.errors.categoryId);
  assert.ok(emptyResult.errors.design);

  draft.categoryId = "kebaya";
  draft.designSource = "custom-upload";
  const uploadMissing = validateStep1(draft);
  assert.equal(uploadMissing.valid, false);
  assert.ok(uploadMissing.errors.attachments);
  assert.ok(uploadMissing.errors.customDesignTitle);

  draft.customDesignTitle = "Kebaya Akad Payet";
  draft.attachments.push({
    id: "att-1",
    name: "referensi.png",
    size: 20480,
    mimeType: "image/png",
    kind: "image",
  });
  assert.equal(validateStep1(draft).valid, true);
});

test("validateStep2 memeriksa detail kain, warna, lengan, kerah, dan panjang", () => {
  const draft = createInitialOrderDraft();
  assert.equal(validateStep2(draft).valid, true);

  draft.specifications.colorName = "";
  const missingColor = validateStep2(draft);
  assert.equal(missingColor.valid, false);
  assert.ok(missingColor.errors.colorName);
});

test("validateStep3 menyesuaikan syarat ukuran berdasarkan kategori dan mode", () => {
  const draft = createInitialOrderDraft();
  draft.categoryId = "kebaya";
  assert.equal(validateStep3(draft).valid, false);

  draft.categoryId = "mukena";
  draft.measurements.values.garmentLength = "125";
  assert.equal(validateStep3(draft).valid, true);

  draft.categoryId = "gamis";
  draft.measurements.mode = "sample_garment";
  assert.equal(validateStep3(draft).valid, false);

  draft.measurements.sampleGarmentNote = "Kirim gamis katun ukuran paling nyaman dipakai.";
  assert.equal(validateStep3(draft).valid, true);
});

test("validateStep4 memvalidasi WhatsApp, email opsional, alamat kirim, dan target tanggal", () => {
  const refDate = new Date("2026-11-25T10:00:00.000Z");
  assert.equal(getMinimumTargetDate(refDate), "2026-11-28");
  assert.equal(isValidWhatsappNumber("0812-3456-7890"), true);
  assert.equal(isValidWhatsappNumber("+62 812 3456 7890"), true);
  assert.equal(isValidWhatsappNumber("12345"), false);
  assert.equal(isValidOptionalEmail(""), true);
  assert.equal(isValidOptionalEmail("pelanggan@celmira.id"), true);
  assert.equal(isValidOptionalEmail("bukan-email"), false);

  const draft = createInitialOrderDraft();
  draft.customer.fullName = "Ayu Lestari";
  draft.customer.whatsapp = "081234567890";
  draft.delivery.method = "shipping";
  draft.targetDate = "2026-11-27";

  const badDeliveryAndDate = validateStep4(draft, refDate);
  assert.equal(badDeliveryAndDate.valid, false);
  assert.ok(badDeliveryAndDate.errors.addressLine);
  assert.ok(badDeliveryAndDate.errors.city);
  assert.ok(badDeliveryAndDate.errors.targetDate);

  draft.delivery.addressLine = "Jl. Kaliurang KM 7, Sleman, Yogyakarta";
  draft.delivery.city = "Sleman";
  draft.delivery.postalCode = "55281";
  draft.targetDate = "2026-12-10";
  assert.equal(validateStep4(draft, refDate).valid, true);
});

test("validateStep5 mewajibkan seluruh langkah valid dan persetujuan alur penawaran", () => {
  const refDate = new Date("2026-11-25T10:00:00.000Z");
  const draft = createInitialOrderDraft();
  draft.categoryId = "kebaya";
  draft.designSource = "celmira";
  draft.selectedCelmiraDesignId = "celmira-kebaya-brokat-panjang";
  draft.measurements.values = {
    bust: "92",
    waist: "74",
    hip: "98",
    shoulderWidth: "38",
    sleeveLength: "56",
    garmentLength: "105",
    neckCircumference: "36",
  };
  draft.customer = {
    fullName: "Nadia Putri",
    whatsapp: "081234567890",
    email: "",
  };
  draft.delivery.method = "pickup";
  draft.targetDate = "2026-12-15";

  assert.equal(validateStep5(draft, refDate).valid, false);
  draft.agreedToTerms = true;
  assert.equal(validateStep5(draft, refDate).valid, true);
});
