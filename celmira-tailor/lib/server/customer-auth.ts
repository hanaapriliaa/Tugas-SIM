import {
  CUSTOMER_SESSION_COOKIE,
  buildClearCookieHeader,
  getCookieFromRequest,
  getCustomerSession,
  getOrCreateCustomerSession,
  hashPasswordPbkdf2,
  isSecureRequest,
  issueAdditionalCustomerSessionCookie,
  sha256Hex,
  verifyPasswordPbkdf2,
} from "./auth.ts";
import { ensureStudioSchema } from "./studio-schema.ts";

export type CustomerAccountRecord = {
  id: string;
  email: string;
  fullName: string;
  customerSessionId: string;
  createdAt: string;
};

export function normalizeCustomerEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateCustomerEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export function validateCustomerPassword(password: string): string | null {
  if (password.length < 8) {
    return "Kata sandi minimal 8 karakter.";
  }
  if (password.length > 128) {
    return "Kata sandi maksimal 128 karakter.";
  }
  return null;
}

export async function getCustomerAccountBySessionId(
  db: D1Database,
  customerSessionId: string
): Promise<CustomerAccountRecord | null> {
  await ensureStudioSchema(db);
  const row = await db
    .prepare(
      `SELECT id, email, full_name, customer_session_id, created_at
       FROM customer_accounts
       WHERE customer_session_id = ?`
    )
    .bind(customerSessionId)
    .first<{
      id: string;
      email: string;
      full_name: string;
      customer_session_id: string;
      created_at: string;
    }>();

  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    customerSessionId: row.customer_session_id,
    createdAt: row.created_at,
  };
}

export async function getAuthenticatedCustomerAccount(
  request: Request,
  db: D1Database
): Promise<CustomerAccountRecord | null> {
  const session = await getCustomerSession(request, db);
  if (!session) return null;
  return getCustomerAccountBySessionId(db, session.id);
}

export async function registerCustomerAccount(
  request: Request,
  db: D1Database,
  input: {
    email: string;
    password: string;
    fullName?: string;
  }
): Promise<
  | { ok: true; account: CustomerAccountRecord; setCookieHeader: string | null }
  | { ok: false; status: number; error: string }
