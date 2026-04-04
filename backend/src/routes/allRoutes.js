// ============ CATEGORIES ROUTE ============
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireAdmin, requireManagerOrAdmin } = require('../middleware/auth');
const prisma = new PrismaClient();

function makeRouter(handlers) {
  const r = express.Router();
  handlers(r);
  return r;
}

// ────────────────────────────────────────
// CATEGORIES
// ────────────────────────────────────────
const categoriesRouter = makeRouter((r) => {
  r.get('/', authenticate, async (req, res) => {
    const cats = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    res.json(cats);
  });
  r.post('/', authenticate, requireManagerOrAdmin, async (req, res) => {
    try {
      const cat = await prisma.category.create({ data: { name: req.body.name, description: req.body.description, color: req.body.color || '#C9A96E' } });
      res.status(201).json(cat);
    } catch (e) { res.status(400).json({ error: 'Category name must be unique' }); }
  });
  r.put('/:id', authenticate, requireManagerOrAdmin, async (req, res) => {
    const cat = await prisma.category.update({ where: { id: parseInt(req.params.id) }, data: { name: req.body.name, description: req.body.description, color: req.body.color } });
    res.json(cat);
  });
  r.delete('/:id', authenticate, requireAdmin, async (req, res) => {
    await prisma.category.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Category deleted' });
  });
});

// ────────────────────────────────────────
// EXPENSES
// ────────────────────────────────────────
const expensesRouter = makeRouter((r) => {
  r.get('/', authenticate, async (req, res) => {
    const { from, to, category } = req.query;
    const where = {};
    if (category) where.category = category;
    if (from) where.createdAt = { ...where.createdAt, gte: new Date(from) };
    if (to) where.createdAt = { ...where.createdAt, lte: new Date(to + 'T23:59:59') };
    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 }),
      prisma.expense.aggregate({ where, _sum: { amount: true } }),
    ]);
    res.json({ expenses, totalAmount: total._sum.amount || 0 });
  });
  r.post('/', authenticate, async (req, res) => {
    const { title, amount, category, description, date } = req.body;
    const expense = await prisma.expense.create({ data: { title, amount: parseFloat(amount), category, description, date, recordedBy: req.user.id } });
    res.status(201).json(expense);
  });
  r.delete('/:id', authenticate, requireManagerOrAdmin, async (req, res) => {
    await prisma.expense.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Expense deleted' });
  });
});

// ────────────────────────────────────────
// SUPPLIERS
// ────────────────────────────────────────
const suppliersRouter = makeRouter((r) => {
  r.get('/', authenticate, async (req, res) => {
    const suppliers = await prisma.supplier.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
    res.json(suppliers);
  });
  r.post('/', authenticate, requireManagerOrAdmin, async (req, res) => {
    const s = await prisma.supplier.create({ data: { name: req.body.name, contactName: req.body.contactName, phone: req.body.phone, email: req.body.email, address: req.body.address, notes: req.body.notes } });
    res.status(201).json(s);
  });
  r.put('/:id', authenticate, requireManagerOrAdmin, async (req, res) => {
    const s = await prisma.supplier.update({ where: { id: parseInt(req.params.id) }, data: req.body });
    res.json(s);
  });
  r.get('/:id/transactions', authenticate, async (req, res) => {
    const txns = await prisma.supplierTransaction.findMany({ where: { supplierId: parseInt(req.params.id) }, orderBy: { createdAt: 'desc' }, take: 50 });
    res.json(txns);
  });
  r.post('/:id/transactions', authenticate, async (req, res) => {
    const { productId, productName, quantity, unitCost, notes } = req.body;
    const totalCost = parseFloat(quantity) * parseFloat(unitCost);
    const txn = await prisma.supplierTransaction.create({ data: { supplierId: parseInt(req.params.id), productId: productId ? parseInt(productId) : null, productName, quantity: parseInt(quantity), unitCost: parseFloat(unitCost), totalCost, notes, recordedBy: req.user.id } });
    await prisma.supplier.update({ where: { id: parseInt(req.params.id) }, data: { totalSupplied: { increment: totalCost } } });
    res.status(201).json(txn);
  });
  r.delete('/:id', authenticate, requireAdmin, async (req, res) => {
    await prisma.supplier.update({ where: { id: parseInt(req.params.id) }, data: { isActive: false } });
    res.json({ message: 'Supplier removed' });
  });
});

