import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  TrendingUp, TrendingDown, ShoppingBag, Users, Package, DollarSign,
  AlertTriangle, ArrowRight, Bell, Sparkles, Send, RefreshCw,
  XCircle, CheckCircle, Zap, Target, ChevronRight, ArrowUp, ArrowDown,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { analytics, ai, notifications } from '../lib/api';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const fmt = (n) => {
  if (!n) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
  return Math.round(n).toLocaleString();
};

function StatCard({ label, value, sub, icon: Icon, trend, color = '#C9A96E', prefix = 'UGX', to }) {
  const up = parseFloat(trend) >= 0;
  const card = (
    <div className="card p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
          <Icon size={20} style={{ color }} />
        </div>
        {trend !== undefined && trend !== null && (
          <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${up ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
            {up ? <ArrowUp size={10} /> : <ArrowDown size={10} />} {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="text-xl font-heading font-bold text-gray-900 dark:text-white">{prefix && `${prefix} `}{fmt(value)}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
  return to ? <Link to={to}>{card}</Link> : card;
}

function AlertBar({ alert }) {
  const styles = {
    CRITICAL: 'bg-red-50 border-red-300 text-red-800',
    URGENT: 'bg-orange-50 border-orange-300 text-orange-800',
    WARNING: 'bg-amber-50 border-amber-300 text-amber-800',
    INFO: 'bg-blue-50 border-blue-200 text-blue-800',
  };
  const icons = { CRITICAL: XCircle, URGENT: AlertTriangle, WARNING: AlertTriangle, INFO: Bell };
  const IconComp = icons[alert.level] || Bell;
  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm font-medium ${styles[alert.level] || styles.INFO}`}>
      <span className="text-base">{alert.icon}</span>
      <span className="flex-1">{alert.message}</span>
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border
        ${alert.level === 'CRITICAL' ? 'bg-red-100 border-red-300 text-red-700' :
          alert.level === 'URGENT' ? 'bg-orange-100 border-orange-300 text-orange-700' :
          'bg-amber-100 border-amber-300 text-amber-700'}`}>
        {alert.level}
      </span>
    </div>
  );
}

const AI_QUICK_QUESTIONS = [
  'What should I restock?',
  'Who are my best customers?',
  'Am I making profit?',
  'What products are slow-moving?',
  'Show me this week\'s performance',
  'Which customers are at risk?',
];

export default function Dashboard() {
  const { user } = useStore();
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState(null);
  const [showAI, setShowAI] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => analytics.dashboard().then(r => r.data),
    refetchInterval: 60000,
  });

  const { data: aiSummary, isLoading: aiLoading, refetch: refetchAI } = useQuery({
    queryKey: ['ai-summary'],
    queryFn: () => ai.summary().then(r => r.data),
    staleTime: 300000,
    enabled: !!data,
  });

  const { data: forecast } = useQuery({
    queryKey: ['ai-forecast'],
    queryFn: () => ai.forecast().then(r => r.data),
    staleTime: 300000,
  });

  const askAI = useMutation({
    mutationFn: (q) => ai.insights({ question: q }),
    onSuccess: (res) => { setAiResponse(res.data.answer); setShowAI(true); },
    onError: (err) => toast.error('AI error: ' + (err.response?.data?.error || 'Check backend')),
  });

  const markAllRead = useMutation({ mutationFn: () => notifications.markAllRead() });

  if (isLoading) return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-48" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="card h-28" />)}</div>
    </div>
  );

  const {
    today = {}, month = {}, inventory = {}, customers: cust = {},
    recentOrders = [], topProducts = [], salesChart = [],
    notifications: notifs = [], birthdays = [],
  } = data || {};

  // Pull critical + urgent alerts from AI summary
  const criticalAlerts = aiSummary?.alerts?.filter(a => a.level === 'CRITICAL' || a.level === 'URGENT') || [];
  const warningAlerts = aiSummary?.alerts?.filter(a => a.level === 'WARNING') || [];
  const weeklyTrend = aiSummary?.context?.financials?.salesChangePercent;
  const atRiskCustomers = aiSummary?.context?.customers?.atRiskHighValue || [];

  return (
    <div className="space-y-4 animate-fade-in">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-semibold text-gray-900 dark:text-white">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.username} 👋
          </h1>
          <p className="text-sm text-gray-500">{format(new Date(), 'EEEE, MMMM d yyyy')} · Villa Vogue Fashions</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { refetch(); refetchAI(); }} className="btn-secondary py-2 px-3 text-xs" title="Refresh">
            <RefreshCw size={14} className={aiLoading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setShowAI(!showAI)} className={`btn-primary text-sm ${showAI ? 'opacity-80' : ''}`}>
            <Sparkles size={15} /> AI Assistant
          </button>
          <Link to="/pos" className="btn-primary text-sm"><ShoppingBag size={15} /> Open POS</Link>
        </div>
      </div>

      {/* ── BIRTHDAY BANNER ── */}
      {birthdays?.length > 0 && (
        <div className="bg-gradient-to-r from-[#C9A96E]/20 to-[#A8824A]/10 border border-[#C9A96E]/30 rounded-xl p-4 flex items-center gap-3 flex-wrap">
          <span className="text-2xl">🎂</span>
          <div className="flex-1">
            <p className="font-semibold text-[#A8824A] text-sm">Birthday Today!</p>
            <p className="text-sm text-gray-600">{birthdays.map(b => b.name).join(', ')}</p>
          </div>
          {birthdays.map(b => (
            <button key={b.id} onClick={() => {
              const phone = b.phone?.replace(/\D/g, '');
              const intl = phone?.startsWith('0') ? '256' + phone.slice(1) : phone;
              window.open(`https://wa.me/${intl}?text=${encodeURIComponent(`🎂 Happy Birthday ${b.name}! 🎉\n\nWishing you a wonderful day! Visit Villa Vogue Fashions today for a special birthday treat! 👗✨\n\n💛 Villa Vogue Fashions\n📞 0782 860372`)}`, '_blank');
            }} className="btn-primary text-xs py-1.5">🎉 WhatsApp {b.name.split(' ')[0]}</button>
          ))}
        </div>
      )}

      {/* ── CRITICAL AI ALERTS ── */}
      {criticalAlerts.length > 0 && (
        <div className="space-y-2">
          {criticalAlerts.map((alert, i) => <AlertBar key={i} alert={alert} />)}
        </div>
      )}

      {/* ── WEEKLY TREND BANNER ── */}
      {weeklyTrend !== null && weeklyTrend !== undefined && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm
          ${parseFloat(weeklyTrend) >= 0 ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {parseFloat(weeklyTrend) >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
          <span className="font-semibold">Weekly Trend:</span>
          <span>Sales are <strong>{parseFloat(weeklyTrend) >= 0 ? 'up' : 'down'} {Math.abs(weeklyTrend)}%</strong> compared to last week</span>
          {parseFloat(weeklyTrend) < -10 && (
            <button onClick={() => { setAiQuestion('Sales dropped this week. What should I do?'); askAI.mutate('Sales dropped this week. What should I do?'); }}
              className="ml-auto text-xs underline font-semibold">Get AI advice →</button>
          )}
        </div>
      )}

      {/* ── AT-RISK HIGH VALUE CUSTOMERS ── */}
      {atRiskCustomers.length > 0 && (
        <div className="card p-4 border-l-4 border-red-400">
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} className="text-red-500" />
            <span className="font-semibold text-sm text-red-700">High-Value Customers at Risk of Churning</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {atRiskCustomers.map((c, i) => (
              <div key={i} className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                <div className="w-6 h-6 rounded-full bg-red-200 flex items-center justify-center text-red-700 text-xs font-bold">{c.name?.[0]}</div>
                <div>
                  <span className="text-sm font-medium">{c.name}</span>
                  <span className="text-xs text-red-500 ml-2">{c.daysSinceVisit}d since last visit</span>
                </div>
                <button onClick={() => {
                  const phone = c.phone?.replace(/\D/g, '');
                  const intl = phone?.startsWith('0') ? '256' + phone.slice(1) : phone;
                  if (intl) window.open(`https://wa.me/${intl}?text=${encodeURIComponent(`Hi ${c.name}! 👋 We miss you at Villa Vogue Fashions! Come in and check out our latest collection. Special offer waiting for you! 👗✨`)}`, '_blank');
                }} className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full hover:bg-red-200 transition-colors">
                  WhatsApp
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── NOTIFICATIONS ── */}
      {notifs?.length > 0 && (
        <div className="card p-4 border-l-4 border-amber-400">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2"><Bell size={16} className="text-amber-500" /><span className="font-semibold text-sm">{notifs.length} System Alerts</span></div>
            <button onClick={() => markAllRead.mutate()} className="text-xs text-gray-400 hover:text-gray-600">Mark all read</button>
          </div>
          <div className="space-y-1">
            {notifs.slice(0, 3).map(n => <p key={n.id} className="text-xs text-gray-600">• {n.message}</p>)}
          </div>
        </div>
      )}

      {/* ── WARNING ALERTS (collapsible) ── */}
      {warningAlerts.length > 0 && (
        <div className="space-y-1.5">
          {warningAlerts.slice(0, 2).map((alert, i) => <AlertBar key={i} alert={alert} />)}
        </div>
      )}

      {/* ── AI ASSISTANT PANEL ── */}
      {showAI && (
        <div className="card p-5 border-2 border-[#C9A96E]/30">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap size={18} className="text-[#C9A96E]" />
              <span className="font-heading font-semibold">AI Business Assistant</span>
              {aiSummary?.generatedAt && (
                <span className="text-xs text-gray-400">· {new Date(aiSummary.generatedAt).toLocaleTimeString()}</span>
              )}
            </div>
          </div>

          {/* AI Insight cards */}
          {aiSummary?.insights?.length > 0 && (
            <div className="grid md:grid-cols-2 gap-2 mb-4">
              {aiSummary.insights.slice(0, 4).map((ins, i) => (
                <div key={i} className={`flex items-start gap-2 p-3 rounded-xl border text-sm
                  ${ins.type === 'positive' ? 'bg-green-50 border-green-200' :
                    ins.type === 'danger' ? 'bg-red-50 border-red-200' :
                    ins.type === 'warning' ? 'bg-amber-50 border-amber-200' :
                    'bg-blue-50 border-blue-200'}`}>
                  <span className="text-xl">{ins.icon}</span>
                  <div>
                    <p className="font-semibold text-xs">{ins.title}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{ins.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {aiSummary?.recommendations?.length > 0 && (
            <div className="mb-4 p-3 bg-[#C9A96E]/5 border border-[#C9A96E]/20 rounded-xl">
              <p className="text-xs font-semibold text-[#A8824A] mb-2">TODAY'S PRIORITIES</p>
              {aiSummary.recommendations.map((rec, i) => (
                <div key={i} className="flex items-center gap-2 text-sm py-0.5">
                  <ChevronRight size={13} className="text-[#C9A96E] shrink-0" />
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          )}

          {/* Ask AI */}
          <div className="flex gap-2 mb-3">
            <input
              className="input flex-1 text-sm py-2"
              placeholder="Ask anything about your business..."
              value={aiQuestion}
              onChange={e => setAiQuestion(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && aiQuestion.trim()) askAI.mutate(aiQuestion); }}
            />
            <button
              onClick={() => { if (aiQuestion.trim()) askAI.mutate(aiQuestion); }}
              disabled={askAI.isPending || !aiQuestion.trim()}
              className="btn-primary py-2 px-3 disabled:opacity-40">
              {askAI.isPending
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Send size={15} />}
            </button>
          </div>

          {/* Quick questions */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {AI_QUICK_QUESTIONS.map(q => (
              <button key={q} onClick={() => { setAiQuestion(q); askAI.mutate(q); }}
                className="text-xs px-2.5 py-1 rounded-full bg-[#C9A96E]/10 text-[#A8824A] hover:bg-[#C9A96E]/20 transition-colors">
                {q}
              </button>
            ))}
          </div>

          {/* AI Response */}
          {aiResponse && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap border border-gray-200 dark:border-gray-700">
              {aiResponse}
            </div>
          )}
        </div>
      )}

      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Today's Sales" value={today.sales} icon={DollarSign} trend={month.salesGrowth} />
        <StatCard label="Today's Orders" value={today.orders} prefix="" icon={ShoppingBag} color="#2d7a4f" />
        <StatCard label="Total Customers" value={cust.total} prefix="" icon={Users} color="#2980b9" to="/customers" />
        <StatCard label="Products" value={inventory.totalProducts} prefix="" icon={Package} color="#8e44ad" to="/inventory" />
      </div>

      {/* ── SECONDARY STATS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Month Sales</p>
          <p className="text-xl font-heading font-bold">UGX {fmt(month.sales)}</p>
          <p className="text-xs text-gray-400">{month.orders} orders</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Today's Profit</p>
          <p className={`text-xl font-heading font-bold ${today.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            UGX {fmt(today.profit)}
          </p>
          <p className="text-xs text-gray-400">After UGX {fmt(today.expenses)} expenses</p>
        </div>
        <Link to="/inventory" className={`card p-4 ${inventory.lowStockCount > 0 ? 'border-amber-200 bg-amber-50/50 dark:border-amber-800' : ''}`}>
          <p className="text-xs text-gray-500 mb-1">Low Stock</p>
          <p className={`text-xl font-heading font-bold ${inventory.lowStockCount > 0 ? 'text-amber-600' : 'text-gray-900 dark:text-white'}`}>
            {inventory.lowStockCount} items
          </p>
          {inventory.lowStockCount > 0 && (
            <p className="text-xs text-amber-600">{inventory.lowStockItems?.slice(0, 2).map(p => p.name).join(', ')}</p>
          )}
        </Link>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Stock Value</p>
          <p className="text-xl font-heading font-bold">UGX {fmt(inventory.stockValue)}</p>
          <p className="text-xs text-gray-400">Retail: UGX {fmt(inventory.retailValue)}</p>
        </div>
      </div>

      {/* ── FORECAST BANNER ── */}
      {forecast && (
        <div className="card p-4 bg-gradient-to-r from-[#1a1a1a] to-[#2a2a2a] text-white">
          <div className="flex items-center gap-2 mb-3">
            <Target size={18} className="text-[#C9A96E]" />
            <span className="font-semibold text-sm">AI Sales Forecast</span>
            <span className="text-xs text-gray-400">({forecast.confidence} confidence)</span>
            {forecast.weeklyTrend && (
              <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full
                ${parseFloat(forecast.weeklyTrend) >= 0 ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                {parseFloat(forecast.weeklyTrend) >= 0 ? '↑' : '↓'} {Math.abs(parseFloat(forecast.weeklyTrend))}% this week
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-400">Daily Average</p>
              <p className="text-lg font-bold text-[#C9A96E]">UGX {fmt(forecast.dailyAverage)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Projected Month</p>
              <p className="text-lg font-bold text-white">UGX {fmt(forecast.projectedMonthTotal)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Next {forecast.remainingDays} Days</p>
              <p className="text-lg font-bold text-green-400">UGX {fmt(forecast.projectedRemaining)}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── CHARTS ── */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-heading font-semibold text-gray-900 dark:text-white mb-4">Last 7 Days Sales</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={salesChart}>
              <defs>
                <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C9A96E" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#C9A96E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={d => d?.slice(5)} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={fmt} />
              <Tooltip formatter={(v) => [`UGX ${Number(v).toLocaleString()}`, 'Sales']} contentStyle={{ borderRadius: 10, border: '1px solid #f0ebe0', fontFamily: 'DM Sans' }} />
              <Area type="monotone" dataKey="sales" stroke="#C9A96E" strokeWidth={2.5} fill="url(#goldGrad)" dot={{ fill: '#C9A96E', r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="font-heading font-semibold text-gray-900 dark:text-white mb-4">Top Products</h3>
          <div className="space-y-3">
            {topProducts.slice(0, 5).map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-4 shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{p.name}</p>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full mt-1">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#C9A96E] to-[#A8824A]"
                      style={{ width: `${Math.min(100, (p.unitsSold / (topProducts[0]?.unitsSold || 1)) * 100)}%` }} />
                  </div>
                </div>
                <span className="text-xs font-semibold text-gray-600 shrink-0">{p.unitsSold} sold</span>
              </div>
            ))}
            {!topProducts.length && <p className="text-sm text-gray-400 text-center py-4">No sales data yet</p>}
          </div>

          {/* Link to full analytics */}
          <Link to="/analytics" className="mt-4 flex items-center justify-center gap-1 text-xs text-[#A8824A] hover:underline">
            Full Analytics <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      {/* ── RECENT ORDERS ── */}
      <div className="card">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-heading font-semibold text-gray-900 dark:text-white">Recent Orders</h3>
          <Link to="/orders" className="text-[#C9A96E] text-sm hover:underline flex items-center gap-1">View all <ArrowRight size={13} /></Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>{['Order #', 'Customer', 'Total', 'Payment', 'Status', 'Served By', 'Time'].map(h => <th key={h} className="table-header">{h}</th>)}</tr>
            </thead>
            <tbody>
              {recentOrders.map(o => (
                <tr key={o.id} className="table-row">
                  <td className="table-cell font-mono font-semibold text-[#A8824A] text-xs">{o.orderNumber}</td>
                  <td className="table-cell text-sm">{o.customerName || <span className="text-gray-400">Walk-in</span>}</td>
                  <td className="table-cell font-semibold text-sm">UGX {Number(o.total).toLocaleString()}</td>
                  <td className="table-cell"><span className="badge-gold capitalize text-xs">{o.paymentMethod?.replace(/_/g, ' ')}</span></td>
                  <td className="table-cell">
                    <span className={`badge capitalize text-xs ${o.orderStatus === 'completed' ? 'badge-green' : o.orderStatus === 'voided' ? 'badge-red' : 'badge-yellow'}`}>
                      {o.orderStatus}
                    </span>
                  </td>
                  <td className="table-cell text-xs text-gray-500">{o.servedByUser?.username || '—'}</td>
                  <td className="table-cell text-xs text-gray-400">{o.createdAt ? format(new Date(o.createdAt), 'HH:mm') : '—'}</td>
                </tr>
              ))}
              {!recentOrders.length && <tr><td colSpan={7} className="text-center py-8 text-gray-400 text-sm">No orders yet today</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
