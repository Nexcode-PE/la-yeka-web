ALTER TABLE "orders"
  ADD COLUMN "delivery_fee" DECIMAL(8,2) NOT NULL DEFAULT 0,
  ADD COLUMN "delivery_driver" TEXT,
  ADD COLUMN "estimated_minutes" INTEGER;

CREATE TABLE "cash_shifts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "opened_by_id" UUID,
  "opening_amount" DECIMAL(8,2) NOT NULL DEFAULT 0,
  "closing_amount" DECIMAL(8,2),
  "notes" TEXT,
  "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closed_at" TIMESTAMP(3),
  CONSTRAINT "cash_shifts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "cash_shifts_closed_at_idx" ON "cash_shifts"("closed_at");
