-- Celmira Tailor — Stage 5B-2: Chat Backend Schema (Cloudflare D1 / SQLite)

CREATE TABLE IF NOT EXISTS chat_customer_sessions (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  customer_name TEXT,
  customer_whatsapp_norm TEXT,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_threads (
  id TEXT PRIMARY KEY,
  customer_session_id TEXT NOT NULL,
  legacy_local_id TEXT,
  title TEXT NOT NULL,
  customer_name TEXT,
  source TEXT NOT NULL CHECK (source IN ('general','design-studio','measurement-studio','orders','track')),
  order_code TEXT,
  order_verified INTEGER NOT NULL DEFAULT 0,
  category_id TEXT,
  design_id TEXT,
  design_title TEXT,
  measurement_profile_id TEXT,
  measurement_label TEXT,
  template_id TEXT,
  unread_by_customer INTEGER NOT NULL DEFAULT 0,
  unread_by_admin INTEGER NOT NULL DEFAULT 0,
  last_message_preview TEXT,
  last_message_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (customer_session_id) REFERENCES chat_customer_sessions(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_threads_legacy
  ON chat_threads(customer_session_id, legacy_local_id)
  WHERE legacy_local_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_threads_customer_updated
  ON chat_threads(customer_session_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_threads_admin_updated
  ON chat_threads(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_threads_order_code
  ON chat_threads(order_code);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  client_message_id TEXT,
  sender TEXT NOT NULL CHECK (sender IN ('customer','admin','system')),
  sender_name TEXT NOT NULL,
  recipient_role TEXT NOT NULL CHECK (recipient_role IN ('customer','admin','all')),
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'terkirim' CHECK (status IN ('terkirim','dibaca')),
  read_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (thread_id) REFERENCES chat_threads(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_idempotency
  ON chat_messages(thread_id, client_message_id)
  WHERE client_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_thread_created
  ON chat_messages(thread_id, created_at ASC);

CREATE TABLE IF NOT EXISTS chat_attachments (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  message_id TEXT,
  uploaded_by TEXT NOT NULL CHECK (uploaded_by IN ('customer','admin')),
  r2_key TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','image/webp')),
  size_bytes INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (thread_id) REFERENCES chat_threads(id) ON DELETE CASCADE,
  FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_attachments_message ON chat_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_attachments_thread ON chat_attachments(thread_id);

CREATE TABLE IF NOT EXISTS chat_admin_config (
  id TEXT PRIMARY KEY CHECK (id = 'default'),
  admin_display_name TEXT NOT NULL,
  status_label TEXT NOT NULL,
  availability_note TEXT NOT NULL,
  official_whatsapp_number TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  admin_email TEXT NOT NULL,
  admin_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);
