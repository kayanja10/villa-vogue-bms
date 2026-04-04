import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, ShoppingBag, Users, Package, DollarSign, AlertTriangle, ArrowRight, Bell, MessageCircle, Sparkles, Send, RefreshCw, Calendar, Star, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { analytics, ai, notifications } from '../lib/api';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const fmt = (n) => {
  if (!n) return '0';
  if (n >= 1000000) return (n/1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n/1000).toFixed(0) + 'K';
  return Math.round(n).toLocaleString();
};

const COLORS = ['#C9A96E', '#A8824A', '#E8D5B0', '#6b6b6b', '#2d7a4f'];

function StatCard({ label, value, sub, icon: Icon, trend, color = '#C9A96E', prefix = 'UGX', to }) {
  const up = parseFloat(trend) >= 0;
  const card = (
    <div className="card p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
          <Icon size={20} style={{ color }} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${up ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
            {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />} {Math.abs(trend)}%
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

  const { data: aiSummary } = useQuery({
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
    onSuccess: (res) => setAiResponse(res.data.answer),
    onError: () => toast.error('AI unavailable. Add ANTHROPIC_API_KEY to backend .env'),
  });

  const markAllRead = useMutation({ mutationFn: () => notifications.markAllRead() });

  if (isLoading) return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-48" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="card h-28" />)}</div>
    </div>
  );

  const { today = {}, month = {}, inventory = {}, customers: cust = {}, recentOrders = [], topProducts = [], salesChart = [], notifications: notifs = [], birthdays = [] } = data || {};

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-semibold text-gray-900 dark:text-white">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.username} 👋
          </h1>
          <p className="text-sm text-gray-500">{format(new Date(), 'EEEE, MMMM d yyyy')} · Villa Vogue Fashions</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-secondary py-2 px-3 text-xs"><RefreshCw size={14} /></button>
          <button onClick={() => setShowAI(!showAI)} className="btn-primary text-sm">
            <Sparkles size={15} /> AI Insights
          </button>
          <Link to="/pos" className="btn-primary text-sm"><ShoppingBag size={15} /> Open POS</Link>
        </div>
      </div>

      {/* Birthday banner */}
      {birthdays?.length > 0 && (
        <div className="bg-gradient-to-r from-[#C9A96E]/20 to-[#A8824A]/10 border border-[#C9A96E]/30 rounded-xl p-4 flex items-center gap-3 flex-wrap">
          <span className="text-2xl">🎂</span>
          <div className="flex-1">
            <p className="font-semibold text-[#A8824A] text-sm">Birthday Today!</p>
            <p className="text-sm text-gray-600">{birthdays.map(b => b.name).join(', ')}</p>
          </div>
          {birthdays.map(b => (
            <button key={b.id} onClick={() => {
              const phone = b.phone?.replace(/\D/g,'');
              const intl = phone?.startsWith('0') ? '256'+phone.slice(1) : phone;
              window.open(`https://wa.me/${intl}?text=${encodeURIComponent(`🎂 Happy Birthday ${b.name}! 🎉\n\nWishing you a wonderful day! Visit Villa Vogue Fashions today for a special birthday treat! 👗✨\n\n💛 Villa Vogue Fashions\n📞 0782 860372`)}`, '_blank');
            }} className="btn-primary text-xs py-1.5">🎉 WhatsApp {b.name.split(' ')[0]}</button>
          ))}
        </div>
      )}

      {/* Notifications */}
      {notifs?.length > 0 && (
        <div className="card p-4 border-l-4 border-amber-400">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2"><Bell size={16} className="text-amber-500" /><span className="font-semibold text-sm">{notifs.length} Alerts</span></div>
            <button onClick={() => markAllRead.mutate()} className="text-xs text-gray-400 hover:text-gray-600">Mark all read</button>
          </div>
          <div className="space-y-1">
            {notifs.slice(0,3).map(n => <p key={n.id} className="text-xs text-gray-600">• {n.message}</p>)}
          </div>
        </div>
      )}

      {/* AI Panel */}
      {showAI && (
        <div className="card p-5 border-2 border-[#C9A96E]/30">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><Sparkles size={18} className="text-[#C9A96E]" /><h3 className="font-heading font-semibold text-gray-900 dark:text-white">AI Business Intelligence</h3></div>
            <button onClick={() => setShowAI(false)}><X size={16} className="text-gray-400" /></button>
          </div>

          {/* Quick insights from AI */}
          {aiSummary?.insights && (
            <div className="grid sm:grid-cols-2 gap-2 mb-4">
              {aiSummary.insights.slice(0,4).map((ins, i) => (
                <div key={i} className={`rounded-xl p-3 text-sm ${ins.type==='positive'?'bg-green-50 border border-green-200':ins.type==='danger'?'bg-red-50 border border-red-200':ins.type==='warning'?'bg-amber-50 border border-amber-200':'bg-blue-50 border border-blue-200'}`}>
                  <p className="font-semibold text-sm">{ins.icon} {ins.title}</p>
                  <p className="text-xs mt-1 text-gray-600">{ins.message}</p>
                </div>
              ))}
            </div>
          )}

          {/* Ask AI */}
          <div className="flex gap-2 mb-3">
            <input className="input flex-1 text-sm py-2" placeholder="Ask anything: 'Which products should I restock?' 'What are my best customers?' 'Am I profitable?'"
              value={aiQuestion} onChange={e => setAiQuestion(e.target.value)}
              onKeyDown={e => { if(e.key === 'Enter' && aiQuestion.trim()) { askAI.mutate(aiQuestion); }}} />
            <button onClick={() => { if(aiQuestion.trim()) askAI.mutate(aiQuestion); }} disabled={askAI.isPending || !aiQuestion.trim()} className="btn-primary py-2 px-3 disabled:opacity-40">
              {askAI.isPending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Send size={15}/>}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {['What should I restock?', 'Who are my best customers?', 'Am I making profit?', 'What products are slow-moving?'].map(q => (
              <button key={q} onClick={() => { setAiQuestion(q); askAI.mutate(q); }} className="text-xs px-2.5 py-1 rounded-full bg-[#C9A96E]/10 text-[#A8824A] hover:bg-[#C9A96E]/20 transition-colors">{q}</button>
            ))}
          </div>
          {aiResponse && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap border border-gray-200 dark:border-gray-700">
              {aiResponse}
            </div>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Today's Sales" value={today.sales} icon={DollarSign} trend={month.salesGrowth} />
        <StatCard label="Today's Orders" value={today.orders} prefix="" icon={ShoppingBag} color="#2d7a4f" />
        <StatCard label="Total Customers" value={cust.total} prefix="" icon={Users} color="#2980b9" to="/customers" />
        <StatCard label="Products" value={inventory.totalProducts} prefix="" icon={Package} color="#8e44ad" to="/inventory" />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Month Sales</p>
          <p className="text-xl font-heading font-bold">UGX {fmt(month.sales)}</p>
          <p className="text-xs text-gray-400">{month.orders} orders</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Today's Profit</p>
          <p className={`text-xl font-heading font-bold ${today.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>UGX {fmt(today.profit)}</p>
          <p className="text-xs text-gray-400">After UGX {fmt(today.expenses)} expenses</p>
        </div>
        <Link to="/inventory" className={`card p-4 ${inventory.lowStockCount > 0 ? 'border-amber-200 bg-amber-50/50 dark:border-amber-800' : ''}`}>
          <p className="text-xs text-gray-500 mb-1">Low Stock</p>
          <p className={`text-xl font-heading font-bold ${inventory.lowStockCount > 0 ? 'text-amber-600' : 'text-gray-900 dark:text-white'}`}>{inventory.lowStockCount} items</p>
          {inventory.lowStockCount > 0 && <p className="text-xs text-amber-600">{inventory.lowStockItems?.slice(0,2).map(p=>p.name).join(', ')}</p>}
        </Link>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Stock Value</p>
          <p className="text-xl font-heading font-bold">UGX {fmt(inventory.stockValue)}</p>
          <p className="text-xs text-gray-400">Retail: UGX {fmt(inventory.retailValue)}</p>
        </div>
      </div>

      {/* Forecast */}
      {forecast && (
        <div className="card p-4 bg-gradient-to-r from-[#1a1a1a] to-[#2a2a2a] text-white">
          <div className="flex items-center gap-2 mb-3"><TrendingUp size={18} className="text-[#C9A96E]" /><span className="font-semibold text-sm">Sales Forecast</span><span className="text-xs text-gray-400">({forecast.confidence} confidence)</span></div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div><p className="text-xs text-gray-400">Daily Average</p><p className="text-lg font-bold text-[#C9A96E]">UGX {fmt(forecast.dailyAverage)}</p></div>
            <div><p className="text-xs text-gray-400">Projected Month</p><p className="text-lg font-bold text-white">UGX {fmt(forecast.projectedMonthTotal)}</p></div>
            <div><p className="text-xs text-gray-400">Next {forecast.remainingDays} Days</p><p className="text-lg font-bold text-green-400">UGX {fmt(forecast.projectedRemaining)}</p></div>
          </div>
        </div>
      )}

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-heading font-semibold text-gray-900 dark:text-white mb-4">Last 7 Days Sales</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={salesChart}>
              <defs><linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#C9A96E" stopOpacity={0.3}/><stop offset="95%" stopColor="#C9A96E" stopOpacity={0}/></linearGradient></defs>
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
                <span className="text-xs text-gray-400 w-4 shrink-0">{i+1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{p.name}</p>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full mt-1">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#C9A96E] to-[#A8824A]" style={{ width: `${Math.min(100, (p.unitsSold / (topProducts[0]?.unitsSold || 1)) * 100)}%` }} />
                  </div>
                </div>
                <span className="text-xs font-semibold text-gray-600 shrink-0">{p.unitsSold} sold</span>
              </div>
            ))}
            {!topProducts.length && <p className="text-sm text-gray-400 text-center py-4">No sales data yet</p>}
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div className="card">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-heading font-semibold text-gray-900 dark:text-white">Recent Orders</h3>
          <Link to="/orders" className="text-[#C9A96E] text-sm hover:underline flex items-center gap-1">View all <ArrowRight size={13}/></Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50"><tr>{['Order #','Customer','Total','Payment','Status','Served By','Time'].map(h=><th key={h} className="table-header">{h}</th>)}</tr></thead>
            <tbody>
              {recentOrders.map(o => (
                <tr key={o.id} className="table-row">
                  <td className="table-cell font-mono font-semibold text-[#A8824A] text-xs">{o.orderNumber}</td>
                  <td className="table-cell text-sm">{o.customerName || <span className="text-gray-400">Walk-in</span>}</td>
                  <td className="table-cell font-semibold text-sm">UGX {Number(o.total).toLocaleString()}</td>
                  <td className="table-cell"><span className="badge-gold capitalize text-xs">{o.paymentMethod?.replace(/_/g,' ')}</span></td>
                  <td className="table-cell"><span className={`badge capitalize text-xs ${o.orderStatus==='completed'?'badge-green':o.orderStatus==='voided'?'badge-red':'badge-yellow'}`}>{o.orderStatus}</span></td>
                  <td className="table-cell text-xs text-gray-500">{o.servedByUser?.username || '—'}</td>
                  <td className="table-cell text-xs text-gray-400">{o.createdAt ? format(new Date(o.createdAt),'HH:mm') : '—'}</td>
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
