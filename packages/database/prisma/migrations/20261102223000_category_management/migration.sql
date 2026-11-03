-- Categories can be paused without hiding their product history.
ALTER TABLE "categories" ADD COLUMN "is_available" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "categories_is_available_position_idx"
ON "categories"("is_available", "position");
