-- Stage 6E: Persistent D1 rate limiting for admin login and order tracking 2FA verification.
-- Migrasi non-destruktif; melindungi endpoint autentikasi sensitif dari brute-force.

CREATE TABLE IF NOT EXISTS auth_rate_limits (
  rate_key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 0,
  window_start TEXT NOT NULL,
  locked_until TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_locked ON auth_rate_limits(locked_until);
