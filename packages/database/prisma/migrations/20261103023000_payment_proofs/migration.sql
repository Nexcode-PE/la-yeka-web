ALTER TABLE "orders"
  ADD COLUMN "payment_proof_url" TEXT,
  ADD COLUMN "payment_token" UUID;

UPDATE "orders"
SET "payment_token" = md5(random()::text || clock_timestamp()::text)::uuid
WHERE "payment_token" IS NULL;

ALTER TABLE "orders" ALTER COLUMN "payment_token" SET NOT NULL;
CREATE UNIQUE INDEX "orders_payment_token_key" ON "orders"("payment_token");
