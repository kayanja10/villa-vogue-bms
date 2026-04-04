const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const prisma = new PrismaClient();

router.get('/', authenticate, async (req, res) => {
  try {
    const notifs = await prisma.notification.findMany({ where: { isRead: false }, orderBy: { createdAt: 'desc' }, take: 20 });
    res.json(notifs);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/read', authenticate, async (req, res) => {
  try {
    await prisma.notification.update({ where: { id: parseInt(req.params.id) }, data: { isRead: true } });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/mark-all-read', authenticate, async (req, res) => {
  try {
    await prisma.notification.updateMany({ data: { isRead: true } });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Auto-generate low stock notifications
router.post('/check-stock', authenticate, async (req, res) => {
  try {
    const products = await prisma.product.findMany({ where: { isActive: true } });
    const lowStock = products.filter(p => p.stock <= p.lowStockThreshold && p.stock > 0);
    const outOfStock = products.filter(p => p.stock === 0);

    for (const p of outOfStock) {
      await prisma.notification.create({ data: { type: 'low_stock', title: 'Out of Stock!', message: `${p.name} is completely out of stock. Restock urgently.`, data: JSON.stringify({ productId: p.id }) } }).catch(() => {});
    }
    for (const p of lowStock) {
      await prisma.notification.create({ data: { type: 'low_stock', title: 'Low Stock Warning', message: `${p.name} has only ${p.stock} units left (threshold: ${p.lowStockThreshold}).`, data: JSON.stringify({ productId: p.id }) } }).catch(() => {});
    }

    res.json({ checked: products.length, lowStock: lowStock.length, outOfStock: outOfStock.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
