import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import { TrendingUp, Clock, Users, Package } from 'lucide-react';
import { analytics } from '../lib/api';

const fmt = n => n >= 1000 ? (n/1000).toFixed(0)+'K' : Math.round(n||0).toString();

export default function Analytics() {
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate()-30); return d.toISOString().split('T')[0]; });
  const [to, setTo] = useState(() => new Date().toISOString().split('T')[0]);

  const { data: hourly } = useQuery({ queryKey: ['hourly', from, to], queryFn: () => analytics.hourly({ from, to }).then(r => r.data) });
  const { data: catPerf } = useQuery({ queryKey: ['cat-perf'], queryFn: () => analytics.categoryPerformance().then(r => r.data) });
  const { data: staffPerf } = useQuery({ queryKey: ['staff-perf', from, to], queryFn: () => analytics.staffPerformance({ from, to }).then(r => r.data) });
  const { data: prodPerf } = useQuery({ queryKey: ['prod-perf'], queryFn: () => analytics.productPerformance().then(r => r.data) });

  const maxSales = Math.max(...(hourly||[]).map(h => h.sales), 1);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><div className="flex items-center gap-2"><TrendingUp size={22} className="text-[#C9A96E]"/><h1 className="page-title">Analytics</h1></div><p className="page-subtitle">Deep business intelligence</p></div>
        <div className="flex items-center gap-2">
          <input type="date" className="input py-2 text-sm w-36" value={from} onChange={e => setFrom(e.target.value)} />
          <span className="text-gray-400 text-sm">to</span>
          <input type="date" className="input py-2 text-sm w-36" value={to} onChange={e => setTo(e.target.value)} />
        </div>
      </div>

      {/* Hourly Sales Heatmap */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-5"><Clock size={18} className="text-[#C9A96E]"/><h3 className="font-heading font-semibold">Hourly Sales Heatmap — When Do You Sell Most?</h3></div>
        <div className="grid grid-cols-12 gap-1 mb-2">
          {(hourly||[]).map(h => {
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
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-[#f5f5f5] border border-gray-200"/><span>No sales</span></div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-[#E8D5B0]"/><span>Low</span></div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-[#C9A96E]"/><span>Medium</span></div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-[#A8824A]"/><span>Peak</span></div>
          <span className="ml-auto">Numbers = order count</span>
        </div>
        <ResponsiveContainer width="100%" height={140} className="mt-4">
          <BarChart data={hourly||[]}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
            <XAxis dataKey="label" tick={{ fontSize: 10 }} tickFormatter={l => l.slice(0,2)+':00'}/>
            <YAxis tick={{ fontSize: 10 }} tickFormatter={fmt}/>
            <Tooltip formatter={v => [`UGX ${Number(v).toLocaleString()}`, 'Sales']} labelFormatter={l => `Hour: ${l}`}/>
            <Bar dataKey="sales" fill="#C9A96E" radius={[3,3,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Category + Staff side by side */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Category performance */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4"><Package size={18} className="text-[#C9A96E]"/><h3 className="font-heading font-semibold">Category Performance</h3></div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={(catPerf||[]).slice(0,8)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={fmt}/>
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80}/>
              <Tooltip formatter={v => [`UGX ${Number(v).toLocaleString()}`, 'Revenue']}/>
              <Bar dataKey="revenue" fill="#C9A96E" radius={[0,3,3,0]}/>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-2">
            {(catPerf||[]).slice(0,5).map((c,i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{c.name}</span>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-gray-400">{c.unitsSold} sold</span>
                  <span className={`font-semibold ${c.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>UGX {fmt(c.profit)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Staff performance */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4"><Users size={18} className="text-[#C9A96E]"/><h3 className="font-heading font-semibold">Staff Performance</h3></div>
          <div className="space-y-3">
            {(staffPerf||[]).map((s,i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#C9A96E]/20 flex items-center justify-center text-[#A8824A] text-sm font-bold shrink-0">{s.username[0].toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{s.username}</span>
                    <span className="text-[#A8824A] font-semibold">UGX {fmt(s.totalSales)}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#C9A96E] to-[#A8824A]"
                      style={{ width: `${Math.min(100, (s.totalSales / (staffPerf?.[0]?.totalSales || 1)) * 100)}%` }}/>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{s.totalOrders} orders · avg UGX {fmt(s.avgOrderValue)}</p>
                </div>
              </div>
            ))}
            {!staffPerf?.length && <p className="text-gray-400 text-sm text-center py-4">No sales data in this period</p>}
          </div>
        </div>
      </div>

      {/* Product velocity table */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4"><TrendingUp size={18} className="text-[#C9A96E]"/><h3 className="font-heading font-semibold">Product Sales Velocity</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>{['Product','Category','Sold/Day','Days of Stock','Margin','Status'].map(h => <th key={h} className="table-header">{h}</th>)}</tr>
            </thead>
            <tbody>
              {(prodPerf||[]).slice(0,15).map((p,i) => (
                <tr key={i} className="table-row">
                  <td className="table-cell font-medium text-sm">{p.name}</td>
                  <td className="table-cell text-xs"><span className="badge-gray">{p.category||'—'}</span></td>
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
  );
}
