import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSetCookieHeader,
  constantTimeEqual,
  generateOpaqueToken,
  hashPasswordPbkdf2,
  isAdminAuthConfigured,
  parseCookies,
  sha256Hex,
  verifyAdminCredentials,
  verifyPasswordPbkdf2,
} from "../lib/server/auth.ts";
import {
  detectImageMimeFromBytes,
  sanitizeAttachmentFileName,
  validateBinaryImageUpload,
} from "../lib/server/attachment-storage.ts";
import { CHAT_SCHEMA_STATEMENTS } from "../lib/server/chat-schema.ts";

test("hashPasswordPbkdf2 dan verifyPasswordPbkdf2 memverifikasi kata sandi secara aman", async () => {
  const hash = await hashPasswordPbkdf2("CelmiraAdmin#2026!", 10_000);
  assert.ok(hash.startsWith("pbkdf2$sha256$10000$"));
  assert.equal(await verifyPasswordPbkdf2("CelmiraAdmin#2026!", hash), true);
  assert.equal(await verifyPasswordPbkdf2("SalahPassword123", hash), false);
  assert.equal(await verifyPasswordPbkdf2("CelmiraAdmin#2026!", "invalid-format"), false);
});

test("verifyAdminCredentials menolak konfigurasi kosong (503) dan tidak memakai password statis", async () => {
  assert.equal(isAdminAuthConfigured({}), false);
  const unconfigured = await verifyAdminCredentials("admin@celmira.local", "anything", {});
  assert.equal(unconfigured.ok, false);
  if (!unconfigured.ok) {
    assert.equal(unconfigured.status, 503);
  }

  const hash = await hashPasswordPbkdf2("SecretAtelier#99", 10_000);
  const env = {
    ADMIN_EMAIL: "admin@celmira.local",
    ADMIN_PASSWORD_HASH: hash,
  };
  assert.equal(isAdminAuthConfigured(env), true);

  const badPass = await verifyAdminCredentials("admin@celmira.local", "wrong", env);
  assert.equal(badPass.ok, false);
  if (!badPass.ok) assert.equal(badPass.status, 401);

  const badEmail = await verifyAdminCredentials("lain@celmira.local", "SecretAtelier#99", env);
  assert.equal(badEmail.ok, false);

  const valid = await verifyAdminCredentials("ADMIN@celmira.local", "SecretAtelier#99", env);
  assert.equal(valid.ok, true);
});

test("token acak, sha256Hex, constantTimeEqual, dan HttpOnly cookie helper berjalan konsisten", async () => {
  const t1 = generateOpaqueToken(32);
  const t2 = generateOpaqueToken(32);
  assert.equal(t1.length, 64);
  assert.notEqual(t1, t2);

  const h1 = await sha256Hex(t1);
  assert.equal(h1.length, 64);
  assert.equal(constantTimeEqual(h1, await sha256Hex(t1)), true);
  assert.equal(constantTimeEqual(h1, await sha256Hex(t2)), false);

  const setCookie = buildSetCookieHeader("celmira_admin_session", t1, {
    maxAge: 3600,
    secure: true,
  });
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /SameSite=Lax/);
  assert.match(setCookie, /Secure/);

  const parsed = parseCookies(`foo=bar; celmira_admin_session=${encodeURIComponent(t1)}`);
  assert.equal(parsed.celmira_admin_session, t1);
});

test("detectImageMimeFromBytes dan validateBinaryImageUpload memeriksa magic bytes, format, dan ukuran", () => {
  const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1]);
  const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
  const webpBytes = new Uint8Array([
    0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
  ]);
  const fakePngHtml = new TextEncoder().encode("<html><script>alert(1)</script></html>");

  assert.equal(detectImageMimeFromBytes(jpegBytes), "image/jpeg");
  assert.equal(detectImageMimeFromBytes(pngBytes), "image/png");
  assert.equal(detectImageMimeFromBytes(webpBytes), "image/webp");
  assert.equal(detectImageMimeFromBytes(fakePngHtml), null);

  const okPng = validateBinaryImageUpload({
    fileName: "../referensi/kebaya.png",
    declaredMimeType: "image/png",
    bytes: pngBytes,
  });
  assert.equal(okPng.ok, true);
  if (okPng.ok) {
    assert.equal(okPng.mimeType, "image/png");
    assert.equal(okPng.safeName.includes("/"), false);
  }

  const spoofed = validateBinaryImageUpload({
    fileName: "palsu.png",
    declaredMimeType: "image/png",
    bytes: fakePngHtml,
  });
  assert.equal(spoofed.ok, false);

  const empty = validateBinaryImageUpload({
    fileName: "kosong.jpg",
    declaredMimeType: "image/jpeg",
    bytes: new Uint8Array(0),
  });
  assert.equal(empty.ok, false);

  const huge = new Uint8Array(5 * 1024 * 1024 + 10);
  huge.set(jpegBytes, 0);
  const tooLarge = validateBinaryImageUpload({
    fileName: "besar.jpg",
    declaredMimeType: "image/jpeg",
    bytes: huge,
  });
  assert.equal(tooLarge.ok, false);

  assert.equal(sanitizeAttachmentFileName("folder\\sub/foto.jpg"), "folder_sub_foto.jpg");
});

test("skema D1 mencakup seluruh tabel backend chat dan indeks idempotensi pesan", () => {
  const joined = CHAT_SCHEMA_STATEMENTS.join("\n");
  for (const required of [
    "chat_customer_sessions",
    "chat_threads",
    "chat_messages",
    "chat_attachments",
    "chat_admin_config",
    "admin_sessions",
    "idx_messages_idempotency",
    "idx_threads_legacy",
    "r2_key",
  ]) {
    assert.ok(joined.includes(required), `Skema D1 harus memuat ${required}`);
  }
});
