-- Add SEO-friendly slug to categories
ALTER TABLE "categories"
ADD COLUMN "slug" TEXT;

-- Add SEO-friendly slug to products
ALTER TABLE "products"
ADD COLUMN "slug" TEXT;

-- Add flexible gender field to products
ALTER TABLE "products"
ADD COLUMN "gender" TEXT;

-- Unique indexes for SEO-friendly slugs
CREATE UNIQUE INDEX "categories_slug_key"
ON "categories"("slug");

CREATE UNIQUE INDEX "products_slug_key"
ON "products"("slug");