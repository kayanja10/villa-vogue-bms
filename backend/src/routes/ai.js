const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireManagerOrAdmin } = require('../middleware/auth');
const prisma = new PrismaClient();

// ─── BUILD FULL BUSINESS CONTEXT ────────────────────────────────────────────
async function buildContext() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const sevenAgo = new Date(now.getTime() - 7 * 86400000);
  const fourteenAgo = new Date(now.getTime() - 14 * 86400000);
  const thirtyAgo = new Date(now.getTime() - 30 * 86400000);
  const sixtyAgo = new Date(now.getTime() - 60 * 86400000);

  const [
    allProducts,
    monthOrders,
    lastMonthOrders,
    last7Orders,
    last14Orders,
    monthExpenses,
    lastMonthExpenses,
    allCustomers,
    debts,
    payments,
    stockMovements7,
    stockMovements14,
  ] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      include: {
        category: { select: { name: true } },
        stockMovements: {
          where: { createdAt: { gte: thirtyAgo } },
          select: { type: true, quantity: true, reason: true, createdAt: true },
        },
      },
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: monthStart }, orderStatus: { not: 'voided' } },
      select: { total: true, paymentMethod: true, orderStatus: true, items: true },
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, orderStatus: { not: 'voided' } },
      select: { total: true, paymentMethod: true },
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: sevenAgo }, orderStatus: { not: 'voided' } },
      select: { total: true, createdAt: true, paymentMethod: true },
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: fourteenAgo, lte: sevenAgo }, orderStatus: { not: 'voided' } },
      select: { total: true, createdAt: true },
    }),
    prisma.expense.findMany({
      where: { createdAt: { gte: monthStart } },
      select: { amount: true, category: true, description: true },
    }),
    prisma.expense.findMany({
      where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd } },
      select: { amount: true },
    }),
    prisma.customer.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true, phone: true, totalSpent: true, visitCount: true, tier: true, lastVisit: true, createdAt: true },
    }),
    prisma.customerDebt.findMany({
      where: { status: 'outstanding' },
      include: { customer: { select: { name: true, phone: true } } },
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: thirtyAgo } },
      select: { paymentMethod: true, orderStatus: true, total: true },
    }),
    prisma.stockMovement.findMany({
      where: { type: 'out', reason: 'Sale', createdAt: { gte: sevenAgo } },
      select: { productId: true, quantity: true, createdAt: true },
    }),
    prisma.stockMovement.findMany({
      where: { type: 'out', reason: 'Sale', createdAt: { gte: fourteenAgo, lte: sevenAgo } },
      select: { productId: true, quantity: true },
    }),
  ]);

  // ── FINANCIALS ──
  const totalSales = monthOrders.reduce((s, o) => s + o.total, 0);
  const lastMonthSales = lastMonthOrders.reduce((s, o) => s + o.total, 0);
  const totalExpenses = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const lastMonthExpenses2 = lastMonthExpenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = totalSales - totalExpenses;
  const last7Sales = last7Orders.reduce((s, o) => s + o.total, 0);
  const prev7Sales = last14Orders.reduce((s, o) => s + o.total, 0);
  const salesChangePercent = prev7Sales > 0 ? (((last7Sales - prev7Sales) / prev7Sales) * 100).toFixed(1) : null;
  const salesVsLastMonth = lastMonthSales > 0 ? (((totalSales - lastMonthSales) / lastMonthSales) * 100).toFixed(1) : null;

  const expenseByCategory = {};
  monthExpenses.forEach(e => { expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount; });

  // ── INVENTORY & DEMAND FORECASTING ──
  const productInsights = allProducts.map(p => {
    const sold7 = stockMovements7.filter(m => m.productId === p.id).reduce((s, m) => s + m.quantity, 0);
    const sold14prev = stockMovements14.filter(m => m.productId === p.id).reduce((s, m) => s + m.quantity, 0);
    const sold30 = p.stockMovements.filter(m => m.type === 'out' && m.reason === 'Sale').reduce((s, m) => s + m.quantity, 0);
    const dailyRate7 = sold7 / 7;
    const dailyRate30 = sold30 / 30;
    const avgDailyRate = (dailyRate7 * 0.6 + dailyRate30 * 0.4); // weight recent sales more
    const daysUntilStockout = avgDailyRate > 0 ? Math.floor(p.stock / avgDailyRate) : null;
    const predicted7Days = Math.round(avgDailyRate * 7);
    const trendVsPrev = sold14prev > 0 ? (((sold7 - sold14prev) / sold14prev) * 100).toFixed(0) : null;
    const reorderQty = Math.max(0, Math.round((avgDailyRate * 30) - p.stock + p.lowStockThreshold));
    const margin = p.costPrice > 0 ? (((p.price - p.costPrice) / p.price) * 100).toFixed(1) : 0;

    return {
      id: p.id,
      name: p.name,
      category: p.category?.name || 'Uncategorized',
      sku: p.sku,
      stock: p.stock,
      reorderThreshold: p.lowStockThreshold,
      price: p.price,
      costPrice: p.costPrice,
      margin: parseFloat(margin),
      sold7,
      sold30,
      predicted7Days,
      dailyRate: parseFloat(avgDailyRate.toFixed(2)),
      daysUntilStockout,
      reorderQty,
      trendVsPrev: trendVsPrev ? parseFloat(trendVsPrev) : null,
      confidence: sold30 >= 10 ? 'high' : sold30 >= 3 ? 'medium' : 'low',
      isOutOfStock: p.stock === 0,
      isLowStock: p.stock > 0 && p.stock <= p.lowStockThreshold,
      isDead: sold30 === 0 && p.stock > 0,
    };
  });

  // ── CUSTOMER INTELLIGENCE ──
  const inactiveThreshold = new Date(now.getTime() - 30 * 86400000);
  const highValueThreshold = allCustomers.length > 0
    ? allCustomers.reduce((s, c) => s + (c.totalSpent || 0), 0) / allCustomers.length * 1.5
    : 500000;

  const customerInsights = allCustomers.map(c => ({
    ...c,
    isInactive: c.lastVisit ? new Date(c.lastVisit) < inactiveThreshold : true,
    isHighValue: (c.totalSpent || 0) >= highValueThreshold,
    daysSinceVisit: c.lastVisit ? Math.floor((now - new Date(c.lastVisit)) / 86400000) : null,
  }));

  const highValueCustomers = customerInsights.filter(c => c.isHighValue).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5);
  const inactiveCustomers = customerInsights.filter(c => c.isInactive && !c.isHighValue).slice(0, 10);
  const atRiskHighValue = customerInsights.filter(c => c.isInactive && c.isHighValue);

  // ── PAYMENT INSIGHTS ──
  const paymentStats = {};
  payments.forEach(p => {
    const method = p.paymentMethod || 'unknown';
    if (!paymentStats[method]) paymentStats[method] = { count: 0, total: 0, voided: 0 };
    paymentStats[method].count++;
    paymentStats[method].total += p.total;
    if (p.orderStatus === 'voided') paymentStats[method].voided++;
  });

  // ── OUTSTANDING DEBTS ──
  const outstandingDebts = debts.map(d => ({
    customer: d.customer?.name,
    phone: d.customer?.phone,
    outstanding: Math.max(0, d.amount - d.paidAmount),
  })).filter(d => d.outstanding > 0);
  const totalOutstanding = outstandingDebts.reduce((s, d) => s + d.outstanding, 0);

  // ── CATEGORY PERFORMANCE ──
  // items is stored as a JSON string in the DB — parse it before use
  const categoryPerf = {};
  monthOrders.forEach(o => {
    let parsedItems = [];
    try { parsedItems = JSON.parse(o.items || '[]'); } catch { parsedItems = []; }
    parsedItems.forEach(item => {
      const cat = item.category || item.categoryName || 'Unknown';
      if (!categoryPerf[cat]) categoryPerf[cat] = { revenue: 0, units: 0 };
      categoryPerf[cat].revenue += (item.price || 0) * (item.quantity || 1);
      categoryPerf[cat].units += item.quantity || 1;
    });
  });

  return {
    generatedAt: now.toISOString(),
    dayOfWeek: now.toLocaleDateString('en-UG', { weekday: 'long' }),
    financials: {
      totalSales, lastMonthSales, totalExpenses, lastMonthExpenses: lastMonthExpenses2,
      netProfit, orderCount: monthOrders.length, lastMonthOrderCount: lastMonthOrders.length,
      profitMargin: totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : '0',
      salesVsLastMonth, last7Sales, prev7Sales, salesChangePercent,
      expenseByCategory, totalOutstanding,
    },
    products: productInsights,
    inventory: {
      total: productInsights.length,
      outOfStock: productInsights.filter(p => p.isOutOfStock),
      lowStock: productInsights.filter(p => p.isLowStock),
      deadStock: productInsights.filter(p => p.isDead),
      topSellers: [...productInsights].sort((a, b) => b.sold30 - a.sold30).slice(0, 5),
      urgentRestock: productInsights.filter(p => p.daysUntilStockout !== null && p.daysUntilStockout <= 3 && !p.isOutOfStock),
    },
    customers: {
      total: allCustomers.length,
      highValue: highValueCustomers,
      inactive: inactiveCustomers,
      atRiskHighValue,
    },
    payments: paymentStats,
    debts: { total: totalOutstanding, items: outstandingDebts.slice(0, 10) },
    categoryPerformance: categoryPerf,
  };
}

