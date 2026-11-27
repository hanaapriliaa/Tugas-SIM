import type { ChatWorkerEnv } from "./cf-env.ts";
import { ensureChatSchema } from "./chat-schema.ts";

export const CUSTOMER_SESSION_COOKIE = "celmira_chat_session";
export const ADMIN_SESSION_COOKIE = "celmira_admin_session";
export const ADMIN_SESSION_TTL_MS = 24 * 60 * 60 * 1000;
export const CUSTOMER_COOKIE_MAX_AGE_SECONDS = 90 * 24 * 60 * 60;
export const ADMIN_COOKIE_MAX_AGE_SECONDS = 24 * 60 * 60;

export type CustomerSessionRecord = {
  id: string;
  customerName: string | null;
  customerWhatsappNorm: string | null;
  createdAt: string;
  lastSeenAt: string;
};

export type AdminSessionRecord = {
  id: string;
  adminEmail: string;
  adminName: string;
  createdAt: string;
  expiresAt: string;
};

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string): Uint8Array | null {
  const clean = hex.trim();
  if (clean.length === 0 || clean.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(clean)) {
    return null;
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function constantTimeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  const maxLen = Math.max(ab.length, bb.length);
  let diff = ab.length ^ bb.length;
  for (let i = 0; i < maxLen; i += 1) {
    diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
  }
  return diff === 0;
}

export function generateOpaqueToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}

export async function hashPasswordPbkdf2(
  password: string,
  iterations = 100_000,
  saltHex?: string
): Promise<string> {
  const saltBytes = saltHex ? hexToBytes(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  if (!saltBytes) {
    throw new Error("Salt hex tidak valid.");
  }
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: saltBytes as BufferSource,
      iterations,
    },
    keyMaterial,
    256
  );
  return `pbkdf2$sha256$${iterations}$${bytesToHex(saltBytes)}$${bytesToHex(new Uint8Array(derivedBits))}`;
}

export async function verifyPasswordPbkdf2(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.trim().split("$");
  if (parts.length !== 5) return false;
  const [scheme, algo, iterStr, saltHex, expectedHex] = parts;
  if (scheme !== "pbkdf2" || algo !== "sha256") return false;
  const iterations = Number.parseInt(iterStr, 10);
  if (!Number.isFinite(iterations) || iterations < 10_000 || iterations > 600_000) return false;

  const saltBytes = hexToBytes(saltHex);
  if (!saltBytes || !hexToBytes(expectedHex)) return false;

  const recomputed = await hashPasswordPbkdf2(password, iterations, saltHex);
  return constantTimeEqual(recomputed, storedHash.trim());
}

export function parseCookies(cookieHeader: string | null): Record<string, string> {
  const map: Record<string, string> = {};
  if (!cookieHeader) return map;
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (!key) continue;
    try {
      map[key] = decodeURIComponent(val);
    } catch {
      map[key] = val;
    }
  }
  return map;
}

export function getCookieFromRequest(request: Request, name: string): string | null {
  const cookies = parseCookies(request.headers.get("cookie"));
  return cookies[name] ?? null;
}

export function isSecureRequest(request: Request): boolean {
  const url = new URL(request.url);
  if (url.protocol === "https:") return true;
  return request.headers.get("x-forwarded-proto") === "https";
}