> {
  const email = normalizeCustomerEmail(input.email);
  if (!validateCustomerEmail(email)) {
    return { ok: false, status: 400, error: "Masukkan alamat email yang valid." };
  }

  const passwordErr = validateCustomerPassword(input.password);
  if (passwordErr) {
    return { ok: false, status: 400, error: passwordErr };
  }

  const fullName = (input.fullName ?? "").trim().slice(0, 80);

  await ensureStudioSchema(db);

  const existingByEmail = await db
    .prepare(`SELECT id FROM customer_accounts WHERE email = ?`)
    .bind(email)
    .first<{ id: string }>();

  if (existingByEmail) {
    return {
      ok: false,
      status: 409,
      error: "Email ini sudah terdaftar. Silakan masuk dengan kata sandi Anda.",
    };
  }

  // Gunakan sesi browser saat ini bila belum terikat akun lain agar desain & ukuran yang sedang dibuat otomatis tersimpan ke akun baru.
  let targetSessionId: string;
  let setCookieHeader: string | null = null;

  const existingSession = await getCustomerSession(request, db);
  if (existingSession) {
    const existingOwner = await getCustomerAccountBySessionId(db, existingSession.id);
    if (!existingOwner) {
      targetSessionId = existingSession.id;
    } else {
      const freshReq = new Request(request.url, { method: request.method });
      const created = await getOrCreateCustomerSession(freshReq, db);
      targetSessionId = created.session.id;
      setCookieHeader = created.setCookieHeader;
    }
  } else {
    const created = await getOrCreateCustomerSession(request, db);
    targetSessionId = created.session.id;
    setCookieHeader = created.setCookieHeader;
  }

  const passwordHash = await hashPasswordPbkdf2(input.password);
  const id = `cacc-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO customer_accounts (id, email, password_hash, full_name, customer_session_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(id, email, passwordHash, fullName, targetSessionId, now, now)
    .run();

  if (fullName) {
    await db
      .prepare(
        `UPDATE chat_customer_sessions
         SET customer_name = COALESCE(NULLIF(customer_name, ''), ?)
         WHERE id = ?`
      )
      .bind(fullName, targetSessionId)
      .run();
  }

  return {
    ok: true,
    account: {
      id,
      email,
      fullName,
      customerSessionId: targetSessionId,
      createdAt: now,
    },
    setCookieHeader,
  };
}

/**
 * Memindahkan desain dan profil ukuran dari sesi anonim sementara (yang belum terikat akun mana pun)
 * ke sesi akun pelanggan saat login, tanpa menyentuh pesanan lama atau menimbulkan duplikasi.
 */
async function mergeAnonymousStudioIntoAccount(
  db: D1Database,
  anonymousSessionId: string,
  accountSessionId: string
): Promise<void> {
  if (anonymousSessionId === accountSessionId) return;
  const anonAccount = await getCustomerAccountBySessionId(db, anonymousSessionId);
  if (anonAccount) return;

  await db
    .prepare(
      `UPDATE design_configs
       SET customer_session_id = ?
       WHERE customer_session_id = ?
         AND (legacy_local_id IS NULL OR legacy_local_id NOT IN (
           SELECT legacy_local_id FROM design_configs
           WHERE customer_session_id = ? AND legacy_local_id IS NOT NULL
         ))`
    )
    .bind(accountSessionId, anonymousSessionId, accountSessionId)
    .run();

  await db
    .prepare(
      `UPDATE measurement_profiles
       SET customer_session_id = ?
       WHERE customer_session_id = ?
         AND (legacy_local_id IS NULL OR legacy_local_id NOT IN (
           SELECT legacy_local_id FROM measurement_profiles
           WHERE customer_session_id = ? AND legacy_local_id IS NOT NULL
         ))`
    )
    .bind(accountSessionId, anonymousSessionId, accountSessionId)
    .run();

  await db
    .prepare(
      `UPDATE studio_files
       SET customer_session_id = ?
       WHERE customer_session_id = ?`
    )
    .bind(accountSessionId, anonymousSessionId)
    .run();
}

export async function loginCustomerAccount(
  request: Request,
  db: D1Database,
  input: {
    email: string;
    password: string;
  }
): Promise<
  | { ok: true; account: CustomerAccountRecord; setCookieHeader: string }
  | { ok: false; status: number; error: string }
> {
  const email = normalizeCustomerEmail(input.email);
  if (!validateCustomerEmail(email) || !input.password) {
    return { ok: false, status: 400, error: "Masukkan email dan kata sandi Anda." };
  }

  await ensureStudioSchema(db);
  const row = await db
    .prepare(
      `SELECT id, email, password_hash, full_name, customer_session_id, created_at
       FROM customer_accounts
       WHERE email = ?`
    )
    .bind(email)
    .first<{
      id: string;
      email: string;
      password_hash: string;
      full_name: string;
      customer_session_id: string;
      created_at: string;
    }>();

  if (!row) {
    return { ok: false, status: 401, error: "Email atau kata sandi tidak cocok." };
  }

  const validPassword = await verifyPasswordPbkdf2(input.password, row.password_hash);
  if (!validPassword) {
    return { ok: false, status: 401, error: "Email atau kata sandi tidak cocok." };
  }

  // Jika perangkat ini sebelumnya punya sesi anonim dengan draft/profil, gabungkan secara aman.
  const currentAnonSession = await getCustomerSession(request, db);
  if (currentAnonSession && currentAnonSession.id !== row.customer_session_id) {
    await mergeAnonymousStudioIntoAccount(db, currentAnonSession.id, row.customer_session_id);
  }

  const setCookieHeader = await issueAdditionalCustomerSessionCookie(
    request,
    db,
    row.customer_session_id
  );

  return {
    ok: true,
    account: {
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      customerSessionId: row.customer_session_id,
      createdAt: row.created_at,
    },
    setCookieHeader,
  };
}

export async function logoutCustomerDevice(
  request: Request,
  db: D1Database
): Promise<string> {
  await ensureStudioSchema(db);
  const rawToken = getCookieFromRequest(request, CUSTOMER_SESSION_COOKIE);
  if (rawToken && rawToken.length >= 32) {
    const tokenHash = await sha256Hex(rawToken);
    await db
      .prepare(`DELETE FROM customer_session_tokens WHERE token_hash = ?`)
      .bind(tokenHash)
      .run();
  }
  return buildClearCookieHeader(CUSTOMER_SESSION_COOKIE, isSecureRequest(request));
}
