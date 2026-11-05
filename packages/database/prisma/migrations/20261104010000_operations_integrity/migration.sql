-- Additive indexes for the operational filters used by the admin API.
CREATE INDEX IF NOT EXISTS "orders_status_created_at_idx" ON "orders" ("status", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "orders_payment_status_created_at_idx" ON "orders" ("payment_status", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "orders_fulfillment_created_at_idx" ON "orders" ("fulfillment", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "claims_status_created_at_idx" ON "claims" ("status", "created_at" DESC);

-- This application currently has a single logical cash register. PostgreSQL enforces
-- that only one active shift can exist, including under concurrent requests.
CREATE UNIQUE INDEX IF NOT EXISTS "cash_shifts_one_open_shift_idx"
  ON "cash_shifts" ((1))
  WHERE "closed_at" IS NULL;
