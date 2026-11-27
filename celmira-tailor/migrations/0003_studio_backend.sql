-- Celmira Tailor — Stage 6B: Design Studio & Measurement Studio Backend Schema (Cloudflare D1 / SQLite)

CREATE TABLE IF NOT EXISTS customer_session_tokens (
  id TEXT PRIMARY KEY,
  customer_session_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  FOREIGN KEY (customer_session_id) REFERENCES chat_customer_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_customer_session_tokens_session
  ON customer_session_tokens(customer_session_id);

CREATE TABLE IF NOT EXISTS studio_access_codes (
  customer_session_id TEXT PRIMARY KEY,
  sync_code TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (customer_session_id) REFERENCES chat_customer_sessions(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_studio_access_codes_code
  ON studio_access_codes(sync_code);

CREATE TABLE IF NOT EXISTS design_configs (
  id TEXT PRIMARY KEY,
  customer_session_id TEXT NOT NULL,
  title TEXT NOT NULL,
  category_id TEXT NOT NULL,
  model_name TEXT NOT NULL,
  specifications_json TEXT NOT NULL,
  attachments_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (customer_session_id) REFERENCES chat_customer_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_design_configs_session
  ON design_configs(customer_session_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS measurement_profiles (
  id TEXT PRIMARY KEY,
  customer_session_id TEXT NOT NULL,
  label TEXT NOT NULL,
  template_id TEXT NOT NULL,
  category_hint TEXT,
  values_json TEXT NOT NULL,
  extra_values_json TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (customer_session_id) REFERENCES chat_customer_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_measurement_profiles_session
  ON measurement_profiles(customer_session_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS studio_files (
  id TEXT PRIMARY KEY,
  design_id TEXT,
  customer_session_id TEXT NOT NULL,
  r2_key TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  size_bytes INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (design_id) REFERENCES design_configs(id) ON DELETE SET NULL,
  FOREIGN KEY (customer_session_id) REFERENCES chat_customer_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_studio_files_design ON studio_files(design_id);
CREATE INDEX IF NOT EXISTS idx_studio_files_session ON studio_files(customer_session_id);
