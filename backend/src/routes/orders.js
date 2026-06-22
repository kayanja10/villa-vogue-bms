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

// ── Allow portal (online) orders without staff JWT ───────────────────────────
// If Authorization header is present and valid → sets req.user (staff/POS flow)
// If no header or invalid → req.user = null (online portal flow)
const optionalAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) return next(); // no token → portal order, allowed
  // Reuse the real authenticate middleware but swallow 401 errors
  authenticate(req, res, (err) => {
    if (err) req.user = null; // bad token → treat as portal order
    next();
  });
};

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
// Accepts both staff (authenticated) and portal (unauthenticated) orders
router.post('/', optionalAuth, async (req, res) => {
  try {
    const {
      customerId, customerName, customerPhone, customerEmail,
      items, subtotal, discount, discountType, tax, total,
      paymentMethod, notes, orderSource,
      // Online-order-specific fields from CustomerPortal checkout
      source, deliveryType, deliveryAddress, deliveryFee,
      selectedSize, selectedColor, momoNumber,
    } = req.body;

    // Normalise source — portal sends { source: 'online' }, POS sends { orderSource: 'pos' }
    const resolvedSource = source || orderSource || (req.user ? 'pos' : 'online');
    const isOnlineOrder = resolvedSource === 'online';

    const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;

    // Validate stock
    for (const item of parsedItems) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) return res.status(400).json({ error: `Product ${item.name || item.productId} not found` });
      if (product.stock < item.quantity) return res.status(400).json({ error: `Insufficient stock for ${product.name}. Available: ${product.stock}` });
    }

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber:   generateOrderNumber(),
          customerId:    customerId ? parseInt(customerId) : null,
          customerName:  customerName || 'Online Customer',
          customerPhone: customerPhone || null,
          customerEmail: customerEmail || null,
          items:         JSON.stringify(parsedItems),
          subtotal:      parseFloat(subtotal || total || 0),
          discount:      parseFloat(discount || 0),
          discountType:  discountType || 'fixed',
          tax:           parseFloat(tax || 0),
          total:         parseFloat(total),
          paymentMethod: paymentMethod || 'cash',
          // Online orders start as 'pending' so staff can confirm; POS orders are 'completed'
          paymentStatus: isOnlineOrder ? 'pending' : 'paid',
          orderStatus:   isOnlineOrder ? 'pending'   : 'completed',
          orderSource:   resolvedSource,
          notes: [
            notes,
            deliveryType  ? `Delivery: ${deliveryType}`    : null,
            deliveryAddress ? `Address: ${deliveryAddress}` : null,
            deliveryFee   ? `Delivery fee: UGX ${deliveryFee}` : null,
            momoNumber    ? `MoMo/Airtel: ${momoNumber}`   : null,
          ].filter(Boolean).join(' | ') || null,
          // servedBy is optional — null for online orders
          servedBy: req.user?.id || null,
        },
      });

      // Deduct stock
      for (const item of parsedItems) {
        await tx.product.update({
          where: { id: item.productId },
          data:  { stock: { decrement: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type:      'out',
            quantity:  item.quantity,
            reason:    isOnlineOrder ? 'Online Order' : 'Sale',
            reference: newOrder.orderNumber,
            userId:    req.user?.id || null,
          },
        });
      }

      // Update customer loyalty if known
      if (customerId) {
        const loyaltyEarned = Math.floor(parseFloat(total) / 1000);
        await tx.customer.update({
          where: { id: parseInt(customerId) },
          data:  { totalSpent: { increment: parseFloat(total) }, visitCount: { increment: 1 }, loyaltyPoints: { increment: loyaltyEarned } },
        });
      }

      return newOrder;
    });

    // Activity log (only when a staff member is logged in)
    if (req.user) {
      await prisma.activityLog.create({
        data: {
          userId: req.user.id, username: req.user.username,
          action: 'create_order', entityType: 'order', entityId: String(order.id),
          details: JSON.stringify({ orderNumber: order.orderNumber, total: order.total }),
        },
      });
    }

    // ── Real-time notifications ──────────────────────────────────────────────
    // Standard order event (updates order list in dashboard)
    global.io?.emit('order:created', { order, user: req.user?.username || 'Online Store' });
    global.io?.emit('stock:bulk-update', parsedItems.map(i => i.productId));

    // 🔔 Special alert for ONLINE orders — pops up for all logged-in staff
    if (isOnlineOrder) {
      global.io?.emit('online:order', {
        id:           order.id,
        orderNumber:  order.orderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        total:        order.total,
        items:        parsedItems.length,
        deliveryType: deliveryType || 'pickup',
        paymentMethod: order.paymentMethod,
        createdAt:    order.createdAt,
      });
    }

    res.status(201).json({ ...order, orderNumber: order.orderNumber });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Valid order statuses across the full lifecycle
