import { ensureChatSchema } from "./chat-schema.ts";
import { ensureOrderSchema } from "./order-schema.ts";
import { ensureStudioSchema } from "./studio-schema.ts";

export const ADMIN_MODULE_SCHEMA_STATEMENTS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS admin_measurement_templates (
    template_id TEXT PRIMARY KEY,
    config_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS admin_production_capacity (
    id TEXT PRIMARY KEY CHECK (id = 'default'),
    weekly_order_limit INTEGER NOT NULL DEFAULT 12,
    daily_target_limit INTEGER NOT NULL DEFAULT 3,
    standard_lead_days INTEGER NOT NULL DEFAULT 14,
    blocked_dates_json TEXT NOT NULL DEFAULT '[]',
    category_lead_days_json TEXT NOT NULL DEFAULT '{}',
    operational_note TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS admin_customer_notes (
    customer_key TEXT PRIMARY KEY,
    internal_note TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS auth_rate_limits (
    rate_key TEXT PRIMARY KEY,
    attempts INTEGER NOT NULL DEFAULT 0,
    window_start TEXT NOT NULL,
    locked_until TEXT,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_locked
    ON auth_rate_limits(locked_until)`,
];

const initializedAdminDbs = new WeakSet<D1Database>();

export async function ensureAdminModuleSchema(db: D1Database): Promise<void> {
  if (initializedAdminDbs.has(db)) return;
  await ensureChatSchema(db);
  await ensureOrderSchema(db);
  await ensureStudioSchema(db);
  await db.batch(ADMIN_MODULE_SCHEMA_STATEMENTS.map((sql) => db.prepare(sql)));
  initializedAdminDbs.add(db);
}
