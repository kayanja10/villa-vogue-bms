-- AlterTable: add missing "name" and "updatedAt" columns to users
-- Idempotent: safe to re-run even if a previous partial attempt
-- already added one or both columns.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill ANY null name (covers both a fresh column and one left over
-- from an earlier partial/failed migration attempt)
UPDATE "users" SET "name" = "username" WHERE "name" IS NULL;

ALTER TABLE "users" ALTER COLUMN "name" SET NOT NULL;