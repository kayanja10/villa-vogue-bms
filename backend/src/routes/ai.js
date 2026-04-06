const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireManagerOrAdmin } = require('../middleware/auth');
const prisma = new PrismaClient();

async function buildContext() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyAgo = new Date(now.getTime() - 30 * 86400000);

  const [monthOrders, monthExpenses, products, customerCount, debts, topCustomers] = await Promise.all([
    prisma.order.findMany({ where: { createdAt: { gte: monthStart }, orderStatus: { not: 'voided' } }, select: { total: true, paymentMethod: true } }),
    prisma.expense.findMany({ where: { createdAt: { gte: monthStart } }, select: { amount: true, category: true } }),
    prisma.product.findMany({ where: { isActive: true }, select: { name: true, stock: true, lowStockThreshold: true, price: true, costPrice: true, stockMovements: { where: { type: 'out', reason: 'Sale', createdAt: { gte: thirtyAgo } }, select: { quantity: true } } } }),
    prisma.customer.count({ where: { isActive: true } }),
    prisma.customerDebt.findMany({ where: { status: 'outstanding' }, select: { amount: true, paidAmount: true } }),
    prisma.customer.findMany({ orderBy: { totalSpent: 'desc' }, take: 5, select: { name: true, totalSpent: true, visitCount: true, tier: true } }),
  ]);

  const totalSales = monthOrders.reduce((s, o) => s + o.total, 0);
  const totalExpenses = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const lowStock = products.filter(p => p.stock <= p.lowStockThreshold && p.stock > 0);
  const outOfStock = products.filter(p => p.stock === 0);
  const outstanding = debts.reduce((s, d) => s + Math.max(0, d.amount - d.paidAmount), 0);

  const topProducts = products
    .map(p => ({ name: p.name, unitsSold: p.stockMovements.reduce((s, m) => s + m.quantity, 0), stock: p.stock, margin: p.costPrice > 0 ? Math.round(((p.price - p.costPrice) / p.price) * 100) : 0 }))
    .sort((a, b) => b.unitsSold - a.unitsSold).slice(0, 5);

  const slowMovers = products
    .filter(p => p.stockMovements.length === 0 && p.stock > 0)
    .map(p => ({ name: p.name, stock: p.stock })).slice(0, 5);

  const expenseByCategory = {};
  monthExpenses.forEach(e => { expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount; });

  return {
    financials: {
      totalSales, totalExpenses,
      netProfit: totalSales - totalExpenses,
      profitMargin: totalSales > 0 ? ((totalSales - totalExpenses) / totalSales * 100).toFixed(1) + '%' : '0%',
      orderCount: monthOrders.length,
      outstandingDebts: outstanding,
      expenseByCategory,
    },
    inventory: {
      totalProducts: products.length,
      lowStockCount: lowStock.length,
      outOfStockCount: outOfStock.length,
      lowStockItems: lowStock.map(p => `${p.name} (${p.stock} left)`),
      outOfStockItems: outOfStock.map(p => p.name),
    },
    topProducts,
    slowMovers,
    customers: { total: customerCount, topCustomers },
  };
}