// ─── SYSTEM PROMPT FOR CLAUDE ────────────────────────────────────────────────
function buildSystemPrompt(ctx) {
  return `You are an AI Business Intelligence Assistant embedded within Villa Vogue Fashions BMS — a fashion retail store in Kampala, Uganda. 

Your role is to analyze real-time business data and generate precise, actionable, quantified recommendations.

RULES:
- Never give generic advice. Every output must be specific and tied to the actual data.
- Always use UGX for currency amounts.
- Adapt to Ugandan retail context (MTN/Airtel mobile money, customer behavior, stock limitations).
- Be concise, bullet-pointed, and practical. Max 300 words per response.
- Prioritize high-impact insights first.
- Quantify everything possible (%, UGX amounts, units, days).

CURRENT LIVE BUSINESS DATA:
${JSON.stringify(ctx, null, 2)}

Today is ${ctx.dayOfWeek}. Use this context to give timely advice (e.g. weekend promotions, month-end stock checks).`;
}

// ─── GENERATE STRUCTURED BI REPORT ──────────────────────────────────────────
function generateBIReport(ctx) {
  const { financials: f, inventory: inv, customers: c, payments, debts, categoryPerformance } = ctx;
  const now = new Date();

  // FORECAST
  const forecast = inv.topSellers.map(p => ({
    product: p.name,
    predicted7Days: p.predicted7Days,
    confidence: p.confidence,
    dailyRate: p.dailyRate,
    trend: p.trendVsPrev !== null ? `${p.trendVsPrev > 0 ? '+' : ''}${p.trendVsPrev}% vs prev week` : 'insufficient data',
    explanation: `Based on ${p.sold30} units sold in last 30 days (${p.dailyRate}/day avg). ${p.trendVsPrev !== null ? `Sales are ${p.trendVsPrev > 0 ? 'up' : 'down'} ${Math.abs(p.trendVsPrev)}% vs previous week.` : ''}`,
  }));

  // INVENTORY RECOMMENDATIONS
  const inventory_recommendations = [];
  inv.outOfStock.forEach(p => {
    inventory_recommendations.push({
      product: p.name, sku: p.sku, status: 'OUT_OF_STOCK',
      priority: 'URGENT', reorderQty: Math.max(20, p.reorderQty),
      message: `${p.name} is completely out of stock. Reorder at least ${Math.max(20, p.reorderQty)} units immediately.`,
      explanation: `Product has 0 units. Any customer demand is being lost right now.`,
    });
  });
  inv.urgentRestock.forEach(p => {
    inventory_recommendations.push({
      product: p.name, sku: p.sku, status: 'CRITICAL_LOW',
      priority: 'URGENT', stock: p.stock, daysLeft: p.daysUntilStockout,
      reorderQty: p.reorderQty,
      message: `${p.name} will stock out in ~${p.daysUntilStockout} days (${p.stock} units left). Reorder ${p.reorderQty} units now.`,
      explanation: `Selling at ${p.dailyRate} units/day. At this rate, stock runs out in ${p.daysUntilStockout} days.`,
    });
  });
  inv.lowStock.filter(p => !inv.urgentRestock.find(u => u.id === p.id)).forEach(p => {
    inventory_recommendations.push({
      product: p.name, sku: p.sku, status: 'LOW_STOCK',
      priority: 'MEDIUM', stock: p.stock, daysLeft: p.daysUntilStockout,
      reorderQty: p.reorderQty,
      message: `${p.name} is low (${p.stock} units). ${p.daysUntilStockout ? `Estimated ${p.daysUntilStockout} days left.` : ''} Reorder ${p.reorderQty} units.`,
      explanation: `Stock is at or below reorder threshold of ${p.reorderThreshold} units.`,
    });
  });
  inv.deadStock.slice(0, 5).forEach(p => {
    inventory_recommendations.push({
      product: p.name, sku: p.sku, status: 'DEAD_STOCK',
      priority: 'LOW', stock: p.stock,
      message: `${p.name} has ${p.stock} units with zero sales in 30 days. Consider 15-25% discount or bundle promotion.`,
      explanation: `No stock movements recorded in last 30 days. Capital is tied up in unsold inventory worth UGX ${(p.stock * p.costPrice).toLocaleString()}.`,
    });
  });

  // SALES INSIGHTS
  const sales_insights = [];
  if (f.salesChangePercent !== null) {
    const pct = parseFloat(f.salesChangePercent);
    sales_insights.push({
      metric: 'Weekly Sales Trend',
      value: `UGX ${f.last7Sales.toLocaleString()} this week vs UGX ${f.prev7Sales.toLocaleString()} last week`,
      change: `${pct > 0 ? '+' : ''}${pct}%`,
      confidence: 'high',
      message: pct >= 0 ? `Sales are up ${pct}% this week. Keep momentum with weekend promotions.` : `Sales dropped ${Math.abs(pct)}% this week. Consider a flash sale or WhatsApp promotion to boost traffic.`,
      explanation: 'Comparison of last 7 days vs previous 7 days of completed orders.',
    });
  }
  if (f.salesVsLastMonth !== null) {
    const pct = parseFloat(f.salesVsLastMonth);
    sales_insights.push({
      metric: 'Month vs Last Month',
      value: `UGX ${f.totalSales.toLocaleString()} this month vs UGX ${f.lastMonthSales.toLocaleString()} last month`,
      change: `${pct > 0 ? '+' : ''}${pct}%`,
      confidence: 'high',
      message: `This month's sales are ${pct > 0 ? 'up' : 'down'} ${Math.abs(pct)}% compared to last month.`,
      explanation: 'Month-to-date comparison with full previous month.',
    });
  }
  const topCats = Object.entries(categoryPerformance).sort((a, b) => b[1].revenue - a[1].revenue);
  if (topCats.length > 0) {
    sales_insights.push({
      metric: 'Top Category',
      value: topCats[0][0],
      revenue: `UGX ${topCats[0][1].revenue.toLocaleString()}`,
      units: topCats[0][1].units,
      message: `${topCats[0][0]} is your best performing category this month with UGX ${topCats[0][1].revenue.toLocaleString()} in revenue (${topCats[0][1].units} units).`,
      explanation: 'Aggregated from all order line items this month by product category.',
    });
  }
  inv.topSellers.filter(p => p.sold30 > 0).slice(0, 3).forEach((p, i) => {
    sales_insights.push({
      metric: `Top Product #${i + 1}`,
      value: p.name,
      unitsSold: p.sold30,
      margin: `${p.margin}%`,
      message: `${p.name}: ${p.sold30} units sold this month at ${p.margin}% margin. ${p.margin < 30 ? 'Consider reviewing pricing — margin is below 30%.' : 'Strong performer.'}`,
      explanation: 'Based on stock movement records tagged as sales in the last 30 days.',
    });
  });
  inv.deadStock.slice(0, 3).forEach(p => {
    sales_insights.push({
      metric: 'Underperforming Product',
      value: p.name,
      stock: p.stock,
      capitalTied: `UGX ${(p.stock * p.costPrice).toLocaleString()}`,
      message: `${p.name} has not sold in 30 days. UGX ${(p.stock * p.costPrice).toLocaleString()} is tied up in this stock.`,
      explanation: 'No outbound stock movements in last 30 days.',
    });
  });

  // CUSTOMER INSIGHTS
  const customer_insights = [];
  c.highValue.forEach(cu => {
    customer_insights.push({
      type: 'HIGH_VALUE',
      customer: cu.name,
      totalSpent: `UGX ${(cu.totalSpent || 0).toLocaleString()}`,
      visits: cu.visitCount,
      tier: cu.tier,
      daysSinceVisit: cu.daysSinceVisit,
      action: cu.daysSinceVisit > 14 ? `Call ${cu.name} — hasn't visited in ${cu.daysSinceVisit} days. Offer VIP preview or personal discount.` : `${cu.name} is active. Maintain relationship with loyalty reward.`,
      explanation: `Customer has spent UGX ${(cu.totalSpent || 0).toLocaleString()} total across ${cu.visitCount} visits.`,
    });
  });
  c.atRiskHighValue.forEach(cu => {
    customer_insights.push({
      type: 'AT_RISK_HIGH_VALUE',
      customer: cu.name,
      totalSpent: `UGX ${(cu.totalSpent || 0).toLocaleString()}`,
      daysSinceVisit: cu.daysSinceVisit,
      action: `URGENT: ${cu.name} is a high-value customer who hasn't visited in ${cu.daysSinceVisit} days. Send personal WhatsApp message with exclusive offer.`,
      explanation: `High-value customer showing churn signals. Risk of permanent loss if not re-engaged.`,
    });
  });
  if (c.inactive.length > 0) {
    customer_insights.push({
      type: 'INACTIVE_SEGMENT',
      count: c.inactive.length,
      action: `${c.inactive.length} customers haven't purchased in 30+ days. Run a WhatsApp re-engagement campaign with a 10% discount code.`,
      customers: c.inactive.slice(0, 5).map(cu => cu.name),
      explanation: 'Customers with no recorded visit in the last 30 days.',
    });
  }

  // PAYMENT INSIGHTS
  const payment_insights = Object.entries(payments).map(([method, stats]) => {
    const failRate = stats.count > 0 ? ((stats.voided / stats.count) * 100).toFixed(1) : 0;
    return {
      method,
      transactions: stats.count,
      totalRevenue: `UGX ${stats.total.toLocaleString()}`,
      failRate: `${failRate}%`,
      message: failRate > 10
        ? `${method} has a ${failRate}% failure/void rate. Investigate payment issues.`
        : `${method} performing well — ${stats.count} transactions, ${failRate}% void rate.`,
      explanation: `Based on ${stats.count} ${method} transactions in the last 30 days.`,
    };
  });

  // ALERTS
  const alerts = [];
  inv.outOfStock.forEach(p => alerts.push({ level: 'CRITICAL', icon: '🚨', message: `${p.name} is OUT OF STOCK — losing sales now!`, product: p.name }));
  inv.urgentRestock.forEach(p => alerts.push({ level: 'URGENT', icon: '⚠️', message: `${p.name} stocks out in ~${p.daysUntilStockout} days (${p.stock} units left)`, product: p.name }));
  if (f.salesChangePercent !== null && parseFloat(f.salesChangePercent) <= -15) {
    alerts.push({ level: 'WARNING', icon: '📉', message: `Sales dropped ${Math.abs(f.salesChangePercent)}% compared to last week. Action needed.` });
  }
  if (f.netProfit < 0) {
    alerts.push({ level: 'CRITICAL', icon: '💸', message: `Running at a loss! Expenses exceed sales by UGX ${Math.abs(f.netProfit).toLocaleString()} this month.` });
  }
  if (debts.total > 500000) {
    alerts.push({ level: 'WARNING', icon: '📋', message: `UGX ${debts.total.toLocaleString()} outstanding from customers. Follow up on collections.` });
  }
  c.atRiskHighValue.forEach(cu => {
    alerts.push({ level: 'WARNING', icon: '👑', message: `High-value customer ${cu.name} hasn't visited in ${cu.daysSinceVisit} days — churn risk!` });
  });
  if (inv.deadStock.length > 3) {
    const capital = inv.deadStock.reduce((s, p) => s + p.stock * p.costPrice, 0);
    alerts.push({ level: 'INFO', icon: '🐌', message: `${inv.deadStock.length} products with no sales in 30 days. UGX ${capital.toLocaleString()} tied up in dead stock.` });
  }

  return { forecast, inventory_recommendations, sales_insights, customer_insights, payment_insights, alerts };
}