// ────────────────────────────────────────
// SETTINGS
// ────────────────────────────────────────
const settingsRouter = makeRouter((r) => {
  r.get('/', authenticate, async (req, res) => {
    const settings = await prisma.setting.findMany();
    const obj = {};
    settings.forEach(s => { obj[s.key] = s.value; });
    res.json(obj);
  });
  r.put('/', authenticate, requireAdmin, async (req, res) => {
    const updates = Object.entries(req.body);
    await prisma.$transaction(updates.map(([key, value]) =>
      prisma.setting.upsert({ where: { key }, update: { value: String(value) }, create: { key, value: String(value) } })
    ));
    res.json({ message: 'Settings updated' });
  });
});

// ────────────────────────────────────────
// ACTIVITY LOG
// ────────────────────────────────────────
const activityRouter = makeRouter((r) => {
  r.get('/', authenticate, requireManagerOrAdmin, async (req, res) => {
    const { page = 1, limit = 50, userId, action } = req.query;
    const where = {};
    if (userId) where.userId = parseInt(userId);
    if (action) where.action = { contains: action };
    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (parseInt(page)-1)*parseInt(limit), take: parseInt(limit), include: { user: { select: { username: true, role: true } } } }),
      prisma.activityLog.count({ where }),
    ]);
    res.json({ logs, total });
  });
});

// ────────────────────────────────────────
// INVENTORY (stock movements)
// ────────────────────────────────────────
const inventoryRouter = makeRouter((r) => {
  r.get('/movements', authenticate, async (req, res) => {
    const { productId, type, page = 1, limit = 50 } = req.query;
    const where = {};
    if (productId) where.productId = parseInt(productId);
    if (type) where.type = type;
    const movements = await prisma.stockMovement.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (parseInt(page)-1)*parseInt(limit), take: parseInt(limit), include: { product: { select: { name: true, sku: true } } } });
    res.json(movements);
  });
  r.get('/valuation', authenticate, requireManagerOrAdmin, async (req, res) => {
    try {
      const products = await prisma.product.findMany({ where: { isActive: true }, select: { stock: true, price: true, costPrice: true } });
      const cost_value = products.reduce((s, p) => s + p.stock * p.costPrice, 0);
      const retail_value = products.reduce((s, p) => s + p.stock * p.price, 0);
      res.json({ cost_value, retail_value, product_count: products.length });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });
  r.get('/dead-stock', authenticate, requireManagerOrAdmin, async (req, res) => {
    try {
      const days = parseInt(req.query.days) || 90;
      const since = new Date(Date.now() - days * 86400000);
      const products = await prisma.product.findMany({ where: { isActive: true, stock: { gt: 0 } }, include: { stockMovements: { where: { type: 'out', createdAt: { gte: since } } } } });
      const deadStock = products.filter(p => p.stockMovements.length === 0).map(p => ({ id: p.id, name: p.name, sku: p.sku, stock: p.stock, price: p.price, costPrice: p.costPrice }));
      res.json(deadStock);
    } catch (err) { res.status(500).json({ error: err.message }); }
  });
});

