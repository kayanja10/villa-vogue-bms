// backend/src/scripts/backfillSlugs.js
//
// One-off migration helper — run this ONCE, right after adding the nullable
// `slug` columns to Product and Category and running
// `npx prisma migrate dev --name add_slug_and_gender` (see prisma/schema.prisma).
// It generates a unique slug for every existing row that doesn't have one
// yet. Safe to re-run: any row that already has a slug is skipped, so a
// second run is a no-op.
//
// Usage (from the backend/ directory):
//   node src/scripts/backfillSlugs.js

const { prisma } = require('../prisma');
const { generateUniqueSlug } = require('../utils/slugify');

async function backfillCategories() {
  const categories = await prisma.category.findMany({ where: { slug: null } });
  console.log(`[backfill] ${categories.length} categories missing a slug`);
  for (const cat of categories) {
    const slug = await generateUniqueSlug(prisma.category, cat.name, cat.id);
    await prisma.category.update({ where: { id: cat.id }, data: { slug } });
    console.log(`[backfill] category "${cat.name}" -> /shop/${slug}`);
  }
}

async function backfillProducts() {
  const products = await prisma.product.findMany({ where: { slug: null } });
  console.log(`[backfill] ${products.length} products missing a slug`);
  for (const p of products) {
    const slug = await generateUniqueSlug(prisma.product, p.name, p.id);
    await prisma.product.update({ where: { id: p.id }, data: { slug } });
    console.log(`[backfill] product "${p.name}" -> ${slug}`);
  }
}

async function main() {
  await backfillCategories();
  await backfillProducts();
  console.log('[backfill] Done. Every existing product and category now has a slug.');
}

main()
  .catch((err) => {
    console.error('[backfill] Fatal error:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