// ─── POST /api/ai/insights ───────────────────────────────────────────────────
router.post('/insights', authenticate, requireManagerOrAdmin, async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: 'Question required' });

    const ctx = await buildContext();
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (apiKey && apiKey !== 'your_anthropic_api_key_here') {
      try {
        const axios = require('axios');
        const response = await axios.post('https://api.anthropic.com/v1/messages', {
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: buildSystemPrompt(ctx),
          messages: [{ role: 'user', content: question }],
        }, {
          headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
          timeout: 20000,
        });

        const answer = response.data?.content?.[0]?.text;
        if (answer) return res.json({ answer, source: 'ai', context: ctx });
      } catch (aiErr) {
        console.error('AI API error:', aiErr.message);
      }
    }

    // Fallback rule-based
    const report = generateBIReport(ctx);
    const q = question.toLowerCase();
    let answer = '';

    if (q.includes('stock') || q.includes('inventory') || q.includes('restock')) {
      const urgent = report.inventory_recommendations.filter(r => r.priority === 'URGENT');
      const medium = report.inventory_recommendations.filter(r => r.priority === 'MEDIUM');
      answer = `📦 **Inventory Report:**\n\n`;
      if (urgent.length) answer += `🚨 URGENT (${urgent.length}):\n` + urgent.map(r => `• ${r.message}`).join('\n') + '\n\n';
      if (medium.length) answer += `⚠️ MEDIUM (${medium.length}):\n` + medium.map(r => `• ${r.message}`).join('\n') + '\n\n';
      const dead = report.inventory_recommendations.filter(r => r.status === 'DEAD_STOCK');
      if (dead.length) answer += `🐌 DEAD STOCK:\n` + dead.map(r => `• ${r.message}`).join('\n');
    } else if (q.includes('sale') || q.includes('revenue') || q.includes('profit') || q.includes('financial')) {
      answer = `💰 **Sales & Financial Summary:**\n\n`;
      report.sales_insights.forEach(s => { answer += `• ${s.message}\n`; });
      answer += `\n💵 Net Profit: UGX ${ctx.financials.netProfit.toLocaleString()} (${ctx.financials.profitMargin}% margin)`;
    } else if (q.includes('customer') || q.includes('client')) {
      answer = `👥 **Customer Intelligence:**\n\n`;
      report.customer_insights.forEach(c => { answer += `• ${c.action}\n`; });
    } else if (q.includes('forecast') || q.includes('predict') || q.includes('next week')) {
      answer = `📈 **7-Day Demand Forecast:**\n\n`;
      report.forecast.forEach(f => { answer += `• ${f.product}: ~${f.predicted7Days} units predicted (${f.confidence} confidence) — ${f.trend}\n`; });
    } else if (q.includes('alert') || q.includes('urgent') || q.includes('problem')) {
      answer = `🚨 **Active Alerts:**\n\n`;
      report.alerts.forEach(a => { answer += `${a.icon} [${a.level}] ${a.message}\n`; });
    } else {
      // Full overview
      answer = `📊 **Villa Vogue Business Intelligence Overview:**\n\n`;
      answer += `💰 Sales: UGX ${ctx.financials.totalSales.toLocaleString()} | Profit: UGX ${ctx.financials.netProfit.toLocaleString()} (${ctx.financials.profitMargin}%)\n`;
      if (ctx.financials.salesChangePercent) answer += `📈 Weekly trend: ${ctx.financials.salesChangePercent}% vs last week\n`;
      answer += `📦 Stock: ${ctx.inventory.outOfStock.length} out of stock, ${ctx.inventory.lowStock.length} low, ${ctx.inventory.deadStock.length} dead\n`;
      answer += `👥 Customers: ${ctx.customers.total} active, ${ctx.customers.atRiskHighValue.length} high-value at risk\n\n`;
      if (report.alerts.length) {
        answer += `🚨 Top Alerts:\n`;
        report.alerts.slice(0, 3).forEach(a => { answer += `${a.icon} ${a.message}\n`; });
      }
      answer += `\n💡 Ask: "What should I restock?", "Show forecast", "Who are my best customers?", "Show alerts"`;
    }

    res.json({ answer, source: 'rules', context: ctx });
  } catch (err) {
    console.error('AI insights error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/ai/summary ─────────────────────────────────────────────────────
router.get('/summary', authenticate, requireManagerOrAdmin, async (req, res) => {
  try {
    const ctx = await buildContext();
    const report = generateBIReport(ctx);
    const { financials: f } = ctx;

    const insights = [];

    // Profit status
    if (f.netProfit > 0) {
      insights.push({ type: 'positive', icon: '💰', title: 'Profitable Month', message: `UGX ${f.netProfit.toLocaleString()} profit — ${f.profitMargin}% margin.${f.salesVsLastMonth ? ` Sales ${parseFloat(f.salesVsLastMonth) > 0 ? 'up' : 'down'} ${Math.abs(f.salesVsLastMonth)}% vs last month.` : ''}` });
    } else if (f.totalSales > 0) {
      insights.push({ type: 'danger', icon: '💸', title: 'Running at a Loss', message: `Expenses exceed sales by UGX ${Math.abs(f.netProfit).toLocaleString()}. Review costs urgently.` });
    } else {
      insights.push({ type: 'info', icon: '📊', title: 'No Sales Yet', message: 'No sales recorded this month.' });
    }

    // Weekly trend
    if (f.salesChangePercent !== null) {
      const pct = parseFloat(f.salesChangePercent);
      insights.push({ type: pct >= 0 ? 'positive' : 'warning', icon: pct >= 0 ? '📈' : '📉', title: `Weekly Sales ${pct >= 0 ? 'Up' : 'Down'} ${Math.abs(pct)}%`, message: `UGX ${f.last7Sales.toLocaleString()} this week vs UGX ${f.prev7Sales.toLocaleString()} last week.` });
    }

    // Stock alerts
    report.alerts.filter(a => a.level === 'CRITICAL' || a.level === 'URGENT').slice(0, 3).forEach(a => {
      insights.push({ type: 'danger', icon: a.icon, title: a.level, message: a.message });
    });

    // Top seller
    const top = ctx.inventory.topSellers.find(p => p.sold30 > 0);
    if (top) insights.push({ type: 'positive', icon: '⭐', title: 'Best Seller', message: `${top.name}: ${top.sold30} units sold, ${top.margin}% margin.` });

    // Dead stock
    if (ctx.inventory.deadStock.length > 0) {
      const capital = ctx.inventory.deadStock.reduce((s, p) => s + p.stock * p.costPrice, 0);
      insights.push({ type: 'warning', icon: '🐌', title: `${ctx.inventory.deadStock.length} Products Not Selling`, message: `UGX ${capital.toLocaleString()} tied up. Consider promotions.` });
    }

    // At-risk customers
    if (ctx.customers.atRiskHighValue.length > 0) {
      insights.push({ type: 'warning', icon: '👑', title: 'High-Value Customers at Risk', message: `${ctx.customers.atRiskHighValue.map(c => c.name).join(', ')} haven't visited recently.` });
    }

    // Debts
    if (f.totalOutstanding > 0) {
      insights.push({ type: 'warning', icon: '📋', title: 'Outstanding Debts', message: `UGX ${f.totalOutstanding.toLocaleString()} owed by customers.` });
    }

    const recommendations = report.inventory_recommendations.filter(r => r.priority === 'URGENT').map(r => r.message).slice(0, 3);
    if (f.netProfit < 0) recommendations.push('Cut expenses — costs exceed revenue this month');
    if (ctx.customers.atRiskHighValue.length > 0) recommendations.push(`Re-engage ${ctx.customers.atRiskHighValue[0]?.name} — high-value customer at churn risk`);

    res.json({ insights, recommendations, alerts: report.alerts, report, context: ctx, generatedAt: new Date().toISOString() });
  } catch (err) {
    console.error('AI summary error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/ai/forecast ────────────────────────────────────────────────────
router.get('/forecast', authenticate, requireManagerOrAdmin, async (req, res) => {
  try {
    const ctx = await buildContext();
    const report = generateBIReport(ctx);
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const remainingDays = daysInMonth - now.getDate();
    const dailyAvg = ctx.financials.totalSales > 0 ? ctx.financials.totalSales / now.getDate() : 0;

    res.json({
      dailyAverage: Math.round(dailyAvg),
      projectedMonthTotal: Math.round(dailyAvg * daysInMonth),
      projectedRemaining: Math.round(dailyAvg * remainingDays),
      remainingDays,
      weeklyTrend: ctx.financials.salesChangePercent ? `${ctx.financials.salesChangePercent}%` : null,
      confidence: ctx.financials.orderCount >= 20 ? 'high' : ctx.financials.orderCount >= 5 ? 'medium' : 'low',
      productForecasts: report.forecast,
      inventoryRecommendations: report.inventory_recommendations,
      alerts: report.alerts,
      note: `Based on ${ctx.financials.orderCount} orders this month.`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/ai/report ──────────────────────────────────────────────────────
router.get('/report', authenticate, requireManagerOrAdmin, async (req, res) => {
  try {
    const ctx = await buildContext();
    const report = generateBIReport(ctx);
    res.json({ ...report, context: ctx, generatedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
