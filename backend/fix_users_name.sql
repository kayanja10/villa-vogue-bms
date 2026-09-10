UPDATE "users" SET "name" = "username" WHERE "name" IS NULL;
ALTER TABLE "users" ALTER COLUMN "name" SET NOT NULL;