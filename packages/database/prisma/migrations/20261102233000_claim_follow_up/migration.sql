-- Preserve the administrative reply and milestones for the complaints book.
ALTER TABLE "claims"
  ADD COLUMN "admin_response" TEXT,
  ADD COLUMN "responded_at" TIMESTAMP(3),
  ADD COLUMN "resolved_at" TIMESTAMP(3),
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "claims_status_created_at_idx" ON "claims"("status", "created_at");
