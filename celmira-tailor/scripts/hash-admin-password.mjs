#!/usr/bin/env node
import { randomBytes, pbkdf2Sync } from "node:crypto";

const password = process.argv[2];
if (!password || password.length < 8) {
  console.error("Penggunaan: node scripts/hash-admin-password.mjs <password-minimal-8-karakter>");
  process.exit(1);
}

const iterations = 100000;
const salt = randomBytes(16).toString("hex");
const derived = pbkdf2Sync(password, Buffer.from(salt, "hex"), iterations, 32, "sha256").toString("hex");
const signingSecret = randomBytes(32).toString("hex");

console.log(`ADMIN_PASSWORD_HASH=pbkdf2$sha256$${iterations}$${salt}$${derived}`);
console.log(`AUTH_SIGNING_SECRET=${signingSecret}`);