export function buildSetCookieHeader(
  name: string,
  value: string,
  options: {
    maxAge: number;
    secure: boolean;
    httpOnly?: boolean;
    sameSite?: "Lax" | "Strict";
    path?: string;
  }
): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${options.path ?? "/"}`,
    `Max-Age=${options.maxAge}`,
    `SameSite=${options.sameSite ?? "Lax"}`,
  ];
  if (options.httpOnly !== false) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  return parts.join("; ");
}

export function buildClearCookieHeader(name: string, secure: boolean): string {
  return buildSetCookieHeader(name, "", { maxAge: 0, secure });
}

export async function getCustomerSession(
  request: Request,
  db: D1Database
): Promise<CustomerSessionRecord | null> {
  await ensureChatSchema(db);
  const rawToken =
    getCookieFromRequest(request, CUSTOMER_SESSION_COOKIE) ??
    extractBearerToken(request, "Customer");
  if (!rawToken || rawToken.length < 32) return null;

  const tokenHash = await sha256Hex(rawToken);
  const row = await db
    .prepare(
      `SELECT id, customer_name, customer_whatsapp_norm, created_at, last_seen_at
       FROM chat_customer_sessions
       WHERE token_hash = ?`
    )
    .bind(tokenHash)
    .first<{
      id: string;
      customer_name: string | null;
      customer_whatsapp_norm: string | null;
      created_at: string;
      last_seen_at: string;
    }>();

  if (!row) return null;

  const now = new Date().toISOString();
  await db
    .prepare(`UPDATE chat_customer_sessions SET last_seen_at = ? WHERE id = ?`)
    .bind(now, row.id)
    .run();

  return {
    id: row.id,
    customerName: row.customer_name,
    customerWhatsappNorm: row.customer_whatsapp_norm,
    createdAt: row.created_at,
    lastSeenAt: now,
  };
}

export async function getOrCreateCustomerSession(
  request: Request,
  db: D1Database
): Promise<{
  session: CustomerSessionRecord;
  setCookieHeader: string | null;
}> {
  const existing = await getCustomerSession(request, db);
  if (existing) {
    return { session: existing, setCookieHeader: null };
  }

  await ensureChatSchema(db);
  const rawToken = generateOpaqueToken(32);
  const tokenHash = await sha256Hex(rawToken);
  const id = `csess-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO chat_customer_sessions (id, token_hash, created_at, last_seen_at)
       VALUES (?, ?, ?, ?)`
    )
    .bind(id, tokenHash, now, now)
    .run();

  return {
    session: {
      id,
      customerName: null,
      customerWhatsappNorm: null,
      createdAt: now,
      lastSeenAt: now,
    },
    setCookieHeader: buildSetCookieHeader(CUSTOMER_SESSION_COOKIE, rawToken, {
      maxAge: CUSTOMER_COOKIE_MAX_AGE_SECONDS,
      secure: isSecureRequest(request),
    }),
  };
}

function extractBearerToken(request: Request, scheme: "Bearer" | "Customer"): string | null {
  const auth = request.headers.get("authorization");
  if (!auth) return null;
  const prefix = `${scheme} `;
  if (!auth.startsWith(prefix)) return null;
  const token = auth.slice(prefix.length).trim();
  return token || null;
}

export function isAdminAuthConfigured(env: Pick<ChatWorkerEnv, "ADMIN_EMAIL" | "ADMIN_PASSWORD_HASH">): boolean {
  return Boolean(env.ADMIN_EMAIL?.trim() && env.ADMIN_PASSWORD_HASH?.trim());
}

export async function verifyAdminCredentials(
  email: string,
  password: string,
  env: Pick<ChatWorkerEnv, "ADMIN_EMAIL" | "ADMIN_PASSWORD_HASH">
): Promise<{ ok: true; adminEmail: string } | { ok: false; status: number; error: string }> {
  const configuredEmail = env.ADMIN_EMAIL?.trim().toLowerCase();
  const configuredHash = env.ADMIN_PASSWORD_HASH?.trim();

  if (!configuredEmail || !configuredHash) {
    return {
      ok: false,
      status: 503,
      error:
        "Autentikasi admin belum dikonfigurasi di server. Atur ADMIN_EMAIL dan ADMIN_PASSWORD_HASH di environment server (.dev.vars / Cloudflare Secrets).",
    };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const emailMatches = constantTimeEqual(normalizedEmail, configuredEmail);
  const passwordMatches = await verifyPasswordPbkdf2(password, configuredHash);

  if (!emailMatches || !passwordMatches) {
    return {
      ok: false,
      status: 401,
      error: "Email atau kata sandi admin tidak cocok.",
    };
  }

  return { ok: true, adminEmail: configuredEmail };
}

export async function createAdminSession(
  request: Request,
  db: D1Database,
  adminEmail: string,
  adminName: string
): Promise<{ session: AdminSessionRecord; setCookieHeader: string }> {
  await ensureChatSchema(db);
  const rawToken = generateOpaqueToken(32);
  const tokenHash = await sha256Hex(rawToken);
  const id = `asess-${crypto.randomUUID()}`;
  const now = new Date();
  const createdAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + ADMIN_SESSION_TTL_MS).toISOString();

  await db
    .prepare(
      `INSERT INTO admin_sessions (id, token_hash, admin_email, admin_name, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(id, tokenHash, adminEmail, adminName, createdAt, expiresAt)
    .run();

  return {
    session: { id, adminEmail, adminName, createdAt, expiresAt },
    setCookieHeader: buildSetCookieHeader(ADMIN_SESSION_COOKIE, rawToken, {
      maxAge: ADMIN_COOKIE_MAX_AGE_SECONDS,
      secure: isSecureRequest(request),
    }),
  };
}

export async function getAdminSession(
  request: Request,
  db: D1Database
): Promise<AdminSessionRecord | null> {
  await ensureChatSchema(db);
  const rawToken =
    getCookieFromRequest(request, ADMIN_SESSION_COOKIE) ??
    extractBearerToken(request, "Bearer");
  if (!rawToken || rawToken.length < 32) return null;

  const tokenHash = await sha256Hex(rawToken);
  const now = new Date().toISOString();
  const row = await db
    .prepare(
      `SELECT id, admin_email, admin_name, created_at, expires_at
       FROM admin_sessions
       WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > ?`
    )
    .bind(tokenHash, now)
    .first<{
      id: string;
      admin_email: string;
      admin_name: string;
      created_at: string;
      expires_at: string;
    }>();

  if (!row) return null;
  return {
    id: row.id,
    adminEmail: row.admin_email,
    adminName: row.admin_name,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

export async function revokeAdminSession(request: Request, db: D1Database): Promise<void> {
  await ensureChatSchema(db);
  const rawToken =
    getCookieFromRequest(request, ADMIN_SESSION_COOKIE) ??
    extractBearerToken(request, "Bearer");
  if (!rawToken) return;
  const tokenHash = await sha256Hex(rawToken);
  await db
    .prepare(`UPDATE admin_sessions SET revoked_at = ? WHERE token_hash = ?`)
    .bind(new Date().toISOString(), tokenHash)
    .run();
}
