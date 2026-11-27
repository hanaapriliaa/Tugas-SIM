-- Celmira Tailor — Revisi Stage 6B: Customer Accounts & Idempotent Legacy Studio Migration (Cloudflare D1)

CREATE TABLE IF NOT EXISTS customer_accounts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  customer_session_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (customer_session_id) REFERENCES chat_customer_sessions(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_accounts_email
  ON customer_accounts(email);

CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_accounts_session
  ON customer_accounts(customer_session_id);

-- Kolom legacy_local_id untuk deduplikasi migrasi data localStorage secara aman & idempotent
ALTER TABLE design_configs ADD COLUMN legacy_local_id TEXT;
ALTER TABLE measurement_profiles ADD COLUMN legacy_local_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_design_configs_legacy
  ON design_configs(customer_session_id, legacy_local_id)
  WHERE legacy_local_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_measurement_profiles_legacy
  ON measurement_profiles(customer_session_id, legacy_local_id)
  WHERE legacy_local_id IS NOT NULL;
