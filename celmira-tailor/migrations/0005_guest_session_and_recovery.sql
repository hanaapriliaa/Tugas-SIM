-- Celmira Tailor — Pure Guest Customer System: Session Expiry, Revocation & Private Recovery Tokens (Cloudflare D1)

-- Tambah masa berlaku dan pencabutan pada token sesi perangkat pelanggan
ALTER TABLE customer_session_tokens ADD COLUMN expires_at TEXT;
ALTER TABLE customer_session_tokens ADD COLUMN revoked_at TEXT;

CREATE INDEX IF NOT EXISTS idx_customer_session_tokens_expires
  ON customer_session_tokens(expires_at);

-- Token pemulihan privat satu kali pakai (hanya SHA-256 hash disimpan, masa berlaku singkat 15 menit)
CREATE TABLE IF NOT EXISTS studio_recovery_tokens (
  id TEXT PRIMARY KEY,
  customer_session_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (customer_session_id) REFERENCES chat_customer_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_studio_recovery_tokens_session
  ON studio_recovery_tokens(customer_session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_studio_recovery_tokens_expires
  ON studio_recovery_tokens(expires_at);
