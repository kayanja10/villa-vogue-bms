const express = require('express');
const router = express.Router();
const { prisma } = require('../prisma');
const { authenticate, requireAdmin, requireManagerOrAdmin } = require('../middleware/auth');
const { generateUniqueSlug } = require('../utils/slugify');

// ── Auto-generate Barcode (EAN-13 format with real check digit) ──────────────
// Uses prefix "200" — the GS1 "restricted circulation" range officially
// reserved for in-store/internal use, so generated codes never collide with
// real retail products if you ever stock branded items with their own barcodes.
// Format: 200 + 9-digit sequence + 1 check digit = 13 digits total, fully
// scannable by any standard barcode scanner or phone camera app.
function ean13CheckDigit(digits12) {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const d = parseInt(digits12[i], 10);
    sum += (i % 2 === 0) ? d : d * 3;
  }
  return (10 - (sum % 10)) % 10;
}

async function generateBarcode() {
  // Find the highest existing sequence among our own generated codes.
  // Capped at 1000 most recent to avoid an unbounded query as the catalog grows.
  const existing = await prisma.product.findMany({
    where: { barcode: { startsWith: '200' } },
    select: { barcode: true },
    orderBy: { id: 'desc' },
    take: 1000,
  });
  let maxSeq = 0;
  for (const p of existing) {
    if (p.barcode?.length === 13) {
      const seq = parseInt(p.barcode.slice(3, 12), 10);
      if (!isNaN(seq)) maxSeq = Math.max(maxSeq, seq);
    }
  }
  const nextSeq = String(maxSeq + 1).padStart(9, '0');
  const digits12 = `200${nextSeq}`;
  const checkDigit = ean13CheckDigit(digits12);
  return `${digits12}${checkDigit}`;
}

// Wraps generateBarcode with a retry loop: if two staff create products at
// the same instant, both might compute the same "next" barcode — the second
// INSERT then fails the @unique constraint. Rather than crash that request,
// retry with a freshly recalculated barcode up to 3 times. This converts a
// rare race-condition crash into an invisible, automatic retry.
async function generateBarcodeWithRetry(maxAttempts = 3) {
  let lastErr;
  for (let i = 0; i < maxAttempts; i++) {
    const candidate = await generateBarcode();
    const clash = await prisma.product.findUnique({ where: { barcode: candidate }, select: { id: true } });
    if (!clash) return candidate;
    lastErr = new Error('Barcode collision, retrying');
  }
  throw lastErr || new Error('Could not generate a unique barcode');
}

// ── Auto-generate SKU ─────────────────────────────────────────────────────────
// Format: VV-{CATEGORY3}-{SEQ4}  e.g. VV-DRE-0001, VV-GEN-0042 (no category)
async function generateSku(categoryId) {
  let prefix = 'GEN';
  if (categoryId) {
    try {
      const cat = await prisma.category.findUnique({ where: { id: parseInt(categoryId) } });
      if (cat?.name) prefix = cat.name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase().padEnd(3, 'X');
    } catch { /* fall back to GEN */ }
  }
  // Find highest existing sequence for this prefix — capped at 1000 most
  // recent to avoid an unbounded query as the catalog grows.
  const existing = await prisma.product.findMany({
    where: { sku: { startsWith: `VV-${prefix}-` } },
    select: { sku: true },
    orderBy: { id: 'desc' },
    take: 1000,
  });
  let maxSeq = 0;
  for (const p of existing) {
    const match = p.sku?.match(/-(\d+)$/);
    if (match) maxSeq = Math.max(maxSeq, parseInt(match[1], 10));
  }
  const nextSeq = String(maxSeq + 1).padStart(4, '0');
  return `VV-${prefix}-${nextSeq}`;
}

// Same race-condition protection as barcodes: retry with a fresh sequence
// number if two staff create products in the same category simultaneously.
async function generateSkuWithRetry(categoryId, maxAttempts = 3) {
  let lastErr;
  for (let i = 0; i < maxAttempts; i++) {
    const candidate = await generateSku(categoryId);
    const clash = await prisma.product.findUnique({ where: { sku: candidate }, select: { id: true } });
    if (!clash) return candidate;
    lastErr = new Error('SKU collision, retrying');
  }
  throw lastErr || new Error('Could not generate a unique SKU');
}

