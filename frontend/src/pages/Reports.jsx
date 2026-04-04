import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { BarChart3, TrendingUp, DollarSign, Package, Users, Download } from 'lucide-react';
import { analytics } from '../lib/api';
import { format } from 'date-fns';

const COLORS = ['#C9A96E','#A8824A','#E8D5B0','#6b6b6b','#2d7a4f','#2980b9'];
const fmt = n => n >= 1000000 ? (n/1000000).toFixed(1)+'M' : n >= 1000 ? (n/1000).toFixed(0)+'K' : Math.round(n||0).toLocaleString();

export default function Reports() {
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; });
  const [to, setTo] = useState(() => new Date().toISOString().split('T')[0]);

  const { data: sales } = useQuery({ queryKey: ['sales-report', from, to], queryFn: () => analytics.salesReport({ from, to }).then(r => r.data) });
  const { data: catPerf } = useQuery({ queryKey: ['cat-perf'], queryFn: () => analytics.categoryPerformance().then(r => r.data) });
  const { data: staffPerf } = useQuery({ queryKey: ['staff-perf', from, to], queryFn: () => analytics.staffPerformance({ from, to }).then(r => r.data) });
  const { data: incomeExp } = useQuery({ queryKey: ['income-exp'], queryFn: () => analytics.incomeExpense({ months: 6 }).then(r => r.data) });
  const { data: prodPerf } = useQuery({ queryKey: ['prod-perf'], queryFn: () => analytics.productPerformance().then(r => r.data) });
  const { data: financial } = useQuery({ queryKey: ['financial', from, to], queryFn: () => analytics.financialSummary({ from, to }).then(r => r.data) });

  const exportCSV = (data, filename) => {
    if (!data?.length) return;
    const keys = Object.keys(data[0]);
    const csv = [keys.join(','), ...data.map(row => keys.map(k => `"${row[k] || ''}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`; a.click();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><div className="flex items-center gap-2"><BarChart3 size={22} className="text-[#C9A96E]"/><h1 className="page-title">Reports & Analytics</h1></div><p className="page-subtitle">Business performance insights</p></div>
        <div className="flex items-center gap-2 flex-wrap">
          <input type="date" className="input py-2 text-sm w-36" value={from} onChange={e => setFrom(e.target.value)} />
          <span className="text-gray-400 text-sm">to</span>
          <input type="date" className="input py-2 text-sm w-36" value={to} onChange={e => setTo(e.target.value)} />
        </div>
      </div>

      {/* Financial KPIs */}
      {financial && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Gross Revenue', value: financial.grossRevenue, color: '#2d7a4f', icon: DollarSign },
            { label: 'Total Expenses', value: financial.totalExpenses, color: '#c0392b', icon: DollarSign },
            { label: 'Net Profit', value: financial.grossProfit, color: financial.grossProfit >= 0 ? '#2d7a4f' : '#c0392b', icon: TrendingUp },
            { label: 'Profit Margin', value: null, label2: financial.profitMargin + '%', color: '#C9A96E', icon: BarChart3 },
          ].map((s, i) => (
            <div key={i} className="card p-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: s.color+'18' }}>
                <s.icon size={16} style={{ color: s.color }} />
              </div>
              <p className="text-lg font-heading font-bold" style={{ color: s.color }}>{s.label2 || `UGX ${fmt(s.value)}`}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Sales trend + Income vs Expense */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold">Daily Sales Trend</h3>
            <button onClick={() => exportCSV(sales?.byDay, 'sales')} className="btn-secondary py-1 px-2 text-xs"><Download size={12}/> CSV</button>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={sales?.byDay || []}>
              <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#C9A96E" stopOpacity={0.3}/><stop offset="95%" stopColor="#C9A96E" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d?.slice(5)}/>
              <YAxis tick={{ fontSize: 10 }} tickFormatter={fmt}/>
              <Tooltip formatter={v => [`UGX ${Number(v).toLocaleString()}`, 'Sales']}/>
              <Area type="monotone" dataKey="total" stroke="#C9A96E" strokeWidth={2} fill="url(#sg)"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="font-heading font-semibold mb-4">Income vs Expenses (6 months)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={incomeExp || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
              <XAxis dataKey="month" tick={{ fontSize: 10 }}/>
              <YAxis tick={{ fontSize: 10 }} tickFormatter={fmt}/>
              <Tooltip formatter={v => [`UGX ${Number(v).toLocaleString()}`]}/>
              <Bar dataKey="income" fill="#C9A96E" radius={[4,4,0,0]} name="Income"/>
              <Bar dataKey="expenses" fill="#e74c3c" radius={[4,4,0,0]} name="Expenses"/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Payment methods + Category performance */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="font-heading font-semibold mb-4">Payment Methods</h3>
          <div className="flex gap-4 items-center">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={sales?.byPayment || []} dataKey="total" nameKey="method" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                  {(sales?.byPayment || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                </Pie>
                <Tooltip formatter={v => [`UGX ${Number(v).toLocaleString()}`]}/>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 flex-1">
              {(sales?.byPayment || []).map((p, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i] }}/><span className="text-xs capitalize">{p.method?.replace(/_/g,' ')}</span></div>
                  <span className="text-xs font-semibold">UGX {fmt(p.total)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-heading font-semibold mb-4">Category Performance</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {(catPerf || []).map((c, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-xs font-bold text-gray-400 w-5">{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{c.name}</p>
                    <div className="h-1.5 bg-gray-100 rounded-full mt-0.5">
                      <div className="h-full rounded-full bg-[#C9A96E]" style={{ width: `${Math.min(100,(c.revenue/(catPerf[0]?.revenue||1))*100)}%` }}/>
                    </div>
                  </div>
                </div>
                <div className="text-right ml-3 shrink-0">
                  <p className="text-xs font-semibold">UGX {fmt(c.revenue)}</p>
                  <p className="text-[10px] text-gray-400">{c.unitsSold} units</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Staff performance */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold">Staff Performance</h3>
          <button onClick={() => exportCSV(staffPerf, 'staff')} className="btn-secondary py-1 px-2 text-xs"><Download size={12}/> CSV</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50"><tr>{['Staff','Role','Orders','Total Sales','Avg Order'].map(h=><th key={h} className="table-header">{h}</th>)}</tr></thead>
            <tbody>
              {(staffPerf || []).map((s, i) => (
                <tr key={i} className="table-row">
                  <td className="table-cell"><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-[#C9A96E]/20 flex items-center justify-center text-[#A8824A] text-xs font-bold">{s.username[0].toUpperCase()}</div><span className="font-medium">{s.username}</span></div></td>
                  <td className="table-cell"><span className={`badge capitalize ${s.role==='admin'?'bg-red-100 text-red-700':s.role==='manager'?'badge-gold':'badge-blue'}`}>{s.role}</span></td>
                  <td className="table-cell font-semibold">{s.totalOrders}</td>
                  <td className="table-cell font-semibold text-[#A8824A]">UGX {Number(s.totalSales||0).toLocaleString()}</td>
                  <td className="table-cell">UGX {Number(s.avgOrderValue||0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product profit table */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold">Product Profit Analysis</h3>
          <button onClick={() => exportCSV(prodPerf, 'products')} className="btn-secondary py-1 px-2 text-xs"><Download size={12}/> CSV</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50"><tr>{['Product','Category','Sold','Revenue','Cost','Profit','Margin','Stock','Restock?'].map(h=><th key={h} className="table-header">{h}</th>)}</tr></thead>
            <tbody>
              {(prodPerf||[]).slice(0,20).map((p,i) => (
                <tr key={i} className="table-row">
                  <td className="table-cell font-medium text-sm">{p.name}</td>
                  <td className="table-cell text-xs"><span className="badge-gray">{p.category||'—'}</span></td>
                  <td className="table-cell text-sm">{p.unitsSold}</td>
                  <td className="table-cell text-sm font-medium">UGX {fmt(p.revenue)}</td>
                  <td className="table-cell text-sm text-gray-500">UGX {fmt(p.cogs)}</td>
                  <td className="table-cell text-sm font-semibold text-green-600">UGX {fmt(p.profit)}</td>
                  <td className="table-cell"><span className="badge-gold">{p.margin}%</span></td>
                  <td className="table-cell"><span className={`badge ${p.stock<=p.lowStockThreshold&&p.stock>0?'badge-yellow':p.stock===0?'badge-red':'badge-green'}`}>{p.stock}</span></td>
                  <td className="table-cell">{p.needsRestock ? <span className="badge bg-red-100 text-red-700 text-xs">Restock!</span> : <span className="text-gray-400 text-xs">OK</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
