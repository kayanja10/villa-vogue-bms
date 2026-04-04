const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireAdmin, requireManagerOrAdmin } = require('../middleware/auth');
const prisma = new PrismaClient();

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
router.get('/public', async (req, res) => {
  try {
    const { search, category, page = 1, limit = 24 } = req.query;
    const where = { isActive: true, stock: { gt: 0 } };
    if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { description: { contains: search, mode: 'insensitive' } }];
    if (category) where.category = { name: category };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        select: { id: true, name: true, price: true, images: true, description: true, stock: true, isFeatured: true, tags: true, category: { select: { name: true } } },
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
    const { name, sku, barcode, categoryId, price, costPrice, stock, lowStockThreshold, description, images, tags, variants, supplierId, isFeatured } = req.body;
    const product = await prisma.product.create({
      data: { name, sku, barcode, categoryId: categoryId ? parseInt(categoryId) : null, price: parseFloat(price), costPrice: parseFloat(costPrice || 0), stock: parseInt(stock || 0), lowStockThreshold: parseInt(lowStockThreshold || 5), description, images: JSON.stringify(images || []), tags: JSON.stringify(tags || []), variants: JSON.stringify(variants || []), supplierId: supplierId ? parseInt(supplierId) : null, isFeatured: !!isFeatured },
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
    const { name, sku, barcode, categoryId, price, costPrice, lowStockThreshold, description, images, tags, variants, supplierId, isFeatured, isActive } = req.body;
    const product = await prisma.product.update({
      where: { id },
      data: { name, sku, barcode, categoryId: categoryId ? parseInt(categoryId) : null, price: parseFloat(price), costPrice: parseFloat(costPrice || 0), lowStockThreshold: parseInt(lowStockThreshold || 5), description, images: JSON.stringify(images || []), tags: JSON.stringify(tags || []), variants: JSON.stringify(variants || []), supplierId: supplierId ? parseInt(supplierId) : null, isFeatured: !!isFeatured, isActive: isActive !== undefined ? !!isActive : undefined },
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
