import { ensureAdminModuleSchema } from "./admin-schema.ts";
import { sha256Hex } from "./auth.ts";

export type RateLimitConfig = {
  scope: "admin_login" | "track_verify";
  maxAttempts: number;
  windowMs: number;
  lockoutMs: number;
};

export type RateLimitCheckResult =
  | { allowed: true; remainingAttempts: number }
  | { allowed: false; retryAfterSeconds: number; lockedUntil: string };

export const ADMIN_LOGIN_RATE_LIMIT: RateLimitConfig = {
  scope: "admin_login",
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
  lockoutMs: 15 * 60 * 1000,
};

export const TRACK_VERIFY_RATE_LIMIT: RateLimitConfig = {
  scope: "track_verify",
  maxAttempts: 8,
  windowMs: 15 * 60 * 1000,
  lockoutMs: 15 * 60 * 1000,
};

export function extractClientIp(request: Request): string {
  const cfIp = request.headers.get("cf-connecting-ip")?.trim();
  if (cfIp) return cfIp;
  const xff = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (xff) return xff;
  return "unknown";
}

export async function buildRateLimitKey(
  scope: RateLimitConfig["scope"],
  ip: string,
  identifier: string
): Promise<string> {
  const digest = await sha256Hex(`${scope}|${ip.toLowerCase()}|${identifier.trim().toLowerCase()}`);
  return `${scope}:${digest.slice(0, 32)}`;
}

export async function checkRateLimit(
  db: D1Database,
  rateKey: string,
  config: RateLimitConfig,
  now: Date = new Date()
): Promise<RateLimitCheckResult> {
  await ensureAdminModuleSchema(db);
  const row = await db
    .prepare(
      `SELECT attempts, window_start, locked_until
       FROM auth_rate_limits
       WHERE rate_key = ?`
    )
    .bind(rateKey)
    .first<{ attempts: number; window_start: string; locked_until: string | null }>();

  if (!row) {
    return { allowed: true, remainingAttempts: config.maxAttempts };
  }

  const nowMs = now.getTime();
  if (row.locked_until) {
    const lockedMs = Date.parse(row.locked_until);
    if (Number.isFinite(lockedMs) && lockedMs > nowMs) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((lockedMs - nowMs) / 1000)),
        lockedUntil: row.locked_until,
      };
    }
  }

  const windowStartMs = Date.parse(row.window_start);
  if (!Number.isFinite(windowStartMs) || nowMs - windowStartMs >= config.windowMs) {
    return { allowed: true, remainingAttempts: config.maxAttempts };
  }

  const remaining = Math.max(0, config.maxAttempts - Number(row.attempts ?? 0));
  return { allowed: true, remainingAttempts: remaining };
}

export async function recordRateLimitFailure(
  db: D1Database,
  rateKey: string,
  config: RateLimitConfig,
  now: Date = new Date()
): Promise<{ locked: boolean; attempts: number; retryAfterSeconds?: number }> {
  await ensureAdminModuleSchema(db);
  const row = await db
    .prepare(
      `SELECT attempts, window_start, locked_until
       FROM auth_rate_limits
       WHERE rate_key = ?`
    )
    .bind(rateKey)
    .first<{ attempts: number; window_start: string; locked_until: string | null }>();

  const nowMs = now.getTime();
  const nowIso = now.toISOString();

  let nextAttempts = 1;
  let nextWindowStart = nowIso;

  if (row) {
    const windowStartMs = Date.parse(row.window_start);
    if (Number.isFinite(windowStartMs) && nowMs - windowStartMs < config.windowMs) {
      nextAttempts = Number(row.attempts ?? 0) + 1;
      nextWindowStart = row.window_start;
    }
  }

  const locked = nextAttempts >= config.maxAttempts;
  const lockedUntil = locked ? new Date(nowMs + config.lockoutMs).toISOString() : null;

  await db
    .prepare(
      `INSERT INTO auth_rate_limits (rate_key, attempts, window_start, locked_until, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(rate_key) DO UPDATE SET
         attempts = excluded.attempts,
         window_start = excluded.window_start,
         locked_until = excluded.locked_until,
         updated_at = excluded.updated_at`
    )
    .bind(rateKey, nextAttempts, nextWindowStart, lockedUntil, nowIso)
    .run();

  return {
    locked,
    attempts: nextAttempts,
    retryAfterSeconds: locked ? Math.ceil(config.lockoutMs / 1000) : undefined,
  };
}

export async function clearRateLimit(db: D1Database, rateKey: string): Promise<void> {
  await ensureAdminModuleSchema(db);
  await db.prepare(`DELETE FROM auth_rate_limits WHERE rate_key = ?`).bind(rateKey).run();
}
