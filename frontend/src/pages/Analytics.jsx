import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Clock, Users, Package, AlertTriangle,
  CheckCircle, XCircle, Zap, Target, ShoppingBag, DollarSign,
  RefreshCw, ChevronRight, ArrowUp, ArrowDown,
} from 'lucide-react';
import { analytics, ai } from '../lib/api';

const fmt = n => n >= 1000000 ? (n / 1000000).toFixed(1) + 'M' : n >= 1000 ? (n / 1000).toFixed(0) + 'K' : Math.round(n || 0).toString();
const fmtFull = n => Math.round(n || 0).toLocaleString();
const GOLD = '#C9A96E';
const GOLD_DARK = '#A8824A';
const COLORS = ['#C9A96E', '#A8824A', '#8B6D3F', '#D4B483', '#E8D5B0', '#6B5230'];

// ── ALERT BADGE ──────────────────────────────────────────────────────────────
function AlertBadge({ level }) {
  const styles = {
    CRITICAL: 'bg-red-100 text-red-700 border-red-200',
    URGENT: 'bg-orange-100 text-orange-700 border-orange-200',
    WARNING: 'bg-amber-100 text-amber-700 border-amber-200',
    INFO: 'bg-blue-100 text-blue-700 border-blue-200',
  };
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${styles[level] || styles.INFO}`}>{level}</span>;
}

// ── METRIC CARD ───────────────────────────────────────────────────────────────
function MetricCard({ icon: Icon, label, value, sub, trend, color = GOLD }) {
  const up = trend > 0;
  return (
    <div className="card p-4 flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}20` }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <p className="font-heading font-bold text-lg leading-none">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5 truncate">{sub}</p>}
      </div>
      {trend !== undefined && trend !== null && (
        <div className={`flex items-center gap-0.5 text-xs font-semibold ${up ? 'text-green-600' : 'text-red-500'}`}>
          {up ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
  );
}

// ── CONFIDENCE PILL ───────────────────────────────────────────────────────────
function Confidence({ level }) {
  const styles = { high: 'bg-green-100 text-green-700', medium: 'bg-amber-100 text-amber-700', low: 'bg-gray-100 text-gray-500' };
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${styles[level] || styles.low}`}>{level}</span>;
}

export default function Analytics() {
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]; });
  const [to, setTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState('overview');

  const { data: hourly } = useQuery({ queryKey: ['hourly', from, to], queryFn: () => analytics.hourly({ from, to }).then(r => r.data) });
  const { data: catPerf } = useQuery({ queryKey: ['cat-perf'], queryFn: () => analytics.categoryPerformance().then(r => r.data) });
  const { data: staffPerf } = useQuery({ queryKey: ['staff-perf', from, to], queryFn: () => analytics.staffPerformance({ from, to }).then(r => r.data) });
  const { data: prodPerf } = useQuery({ queryKey: ['prod-perf'], queryFn: () => analytics.productPerformance().then(r => r.data) });
  const { data: incomeExp } = useQuery({ queryKey: ['income-exp'], queryFn: () => analytics.incomeExpense({ months: 6 }).then(r => r.data) });
  const { data: biReport, isLoading: biLoading, refetch: refetchBI } = useQuery({
    queryKey: ['ai-report'], queryFn: () => ai.summary().then(r => r.data), staleTime: 5 * 60 * 1000,
  });
  const { data: forecast, isLoading: forecastLoading } = useQuery({
    queryKey: ['ai-forecast'], queryFn: () => ai.forecast().then(r => r.data), staleTime: 5 * 60 * 1000,
  });

  const maxSales = Math.max(...(hourly || []).map(h => h.sales), 1);
  const tabs = ['overview', 'forecast', 'inventory', 'customers', 'hourly'];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp size={22} className="text-[#C9A96E]" />
            <h1 className="page-title">Business Intelligence</h1>
          </div>
          <p className="page-subtitle">AI-powered insights for Villa Vogue</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" className="input py-2 text-sm w-36" value={from} onChange={e => setFrom(e.target.value)} />
          <span className="text-gray-400 text-sm">to</span>
          <input type="date" className="input py-2 text-sm w-36" value={to} onChange={e => setTo(e.target.value)} />
          <button onClick={() => refetchBI()} className="btn-ghost p-2 rounded-lg" title="Refresh AI insights">
            <RefreshCw size={16} className={biLoading ? 'animate-spin text-[#C9A96E]' : 'text-gray-400'} />
          </button>
        </div>
      </div>

      {/* Alerts Bar */}
      {biReport?.alerts?.length > 0 && (
        <div className="space-y-2">
          {biReport.alerts.filter(a => a.level === 'CRITICAL' || a.level === 'URGENT').slice(0, 3).map((alert, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium
              ${alert.level === 'CRITICAL' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-orange-50 border-orange-200 text-orange-800'}`}>
              <span className="text-lg">{alert.icon}</span>
              <span className="flex-1">{alert.message}</span>
              <AlertBadge level={alert.level} />
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all
              ${activeTab === tab ? 'bg-white dark:bg-gray-700 text-[#A8824A] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* KPI Cards from AI report */}
          {biReport?.context && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <MetricCard icon={DollarSign} label="Monthly Sales" value={`UGX ${fmt(biReport.context.financials.totalSales)}`}
                sub={`${biReport.context.financials.orderCount} orders`}
                trend={biReport.context.financials.salesVsLastMonth ? parseFloat(biReport.context.financials.salesVsLastMonth) : null} />
              <MetricCard icon={TrendingUp} label="Net Profit" value={`UGX ${fmt(biReport.context.financials.netProfit)}`}
                sub={`${biReport.context.financials.profitMargin}% margin`}
                color={biReport.context.financials.netProfit >= 0 ? '#16a34a' : '#dc2626'} />
              <MetricCard icon={Package} label="Stock Alerts"
                value={`${biReport.context.inventory.outOfStock.length + biReport.context.inventory.lowStock.length}`}
                sub={`${biReport.context.inventory.outOfStock.length} out, ${biReport.context.inventory.lowStock.length} low`}
                color={biReport.context.inventory.outOfStock.length > 0 ? '#dc2626' : GOLD} />
              <MetricCard icon={Users} label="Customers" value={biReport.context.customers.total}
                sub={`${biReport.context.customers.atRiskHighValue.length} high-value at risk`} />
            </div>
          )}

          {/* AI Insights Cards */}
          {biReport?.insights?.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Zap size={18} className="text-[#C9A96E]" />
                <h3 className="font-heading font-semibold">AI Business Insights</h3>
                <span className="ml-auto text-xs text-gray-400">Updated {new Date(biReport.generatedAt).toLocaleTimeString()}</span>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                {biReport.insights.map((insight, i) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border
                    ${insight.type === 'positive' ? 'bg-green-50 border-green-200' :
                      insight.type === 'danger' ? 'bg-red-50 border-red-200' :
                      insight.type === 'warning' ? 'bg-amber-50 border-amber-200' :
                      'bg-blue-50 border-blue-200'}`}>
                    <span className="text-2xl">{insight.icon}</span>
                    <div>
                      <p className="font-semibold text-sm">{insight.title}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{insight.message}</p>
                    </div>
                  </div>
                ))}
              </div>
              {biReport.recommendations?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 mb-2">TOP RECOMMENDATIONS</p>
                  <div className="space-y-1.5">
                    {biReport.recommendations.map((rec, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <ChevronRight size={14} className="text-[#C9A96E] shrink-0" />
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Income vs Expense chart */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={18} className="text-[#C9A96E]" />
              <h3 className="font-heading font-semibold">Income vs Expenses (6 Months)</h3>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={incomeExp || []}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={GOLD} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={GOLD} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={fmt} />
                <Tooltip formatter={v => [`UGX ${fmtFull(v)}`]} />
                <Legend />
                <Area type="monotone" dataKey="income" stroke={GOLD} fill="url(#incomeGrad)" strokeWidth={2} name="Income" />
                <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="url(#expGrad)" strokeWidth={2} name="Expenses" />
                <Line type="monotone" dataKey="profit" stroke="#16a34a" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Profit" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Category + Staff */}
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4"><Package size={18} className="text-[#C9A96E]" /><h3 className="font-heading font-semibold">Category Performance</h3></div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={(catPerf || []).slice(0, 8)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={fmt} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                  <Tooltip formatter={v => [`UGX ${fmtFull(v)}`, 'Revenue']} />
                  <Bar dataKey="revenue" fill={GOLD} radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4"><Users size={18} className="text-[#C9A96E]" /><h3 className="font-heading font-semibold">Staff Performance</h3></div>
              <div className="space-y-3">
                {(staffPerf || []).map((s, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#C9A96E]/20 flex items-center justify-center text-[#A8824A] text-sm font-bold shrink-0">{s.username[0].toUpperCase()}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{s.username}</span>
                        <span className="text-[#A8824A] font-semibold">UGX {fmt(s.totalSales)}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full">
                        <div className="h-full rounded-full bg-gradient-to-r from-[#C9A96E] to-[#A8824A]"
                          style={{ width: `${Math.min(100, (s.totalSales / (staffPerf?.[0]?.totalSales || 1)) * 100)}%` }} />
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{s.totalOrders} orders · avg UGX {fmt(s.avgOrderValue)}</p>
                    </div>
                  </div>
                ))}
                {!staffPerf?.length && <p className="text-gray-400 text-sm text-center py-4">No sales data in this period</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FORECAST TAB ── */}
      {activeTab === 'forecast' && (
        <div className="space-y-5">
          {forecastLoading ? (
            <div className="card p-10 flex items-center justify-center gap-3 text-gray-400">
              <RefreshCw size={18} className="animate-spin" /> Generating AI forecast...
            </div>
          ) : forecast ? (
            <>
              {/* Forecast summary cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <MetricCard icon={Target} label="Daily Average" value={`UGX ${fmt(forecast.dailyAverage)}`} sub="Based on this month" />
                <MetricCard icon={TrendingUp} label="Projected Month" value={`UGX ${fmt(forecast.projectedMonthTotal)}`} sub={`${forecast.remainingDays} days remaining`} />
                <MetricCard icon={DollarSign} label="Remaining Revenue" value={`UGX ${fmt(forecast.projectedRemaining)}`} sub="Projected this month" />
                <MetricCard icon={Zap} label="Forecast Confidence" value={forecast.confidence?.toUpperCase()} sub={forecast.note} color={forecast.confidence === 'high' ? '#16a34a' : forecast.confidence === 'medium' ? GOLD : '#6b7280'} />
              </div>

              {/* Product forecasts */}
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Target size={18} className="text-[#C9A96E]" />
                  <h3 className="font-heading font-semibold">7-Day Product Demand Forecast</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800/50">
                      <tr>
                        {['Product', 'Predicted Units', 'Daily Rate', 'Trend', 'Confidence', 'Explanation'].map(h => (
                          <th key={h} className="table-header">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(forecast.productForecasts || []).map((p, i) => (
                        <tr key={i} className="table-row">
                          <td className="table-cell font-medium text-sm">{p.product}</td>
                          <td className="table-cell">
                            <span className="font-bold text-[#A8824A]">{p.predicted7Days} units</span>
                          </td>
                          <td className="table-cell text-sm">{p.dailyRate}/day</td>
                          <td className="table-cell text-sm">
                            <span className={`font-medium ${p.trend?.includes('+') ? 'text-green-600' : p.trend?.includes('-') ? 'text-red-500' : 'text-gray-400'}`}>
                              {p.trend}
                            </span>
                          </td>
                          <td className="table-cell"><Confidence level={p.confidence} /></td>
                          <td className="table-cell text-xs text-gray-400 max-w-[200px]">{p.explanation}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Weekly trend chart */}
              {forecast.weeklyTrend && (
                <div className="card p-4 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${parseFloat(forecast.weeklyTrend) >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                    {parseFloat(forecast.weeklyTrend) >= 0 ? <TrendingUp size={22} className="text-green-600" /> : <TrendingDown size={22} className="text-red-500" />}
                  </div>
                  <div>
                    <p className="font-semibold">Weekly Sales Trend</p>
                    <p className="text-sm text-gray-500">Sales are <strong>{parseFloat(forecast.weeklyTrend) >= 0 ? 'up' : 'down'} {Math.abs(parseFloat(forecast.weeklyTrend))}%</strong> compared to the previous week</p>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* ── INVENTORY TAB ── */}
      {activeTab === 'inventory' && (
        <div className="space-y-5">
          {biReport?.report?.inventory_recommendations?.length > 0 ? (
            <>
              {/* Priority groups */}
              {['URGENT', 'MEDIUM', 'LOW'].map(priority => {
                const items = biReport.report.inventory_recommendations.filter(r => r.priority === priority);
                if (!items.length) return null;
                return (
                  <div key={priority} className="card p-5">
                    <div className="flex items-center gap-2 mb-4">
                      {priority === 'URGENT' ? <XCircle size={18} className="text-red-500" /> :
                        priority === 'MEDIUM' ? <AlertTriangle size={18} className="text-amber-500" /> :
                          <CheckCircle size={18} className="text-blue-400" />}
                      <h3 className="font-heading font-semibold">{priority} Priority ({items.length})</h3>
                    </div>
                    <div className="space-y-3">
                      {items.map((item, i) => (
                        <div key={i} className={`p-3 rounded-xl border
                          ${priority === 'URGENT' ? 'bg-red-50 border-red-200' :
                            priority === 'MEDIUM' ? 'bg-amber-50 border-amber-200' :
                              'bg-blue-50 border-blue-200'}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-sm">{item.product}</span>
                                <span className="text-[10px] bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full">{item.sku}</span>
                                <AlertBadge level={item.status?.replace('_', ' ')} />
                              </div>
                              <p className="text-sm text-gray-700">{item.message}</p>
                              <p className="text-xs text-gray-400 mt-1 italic">{item.explanation}</p>
                            </div>
                            {item.reorderQty > 0 && (
                              <div className="text-right shrink-0">
                                <p className="text-xs text-gray-400">Reorder</p>
                                <p className="font-bold text-[#A8824A]">{item.reorderQty} units</p>
                              </div>
                            )}
                          </div>
                          {item.daysLeft !== undefined && (
                            <div className="mt-2 flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-white rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${item.daysLeft <= 3 ? 'bg-red-500' : item.daysLeft <= 7 ? 'bg-amber-500' : 'bg-green-500'}`}
                                  style={{ width: `${Math.min(100, (item.daysLeft / 30) * 100)}%` }} />
                              </div>
                              <span className="text-xs font-medium">{item.daysLeft}d left</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <div className="card p-8 text-center text-gray-400">
              <CheckCircle size={32} className="mx-auto mb-2 text-green-400" />
              <p>No inventory issues detected</p>
            </div>
          )}

          {/* Product velocity table */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4"><ShoppingBag size={18} className="text-[#C9A96E]" /><h3 className="font-heading font-semibold">Product Sales Velocity</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>{['Product', 'Category', 'Sold/Day', 'Days of Stock', 'Margin', 'Status'].map(h => <th key={h} className="table-header">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {(prodPerf || []).slice(0, 15).map((p, i) => (
                    <tr key={i} className="table-row">
                      <td className="table-cell font-medium text-sm">{p.name}</td>
                      <td className="table-cell text-xs"><span className="badge-gray">{p.category || '—'}</span></td>
                      <td className="table-cell font-semibold text-sm">{p.velocity}</td>
                      <td className="table-cell">
                        <span className={`badge text-xs ${p.daysOfStock < 7 ? 'badge-red' : p.daysOfStock < 14 ? 'badge-yellow' : 'badge-green'}`}>
                          {p.daysOfStock === 999 ? '∞' : p.daysOfStock + 'd'}
                        </span>
                      </td>
                      <td className="table-cell"><span className="badge-gold">{p.margin}%</span></td>
                      <td className="table-cell">
                        {p.stock === 0 ? <span className="badge-red text-xs">Out of Stock</span>
                          : p.needsRestock ? <span className="badge bg-amber-100 text-amber-700 text-xs">Restock Soon</span>
                            : p.velocity === 0 ? <span className="badge-gray text-xs">Not Moving</span>
                              : <span className="badge-green text-xs">Good</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── CUSTOMERS TAB ── */}
      {activeTab === 'customers' && (
        <div className="space-y-5">
          {biReport?.report?.customer_insights?.length > 0 ? (
            <>
              {/* At-risk high value */}
              {biReport.report.customer_insights.filter(c => c.type === 'AT_RISK_HIGH_VALUE').length > 0 && (
                <div className="card p-5 border-l-4 border-red-400">
                  <div className="flex items-center gap-2 mb-3"><AlertTriangle size={18} className="text-red-500" /><h3 className="font-heading font-semibold text-red-700">High-Value Customers at Risk</h3></div>
                  <div className="space-y-3">
                    {biReport.report.customer_insights.filter(c => c.type === 'AT_RISK_HIGH_VALUE').map((c, i) => (
                      <div key={i} className="bg-red-50 border border-red-200 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold">{c.customer}</span>
                          <span className="text-xs text-red-600">{c.daysSinceVisit} days since last visit</span>
                        </div>
                        <p className="text-sm text-gray-600">{c.action}</p>
                        <p className="text-xs text-gray-400 mt-1">Total spent: {c.totalSpent}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* High value customers */}
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-4"><Users size={18} className="text-[#C9A96E]" /><h3 className="font-heading font-semibold">High-Value Customers</h3></div>
                <div className="space-y-3">
                  {biReport.report.customer_insights.filter(c => c.type === 'HIGH_VALUE').map((c, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800/30 rounded-xl">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C9A96E] to-[#A8824A] flex items-center justify-center text-white font-bold shrink-0">
                        {c.customer?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{c.customer}</span>
                          <span className="text-[10px] bg-[#C9A96E]/20 text-[#A8824A] px-2 py-0.5 rounded-full font-semibold">{c.tier?.toUpperCase()}</span>
                        </div>
                        <p className="text-xs text-gray-400">{c.visits} visits · {c.totalSpent}</p>
                        <p className="text-xs text-gray-600 mt-0.5">{c.action}</p>
                      </div>
                      {c.daysSinceVisit && (
                        <div className="text-right shrink-0">
                          <p className="text-xs text-gray-400">Last visit</p>
                          <p className={`text-sm font-semibold ${c.daysSinceVisit > 14 ? 'text-red-500' : 'text-green-600'}`}>{c.daysSinceVisit}d ago</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Inactive segment */}
              {biReport.report.customer_insights.filter(c => c.type === 'INACTIVE_SEGMENT').map((seg, i) => (
                <div key={i} className="card p-5 border-l-4 border-amber-400">
                  <div className="flex items-center gap-2 mb-2"><AlertTriangle size={18} className="text-amber-500" /><h3 className="font-heading font-semibold">{seg.count} Inactive Customers</h3></div>
                  <p className="text-sm text-gray-600 mb-3">{seg.action}</p>
                  <div className="flex flex-wrap gap-2">
                    {seg.customers?.map((name, j) => (
                      <span key={j} className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full">{name}</span>
                    ))}
                    {seg.count > 5 && <span className="text-xs text-gray-400 px-3 py-1">+{seg.count - 5} more</span>}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="card p-8 text-center text-gray-400">
              <Users size={32} className="mx-auto mb-2" />
              <p>No customer data yet</p>
            </div>
          )}
        </div>
      )}

      {/* ── HOURLY TAB ── */}
      {activeTab === 'hourly' && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-5"><Clock size={18} className="text-[#C9A96E]" /><h3 className="font-heading font-semibold">Hourly Sales Heatmap — When Do You Sell Most?</h3></div>
          <div className="grid grid-cols-12 gap-1 mb-2">
            {(hourly || []).map(h => {
              const intensity = h.sales / maxSales;
              const bg = intensity > 0.7 ? '#A8824A' : intensity > 0.4 ? '#C9A96E' : intensity > 0.1 ? '#E8D5B0' : '#f5f5f5';
              return (
                <div key={h.hour} className="flex flex-col items-center gap-1">
                  <div className="w-full aspect-square rounded-lg flex items-center justify-center text-[10px] font-bold transition-all hover:scale-110 cursor-default"
                    style={{ background: bg, color: intensity > 0.4 ? 'white' : '#999' }}
                    title={`${h.label}: ${h.orders} orders, UGX ${h.sales.toLocaleString()}`}>
                    {h.orders || ''}
                  </div>
                  <span className="text-[9px] text-gray-400">{h.hour}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-[#f5f5f5] border border-gray-200" /><span>No sales</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-[#E8D5B0]" /><span>Low</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-[#C9A96E]" /><span>Medium</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-[#A8824A]" /><span>Peak</span></div>
            <span className="ml-auto">Numbers = order count</span>
          </div>
          <ResponsiveContainer width="100%" height={140} className="mt-4">
            <BarChart data={hourly || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} tickFormatter={l => l.slice(0, 2) + ':00'} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={fmt} />
              <Tooltip formatter={v => [`UGX ${Number(v).toLocaleString()}`, 'Sales']} labelFormatter={l => `Hour: ${l}`} />
              <Bar dataKey="sales" fill={GOLD} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
