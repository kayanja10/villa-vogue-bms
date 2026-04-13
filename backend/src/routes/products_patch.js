// ════════════════════════════════════════════════════════════════
// FILE: routes/products.js  (BACKEND)
// INSTRUCTION: Inside router.get('/public', ...) find the line
// that has `orderBy:` in the findMany call and REPLACE only that
// line with the block below.
// ════════════════════════════════════════════════════════════════

// ── REPLACE your existing orderBy line with this block ───────────

const sortMap = {
  featured:   [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
  price_asc:  [{ price: 'asc' }],
  price_desc: [{ price: 'desc' }],
  newest:     [{ createdAt: 'desc' }],
};
const orderBy = sortMap[req.query.sort] || sortMap.featured;

// ── then make sure your findMany uses `orderBy` like: ────────────
// const products = await prisma.product.findMany({
//   where: { ... },
//   orderBy,          <── just the variable, replaces any old orderBy line
//   ...
// });
