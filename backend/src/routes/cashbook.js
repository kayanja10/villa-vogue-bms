const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireManagerOrAdmin } = require('../middleware/auth');
const prisma = new PrismaClient();

// GET /api/cashbook — List all entries
router.get('/', authenticate, requireManagerOrAdmin, async (req, res) => {
  try {
    const { from, to, type } = req.query;
    const where = {};
    if (type) where.type = type;
    if (from) where.createdAt = { gte: new Date(from) };
    if (to) where.createdAt = { ...where.createdAt, lte: new Date(to + 'T23:59:59') };

    const entries = await prisma.cashBook.findMany({
      where, orderBy: { createdAt: 'desc' }, take: 200,
      include: { user: { select: { username: true } } }
    });

    const totalIn = entries.filter(e => e.type === 'inflow').reduce((s, e) => s + e.amount, 0);
    const totalOut = entries.filter(e => e.type === 'outflow').reduce((s, e) => s + e.amount, 0);

    res.json({ entries, summary: { totalIn, totalOut, balance: totalIn - totalOut } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/cashbook — Add entry
router.post('/', authenticate, async (req, res) => {
  try {
    const { type, amount, description, reference, category, paymentMethod } = req.body;

    // Get current balance
    const last = await prisma.cashBook.findFirst({ orderBy: { createdAt: 'desc' } });
    const currentBalance = last?.balance || 0;
    const newBalance = type === 'inflow' ? currentBalance + parseFloat(amount) : currentBalance - parseFloat(amount);

    const entry = await prisma.cashBook.create({
      data: { type, amount: parseFloat(amount), description, reference, category: category || 'General', paymentMethod: paymentMethod || 'cash', balance: newBalance, userId: req.user.id }
    });

    res.status(201).json(entry);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/cashbook/reconciliation — Daily reconciliation
router.get('/reconciliation', authenticate, requireManagerOrAdmin, async (req, res) => {
  try {
    const { date } = req.query;
    const d = date || new Date().toISOString().split('T')[0];
    const start = new Date(d + 'T00:00:00');
    const end = new Date(d + 'T23:59:59');

    const [orders, expenses, refunds, float] = await Promise.all([
      prisma.order.findMany({ where: { createdAt: { gte: start, lte: end }, orderStatus: { not: 'voided' }, paymentMethod: 'cash' }, select: { total: true } }),
      prisma.expense.findMany({ where: { createdAt: { gte: start, lte: end } }, select: { amount: true } }),
      prisma.refund.findMany({ where: { createdAt: { gte: start, lte: end } }, select: { amount: true } }),
      prisma.cashFloat.findFirst({ where: { date: d, type: 'open' } }),
    ]);

    const cashSales = orders.reduce((s, o) => s + o.total, 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const totalRefunds = refunds.reduce((s, r) => s + r.amount, 0);
    const openingFloat = float?.amount || 0;
    const expectedCash = openingFloat + cashSales - totalExpenses - totalRefunds;

    const existing = await prisma.dailyReconciliation.findUnique({ where: { date: d } });

    res.json({
      date: d, openingFloat, cashSales, totalExpenses, totalRefunds,
      expectedCash, countedCash: existing?.countedCash || 0,
      variance: existing ? existing.countedCash - expectedCash : null,
      status: existing?.status || 'pending',
      notes: existing?.notes,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/cashbook/reconciliation — Submit reconciliation
router.post('/reconciliation', authenticate, requireManagerOrAdmin, async (req, res) => {
  try {
    const { date, countedCash, notes } = req.body;
    const d = date || new Date().toISOString().split('T')[0];
    const start = new Date(d + 'T00:00:00');
    const end = new Date(d + 'T23:59:59');

    const [orders, expenses, float] = await Promise.all([
      prisma.order.aggregate({ where: { createdAt: { gte: start, lte: end }, orderStatus: { not: 'voided' }, paymentMethod: 'cash' }, _sum: { total: true } }),
      prisma.expense.aggregate({ where: { createdAt: { gte: start, lte: end } }, _sum: { amount: true } }),
      prisma.cashFloat.findFirst({ where: { date: d, type: 'open' } }),
    ]);

    const expectedCash = (float?.amount || 0) + (orders._sum.total || 0) - (expenses._sum.amount || 0);
    const variance = parseFloat(countedCash) - expectedCash;
    const status = Math.abs(variance) < 1000 ? 'balanced' : 'discrepancy';

    const rec = await prisma.dailyReconciliation.upsert({
      where: { date: d },
      update: { countedCash: parseFloat(countedCash), expectedCash, variance, status, notes, reconciledBy: req.user.id },
      create: { date: d, openingFloat: float?.amount || 0, expectedCash, countedCash: parseFloat(countedCash), variance, totalSales: orders._sum.total || 0, totalExpenses: expenses._sum.amount || 0, status, notes, reconciledBy: req.user.id },
    });

    // Create notification if discrepancy
    if (status === 'discrepancy') {
      await prisma.notification.create({ data: { type: 'reconciliation', title: 'Cash Discrepancy', message: `Cash discrepancy of UGX ${Math.abs(variance).toLocaleString()} on ${d}. Expected: ${expectedCash.toLocaleString()}, Counted: ${countedCash}`, userId: req.user.id } });
    }

    res.json(rec);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
