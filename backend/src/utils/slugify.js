// backend/src/utils/slugify.js
//
// Turns a product/category name into a URL-safe slug, and guarantees
// uniqueness against a given Prisma model before it's saved.
//
// Examples:
//   slugify("Elegant Black Evening Dress")  -> "elegant-black-evening-dress"
//   slugify("KIDS WEAR")                     -> "kids-wear"
//   slugify("Men's Suits & Blazers")         -> "mens-suits-and-blazers"
//   slugify("Café Chic")                     -> "cafe-chic"

function slugify(input) {
  return String(input || '')
    .normalize('NFKD')                 // split accented chars into base + accent mark
    .replace(/[\u0300-\u036f]/g, '')   // strip the accent marks
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/'/g, '')                 // "Men's" -> "Mens" (avoids a dangling hyphen)
    .replace(/[^a-z0-9]+/g, '-')       // any run of non-alphanumerics -> single hyphen
    .replace(/^-+|-+$/g, '');          // trim leading/trailing hyphens
}

// Generates a slug for `name` that doesn't collide with any existing row in
// `model` (pass e.g. prisma.product or prisma.category), excluding
// `excludeId` itself when updating a record that may already own that slug.
// Appends -2, -3, ... on collision (e.g. two products both named
// "Little Black Dress" become "little-black-dress" and "little-black-dress-2").
async function generateUniqueSlug(model, name, excludeId = null) {
  const base = slugify(name) || 'item';
  let candidate = base;
  let suffix = 2;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const where = excludeId
      ? { slug: candidate, NOT: { id: excludeId } }
      : { slug: candidate };
    const clash = await model.findFirst({ where, select: { id: true } });
    if (!clash) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

module.exports = { slugify, generateUniqueSlug };
