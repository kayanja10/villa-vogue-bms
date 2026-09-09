// backend/src/routes/categories.js
//
// ⚠️ RECONSTRUCTED FILE — I was not given your actual categories.js, so this
// was rebuilt from the API contract your frontend already calls
// (categories.list/create/update/delete in lib/api.js) plus the same
// middleware pattern used in products.js. Diff this against your real file
// before replacing it — if your real file has extra fields or logic, keep
// those and just merge in the parts marked "SEO:" below (the /public routes
// and the slug generation in POST/PUT).

const express = require('express');
const router = express.Router();
const { prisma } = require('../prisma');
const { authenticate, requireManagerOrAdmin } = require('../middleware/auth');
const { generateUniqueSlug } = require('../utils/slugify');

// GET /api/categories — full list, staff/admin only (Settings page, Inventory forms)
router.get('/', authenticate, async (req, res) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SEO: GET /api/categories/public — no auth required. Only returns
// categories that currently have at least one active, in-stock product, so
// the storefront never links to (or the sitemap never lists) an empty
// category page. Registered BEFORE "/:id"-style routes below so Express
// doesn't try to parse "public" as a numeric id.
router.get('/public', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { products: { some: { isActive: true, stock: { gt: 0 } } } },
      select: { id: true, name: true, slug: true, description: true, color: true },
      orderBy: { name: 'asc' },
    });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SEO: GET /api/categories/public/:slug — single category, for the category
// landing page's own title/description/H1.
router.get('/public/:slug', async (req, res) => {
  try {
    const category = await prisma.category.findFirst({
      where: { slug: req.params.slug },
      select: { id: true, name: true, slug: true, description: true, color: true },
    });
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/categories
router.post('/', authenticate, requireManagerOrAdmin, async (req, res) => {
  try {
    const { name, description, color } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Category name is required' });

    // SEO: every category gets a unique URL slug from its name at creation
    const slug = await generateUniqueSlug(prisma.category, name);

    const category = await prisma.category.create({
      data: { name: name.trim(), slug, description, color: color || '#C9A96E' },
    });
    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/categories/:id
router.put('/:id', authenticate, requireManagerOrAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, description, color, slug: requestedSlug } = req.body;

    const data = {};
    if (description !== undefined) data.description = description;
    if (color !== undefined) data.color = color;
    if (name !== undefined) data.name = name;

    // SEO: never regenerate a category's slug just because its description
    // or color changed — that would break every product URL under it
    // (product URLs are /shop/:categorySlug/:productSlug). Only touch it if
    // a new slug was explicitly supplied, or the name itself changed.
    if (requestedSlug !== undefined && requestedSlug !== null && requestedSlug.trim()) {
      data.slug = await generateUniqueSlug(prisma.category, requestedSlug, id);
    } else if (name !== undefined) {
      const existing = await prisma.category.findUnique({ where: { id } });
      if (existing && (existing.name !== name || !existing.slug)) {
        data.slug = await generateUniqueSlug(prisma.category, name, id);
      }
    }

    const category = await prisma.category.update({ where: { id }, data });
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/categories/:id
router.delete('/:id', authenticate, requireManagerOrAdmin, async (req, res) => {
  try {
    await prisma.category.delete({ where: { id: parseInt(req.params.id, 10) } });
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
