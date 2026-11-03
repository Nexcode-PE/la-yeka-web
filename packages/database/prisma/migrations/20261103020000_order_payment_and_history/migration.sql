-- Public, sequential order reference for customers and kitchen operations.
CREATE SEQUENCE "orders_order_number_seq";
ALTER TABLE "orders" ADD COLUMN "order_number" INTEGER;
UPDATE "orders" SET "order_number" = nextval('orders_order_number_seq');
ALTER TABLE "orders" ALTER COLUMN "order_number" SET DEFAULT nextval('orders_order_number_seq');
ALTER SEQUENCE "orders_order_number_seq" OWNED BY "orders"."order_number";
ALTER TABLE "orders" ALTER COLUMN "order_number" SET NOT NULL;
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
ALTER TABLE "orders"
  ADD COLUMN "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "payment_reference" TEXT,
  ADD COLUMN "payment_reviewed_at" TIMESTAMP(3);

CREATE TABLE "order_status_events" (
  "id" UUID NOT NULL,
  "order_id" UUID NOT NULL,
  "from_status" "OrderStatus",
  "to_status" "OrderStatus" NOT NULL,
  "reason" TEXT,
  "changed_by_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_status_events_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "order_status_events" ADD CONSTRAINT "order_status_events_order_id_fkey"
FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_status_events" ADD CONSTRAINT "order_status_events_changed_by_id_fkey"
FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "order_status_events_order_id_created_at_idx" ON "order_status_events"("order_id", "created_at");