const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'received', 'delivered', 'completed', 'cancelled', 'voided'];

// PUT /api/orders/:id/status
router.put('/:id/status', authenticate, requireManagerOrAdmin, async (req, res) => {
  try {
    const { status, note } = req.body;
    if (!ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${ORDER_STATUSES.join(', ')}` });
    }

    const order = await prisma.order.update({
      where: { id: parseInt(req.params.id) },
      data: { orderStatus: status },
    });

    // Log who changed the status and when (for audit trail)
    await prisma.activityLog.create({
      data: {
        userId: req.user.id, username: req.user.username,
        action: 'update_order_status', entityType: 'order', entityId: String(order.id),
        details: JSON.stringify({ orderNumber: order.orderNumber, newStatus: status, note: note || null }),
      },
    }).catch(() => {});

    // Notify staff dashboards (existing behaviour)
    global.io?.emit('order:updated', order);

    // 🔔 Notify the specific customer who placed this order — so it reflects on their side
    if (order.customerId) {
      global.io?.to(`customer:${order.customerId}`).emit('order:status-changed', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status,
        note: note || null,
        updatedAt: new Date(),
      });
    }
    // Also broadcast a generic event with order number so the portal can match
    // by orderNumber even for guest customers (no customerId) tracking by number
    global.io?.emit('order:status-public', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status,
      updatedAt: new Date(),
    });

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders/track/:orderNumber — public order tracking (no auth needed)
// Lets a guest customer check their order status using just the order number
router.get('/track/:orderNumber', async (req, res) => {
  try {
    const order = await prisma.order.findFirst({
      where: { orderNumber: req.params.orderNumber },
      select: {
        orderNumber: true, orderStatus: true, paymentStatus: true,
        total: true, createdAt: true, customerName: true, notes: true,
        items: true, paymentMethod: true, orderSource: true,
      },
    });
    if (!order) return res.status(404).json({ error: 'Order not found. Check your order number and try again.' });
    // Parse items count without exposing internal product IDs unnecessarily
    let itemCount = 0;
    try { itemCount = JSON.parse(order.items || '[]').length; } catch {}
    res.json({ ...order, itemCount, items: undefined });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/orders/:id/mark-paid — quick action for staff confirming manual MoMo/cash payment
router.put('/:id/mark-paid', authenticate, requireManagerOrAdmin, async (req, res) => {
  try {
    const order = await prisma.order.update({
      where: { id: parseInt(req.params.id) },
      data: { paymentStatus: 'paid' },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id, username: req.user.username,
        action: 'mark_order_paid', entityType: 'order', entityId: String(order.id),
        details: JSON.stringify({ orderNumber: order.orderNumber, total: order.total }),
      },
    }).catch(() => {});

    global.io?.emit('order:updated', order);
    if (order.customerId) {
      global.io?.to(`customer:${order.customerId}`).emit('order:status-changed', {
        orderId: order.id, orderNumber: order.orderNumber,
        paymentStatus: 'paid', updatedAt: new Date(),
      });
    }

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