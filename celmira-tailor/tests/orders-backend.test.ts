import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ORDER_SCHEMA_STATEMENTS } from "../lib/server/order-schema.ts";
import {
  detectOrderFileMimeFromBytes,
  validateOrderBinaryFile,
} from "../lib/server/order-storage.ts";

const PNG_HEADER = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
]);
const JPEG_HEADER = new Uint8Array([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
]);
const WEBP_HEADER = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);
const PDF_HEADER = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]); // %PDF-1.4
const FAKE_HTML = new TextEncoder().encode("<html><script>alert(1)</script></html>");

describe("Stage 6A — Orders Backend Schema & R2 File Validation", () => {
  it("memiliki seluruh DDL tabel orders, order_files, admin_payment_config, dan order_tracking_sessions", () => {
    const joined = ORDER_SCHEMA_STATEMENTS.join("\n");
    assert.match(joined, /CREATE TABLE IF NOT EXISTS orders/i);
    assert.match(joined, /CREATE TABLE IF NOT EXISTS order_files/i);
    assert.match(joined, /CREATE TABLE IF NOT EXISTS admin_payment_config/i);
    assert.match(joined, /CREATE TABLE IF NOT EXISTS order_tracking_sessions/i);
  });

  it("mendeteksi magic bytes PNG, JPEG, WEBP, dan PDF secara akurat", () => {
    assert.equal(detectOrderFileMimeFromBytes(PNG_HEADER, true), "image/png");
    assert.equal(detectOrderFileMimeFromBytes(JPEG_HEADER, true), "image/jpeg");
    assert.equal(detectOrderFileMimeFromBytes(WEBP_HEADER, true), "image/webp");
    assert.equal(detectOrderFileMimeFromBytes(PDF_HEADER, true), "application/pdf");
    assert.equal(detectOrderFileMimeFromBytes(PDF_HEADER, false), null);
    assert.equal(detectOrderFileMimeFromBytes(FAKE_HTML, true), null);
  });

  it("mengizinkan PDF untuk payment_proof dan order_reference tetapi menolak PDF untuk QRIS", () => {
    const proofPdf = validateOrderBinaryFile({
      fileName: "bukti-dp.pdf",
      bytes: PDF_HEADER,
      kind: "payment_proof",
    });
    assert.equal(proofPdf.ok, true);
    if (proofPdf.ok) {
      assert.equal(proofPdf.mimeType, "application/pdf");
    }

    const refPdf = validateOrderBinaryFile({
      fileName: "referensi-model.pdf",
      bytes: PDF_HEADER,
      kind: "order_reference",
    });
    assert.equal(refPdf.ok, true);

    const qrisPdf = validateOrderBinaryFile({
      fileName: "qris.pdf",
      bytes: PDF_HEADER,
      kind: "qris",
    });
    assert.equal(qrisPdf.ok, false);
  });

  it("menolak file HTML/script yang menyamar sebagai gambar atau PDF dan menolak file > 5 MB", () => {
    const spoofed = validateOrderBinaryFile({
      fileName: "bukti.jpg",
      bytes: FAKE_HTML,
      kind: "payment_proof",
    });
    assert.equal(spoofed.ok, false);

    const empty = validateOrderBinaryFile({
      fileName: "kosong.png",
      bytes: new Uint8Array(0),
      kind: "qris",
    });
    assert.equal(empty.ok, false);

    const oversized = new Uint8Array(5 * 1024 * 1024 + 16);
    oversized.set(PNG_HEADER, 0);
    const tooBig = validateOrderBinaryFile({
      fileName: "besar.png",
      bytes: oversized,
      kind: "payment_proof",
    });
    assert.equal(tooBig.ok, false);
  });

  it("menerima gambar PNG/JPEG valid untuk QRIS dan mensterilkan nama file", () => {
    const validQris = validateOrderBinaryFile({
      fileName: "../../qris resmi (2026).png",
      bytes: PNG_HEADER,
      kind: "qris",
    });
    assert.equal(validQris.ok, true);
    if (validQris.ok) {
      assert.equal(validQris.mimeType, "image/png");
      assert.ok(!validQris.safeName.includes(".."));
      assert.ok(!validQris.safeName.includes("/"));
    }
  });
});
