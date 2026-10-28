-- Delivery and payment data required for real restaurant operations.
CREATE TYPE "FulfillmentMethod" AS ENUM ('DELIVERY', 'PICKUP');
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'YAPE', 'TRANSFER', 'CARD');

ALTER TABLE "orders"
  ADD COLUMN "fulfillment" "FulfillmentMethod" NOT NULL DEFAULT 'DELIVERY',
  ADD COLUMN "payment_method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
  ADD COLUMN "address" TEXT,
  ADD COLUMN "district" TEXT;

CREATE INDEX "orders_status_created_at_idx" ON "orders"("status", "created_at");
