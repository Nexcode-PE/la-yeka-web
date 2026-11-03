ALTER TABLE "users" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "users_role_is_active_idx" ON "users"("role", "is_active");
