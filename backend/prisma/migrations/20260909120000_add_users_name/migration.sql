-- AlterTable: add missing "name" and "updatedAt" columns to users
-- Idempotent: safe to re-run even if a previous partial attempt
-- already added one or both columns.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT 'Unknown';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "users" SET "name" = "username" WHERE "name" = 'Unknown';

ALTER TABLE "users" ALTER COLUMN "name" DROP DEFAULT;