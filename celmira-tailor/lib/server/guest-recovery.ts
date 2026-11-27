import {
  generateOpaqueToken,
  issueAdditionalCustomerSessionCookie,
  sha256Hex,
} from "./auth.ts";
import { ensureStudioSchema } from "./studio-schema.ts";

/** Masa berlaku tautan pemulihan privat satu kali pakai (15 menit). */
export const RECOVERY_TOKEN_TTL_MS = 15 * 60 * 1000;

export async function createGuestRecoveryToken(
  db: D1Database,
  customerSessionId: string,
  now: Date = new Date()
): Promise<{ token: string; expiresAt: string }> {
  await ensureStudioSchema(db);
  const nowIso = now.toISOString();
  const expiresAt = new Date(now.getTime() + RECOVERY_TOKEN_TTL_MS).toISOString();

  // Cabut token pemulihan sebelumnya yang belum dipakai agar hanya 1 tautan aktif per sesi
  await db
    .prepare(
      `UPDATE studio_recovery_tokens
       SET revoked_at = ?
       WHERE customer_session_id = ? AND used_at IS NULL AND revoked_at IS NULL`
    )
    .bind(nowIso, customerSessionId)
    .run();

  const rawToken = generateOpaqueToken(32);
  const tokenHash = await sha256Hex(rawToken);
  const id = `rec-${crypto.randomUUID()}`;

  await db
    .prepare(
      `INSERT INTO studio_recovery_tokens (id, customer_session_id, token_hash, expires_at, used_at, revoked_at, created_at)
       VALUES (?, ?, ?, ?, NULL, NULL, ?)`
    )
    .bind(id, customerSessionId, tokenHash, expiresAt, nowIso)
    .run();

  return { token: rawToken, expiresAt };
}

export async function revokeActiveGuestRecoveryTokens(
  db: D1Database,
  customerSessionId: string,
  now: Date = new Date()
): Promise<void> {
  await ensureStudioSchema(db);
  await db
    .prepare(
      `UPDATE studio_recovery_tokens
       SET revoked_at = ?
       WHERE customer_session_id = ? AND used_at IS NULL AND revoked_at IS NULL`
    )
    .bind(now.toISOString(), customerSessionId)
    .run();
}

export async function consumeGuestRecoveryToken(
  request: Request,
  db: D1Database,
  rawToken: string,
  now: Date = new Date()
): Promise<
  | { ok: true; customerSessionId: string; setCookieHeader: string }
  | { ok: false; status: number; error: string }
> {
  const clean = rawToken.trim();
  if (clean.length < 32 || !/^[0-9a-f]+$/i.test(clean)) {
    return {
      ok: false,
      status: 400,
      error: "Tautan pemulihan tidak valid.",
    };
  }

  await ensureStudioSchema(db);
  const tokenHash = await sha256Hex(clean);
  const nowIso = now.toISOString();

  const row = await db
    .prepare(
      `SELECT id, customer_session_id, expires_at, used_at, revoked_at
       FROM studio_recovery_tokens
       WHERE token_hash = ?`
    )
    .bind(tokenHash)
    .first<{
      id: string;
      customer_session_id: string;
      expires_at: string;
      used_at: string | null;
      revoked_at: string | null;
    }>();

  if (!row) {
    return {
      ok: false,
      status: 404,
      error: "Tautan pemulihan tidak ditemukan atau sudah tidak berlaku.",
    };
  }

  if (row.revoked_at) {
    return {
      ok: false,
      status: 410,
      error: "Tautan pemulihan ini telah dicabut. Buat tautan baru dari perangkat asal.",
    };
  }

  if (row.used_at) {
    return {
      ok: false,
      status: 410,
      error: "Tautan pemulihan hanya dapat digunakan satu kali dan sudah terpakai.",
    };
  }

  if (row.expires_at <= nowIso) {
    return {
      ok: false,
      status: 410,
      error: "Masa berlaku tautan pemulihan (15 menit) telah habis. Buat tautan baru dari perangkat asal.",
    };
  }

  // Tandai terpakai secara kondisional (mencegah penggunaan ganda secara bersamaan)
  const updateResult = await db
    .prepare(
      `UPDATE studio_recovery_tokens
       SET used_at = ?
       WHERE id = ? AND used_at IS NULL AND revoked_at IS NULL`
    )
    .bind(nowIso, row.id)
    .run();

  const changes = (updateResult as { meta?: { changes?: number } })?.meta?.changes;
  if (typeof changes === "number" && changes === 0) {
    return {
      ok: false,
      status: 410,
      error: "Tautan pemulihan sudah digunakan.",
    };
  }

  const setCookieHeader = await issueAdditionalCustomerSessionCookie(
    request,
    db,
    row.customer_session_id
  );

  return {
    ok: true,
    customerSessionId: row.customer_session_id,
    setCookieHeader,
  };
}