function ruleBasedAnswer(ctx, question) {
  if (!ctx) return '⚠️ Unable to load business data. Please try again.';
  const q = (question || '').toLowerCase();
  const { financials: f, inventory: inv, topProducts, slowMovers, customers: c } = ctx;

  if (q.includes('restock') || q.includes('stock') || q.includes('inventory')) {
    const lines = ['📦 **Inventory Intelligence:**\n'];
    if (inv.outOfStockCount > 0) lines.push(`🚨 OUT OF STOCK (${inv.outOfStockCount}): ${inv.outOfStockItems.join(', ')}`);
    if (inv.lowStockCount > 0) lines.push(`⚠️ LOW STOCK (${inv.lowStockCount}): ${inv.lowStockItems.join(', ')}`);
    if (slowMovers.length > 0) lines.push(`🐌 NOT SELLING: ${slowMovers.map(p => p.name).join(', ')} — consider discounting`);
    if (topProducts.length > 0) lines.push(`⭐ BEST SELLERS: ${topProducts.slice(0,3).map(p => `${p.name} (${p.unitsSold} sold)`).join(', ')}`);
    return lines.join('\n');
  }

  if (q.includes('profit') || q.includes('revenue') || q.includes('money') || q.includes('sales') || q.includes('financial')) {
    const lines = ['💰 **Financial Summary (This Month):**\n'];
    lines.push(`📈 Sales: UGX ${f.totalSales.toLocaleString()}`);
    lines.push(`📉 Expenses: UGX ${f.totalExpenses.toLocaleString()}`);
    lines.push(`💵 Net Profit: UGX ${f.netProfit.toLocaleString()} (${f.profitMargin} margin)`);
    lines.push(`📋 Orders: ${f.orderCount}`);
    if (f.outstandingDebts > 0) lines.push(`⚠️ Outstanding Debts: UGX ${f.outstandingDebts.toLocaleString()}`);
    if (Object.keys(f.expenseByCategory).length > 0) {
      const topExp = Object.entries(f.expenseByCategory).sort((a,b)=>b[1]-a[1])[0];
      if (topExp) lines.push(`💸 Biggest expense category: ${topExp[0]} (UGX ${topExp[1].toLocaleString()})`);
    }
    return lines.join('\n');
  }

  if (q.includes('customer') || q.includes('client') || q.includes('buyer')) {
    const lines = ['👥 **Customer Intelligence:**\n'];
    lines.push(`Total active customers: ${c.total}`);
    if (c.topCustomers.length > 0) {
      lines.push('\nTop Customers:');
      c.topCustomers.forEach((cu, i) => lines.push(`  ${i+1}. ${cu.name} — UGX ${(cu.totalSpent||0).toLocaleString()} (${cu.visitCount} visits, ${cu.tier} tier)`));
    }
    if (f.outstandingDebts > 0) lines.push(`\n⚠️ UGX ${f.outstandingDebts.toLocaleString()} owed by customers — follow up!`);
    return lines.join('\n');
  }

  if (q.includes('best') || q.includes('top') || q.includes('popular')) {
    if (topProducts.length === 0) return '📊 No sales data yet this month. Make some sales to see top products!';
    const lines = ['⭐ **Top Performing Products (Last 30 Days):**\n'];
    topProducts.forEach((p, i) => lines.push(`${i+1}. ${p.name} — ${p.unitsSold} units sold, ${p.margin}% margin`));
    return lines.join('\n');
  }

  if (q.includes('slow') || q.includes('dead') || q.includes('not selling') || q.includes('discount')) {
    if (slowMovers.length === 0) return '✅ Great news! All your products have sold at least once this month.';
    const lines = ['🐌 **Slow Moving Products (No Sales This Month):**\n'];
    slowMovers.forEach(p => lines.push(`• ${p.name} — ${p.stock} units sitting in stock`));
    lines.push('\n💡 **Recommendations:**');
    lines.push('• Create a discount code for these items');
    lines.push('• Feature them in WhatsApp marketing messages');
    lines.push('• Bundle them with bestsellers');
    return lines.join('\n');
  }

  if (q.includes('expense') || q.includes('cost') || q.includes('spending')) {
    const lines = ['💸 **Expense Breakdown (This Month):**\n'];
    lines.push(`Total: UGX ${f.totalExpenses.toLocaleString()}`);
    Object.entries(f.expenseByCategory).sort((a,b)=>b[1]-a[1]).forEach(([cat, amt]) => {
      lines.push(`  • ${cat}: UGX ${amt.toLocaleString()}`);
    });
    return lines.join('\n');
  }

  const lines = ['📊 **Villa Vogue Business Overview (This Month):**\n'];
  lines.push(`💰 Sales: UGX ${f.totalSales.toLocaleString()} | ${f.orderCount} orders`);
  lines.push(`💵 Profit: UGX ${f.netProfit.toLocaleString()} (${f.profitMargin})`);
  lines.push(`📦 Products: ${inv.totalProducts} total, ${inv.lowStockCount} low stock, ${inv.outOfStockCount} out of stock`);
  lines.push(`👥 Customers: ${c.total} active`);
  if (topProducts[0]) lines.push(`⭐ Best seller: ${topProducts[0].name} (${topProducts[0].unitsSold} sold)`);
  if (slowMovers.length > 0) lines.push(`🐌 Not selling: ${slowMovers[0].name} and ${slowMovers.length - 1} others`);
  lines.push('\n💡 Ask me anything: "What should I restock?", "Who are my best customers?", "Show me slow products"');
  return lines.join('\n');
}