// ────────────────────────────────────────
// REPORTS
// ────────────────────────────────────────
const reportsRouter = makeRouter((r) => {
  r.get('/daily', authenticate, requireManagerOrAdmin, async (req, res) => {
    try {
      const dateStr = req.query.date || new Date().toISOString().split('T')[0];
      const start = new Date(dateStr + 'T00:00:00.000Z');
      const end = new Date(dateStr + 'T23:59:59.999Z');
      const [sales, expenses] = await Promise.all([
        prisma.order.aggregate({ where: { createdAt: { gte: start, lte: end }, orderStatus: { not: 'voided' } }, _sum: { total: true, discount: true }, _count: true, _avg: { total: true } }),
        prisma.expense.aggregate({ where: { createdAt: { gte: start, lte: end } }, _sum: { amount: true } }),
      ]);
      const movements = await prisma.stockMovement.findMany({ where: { type: 'out', reason: 'Sale', createdAt: { gte: start, lte: end } }, include: { product: { select: { name: true, price: true } } } });
      const topMap = {};
      movements.forEach(m => { if (!topMap[m.productId]) topMap[m.productId] = { name: m.product.name, qty: 0, revenue: 0 }; topMap[m.productId].qty += m.quantity; topMap[m.productId].revenue += m.quantity * m.product.price; });
      const topProducts = Object.values(topMap).sort((a,b) => b.qty - a.qty).slice(0,5);
      res.json({ date: dateStr, totalSales: sales._sum.total || 0, orderCount: sales._count, avgOrderValue: sales._avg.total || 0, totalDiscounts: sales._sum.discount || 0, totalExpenses: expenses._sum.amount || 0, netProfit: (sales._sum.total || 0) - (expenses._sum.amount || 0), topProducts });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  r.get('/monthly-summary', authenticate, requireManagerOrAdmin, async (req, res) => {
    try {
      const y = parseInt(req.query.year) || new Date().getFullYear();
      const m = parseInt(req.query.month) || new Date().getMonth() + 1;
      const start = new Date(y, m-1, 1);
      const end = new Date(y, m, 0, 23, 59, 59);
      const [sales, expenses, newCustomers] = await Promise.all([
        prisma.order.aggregate({ where: { createdAt: { gte: start, lte: end }, orderStatus: { not: 'voided' } }, _sum: { total: true }, _count: true }),
        prisma.expense.aggregate({ where: { createdAt: { gte: start, lte: end } }, _sum: { amount: true } }),
        prisma.customer.count({ where: { createdAt: { gte: start, lte: end } } }),
      ]);
      const users = await prisma.user.findMany({ select: { id: true, username: true } });
      const orders = await prisma.order.findMany({ where: { createdAt: { gte: start, lte: end }, orderStatus: { not: 'voided' } }, select: { servedBy: true, total: true } });
      const topStaff = users.map(u => ({ username: u.username, orders: orders.filter(o => o.servedBy === u.id).length, sales: orders.filter(o => o.servedBy === u.id).reduce((s,o) => s + o.total, 0) })).sort((a,b) => b.sales - a.sales).slice(0,5);
      res.json({ year: y, month: m, totalSales: sales._sum.total || 0, orderCount: sales._count, totalExpenses: expenses._sum.amount || 0, netProfit: (sales._sum.total || 0) - (expenses._sum.amount || 0), newCustomers, topStaff });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  r.get('/cash-flow', authenticate, requireManagerOrAdmin, async (req, res) => {
    try {
      const where = {};
      if (req.query.from) where.gte = new Date(req.query.from);
      if (req.query.to) where.lte = new Date(req.query.to + 'T23:59:59');
      const [income, expenses] = await Promise.all([
        prisma.order.aggregate({ where: { ...(Object.keys(where).length ? { createdAt: where } : {}), orderStatus: { not: 'voided' } }, _sum: { total: true } }),
        prisma.expense.aggregate({ where: Object.keys(where).length ? { createdAt: where } : {}, _sum: { amount: true } }),
      ]);
      res.json({ income: income._sum.total || 0, expenses: expenses._sum.amount || 0, netFlow: (income._sum.total || 0) - (expenses._sum.amount || 0) });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });
});

// ────────────────────────────────────────
// DISCOUNTS
// ────────────────────────────────────────
const discountsRouter = makeRouter((r) => {
  r.get('/', authenticate, async (req, res) => {
    const codes = await prisma.discountCode.findMany({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
    res.json(codes);
  });
  r.post('/', authenticate, requireManagerOrAdmin, async (req, res) => {
    const { code, type, value, minOrder, maxUses, expiresAt } = req.body;
    const dc = await prisma.discountCode.create({ data: { code: code.toUpperCase(), type, value: parseFloat(value), minOrder: parseFloat(minOrder || 0), maxUses: parseInt(maxUses || 0), expiresAt } });
    res.status(201).json(dc);
  });
  r.post('/validate', authenticate, async (req, res) => {
    const { code, orderTotal } = req.body;
    const dc = await prisma.discountCode.findFirst({ where: { code: code.toUpperCase(), isActive: true } });
    if (!dc) return res.status(404).json({ error: 'Invalid discount code' });
    if (dc.expiresAt && new Date() > new Date(dc.expiresAt)) return res.status(400).json({ error: 'Discount code expired' });
    if (dc.maxUses > 0 && dc.usedCount >= dc.maxUses) return res.status(400).json({ error: 'Discount code usage limit reached' });
    if (parseFloat(orderTotal) < dc.minOrder) return res.status(400).json({ error: `Minimum order amount is UGX ${dc.minOrder.toLocaleString()}` });
    const discountAmount = dc.type === 'percent' ? (parseFloat(orderTotal) * dc.value / 100) : dc.value;
    res.json({ ...dc, discountAmount });
  });
  r.post('/use', authenticate, async (req, res) => {
    const { code } = req.body;
    await prisma.discountCode.update({ where: { code: code.toUpperCase() }, data: { usedCount: { increment: 1 } } });
    res.json({ message: 'Discount applied' });
  });
  r.delete('/:id', authenticate, requireAdmin, async (req, res) => {
    await prisma.discountCode.update({ where: { id: parseInt(req.params.id) }, data: { isActive: false } });
    res.json({ message: 'Discount deleted' });
  });
});

// ────────────────────────────────────────
// QUOTES
// ────────────────────────────────────────
const quotesRouter = makeRouter((r) => {
  function genQuoteNum() { return `QT${Date.now().toString().slice(-8)}`; }
  r.get('/', authenticate, async (req, res) => {
    const quotes = await prisma.quote.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
    res.json(quotes);
  });
  r.get('/:id', authenticate, async (req, res) => {
    const q = await prisma.quote.findUnique({ where: { id: parseInt(req.params.id) } });
    res.json(q);
  });
  r.post('/', authenticate, async (req, res) => {
    const { customerName, customerPhone, customerEmail, items, subtotal, discount, tax, total, validUntil, notes } = req.body;
    const q = await prisma.quote.create({ data: { quoteNumber: genQuoteNum(), customerName, customerPhone, customerEmail, items: JSON.stringify(items), subtotal: parseFloat(subtotal||0), discount: parseFloat(discount||0), tax: parseFloat(tax||0), total: parseFloat(total), validUntil, notes, createdBy: req.user.id } });
    res.status(201).json(q);
  });
  r.put('/:id/status', authenticate, async (req, res) => {
    const q = await prisma.quote.update({ where: { id: parseInt(req.params.id) }, data: { status: req.body.status } });
    res.json(q);
  });
});

// ────────────────────────────────────────
// STAFF
// ────────────────────────────────────────
const staffRouter = makeRouter((r) => {
  r.get('/shifts', authenticate, async (req, res) => {
    const { userId, from, to } = req.query;
    const where = {};
    if (userId) where.userId = parseInt(userId);
    if (from) where.clockIn = { gte: new Date(from) };
    const shifts = await prisma.staffShift.findMany({ where, include: { user: { select: { username: true, role: true } } }, orderBy: { clockIn: 'desc' }, take: 100 });
    res.json(shifts);
  });
  r.post('/clock-in', authenticate, async (req, res) => {
    const active = await prisma.staffShift.findFirst({ where: { userId: req.user.id, clockOut: null } });
    if (active) return res.status(400).json({ error: 'Already clocked in' });
    const shift = await prisma.staffShift.create({ data: { userId: req.user.id } });
    res.status(201).json(shift);
  });
  r.post('/clock-out', authenticate, async (req, res) => {
    const active = await prisma.staffShift.findFirst({ where: { userId: req.user.id, clockOut: null } });
    if (!active) return res.status(400).json({ error: 'Not clocked in' });
    const clockOut = new Date();
    const hours = (clockOut - active.clockIn) / 3600000;
    const shift = await prisma.staffShift.update({ where: { id: active.id }, data: { clockOut, hoursWorked: parseFloat(hours.toFixed(2)) } });
    res.json(shift);
  });
  r.get('/targets', authenticate, async (req, res) => {
    const targets = await prisma.staffTarget.findMany({ include: { user: { select: { username: true } } }, orderBy: { createdAt: 'desc' } });
    res.json(targets);
  });
  r.post('/targets', authenticate, requireManagerOrAdmin, async (req, res) => {
    const { userId, period, targetSales, targetOrders } = req.body;
    const target = await prisma.staffTarget.create({ data: { userId: parseInt(userId), period, targetSales: parseFloat(targetSales), targetOrders: parseInt(targetOrders || 0) } });
    res.status(201).json(target);
  });
});

// ────────────────────────────────────────
// LAYAWAYS
// ────────────────────────────────────────
const layawaysRouter = makeRouter((r) => {
  function genNum() { return `LAY${Date.now().toString().slice(-8)}`; }
  r.get('/', authenticate, async (req, res) => {
    const { status } = req.query;
    const where = status ? { status } : {};
    const layaways = await prisma.layaway.findMany({ where, orderBy: { createdAt: 'desc' }, include: { customer: { select: { name: true, phone: true } } } });
    res.json(layaways);
  });
  r.get('/:id', authenticate, async (req, res) => {
    const l = await prisma.layaway.findUnique({ where: { id: parseInt(req.params.id) }, include: { customer: true } });
    res.json(l);
  });
  r.post('/', authenticate, async (req, res) => {
    const { customerId, customerName, customerPhone, items, totalAmount, depositPaid, dueDate, notes } = req.body;
    const balance = parseFloat(totalAmount) - parseFloat(depositPaid);
    const l = await prisma.layaway.create({ data: { layawayNumber: genNum(), customerId: customerId ? parseInt(customerId) : null, customerName, customerPhone, items: JSON.stringify(items), totalAmount: parseFloat(totalAmount), depositPaid: parseFloat(depositPaid), balanceDue: balance, dueDate, notes, payments: JSON.stringify([{ amount: parseFloat(depositPaid), date: new Date().toISOString(), note: 'Initial deposit' }]), createdBy: req.user.id } });
    res.status(201).json(l);
  });
  r.post('/:id/payment', authenticate, async (req, res) => {
    const { amount, note } = req.body;
    const l = await prisma.layaway.findUnique({ where: { id: parseInt(req.params.id) } });
    const payments = JSON.parse(l.payments);
    payments.push({ amount: parseFloat(amount), date: new Date().toISOString(), note });
    const newBalance = l.balanceDue - parseFloat(amount);
    const status = newBalance <= 0 ? 'completed' : 'active';
    const updated = await prisma.layaway.update({ where: { id: l.id }, data: { depositPaid: { increment: parseFloat(amount) }, balanceDue: Math.max(0, newBalance), payments: JSON.stringify(payments), status } });
    res.json(updated);
  });
  r.post('/:id/cancel', authenticate, requireManagerOrAdmin, async (req, res) => {
    const l = await prisma.layaway.update({ where: { id: parseInt(req.params.id) }, data: { status: 'cancelled' } });
    res.json(l);
  });
});

// ────────────────────────────────────────
// DEBTS
// ────────────────────────────────────────
const debtsRouter = makeRouter((r) => {
  r.get('/', authenticate, async (req, res) => {
    const debts = await prisma.customerDebt.findMany({ include: { customer: { select: { name: true, phone: true } } }, orderBy: { createdAt: 'desc' } });
    res.json(debts);
  });
  r.post('/', authenticate, async (req, res) => {
    const { customerId, amount, description, dueDate } = req.body;
    const debt = await prisma.customerDebt.create({ data: { customerId: parseInt(customerId), amount: parseFloat(amount), description, dueDate } });
    res.status(201).json(debt);
  });
  r.post('/:id/pay', authenticate, async (req, res) => {
    const { amount, note } = req.body;
    const debt = await prisma.customerDebt.findUnique({ where: { id: parseInt(req.params.id) } });
    const payments = JSON.parse(debt.payments);
    payments.push({ amount: parseFloat(amount), date: new Date().toISOString(), note });
    const paidAmount = debt.paidAmount + parseFloat(amount);
    const status = paidAmount >= debt.amount ? 'paid' : 'outstanding';
    const updated = await prisma.customerDebt.update({ where: { id: debt.id }, data: { paidAmount, payments: JSON.stringify(payments), status } });
    res.json(updated);
  });
});

// ────────────────────────────────────────
// FEEDBACK
// ────────────────────────────────────────
const feedbackRouter = makeRouter((r) => {
  r.get('/', authenticate, async (req, res) => {
    const fb = await prisma.feedback.findMany({ orderBy: { createdAt: 'desc' }, take: 100, include: { customer: { select: { name: true } } } });
    res.json(fb);
  });
  r.get('/stats', authenticate, async (req, res) => {
    try {
      const [avg, total] = await Promise.all([
        prisma.feedback.aggregate({ _avg: { rating: true }, _count: true }),
        prisma.feedback.count(),
      ]);
      const allFeedback = await prisma.feedback.findMany({ select: { rating: true } });
      const distMap = {};
      allFeedback.forEach(f => { distMap[f.rating] = (distMap[f.rating] || 0) + 1; });
      const distribution = Object.entries(distMap).map(([rating, count]) => ({ rating: parseInt(rating), count })).sort((a,b) => b.rating - a.rating);
      res.json({ averageRating: avg._avg.rating || 0, totalReviews: total, distribution });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });
  r.post('/', async (req, res) => {
    const { customerId, customerName, rating, comment, category } = req.body;
    const fb = await prisma.feedback.create({ data: { customerId: customerId ? parseInt(customerId) : null, customerName, rating: parseInt(rating), comment, category } });
    res.status(201).json(fb);
  });
});

// ────────────────────────────────────────
// CASH FLOAT
// ────────────────────────────────────────
const cashFloatRouter = makeRouter((r) => {
  r.get('/today', authenticate, async (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const floats = await prisma.cashFloat.findMany({ where: { date: today }, orderBy: { createdAt: 'asc' } });
    res.json(floats);
  });
  r.get('/history', authenticate, requireManagerOrAdmin, async (req, res) => {
    const floats = await prisma.cashFloat.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
    res.json(floats);
  });
  r.post('/open', authenticate, async (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const f = await prisma.cashFloat.create({ data: { date: today, type: 'open', amount: parseFloat(req.body.amount), notes: req.body.notes, userId: req.user.id } });
    res.status(201).json(f);
  });
  r.post('/close', authenticate, async (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const f = await prisma.cashFloat.create({ data: { date: today, type: 'close', amount: parseFloat(req.body.amount), notes: req.body.notes, userId: req.user.id } });
    res.status(201).json(f);
  });
});

// ────────────────────────────────────────
// PURCHASE ORDERS
// ────────────────────────────────────────
const purchaseOrdersRouter = makeRouter((r) => {
  function genPO() { return `PO${Date.now().toString().slice(-8)}`; }
  r.get('/', authenticate, requireManagerOrAdmin, async (req, res) => {
    const pos = await prisma.purchaseOrder.findMany({ orderBy: { createdAt: 'desc' }, include: { supplier: { select: { name: true } } } });
    res.json(pos);
  });
  r.post('/', authenticate, requireManagerOrAdmin, async (req, res) => {
    const { supplierId, items, totalCost, expectedDate, notes } = req.body;
    const po = await prisma.purchaseOrder.create({ data: { poNumber: genPO(), supplierId: parseInt(supplierId), items: JSON.stringify(items), totalCost: parseFloat(totalCost), expectedDate, notes, createdBy: req.user.id } });
    res.status(201).json(po);
  });
  r.post('/:id/receive', authenticate, requireManagerOrAdmin, async (req, res) => {
    const po = await prisma.purchaseOrder.findUnique({ where: { id: parseInt(req.params.id) } });
    const items = JSON.parse(po.items);
    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        if (item.productId) {
          await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
          await tx.stockMovement.create({ data: { productId: item.productId, type: 'in', quantity: item.quantity, reason: 'Purchase Order', reference: po.poNumber } });
        }
      }
      await tx.purchaseOrder.update({ where: { id: po.id }, data: { status: 'received', receivedAt: new Date() } });
    });
    res.json({ message: 'Purchase order received and stock updated' });
  });
  r.put('/:id/status', authenticate, requireManagerOrAdmin, async (req, res) => {
    const po = await prisma.purchaseOrder.update({ where: { id: parseInt(req.params.id) }, data: { status: req.body.status } });
    res.json(po);
  });
});

// ────────────────────────────────────────
// UPLOADS (Cloudinary if configured, else base64)
// ────────────────────────────────────────
const multer = require('multer');
const uploadsRouter = makeRouter((r) => {
  const storage = multer.memoryStorage();
  const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 } });

  r.post('/image', authenticate, upload.single('image'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

      // Try Cloudinary if configured
      const hasCloudinary = process.env.CLOUDINARY_CLOUD_NAME && 
        process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name' &&
        process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;

      if (hasCloudinary) {
        try {
          const cloudinary = require('cloudinary').v2;
          cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
          const b64 = req.file.buffer.toString('base64');
          const dataURI = `data:${req.file.mimetype};base64,${b64}`;
          const result = await cloudinary.uploader.upload(dataURI, { folder: 'villavogue', transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }] });
          return res.json({ url: result.secure_url, publicId: result.public_id, source: 'cloudinary' });
        } catch (cloudErr) {
          console.log('Cloudinary failed, using base64 fallback:', cloudErr.message);
        }
      }

      // Fallback: return as base64 data URL (works without any cloud service)
      const b64 = req.file.buffer.toString('base64');
      const dataUrl = `data:${req.file.mimetype};base64,${b64}`;
      res.json({ url: dataUrl, publicId: null, source: 'base64' });
    } catch (err) {
      res.status(500).json({ error: 'Upload failed: ' + err.message });
    }
  });
});

module.exports = {
  categoriesRouter, expensesRouter, suppliersRouter, settingsRouter,
  activityRouter, inventoryRouter, reportsRouter, discountsRouter,
  quotesRouter, staffRouter, layawaysRouter, debtsRouter, feedbackRouter,
  cashFloatRouter, purchaseOrdersRouter, uploadsRouter,
};
