-- Stage 6D: Admin Dashboard extended modules (Measurement Templates, Production Capacity/Schedule, Customer Notes).
-- Migrasi non-destruktif; tidak mengubah tabel pesanan, studio, maupun chat yang sudah ada.

CREATE TABLE IF NOT EXISTS admin_measurement_templates (
  template_id TEXT PRIMARY KEY,
  config_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_production_capacity (
  id TEXT PRIMARY KEY CHECK (id = 'default'),
  weekly_order_limit INTEGER NOT NULL DEFAULT 12,
  daily_target_limit INTEGER NOT NULL DEFAULT 3,
  standard_lead_days INTEGER NOT NULL DEFAULT 14,
  blocked_dates_json TEXT NOT NULL DEFAULT '[]',
  category_lead_days_json TEXT NOT NULL DEFAULT '{}',
  operational_note TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_customer_notes (
  customer_key TEXT PRIMARY KEY,
  internal_note TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);
