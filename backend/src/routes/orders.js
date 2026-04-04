const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireAdmin, requireManagerOrAdmin } = require('../middleware/auth');
const prisma = new PrismaClient();

function generateOrderNumber() {
  const date = new Date();
  const y = date.getFullYear().toString().slice(2);
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `VV${y}${m}${d}-${rand}`;
}

// GET /api/orders
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, status, from, to, page = 1, limit = 20, source } = req.query;
    const where = {};
    if (status) where.orderStatus = status;
    if (source) where.orderSource = source;
    if (search) where.OR = [
      { orderNumber: { contains: search, mode: 'insensitive' } },
      { customerName: { contains: search, mode: 'insensitive' } },
      { customerPhone: { contains: search, mode: 'insensitive' } },
    ];
    if (from || to) where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to + 'T23:59:59');

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { customer: { select: { id: true, name: true } }, servedByUser: { select: { id: true, username: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.order.count({ where }),
    ]);

    res.json({ orders, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { customer: true, servedByUser: { select: { username: true } }, payments: true, refunds: true },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/orders
router.post('/', authenticate, async (req, res) => {
  try {
    const { customerId, customerName, customerPhone, customerEmail, items, subtotal, discount, discountType, tax, total, paymentMethod, notes, orderSource } = req.body;
    
    const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;

    // Validate stock
    for (const item of parsedItems) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) return res.status(400).json({ error: `Product ${item.name} not found` });
      if (product.stock < item.quantity) return res.status(400).json({ error: `Insufficient stock for ${item.name}. Available: ${product.stock}` });
    }

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          customerId: customerId ? parseInt(customerId) : null,
          customerName: customerName || 'Walk-in Customer',
          customerPhone,
          customerEmail,
          items: JSON.stringify(parsedItems),
          subtotal: parseFloat(subtotal || 0),
          discount: parseFloat(discount || 0),
          discountType: discountType || 'fixed',
          tax: parseFloat(tax || 0),
          total: parseFloat(total),
          paymentMethod: paymentMethod || 'cash',
          paymentStatus: 'paid',
          orderStatus: 'completed',
          orderSource: orderSource || 'pos',
          notes,
          servedBy: req.user.id,
        },
      });

      // Deduct stock for each item
      for (const item of parsedItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
        await tx.stockMovement.create({
          data: { productId: item.productId, type: 'out', quantity: item.quantity, reason: 'Sale', reference: newOrder.orderNumber, userId: req.user.id },
        });
      }

      // Update customer stats
      if (customerId) {
        const loyaltyEarned = Math.floor(parseFloat(total) / 1000);
        await tx.customer.update({
          where: { id: parseInt(customerId) },
          data: { totalSpent: { increment: parseFloat(total) }, visitCount: { increment: 1 }, loyaltyPoints: { increment: loyaltyEarned } },
        });
      }

      return newOrder;
    });

    await prisma.activityLog.create({
      data: { userId: req.user.id, username: req.user.username, action: 'create_order', entityType: 'order', entityId: String(order.id), details: JSON.stringify({ orderNumber: order.orderNumber, total: order.total }) }
    });

    global.io?.emit('order:created', { order, user: req.user.username });
    global.io?.emit('stock:bulk-update', parsedItems.map(i => i.productId));

    res.status(201).json(order);
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/orders/:id/status
router.put('/:id/status', authenticate, requireManagerOrAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await prisma.order.update({ where: { id: parseInt(req.params.id) }, data: { orderStatus: status } });
    global.io?.emit('order:updated', order);
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/orders/:id (admin only - void order)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const items = JSON.parse(order.items);
    await prisma.$transaction(async (tx) => {
      // Restore stock
      for (const item of items) {
        await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
        await tx.stockMovement.create({ data: { productId: item.productId, type: 'in', quantity: item.quantity, reason: 'Order voided', reference: order.orderNumber, userId: req.user.id } });
      }
      await tx.order.update({ where: { id: parseInt(req.params.id) }, data: { orderStatus: 'voided' } });
    });

    res.json({ message: 'Order voided and stock restored' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