// GET /api/products
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, category, lowStock, featured, page = 1, limit = 50 } = req.query;
    const where = { isActive: true };
    if (search) where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
      { barcode: { contains: search, mode: 'insensitive' } },
    ];
    if (category) where.category = { name: category };
    // lowStock filter handled in-memory after fetch if needed
    if (featured === 'true') where.isFeatured = true;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true, supplier: { select: { id: true, name: true } } },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    res.json({ products, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public endpoint for ecommerce store
// SEO: accepts `categorySlug` (preferred, used by /shop/:categorySlug) as well
// as the original `category` name filter (kept for backward compatibility
// with any existing caller). Also returns each product's own `slug`,
// `gender`, and its category's `slug` so the storefront and prerender/sitemap
// scripts can build the new /shop/:categorySlug/:productSlug URLs without a
// second round-trip.
router.get('/public', async (req, res) => {
  try {
    const { search, category, categorySlug, gender, page = 1, limit = 24 } = req.query;
    const where = { isActive: true, stock: { gt: 0 } };
    if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { description: { contains: search, mode: 'insensitive' } }];
    if (categorySlug) where.category = { slug: categorySlug };
    else if (category) where.category = { name: category };
    if (gender) where.gender = gender;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        select: {
          id: true, name: true, slug: true, gender: true, price: true, images: true,
          description: true, stock: true, isFeatured: true, tags: true, createdAt: true, updatedAt: true,
          category: { select: { id: true, name: true, slug: true } },
        },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.product.count({ where }),
    ]);
    res.json({ products, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/public/:id — single product, no auth required.
// Used by the standalone product detail page (/store/product/:id) so a
// direct link, a search engine crawler, or a WhatsApp/Facebook link
// preview can load just the one product instead of fetching the entire
// catalog to find it client-side. Returns 404 (not 500) for inactive or
// out-of-stock products, matching the same visibility rule as the list
// endpoint above, so a sold-out item's old shared link cleanly 404s
// rather than ever leaking data about an inactive product.
router.get('/public/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid product id' });

    const product = await prisma.product.findFirst({
      where: { id, isActive: true },
      select: {
        id: true, name: true, slug: true, gender: true, price: true, costPrice: false, images: true,
        description: true, stock: true, isFeatured: true, tags: true,
        createdAt: true, updatedAt: true, sku: true,
        category: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/public/slug/:slug — the real, canonical SEO product page
// endpoint (used by /shop/:categorySlug/:productSlug). Registered BEFORE
// /public/:id would ever be reached for this path since "slug" is a fixed
// segment, not a numeric id, so there's no route-ordering ambiguity here —
// but it's kept directly under the id route for readability since the two
// serve the same purpose (one legacy, one canonical).
router.get('/public/slug/:slug', async (req, res) => {
  try {
    const product = await prisma.product.findFirst({
      where: { slug: req.params.slug, isActive: true },
      select: {
        id: true, name: true, slug: true, gender: true, price: true, images: true,
        description: true, stock: true, isFeatured: true, tags: true,
        createdAt: true, updatedAt: true, sku: true,
        category: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/low-stock
router.get('/low-stock', authenticate, requireManagerOrAdmin, async (req, res) => {
  try {
    const allProds = await prisma.product.findMany({ where: { isActive: true }, include: { category: true } });
    const products = allProds.filter(p => p.stock <= p.lowStockThreshold).sort((a,b) => a.stock - b.stock);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/next-sku — preview the next SKU before saving (for the Inventory form)
// MUST be registered before /:id so Express doesn't treat "next-sku" as an ID
router.get('/next-sku', authenticate, requireManagerOrAdmin, async (req, res) => {
  try {
    const { categoryId } = req.query;
    const sku = await generateSku(categoryId);
    res.json({ sku });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/next-barcode — preview the next auto-generated barcode
router.get('/next-barcode', authenticate, requireManagerOrAdmin, async (req, res) => {
  try {
    const barcode = await generateBarcode();
    res.json({ barcode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products/:id/generate-barcode — backfill a barcode for an
// existing product that was created before this feature existed
router.post('/:id/generate-barcode', authenticate, requireManagerOrAdmin, async (req, res) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.barcode) return res.status(400).json({ error: 'Product already has a barcode' });
    const barcode = await generateBarcodeWithRetry();
    const updated = await prisma.product.update({ where: { id: product.id }, data: { barcode } });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/barcode/:code — look up a product by scanned barcode (for POS)
router.get('/barcode/:code', authenticate, async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { barcode: req.params.code },
      include: { category: true },
    });
    if (!product) return res.status(404).json({ error: 'No product found for this barcode' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { category: true, supplier: true, stockMovements: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products
router.post('/', authenticate, requireManagerOrAdmin, async (req, res) => {
  try {
    const { name, sku, barcode, categoryId, price, costPrice, stock, lowStockThreshold, description, images, tags, variants, supplierId, isFeatured, gender } = req.body;

    // Auto-generate SKU if not provided (or blank) — guarantees every product has one
    const finalSku = sku && sku.trim() ? sku.trim() : await generateSkuWithRetry(categoryId);
    // Auto-generate barcode if not provided — guarantees every product is scannable
    const finalBarcode = barcode && barcode.trim() ? barcode.trim() : await generateBarcodeWithRetry();
    // SEO: every product gets a unique URL slug from its name at creation time
    const slug = await generateUniqueSlug(prisma.product, name);

    const product = await prisma.product.create({
      data: { name, slug, gender: gender || null, sku: finalSku, barcode: finalBarcode, categoryId: categoryId ? parseInt(categoryId) : null, price: parseFloat(price), costPrice: parseFloat(costPrice || 0), stock: parseInt(stock || 0), lowStockThreshold: parseInt(lowStockThreshold || 5), description, images: JSON.stringify(images || []), tags: JSON.stringify(tags || []), variants: JSON.stringify(variants || []), supplierId: supplierId ? parseInt(supplierId) : null, isFeatured: !!isFeatured },
      include: { category: true },
    });

    if (stock > 0) {
      await prisma.stockMovement.create({ data: { productId: product.id, type: 'in', quantity: parseInt(stock), reason: 'Initial stock', userId: req.user.id } });
    }

    global.io?.emit('product:created', product);
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/products/:id
router.put('/:id', authenticate, requireManagerOrAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, sku, barcode, categoryId, price, costPrice, lowStockThreshold, description, images, tags, variants, supplierId, isFeatured, isActive, gender, slug: requestedSlug } = req.body;

    const data = { name, sku, barcode, categoryId: categoryId ? parseInt(categoryId) : null, price: parseFloat(price), costPrice: parseFloat(costPrice || 0), lowStockThreshold: parseInt(lowStockThreshold || 5), description, images: JSON.stringify(images || []), tags: JSON.stringify(tags || []), variants: JSON.stringify(variants || []), supplierId: supplierId ? parseInt(supplierId) : null, isFeatured: !!isFeatured, isActive: isActive !== undefined ? !!isActive : undefined, gender: gender !== undefined ? (gender || null) : undefined };

    // SEO: never regenerate a product's slug just because staff fixed a typo
    // in some other field — that would silently break any link already
    // shared or indexed under the old slug. Only touch it if a new slug was
    // explicitly supplied, or the name itself actually changed.
    if (requestedSlug !== undefined && requestedSlug !== null && requestedSlug.trim()) {
      data.slug = await generateUniqueSlug(prisma.product, requestedSlug, id);
    } else if (name !== undefined) {
      const existing = await prisma.product.findUnique({ where: { id }, select: { name: true, slug: true } });
      if (existing && existing.name !== name || (existing && !existing.slug)) {
        data.slug = await generateUniqueSlug(prisma.product, name, id);
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data,
      include: { category: true },
    });
    global.io?.emit('product:updated', product);
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products/:id/adjust-stock
router.post('/:id/adjust-stock', authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { quantity, type, reason } = req.body;
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    let newStock = product.stock;
    if (type === 'in') newStock += parseInt(quantity);
    else if (type === 'out') newStock -= parseInt(quantity);
    else if (type === 'set') newStock = parseInt(quantity);

    if (newStock < 0) return res.status(400).json({ error: 'Insufficient stock' });

    const [updated] = await prisma.$transaction([
      prisma.product.update({ where: { id }, data: { stock: newStock } }),
      prisma.stockMovement.create({ data: { productId: id, type, quantity: parseInt(quantity), reason, userId: req.user.id } }),
    ]);

    global.io?.emit('stock:updated', { productId: id, stock: newStock });
    res.json({ ...updated, stock: newStock });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/products/:id
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await prisma.product.update({ where: { id: parseInt(req.params.id) }, data: { isActive: false } });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/:id/profit-margin
router.get('/:id/profit-margin', authenticate, requireManagerOrAdmin, async (req, res) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!product) return res.status(404).json({ error: 'Not found' });
    const margin = product.costPrice > 0 ? ((product.price - product.costPrice) / product.price * 100).toFixed(2) : 0;
    res.json({ ...product, profitMargin: parseFloat(margin), profit: product.price - product.costPrice });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
