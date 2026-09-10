-- AlterTable: add missing "name" and "updatedAt" columns to users
-- (production DB was created from an older schema that lacked these)

ALTER TABLE "users" ADD COLUMN "name" TEXT NOT NULL DEFAULT 'Unknown';
ALTER TABLE "users" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill "name" from username for existing accounts, since real names
-- were never captured for users created before this column existed
UPDATE "users" SET "name" = "username" WHERE "name" = 'Unknown';

-- Drop the temporary default now that every row has a name
ALTER TABLE "users" ALTER COLUMN "name" DROP DEFAULT;