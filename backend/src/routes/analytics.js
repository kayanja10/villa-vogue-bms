const express = require('express');
const router = express.Router();
const { prisma } = require('../prisma');
const { authenticate, requireManagerOrAdmin } = require('../middleware/auth');

// ─── DASHBOARD ────────────────────────────────────────────────
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86400000 - 1);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);

    // Today stats
    const [todayOrders, todayExpenses, monthOrders, lastMonthOrders, totalProducts, totalCustomers, pendingOrders, recentOrders] = await Promise.all([
      prisma.order.aggregate({
        where: { createdAt: { gte: todayStart, lte: todayEnd }, orderStatus: { not: 'voided' } },
        _sum: { total: true, discount: true }, _count: true, _avg: { total: true }
      }),
      prisma.expense.aggregate({
        where: { createdAt: { gte: todayStart, lte: todayEnd } },
        _sum: { amount: true }
      }),
      prisma.order.aggregate({
        where: { createdAt: { gte: monthStart }, orderStatus: { not: 'voided' } },
        _sum: { total: true }, _count: true
      }),
      prisma.order.aggregate({
        where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, orderStatus: { not: 'voided' } },
        _sum: { total: true }
      }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.customer.count({ where: { isActive: true } }),
      prisma.order.count({ where: { orderStatus: 'pending' } }),
      prisma.order.findMany({
        where: { orderStatus: { not: 'voided' } },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { servedByUser: { select: { username: true } } }
      })
    ]);

    // Low stock: products where stock <= lowStockThreshold
    const allProducts = await prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, stock: true, lowStockThreshold: true, price: true, costPrice: true }
    });
    const lowStockItems = allProducts.filter(p => p.stock <= p.lowStockThreshold);
    const stockValue = allProducts.reduce((s, p) => s + p.stock * p.costPrice, 0);
    const retailValue = allProducts.reduce((s, p) => s + p.stock * p.price, 0);

    // 7-day chart using Prisma groupBy
    const sevenDayOrders = await prisma.order.findMany({
      where: { createdAt: { gte: sevenDaysAgo }, orderStatus: { not: 'voided' } },
      select: { total: true, createdAt: true }
    });

    // Group by date manually
    const chartMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const key = d.toISOString().split('T')[0];
      chartMap[key] = { date: key, sales: 0, orders: 0 };
    }
    sevenDayOrders.forEach(o => {
      const key = o.createdAt.toISOString().split('T')[0];
      if (chartMap[key]) { chartMap[key].sales += o.total; chartMap[key].orders++; }
    });
    const salesChart = Object.values(chartMap);

    // Top products from stock movements
    const soldMovements = await prisma.stockMovement.findMany({
      where: { type: 'out', reason: 'Sale', createdAt: { gte: new Date(now.getTime() - 30 * 86400000) } },
      include: { product: { select: { name: true, price: true, images: true } } }
    });
    const topMap = {};
    soldMovements.forEach(m => {
      if (!topMap[m.productId]) topMap[m.productId] = { id: m.productId, name: m.product.name, price: m.product.price, unitsSold: 0, revenue: 0 };
      topMap[m.productId].unitsSold += m.quantity;
      topMap[m.productId].revenue += m.quantity * m.product.price;
    });
    const topProducts = Object.values(topMap).sort((a, b) => b.unitsSold - a.unitsSold).slice(0, 5);

    // Growth
    const lastMonthSales = lastMonthOrders._sum.total || 0;
    const thisMonthSales = monthOrders._sum.total || 0;
    const salesGrowth = lastMonthSales > 0 ? ((thisMonthSales - lastMonthSales) / lastMonthSales * 100).toFixed(1) : 0;

    // Notifications
    const notifications = await prisma.notification.findMany({
      where: { isRead: false },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Today's birthday customers
    const today = `${String(now.getMonth() + 1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const birthdayCustomers = await prisma.customer.findMany({
      where: { birthday: { endsWith: today }, isActive: true },
      select: { id: true, name: true, phone: true }
    });

    res.json({
      today: {
        sales: todayOrders._sum.total || 0,
        orders: todayOrders._count,
        expenses: todayExpenses._sum.amount || 0,
        profit: (todayOrders._sum.total || 0) - (todayExpenses._sum.amount || 0),
        avgOrderValue: todayOrders._avg.total || 0,
        discounts: todayOrders._sum.discount || 0,
      },
      month: {
        sales: thisMonthSales,
        orders: monthOrders._count,
        salesGrowth: parseFloat(salesGrowth),
      },
      inventory: {
        totalProducts,
        lowStockCount: lowStockItems.length,
        lowStockItems: lowStockItems.slice(0, 5),
        stockValue,
        retailValue,
        potentialProfit: retailValue - stockValue,
      },
      customers: { total: totalCustomers },
      pendingOrders,
      recentOrders,
      topProducts,
      salesChart,
      notifications,
      birthdays: birthdayCustomers,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: err.message });
  }
});


// ─── DAILY CLOSING REPORT ─────────────────────────────────────
// Generates the end-of-day summary as both structured JSON (for the dashboard
// widget) and a pre-formatted WhatsApp message (for the one-click send link).
// There is no server-side WhatsApp sending — this returns a wa.me link that
// staff tap to actually send, since automated sending requires a paid Meta
// Business API account that isn't configured.
router.get('/daily-closing', authenticate, requireManagerOrAdmin, async (req, res) => {
  try {
    const { date } = req.query;
    const target = date ? new Date(date) : new Date();
    const dayStart = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    const dayEnd = new Date(dayStart.getTime() + 86400000 - 1);

    const [orders, expenses, voidedCount] = await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: dayStart, lte: dayEnd }, orderStatus: { not: 'voided' } },
        select: { total: true, paymentMethod: true, orderSource: true, items: true, servedBy: true },
      }),
      prisma.expense.aggregate({
        where: { createdAt: { gte: dayStart, lte: dayEnd } },
        _sum: { amount: true },
      }),
      prisma.order.count({ where: { createdAt: { gte: dayStart, lte: dayEnd }, orderStatus: 'voided' } }),
    ]);

    const totalSales = orders.reduce((s, o) => s + o.total, 0);
    const totalExpenses = expenses._sum.amount || 0;
    const netProfit = totalSales - totalExpenses;

    const byPayment = {};
    orders.forEach(o => { byPayment[o.paymentMethod] = (byPayment[o.paymentMethod] || 0) + o.total; });

    const onlineCount = orders.filter(o => o.orderSource === 'online').length;
    const posCount = orders.length - onlineCount;

    const itemTally = {};
    orders.forEach(o => {
      try {
        JSON.parse(o.items || '[]').forEach(i => {
          itemTally[i.name] = (itemTally[i.name] || 0) + i.quantity;
        });
      } catch {}
    });
    const topItem = Object.entries(itemTally).sort((a, b) => b[1] - a[1])[0];

    const staffIds = [...new Set(orders.map(o => o.servedBy).filter(Boolean))];
    const staffUsers = staffIds.length
      ? await prisma.user.findMany({ where: { id: { in: staffIds } }, select: { id: true, username: true } })
      : [];
    const staffSales = staffUsers.map(u => ({
      username: u.username,
      sales: orders.filter(o => o.servedBy === u.id).reduce((s, o) => s + o.total, 0),
      orders: orders.filter(o => o.servedBy === u.id).length,
    })).sort((a, b) => b.sales - a.sales);

    const dateLabel = dayStart.toLocaleDateString('en-UG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const lines = [
      `📋 *VILLA VOGUE — DAILY CLOSING*`,
      `${dateLabel}`,
      ``,
      `💰 *Total Sales:* UGX ${totalSales.toLocaleString()}`,
      `📦 *Orders:* ${orders.length} (${posCount} in-store, ${onlineCount} online)`,
      `💸 *Expenses:* UGX ${totalExpenses.toLocaleString()}`,
      `✅ *Net Profit:* UGX ${netProfit.toLocaleString()}`,
      ``,
      `*Payment Breakdown:*`,
      ...Object.entries(byPayment).map(([m, v]) => `• ${m.replace(/_/g, ' ')}: UGX ${v.toLocaleString()}`),
      ``,
      topItem ? `🏆 *Top Seller:* ${topItem[0]} (${topItem[1]} sold)` : null,
      voidedCount > 0 ? `⚠️ *Voided orders:* ${voidedCount}` : null,
      ``,
      staffSales.length ? `*Staff Performance:*` : null,
      ...staffSales.slice(0, 5).map((s, i) => `${i + 1}. ${s.username}: UGX ${s.sales.toLocaleString()} (${s.orders} orders)`),
    ].filter(Boolean);

    const message = lines.join('\n');
    const whatsappUrl = `https://wa.me/256782860372?text=${encodeURIComponent(message)}`;

    res.json({
      date: dayStart.toISOString().split('T')[0],
      dateLabel,
      totalSales,
      totalExpenses,
      netProfit,
      orderCount: orders.length,
      onlineCount,
      posCount,
      voidedCount,
      byPayment,
      topItem: topItem ? { name: topItem[0], unitsSold: topItem[1] } : null,
      staffSales,
      message,
      whatsappUrl,
    });
  } catch (err) {
    console.error('Daily closing report error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── SALES REPORT ────────────────────────────────────────────
router.get('/sales-report', authenticate, requireManagerOrAdmin, async (req, res) => {
  try {
    const { from, to } = req.query;
    const where = { orderStatus: { not: 'voided' } };
    if (from) where.createdAt = { ...where.createdAt, gte: new Date(from) };
    if (to) where.createdAt = { ...where.createdAt, lte: new Date(to + 'T23:59:59') };

    const orders = await prisma.order.findMany({ where, select: { total: true, discount: true, tax: true, paymentMethod: true, createdAt: true } });

    // Group by day
    const byDay = {};
    orders.forEach(o => {
      const day = o.createdAt.toISOString().split('T')[0];
      if (!byDay[day]) byDay[day] = { date: day, total: 0, count: 0, discount: 0 };
      byDay[day].total += o.total;
      byDay[day].count++;
      byDay[day].discount += o.discount;
    });

    // Payment breakdown
    const byPayment = {};
    orders.forEach(o => {
      if (!byPayment[o.paymentMethod]) byPayment[o.paymentMethod] = { method: o.paymentMethod, total: 0, count: 0 };
      byPayment[o.paymentMethod].total += o.total;
      byPayment[o.paymentMethod].count++;
    });

    res.json({
      summary: {
        totalSales: orders.reduce((s, o) => s + o.total, 0),
        orderCount: orders.length,
        totalDiscounts: orders.reduce((s, o) => s + o.discount, 0),
        avgOrderValue: orders.length ? orders.reduce((s, o) => s + o.total, 0) / orders.length : 0,
      },
      byDay: Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)),
      byPayment: Object.values(byPayment),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── CATEGORY PERFORMANCE ────────────────────────────────────
router.get('/category-performance', authenticate, requireManagerOrAdmin, async (req, res) => {
  try {
    const categories = await prisma.category.findMany({ include: { products: { where: { isActive: true }, select: { id: true, name: true, price: true, costPrice: true, stock: true } } } });
    const movements = await prisma.stockMovement.findMany({ where: { type: 'out', reason: 'Sale' }, select: { productId: true, quantity: true } });
    const soldMap = {};
    movements.forEach(m => { soldMap[m.productId] = (soldMap[m.productId] || 0) + m.quantity; });

    const result = categories.map(c => {
      const unitsSold = c.products.reduce((s, p) => s + (soldMap[p.id] || 0), 0);
      const revenue = c.products.reduce((s, p) => s + (soldMap[p.id] || 0) * p.price, 0);
      const cogs = c.products.reduce((s, p) => s + (soldMap[p.id] || 0) * p.costPrice, 0);
      return { id: c.id, name: c.name, productCount: c.products.length, unitsSold, revenue, cogs, profit: revenue - cogs, stockValue: c.products.reduce((s, p) => s + p.stock * p.costPrice, 0) };
    });

    res.json(result.sort((a, b) => b.revenue - a.revenue));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── STAFF PERFORMANCE ───────────────────────────────────────
router.get('/staff-performance', authenticate, requireManagerOrAdmin, async (req, res) => {
  try {
    const { from, to } = req.query;
    const where = { orderStatus: { not: 'voided' } };
    if (from) where.createdAt = { gte: new Date(from) };
    if (to) where.createdAt = { ...where.createdAt, lte: new Date(to + 'T23:59:59') };

    const users = await prisma.user.findMany({ where: { isActive: true }, select: { id: true, username: true, role: true } });
    const orders = await prisma.order.findMany({ where, select: { servedBy: true, total: true } });

    const result = users.map(u => {
      const userOrders = orders.filter(o => o.servedBy === u.id);
      return { id: u.id, username: u.username, role: u.role, totalOrders: userOrders.length, totalSales: userOrders.reduce((s, o) => s + o.total, 0), avgOrderValue: userOrders.length ? userOrders.reduce((s, o) => s + o.total, 0) / userOrders.length : 0 };
    });

    res.json(result.sort((a, b) => b.totalSales - a.totalSales));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── HOURLY HEATMAP ──────────────────────────────────────────
router.get('/hourly', authenticate, requireManagerOrAdmin, async (req, res) => {
  try {
    const { from, to } = req.query;
    const where = { orderStatus: { not: 'voided' } };
    if (from) where.createdAt = { gte: new Date(from) };
    if (to) where.createdAt = { ...where.createdAt, lte: new Date(to + 'T23:59:59') };

    const orders = await prisma.order.findMany({ where, select: { total: true, createdAt: true } });

    const hourly = Array.from({ length: 24 }, (_, h) => ({ hour: h, label: `${String(h).padStart(2,'0')}:00`, orders: 0, sales: 0 }));
    orders.forEach(o => {
      const h = o.createdAt.getHours();
      hourly[h].orders++;
      hourly[h].sales += o.total;
    });

    res.json(hourly);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── INCOME VS EXPENSE ───────────────────────────────────────
router.get('/income-expense', authenticate, requireManagerOrAdmin, async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 6;
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const [orders, expenses] = await Promise.all([
      prisma.order.findMany({ where: { createdAt: { gte: since }, orderStatus: { not: 'voided' } }, select: { total: true, createdAt: true } }),
      prisma.expense.findMany({ where: { createdAt: { gte: since } }, select: { amount: true, createdAt: true } })
    ]);

    const map = {};
    orders.forEach(o => {
      const k = o.createdAt.toISOString().slice(0, 7);
      if (!map[k]) map[k] = { month: k, income: 0, expenses: 0 };
      map[k].income += o.total;
    });
    expenses.forEach(e => {
      const k = e.createdAt.toISOString().slice(0, 7);
      if (!map[k]) map[k] = { month: k, income: 0, expenses: 0 };
      map[k].expenses += e.amount;
    });

    res.json(Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).map(m => ({ ...m, profit: m.income - m.expenses })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── PRODUCT PERFORMANCE & PROFIT ───────────────────────────
router.get('/product-performance', authenticate, requireManagerOrAdmin, async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: { category: { select: { name: true } }, stockMovements: { where: { type: 'out', reason: 'Sale' } } }
    });

    const result = products.map(p => {
      const unitsSold = p.stockMovements.reduce((s, m) => s + m.quantity, 0);
      const revenue = unitsSold * p.price;
      const cogs = unitsSold * p.costPrice;
      const profit = revenue - cogs;
      const margin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : 0;
      const velocity = unitsSold / 30; // units per day over last 30 days
      const daysOfStock = velocity > 0 ? Math.floor(p.stock / velocity) : 999;
      return { id: p.id, name: p.name, sku: p.sku, category: p.category?.name, price: p.price, costPrice: p.costPrice, stock: p.stock, lowStockThreshold: p.lowStockThreshold, unitsSold, revenue, cogs, profit, margin: parseFloat(margin), velocity: parseFloat(velocity.toFixed(2)), daysOfStock, needsRestock: p.stock <= p.lowStockThreshold };
    });

    res.json(result.sort((a, b) => b.revenue - a.revenue));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── FINANCIAL SUMMARY ───────────────────────────────────────
router.get('/financial-summary', authenticate, requireManagerOrAdmin, async (req, res) => {
  try {
    const { from, to } = req.query;
    const dateWhere = {};
    if (from) dateWhere.gte = new Date(from);
    if (to) dateWhere.lte = new Date(to + 'T23:59:59');

    const [sales, expenses, refunds, debts] = await Promise.all([
      prisma.order.aggregate({ where: { orderStatus: { not: 'voided' }, ...(from||to ? { createdAt: dateWhere } : {}) }, _sum: { total: true, discount: true, tax: true }, _count: true }),
      prisma.expense.aggregate({ where: from||to ? { createdAt: dateWhere } : {}, _sum: { amount: true }, _count: true }),
      prisma.refund.aggregate({ where: from||to ? { createdAt: dateWhere } : {}, _sum: { amount: true }, _count: true }),
      prisma.customerDebt.aggregate({ where: { status: 'outstanding' }, _sum: { amount: true, paidAmount: true } }),
    ]);

    const grossRevenue = sales._sum.total || 0;
    const totalExpenses = expenses._sum.amount || 0;
    const totalRefunds = refunds._sum.amount || 0;
    const netRevenue = grossRevenue - totalRefunds;
    const grossProfit = netRevenue - totalExpenses;

    res.json({
      grossRevenue, totalExpenses, totalRefunds, netRevenue, grossProfit,
      orderCount: sales._count,
      totalDiscounts: sales._sum.discount || 0,
      totalTax: sales._sum.tax || 0,
      expenseCount: expenses._count,
      outstandingDebts: (debts._sum.amount || 0) - (debts._sum.paidAmount || 0),
      profitMargin: netRevenue > 0 ? ((grossProfit / netRevenue) * 100).toFixed(1) : 0,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
