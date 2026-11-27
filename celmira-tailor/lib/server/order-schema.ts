export const ORDER_SCHEMA_STATEMENTS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    order_code TEXT NOT NULL UNIQUE,
    tracking_access_code TEXT NOT NULL,
    customer_session_id TEXT,
    status TEXT NOT NULL,
    production_stage TEXT NOT NULL,
    category_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_whatsapp TEXT NOT NULL,
    target_date TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_orders_code ON orders(order_code)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_session ON orders(customer_session_id, updated_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, updated_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_updated ON orders(updated_at DESC)`,
  `CREATE TABLE IF NOT EXISTS order_files (
    id TEXT PRIMARY KEY,
    order_id TEXT,
    kind TEXT NOT NULL CHECK (kind IN ('order_reference', 'payment_proof', 'qris')),
    r2_key TEXT NOT NULL UNIQUE,
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
    size_bytes INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS idx_order_files_order ON order_files(order_id)`,
  `CREATE INDEX IF NOT EXISTS idx_order_files_kind ON order_files(kind)`,
  `CREATE TABLE IF NOT EXISTS admin_payment_config (
    id TEXT PRIMARY KEY CHECK (id = 'default'),
    qris_file_id TEXT,
    qris_file_name TEXT,
    qris_merchant_name TEXT,
    qris_updated_at TEXT,
    payment_instructions TEXT NOT NULL,
    dp_window_hours INTEGER NOT NULL DEFAULT 24,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS order_tracking_sessions (
    id TEXT PRIMARY KEY,
    token_hash TEXT NOT NULL,
    order_code TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_tracking_session_pair
    ON order_tracking_sessions(token_hash, order_code)`,
  `CREATE INDEX IF NOT EXISTS idx_tracking_session_expires
    ON order_tracking_sessions(expires_at)`,
];

const initializedOrderDbs = new WeakSet<D1Database>();

export async function ensureOrderSchema(db: D1Database): Promise<void> {
  if (initializedOrderDbs.has(db)) return;
  await db.batch(ORDER_SCHEMA_STATEMENTS.map((sql) => db.prepare(sql)));
  initializedOrderDbs.add(db);
}
