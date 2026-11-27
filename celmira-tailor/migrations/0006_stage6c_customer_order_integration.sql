-- Stage 6C: Non-destructive relational integration between guest sessions, studio configs, and orders.
-- Tidak menghapus tabel atau data yang sudah ada; seluruh snapshot desain & ukuran lama tetap aman di payload_json.

ALTER TABLE chat_customer_sessions ADD COLUMN customer_email TEXT;

ALTER TABLE orders ADD COLUMN design_id TEXT;
ALTER TABLE orders ADD COLUMN measurement_profile_id TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_design ON orders(design_id);
CREATE INDEX IF NOT EXISTS idx_orders_measurement_profile ON orders(measurement_profile_id);