// POST /api/ai/insights
router.post('/insights', authenticate, requireManagerOrAdmin, async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: 'Question required' });

    const ctx = await buildContext();
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (apiKey && apiKey !== 'your_anthropic_api_key_here') {
      try {
        const axios = require('axios');
        const prompt = `You are the AI assistant for Villa Vogue Fashions, a fashion retail store in Kampala, Uganda. Analyze this business data and answer the question clearly and practically. Use UGX for currency. Be specific, actionable, and concise (max 250 words).

LIVE BUSINESS DATA:
${JSON.stringify(ctx, null, 2)}

QUESTION: ${question}

Give bullet-pointed, practical advice based on the actual numbers above.`;

        const response = await axios.post('https://api.anthropic.com/v1/messages', {
          model: 'claude-3-haiku-20240307',
          max_tokens: 600,
          messages: [{ role: 'user', content: prompt }]
        }, {
          headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
          timeout: 15000
        });

        const answer = response.data?.content?.[0]?.text;
        if (answer) return res.json({ answer, source: 'ai', context: ctx });
      } catch (aiErr) {
        console.error('AI API error:', aiErr.message);
      }
    }

    res.json({ answer: ruleBasedAnswer(ctx, question), source: 'rules', context: ctx });
  } catch (err) {
    console.error('AI insights error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ai/summary
router.get('/summary', authenticate, requireManagerOrAdmin, async (req, res) => {
  try {
    const ctx = await buildContext();
    const { financials: f, inventory: inv, topProducts, slowMovers, customers: c } = ctx;

    const insights = [];

    if (f.netProfit > 0) {
      insights.push({ type: 'positive', icon: '💰', title: 'Profitable Month', message: `You're making UGX ${f.netProfit.toLocaleString()} profit this month with a ${f.profitMargin} margin.` });
    } else if (f.totalSales > 0) {
      insights.push({ type: 'danger', icon: '⚠️', title: 'Running at a Loss', message: `Expenses exceed sales by UGX ${Math.abs(f.netProfit).toLocaleString()}. Review your costs urgently.` });
    } else {
      insights.push({ type: 'info', icon: '📊', title: 'No Sales Yet', message: 'No sales recorded this month. Start making sales to see insights here.' });
    }

    if (inv.outOfStockCount > 0) {
      insights.push({ type: 'danger', icon: '🚨', title: `${inv.outOfStockCount} Products Out of Stock`, message: `${inv.outOfStockItems.slice(0,3).join(', ')} — customers cannot buy these!` });
    }

    if (inv.lowStockCount > 0) {
      insights.push({ type: 'warning', icon: '📦', title: `${inv.lowStockCount} Products Running Low`, message: `${inv.lowStockItems.slice(0,3).join(', ')}` });
    }

    if (topProducts.length > 0 && topProducts[0].unitsSold > 0) {
      insights.push({ type: 'positive', icon: '⭐', title: 'Best Seller', message: `${topProducts[0].name} leads with ${topProducts[0].unitsSold} units sold and ${topProducts[0].margin}% margin.` });
    }

    if (slowMovers.length > 0) {
      insights.push({ type: 'warning', icon: '🐌', title: `${slowMovers.length} Products Not Selling`, message: `${slowMovers.map(p => p.name).join(', ')} — consider promotions or discounts.` });
    }

    if (f.outstandingDebts > 0) {
      insights.push({ type: 'warning', icon: '📋', title: 'Outstanding Debts', message: `Customers owe UGX ${f.outstandingDebts.toLocaleString()}. Follow up on collections.` });
    }

    if (c.topCustomers.length > 0) {
      insights.push({ type: 'info', icon: '👑', title: 'Top Customer', message: `${c.topCustomers[0].name} has spent UGX ${(c.topCustomers[0].totalSpent||0).toLocaleString()}. Show some appreciation!` });
    }

    const recommendations = [];
    if (slowMovers.length > 0) recommendations.push(`Discount ${slowMovers[0].name} to move old stock`);
    if (inv.lowStockCount > 0) recommendations.push(`Restock ${inv.lowStockItems[0]?.split(' (')[0]} before it runs out`);
    if (f.outstandingDebts > 100000) recommendations.push(`Collect UGX ${f.outstandingDebts.toLocaleString()} in outstanding debts`);
    if (f.netProfit < 0) recommendations.push('Cut expenses — your costs are higher than revenue');
    if (f.orderCount === 0) recommendations.push('Make your first sale! The POS is ready to go.');

    res.json({ insights, recommendations, context: ctx, generatedAt: new Date().toISOString() });
  } catch (err) {
    console.error('AI summary error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ai/forecast
router.get('/forecast', authenticate, requireManagerOrAdmin, async (req, res) => {
  try {
    const thirtyAgo = new Date(Date.now() - 30 * 86400000);
    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: thirtyAgo }, orderStatus: { not: 'voided' } },
      select: { total: true, createdAt: true }
    });

    if (orders.length === 0) {
      return res.json({ dailyAverage: 0, projectedMonthTotal: 0, projectedRemaining: 0, remainingDays: 30, confidence: 'none', note: 'No sales data yet' });
    }

    const byDay = {};
    orders.forEach(o => {
      const k = o.createdAt.toISOString().split('T')[0];
      if (!byDay[k]) byDay[k] = 0;
      byDay[k] += o.total;
    });

    const dailySales = Object.values(byDay);
    const avg = dailySales.reduce((s, v) => s + v, 0) / dailySales.length;
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const remainingDays = daysInMonth - now.getDate();

    res.json({
      dailyAverage: Math.round(avg),
      projectedMonthTotal: Math.round(avg * daysInMonth),
      projectedRemaining: Math.round(avg * remainingDays),
      remainingDays,
      confidence: dailySales.length >= 14 ? 'medium' : 'low',
      note: dailySales.length < 7 ? 'Need more data for accuracy' : `Based on ${dailySales.length} days of sales`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;