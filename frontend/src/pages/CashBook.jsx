import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookMarked, Plus, TrendingUp, TrendingDown, CheckCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { cashbook } from '../lib/api';
import { format } from 'date-fns';

export default function CashBook() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [showRecon, setShowRecon] = useState(false);
  const [form, setForm] = useState({ type: 'inflow', amount: '', description: '', category: 'Sales', paymentMethod: 'cash' });
  const [reconDate, setReconDate] = useState(new Date().toISOString().split('T')[0]);
  const [countedCash, setCountedCash] = useState('');
  const [reconNotes, setReconNotes] = useState('');

  const { data } = useQuery({ queryKey: ['cashbook'], queryFn: () => cashbook.list().then(r => r.data) });
  const { data: recon } = useQuery({ queryKey: ['recon', reconDate], queryFn: () => cashbook.reconciliation({ date: reconDate }).then(r => r.data) });

  const addEntry = useMutation({ mutationFn: (d) => cashbook.create(d), onSuccess: () => { toast.success('Entry added'); setShowAdd(false); setForm({ type:'inflow', amount:'', description:'', category:'Sales', paymentMethod:'cash' }); qc.invalidateQueries(['cashbook']); } });
  const submitRecon = useMutation({ mutationFn: (d) => cashbook.submitReconciliation(d), onSuccess: () => { toast.success('Reconciliation saved'); qc.invalidateQueries(['recon', reconDate]); setShowRecon(false); } });

  const { entries = [], summary = {} } = data || {};

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><div className="flex items-center gap-2"><BookMarked size={22} className="text-[#C9A96E]"/><h1 className="page-title">Cash Book</h1></div><p className="page-subtitle">Track all cash inflows and outflows</p></div>
        <div className="flex gap-2">
          <button onClick={() => setShowRecon(!showRecon)} className="btn-secondary"><CheckCircle size={16}/> Reconcile</button>
          <button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={16}/> Add Entry</button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 border-l-4 border-green-400">
          <div className="flex items-center gap-2 mb-1"><TrendingUp size={16} className="text-green-500"/><p className="text-xs text-gray-500">Total Inflows</p></div>
          <p className="text-2xl font-heading font-bold text-green-600">UGX {Number(summary.totalIn||0).toLocaleString()}</p>
        </div>
        <div className="card p-4 border-l-4 border-red-400">
          <div className="flex items-center gap-2 mb-1"><TrendingDown size={16} className="text-red-500"/><p className="text-xs text-gray-500">Total Outflows</p></div>
          <p className="text-2xl font-heading font-bold text-red-600">UGX {Number(summary.totalOut||0).toLocaleString()}</p>
        </div>
        <div className={`card p-4 border-l-4 ${summary.balance >= 0 ? 'border-[#C9A96E]' : 'border-red-500'}`}>
          <p className="text-xs text-gray-500 mb-1">Net Balance</p>
          <p className={`text-2xl font-heading font-bold ${summary.balance >= 0 ? 'text-[#A8824A]' : 'text-red-600'}`}>UGX {Number(summary.balance||0).toLocaleString()}</p>
        </div>
      </div>

      {/* Reconciliation panel */}
      {showRecon && recon && (
        <div className="card p-5 border-2 border-[#C9A96E]/30">
          <h3 className="font-heading font-semibold mb-4 flex items-center gap-2"><CheckCircle size={18} className="text-[#C9A96E]"/> Daily Cash Reconciliation</h3>
          <div className="flex gap-3 mb-4 flex-wrap">
            <div><label className="label">Date</label><input type="date" className="input" value={reconDate} onChange={e => setReconDate(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            {[['Opening Float', recon.openingFloat],['Cash Sales', recon.cashSales],['Expenses', recon.totalExpenses],['Expected Cash', recon.expectedCash]].map(([l,v]) => (
              <div key={l} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">{l}</p>
                <p className="font-bold text-sm">UGX {Number(v||0).toLocaleString()}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div><label className="label">Actual Cash Counted (UGX)</label><input className="input" type="number" value={countedCash} onChange={e => setCountedCash(e.target.value)} placeholder="Enter amount" /></div>
            <div><label className="label">Notes</label><input className="input" value={reconNotes} onChange={e => setReconNotes(e.target.value)} placeholder="Optional notes" /></div>
          </div>
          {countedCash && (
            <div className={`rounded-xl p-3 mb-4 ${Math.abs(parseFloat(countedCash) - recon.expectedCash) < 1000 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <p className="font-semibold">{Math.abs(parseFloat(countedCash) - recon.expectedCash) < 1000 ? '✅ Balanced' : '⚠️ Discrepancy'}</p>
              <p className="text-sm">Variance: UGX {(parseFloat(countedCash) - recon.expectedCash).toLocaleString()}</p>
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => setShowRecon(false)} className="btn-secondary">Cancel</button>
            <button onClick={() => submitRecon.mutate({ date: reconDate, countedCash, notes: reconNotes })} disabled={!countedCash || submitRecon.isPending} className="btn-primary">Save Reconciliation</button>
          </div>
        </div>
      )}

      {/* Add entry modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-heading font-semibold">Add Cash Book Entry</h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {['inflow','outflow'].map(t => (
                  <button key={t} onClick={() => setForm(p=>({...p,type:t}))}
                    className={`py-3 rounded-xl font-medium text-sm capitalize border-2 transition-all ${form.type===t?(t==='inflow'?'bg-green-500 border-green-500 text-white':'bg-red-500 border-red-500 text-white'):'border-gray-200 text-gray-600'}`}>
                    {t==='inflow'?'💰 ':'💸 '}{t}
                  </button>
                ))}
              </div>
              <div><label className="label">Amount (UGX) *</label><input className="input" type="number" value={form.amount} onChange={e => setForm(p=>({...p,amount:e.target.value}))} /></div>
              <div><label className="label">Description *</label><input className="input" value={form.description} onChange={e => setForm(p=>({...p,description:e.target.value}))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Category</label>
                  <select className="input" value={form.category} onChange={e => setForm(p=>({...p,category:e.target.value}))}>
                    {['Sales','Refund','Expense','Float','Debt Payment','Other'].map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className="label">Payment Method</label>
                  <select className="input" value={form.paymentMethod} onChange={e => setForm(p=>({...p,paymentMethod:e.target.value}))}>
                    {['cash','mtn_momo','airtel_money','card'].map(m=><option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100 dark:border-gray-800">
              <button onClick={() => setShowAdd(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={() => addEntry.mutate(form)} disabled={!form.amount||!form.description||addEntry.isPending} className="btn-primary flex-1 justify-center">Add Entry</button>
            </div>
          </div>
        </div>
      )}

      {/* Entries table */}
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800/50"><tr>{['Date','Type','Description','Category','Method','Amount','Balance','By'].map(h=><th key={h} className="table-header">{h}</th>)}</tr></thead>
          <tbody>
            {entries.map(e => (
              <tr key={e.id} className="table-row">
                <td className="table-cell text-xs text-gray-400">{e.createdAt ? format(new Date(e.createdAt),'MMM d, HH:mm') : '—'}</td>
                <td className="table-cell"><span className={`badge text-xs ${e.type==='inflow'?'badge-green':'badge-red'} capitalize`}>{e.type}</span></td>
                <td className="table-cell text-sm font-medium">{e.description}</td>
                <td className="table-cell"><span className="badge-gray text-xs">{e.category}</span></td>
                <td className="table-cell text-xs capitalize">{e.paymentMethod?.replace(/_/g,' ')}</td>
                <td className={`table-cell font-semibold ${e.type==='inflow'?'text-green-600':'text-red-600'}`}>{e.type==='inflow'?'+':'-'}UGX {Number(e.amount).toLocaleString()}</td>
                <td className="table-cell font-semibold text-sm">UGX {Number(e.balance||0).toLocaleString()}</td>
                <td className="table-cell text-xs text-gray-400">{e.user?.username || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!entries.length && <div className="py-10 text-center text-gray-400">No entries yet. Sales automatically create inflow entries.</div>}
      </div>
    </div>
  );
}
