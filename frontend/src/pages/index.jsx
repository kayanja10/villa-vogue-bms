import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Plus, Eye, Edit, Trash2, Download, X, Save, Check,
  Package, Users, BarChart3, DollarSign, FileText, Truck, Shield,
  Activity, MessageSquare, Tag, Layers, AlertTriangle, Wallet,
  ClipboardList, BookOpen, UserCircle, Settings as SettingsIcon,
  CheckCircle, XCircle, Lock, Unlock, Key, Upload, Image as ImgIcon,
  MessageCircle, RefreshCw, Star, Bell, TrendingUp, Clock, ChevronDown,
  Send, Printer, Phone, Mail, MapPin, Calendar, Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import * as apiLib from '../lib/api';
import { useStore } from '../store/useStore';

// ─── REUSABLE COMPONENTS ───────────────────────────────────────
function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  if (!open) return null;
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className={`bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full ${sizes[size]} my-8`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-heading text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition-colors"><X size={18}/></button>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100 dark:border-gray-800">{footer}</div>}
      </div>
    </div>
  );
}

function Page({ title, subtitle, icon: Icon, children, action }) {
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2"><Icon size={22} className="text-[#C9A96E]"/><h1 className="text-2xl font-heading font-semibold text-gray-900 dark:text-white">{title}</h1></div>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5 ml-8">{subtitle}</p>}
        </div>
        {action && <div className="flex items-center gap-2">{action}</div>}
      </div>
      {children}
    </div>
  );
}

function Empty({ icon: Icon, message, sub }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon size={48} className="text-gray-200 dark:text-gray-700 mb-3"/>
      <p className="font-medium text-gray-500">{message}</p>
      {sub && <p className="text-sm text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function Loader() {
  return <div className="flex justify-center py-16"><div className="w-8 h-8 border-3 border-[#C9A96E] border-t-transparent rounded-full animate-spin"/></div>;
}

// ─── ORDERS ────────────────────────────────────────────────────
export function Orders() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['orders', search, page, status],
    queryFn: () => apiLib.orders.list({ search, page, limit: 20, status }).then(r => r.data),
  });

  const printReceipt = (order) => {
    const items = (() => { try { return JSON.parse(order.items); } catch { return []; } })();
    const w = window.open('', '_blank', 'width=380,height=600');
    w.document.write(`<!DOCTYPE html><html><head><title>Receipt</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Courier New',monospace;font-size:12px;padding:15px;max-width:320px}
    .c{text-align:center}.b{font-weight:bold}.hr{border:none;border-top:1px dashed;margin:8px 0}
    table{width:100%;border-collapse:collapse}td{padding:2px 0}img{display:block;margin:0 auto 8px;max-width:80px;height:80px;object-fit:contain}</style></head><body>
    <div class="c"><img src="${window.location.origin}/logo.png" onerror="this.style.display='none'"/>
    <div class="b" style="font-size:16px">VILLA VOGUE FASHIONS</div>
    <div>Where Fashion Finds a Home</div><div>Tel: 0782 860372 / 0745 903189</div></div>
    <hr class="hr"/>
    <table><tr><td>Receipt:</td><td class="b" style="text-align:right">${order.orderNumber}</td></tr>
    <tr><td>Date:</td><td style="text-align:right">${new Date(order.createdAt).toLocaleString()}</td></tr>
    ${order.customerName && order.customerName !== 'Walk-in Customer' ? `<tr><td>Customer:</td><td style="text-align:right">${order.customerName}</td></tr>` : ''}
    </table><hr class="hr"/>
    <table>${items.map(i => `<tr><td>${i.name} x${i.quantity}</td><td style="text-align:right">UGX ${(i.price*i.quantity).toLocaleString()}</td></tr>`).join('')}</table>
    <hr class="hr"/>
    ${order.discount > 0 ? `<table><tr><td>Discount:</td><td style="text-align:right">-UGX ${Number(order.discount).toLocaleString()}</td></tr></table>` : ''}
    <table><tr class="b"><td>TOTAL:</td><td style="text-align:right">UGX ${Number(order.total).toLocaleString()}</td></tr>
    <tr><td>Payment:</td><td style="text-align:right">${order.paymentMethod?.replace(/_/g,' ').toUpperCase()}</td></tr></table>
    <hr class="hr"/><div class="c"><div>Thank you for shopping at</div><div class="b">Villa Vogue Fashions!</div></div>
    <script>window.onload=()=>{window.print();setTimeout(window.close,500)}</script></body></html>`);
    w.document.close();
  };

  const whatsapp = (order) => {
    if (!order.customerPhone) return toast.error('No phone number on this order');
    const items = (() => { try { return JSON.parse(order.items).map(i => `• ${i.name} x${i.quantity} = UGX ${(i.price*i.quantity).toLocaleString()}`).join('\n'); } catch { return 'Items as per receipt'; } })();
    const msg = encodeURIComponent(`🛍️ *VILLA VOGUE FASHIONS*\n_Where Fashion Finds a Home_\n\n*Receipt: ${order.orderNumber}*\nDate: ${new Date(order.createdAt).toLocaleString()}\n\n${items}\n\n*TOTAL: UGX ${Number(order.total).toLocaleString()}*\nPayment: ${order.paymentMethod?.replace(/_/g,' ')}\n\nThank you! 💛\n📞 0782 860372`);
    const phone = order.customerPhone.replace(/\D/g,'');
    const intl = phone.startsWith('0') ? '256'+phone.slice(1) : phone;
    window.open(`https://wa.me/${intl}?text=${msg}`, '_blank');
  };

  return (
    <Page title="Orders" subtitle={`${data?.total || 0} total`} icon={FileText}
      action={<>
        <select className="input py-2 text-sm w-36" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="voided">Voided</option>
        </select>
      </>}>
      <div className="card">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input className="input pl-9" placeholder="Search order #, customer name..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}/></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50"><tr>{['Order #','Customer','Items','Total','Payment','Status','Date','Actions'].map(h=><th key={h} className="table-header">{h}</th>)}</tr></thead>
            <tbody>
              {data?.orders?.map(o => (
                <tr key={o.id} className="table-row">
                  <td className="table-cell font-mono font-semibold text-[#A8824A] text-xs">{o.orderNumber}</td>
                  <td className="table-cell text-sm">{o.customerName||<span className="text-gray-400 italic">Walk-in</span>}</td>
                  <td className="table-cell text-sm">{(() => { try { return JSON.parse(o.items).length; } catch { return '?'; } })()} items</td>
                  <td className="table-cell font-semibold text-sm">UGX {Number(o.total).toLocaleString()}</td>
                  <td className="table-cell"><span className="badge-gold capitalize text-xs">{o.paymentMethod?.replace(/_/g,' ')}</span></td>
                  <td className="table-cell"><span className={`badge capitalize text-xs ${o.orderStatus==='completed'?'badge-green':o.orderStatus==='voided'?'badge-red':'badge-yellow'}`}>{o.orderStatus}</span></td>
                  <td className="table-cell text-xs text-gray-400">{o.createdAt?format(new Date(o.createdAt),'MMM d, HH:mm'):'—'}</td>
                  <td className="table-cell">
                    <div className="flex gap-1">
                      <button onClick={() => setSelected(o)} className="btn-ghost py-1 px-2" title="View"><Eye size={13}/></button>
                      <button onClick={() => printReceipt(o)} className="btn-ghost py-1 px-2" title="Print"><Printer size={13}/></button>
                      {o.customerPhone && <button onClick={() => whatsapp(o)} className="btn-ghost py-1 px-2 text-green-600" title="WhatsApp"><MessageCircle size={13}/></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {isLoading && <Loader/>}
        {!isLoading && !data?.orders?.length && <Empty icon={FileText} message="No orders found" sub="Use the POS to create your first order"/>}
        {data?.pages > 1 && (
          <div className="flex justify-between items-center p-4 border-t border-gray-100 dark:border-gray-800 text-sm">
            <span className="text-gray-500">Page {page} of {data.pages}</span>
            <div className="flex gap-2">
              <button disabled={page===1} onClick={() => setPage(p=>p-1)} className="btn-secondary py-1 px-3 text-xs disabled:opacity-40">Prev</button>
              <button disabled={page===data.pages} onClick={() => setPage(p=>p+1)} className="btn-secondary py-1 px-3 text-xs disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Order ${selected?.orderNumber}`}>
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-xs text-gray-500">Customer</p><p className="font-medium">{selected.customerName||'Walk-in'}</p></div>
              <div><p className="text-xs text-gray-500">Phone</p><p className="font-medium">{selected.customerPhone||'—'}</p></div>
              <div><p className="text-xs text-gray-500">Payment</p><p className="font-medium capitalize">{selected.paymentMethod?.replace(/_/g,' ')}</p></div>
              <div><p className="text-xs text-gray-500">Date</p><p className="font-medium">{selected.createdAt?format(new Date(selected.createdAt),'MMM d yyyy, HH:mm'):'—'}</p></div>
            </div>
            <div className="border-t dark:border-gray-800 pt-3">
              <p className="font-semibold mb-2">Items</p>
              {(() => { try { return JSON.parse(selected.items).map((i,idx) => (<div key={idx} className="flex justify-between py-1 border-b border-gray-50 dark:border-gray-800"><span>{i.name} × {i.quantity}</span><span className="font-medium">UGX {(i.price*i.quantity).toLocaleString()}</span></div>)); } catch { return null; } })()}
            </div>
            {selected.discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-UGX {Number(selected.discount).toLocaleString()}</span></div>}
            <div className="flex justify-between font-bold text-base border-t dark:border-gray-800 pt-2"><span>Total</span><span className="text-[#A8824A]">UGX {Number(selected.total).toLocaleString()}</span></div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => printReceipt(selected)} className="btn-secondary flex-1 justify-center"><Printer size={15}/> Print</button>
              {selected.customerPhone && <button onClick={() => whatsapp(selected)} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white font-medium text-sm"><MessageCircle size={15}/> WhatsApp</button>}
            </div>
          </div>
        )}
      </Modal>
    </Page>
  );
}

// ─── INVENTORY ─────────────────────────────────────────────────
export function Inventory() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editProd, setEditProd] = useState(null);
  const [adjustProd, setAdjustProd] = useState(null);
  const [form, setForm] = useState({ name:'', price:'', costPrice:'', stock:'', categoryId:'', description:'', sku:'', lowStockThreshold:'5' });
  const [adjustForm, setAdjustForm] = useState({ type:'in', quantity:'', reason:'' });
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const { data } = useQuery({ queryKey: ['products', search], queryFn: () => apiLib.products.list({ search, limit: 200 }).then(r => r.data) });
  const { data: cats } = useQuery({ queryKey: ['categories'], queryFn: () => apiLib.categories.list().then(r => r.data) });
  const { data: valuation } = useQuery({ queryKey: ['valuation'], queryFn: () => apiLib.inventory.valuation().then(r => r.data) });

  const ff = (k,v) => setForm(p => ({...p,[k]:v}));

  const createProd = useMutation({
    mutationFn: async (d) => {
      let images = [];
      if (imageFile) {
        setUploading(true);
        try {
          const res = await apiLib.uploads.image(imageFile);
          images = [res.data.url];
          if (res.data.fallback) toast('Image stored locally (set up Cloudinary for cloud storage)', { icon: 'ℹ️' });
        } catch { toast.error('Image upload failed'); }
        finally { setUploading(false); }
      } else if (imageUrl.trim()) {
        images = [imageUrl.trim()];
      }
      return apiLib.products.create({ ...d, images });
    },
    onSuccess: () => { toast.success('Product created!'); setShowAdd(false); setForm({name:'',price:'',costPrice:'',stock:'',categoryId:'',description:'',sku:'',lowStockThreshold:'5'}); setImageFile(null); setImageUrl(''); qc.invalidateQueries(['products']); },
    onError: e => toast.error(e.response?.data?.error||'Failed to create'),
  });

  const updateProd = useMutation({
    mutationFn: (d) => apiLib.products.update(d.id, d),
    onSuccess: () => { toast.success('Updated!'); setEditProd(null); qc.invalidateQueries(['products']); },
    onError: e => toast.error(e.response?.data?.error||'Failed'),
  });

  const deleteProd = useMutation({
    mutationFn: (id) => apiLib.products.delete(id),
    onSuccess: () => { toast.success('Product removed'); qc.invalidateQueries(['products']); },
  });

  const adjustStock = useMutation({
    mutationFn: (d) => apiLib.products.adjustStock(d.id, { type: d.type, quantity: d.quantity, reason: d.reason }),
    onSuccess: () => { toast.success('Stock updated!'); setAdjustProd(null); setAdjustForm({type:'in',quantity:'',reason:''}); qc.invalidateQueries(['products']); },
    onError: e => toast.error(e.response?.data?.error||'Failed'),
  });

  const openEdit = (p) => {
    setEditProd(p);
    const imgs = (() => { try { return JSON.parse(p.images||'[]'); } catch { return []; } })();
    setImageUrl(imgs[0]||'');
    setForm({ name:p.name, price:p.price, costPrice:p.costPrice||'', stock:p.stock, categoryId:p.categoryId||'', description:p.description||'', sku:p.sku||'', lowStockThreshold:p.lowStockThreshold||5 });
  };

  return (
    <Page title="Inventory" subtitle={`${data?.total||0} products`} icon={Package}
      action={<button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={16}/> Add Product</button>}>

      {/* Valuation strip */}
      {valuation && (
        <div className="grid grid-cols-3 gap-3">
          {[['Stock Cost Value','cost_value','text-orange-600'],['Retail Value','retail_value','text-[#A8824A]'],['Products','product_count','text-blue-600']].map(([l,k,c]) => (
            <div key={k} className="card p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">{l}</p>
              <p className={`font-heading font-bold text-lg ${c}`}>{k==='product_count' ? valuation[k] : `UGX ${Number(valuation[k]||0).toLocaleString()}`}</p>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex gap-3">
          <div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input className="input pl-9" placeholder="Search products, SKU, barcode..." value={search} onChange={e => setSearch(e.target.value)}/></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50"><tr>{['Image','Product','SKU','Category','Price','Cost','Stock','Margin','Actions'].map(h=><th key={h} className="table-header">{h}</th>)}</tr></thead>
            <tbody>
              {data?.products?.map(p => {
                const margin = p.costPrice > 0 ? (((p.price-p.costPrice)/p.price)*100).toFixed(0) : '—';
                const imgs = (() => { try { return JSON.parse(p.images||'[]'); } catch { return []; } })();
                return (
                  <tr key={p.id} className="table-row">
                    <td className="table-cell"><div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden">{imgs[0]?<img src={imgs[0]} alt={p.name} className="w-full h-full object-cover"/>:<div className="w-full h-full flex items-center justify-center text-lg">👗</div>}</div></td>
                    <td className="table-cell font-medium">{p.name}</td>
                    <td className="table-cell text-xs font-mono text-gray-400">{p.sku||'—'}</td>
                    <td className="table-cell"><span className="badge-gray text-xs">{p.category?.name||'—'}</span></td>
                    <td className="table-cell font-medium text-sm">UGX {p.price?.toLocaleString()}</td>
                    <td className="table-cell text-gray-500 text-sm">UGX {p.costPrice?.toLocaleString()}</td>
                    <td className="table-cell"><span className={`badge font-semibold ${p.stock===0?'badge-red':p.stock<=p.lowStockThreshold?'badge-yellow':'badge-green'}`}>{p.stock}</span></td>
                    <td className="table-cell"><span className="badge-gold">{margin}%</span></td>
                    <td className="table-cell">
                      <div className="flex gap-1">
                        <button onClick={() => { setAdjustProd(p); setAdjustForm({type:'in',quantity:'',reason:''}); }} className="btn-ghost py-1 px-2 text-xs" title="Adjust Stock"><Package size={13}/></button>
                        <button onClick={() => openEdit(p)} className="btn-ghost py-1 px-2 text-xs" title="Edit"><Edit size={13}/></button>
                        <button onClick={() => window.confirm('Remove product?') && deleteProd.mutate(p.id)} className="btn-ghost py-1 px-2 text-xs text-red-500" title="Delete"><Trash2 size={13}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!data?.products?.length && !false && <Empty icon={Package} message="No products yet" sub='Click "Add Product" to add your first item'/>}
      </div>

      {/* Add Product Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New Product" size="lg"
        footer={<><button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button><button onClick={() => createProd.mutate(form)} disabled={!form.name||!form.price||createProd.isPending||uploading} className="btn-primary disabled:opacity-40">{uploading?'Uploading...':createProd.isPending?'Saving...':'Create Product'}</button></>}>
        <div className="space-y-4">
          <div>
            <label className="label">Product Image</label>
            <div className="flex gap-3 items-start">
              <div className="w-20 h-20 rounded-xl bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 overflow-hidden flex items-center justify-center shrink-0 cursor-pointer hover:border-[#C9A96E] transition-colors" onClick={() => fileRef.current?.click()}>
                {imageFile ? <img src={URL.createObjectURL(imageFile)} className="w-full h-full object-cover"/> : imageUrl ? <img src={imageUrl} className="w-full h-full object-cover"/> : <div className="text-center"><ImgIcon size={20} className="text-gray-400 mx-auto"/><p className="text-[10px] text-gray-400 mt-1">Click to upload</p></div>}
              </div>
              <div className="flex-1 space-y-2">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { if(e.target.files[0]) { setImageFile(e.target.files[0]); setImageUrl(''); }}}/>
                <button type="button" onClick={() => fileRef.current?.click()} className="btn-secondary text-xs py-2 w-full justify-center"><Upload size={13}/> Upload from Computer</button>
                <input className="input text-xs py-2" placeholder="Or paste image URL (https://...)" value={imageUrl} onChange={e => { setImageUrl(e.target.value); setImageFile(null); }}/>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="label">Product Name *</label><input className="input" value={form.name} onChange={e => ff('name',e.target.value)} placeholder="e.g. Floral Wrap Dress"/></div>
            <div><label className="label">SKU / Code</label><input className="input" value={form.sku} onChange={e => ff('sku',e.target.value)} placeholder="VV-001"/></div>
            <div><label className="label">Category</label><select className="input" value={form.categoryId} onChange={e => ff('categoryId',e.target.value)}><option value="">Select category</option>{cats?.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label className="label">Selling Price (UGX) *</label><input className="input" type="number" value={form.price} onChange={e => ff('price',e.target.value)}/></div>
            <div><label className="label">Cost Price (UGX)</label><input className="input" type="number" value={form.costPrice} onChange={e => ff('costPrice',e.target.value)}/></div>
            <div><label className="label">Opening Stock</label><input className="input" type="number" value={form.stock} onChange={e => ff('stock',e.target.value)}/></div>
            <div><label className="label">Low Stock Alert</label><input className="input" type="number" value={form.lowStockThreshold} onChange={e => ff('lowStockThreshold',e.target.value)}/></div>
            <div className="col-span-2"><label className="label">Description</label><textarea className="input resize-none" rows={2} value={form.description} onChange={e => ff('description',e.target.value)}/></div>
          </div>
          {form.price && form.costPrice && <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 text-sm"><p className="text-green-700 dark:text-green-400 font-medium">Profit margin: {(((parseFloat(form.price)-parseFloat(form.costPrice))/parseFloat(form.price))*100).toFixed(1)}% · UGX {(parseFloat(form.price)-parseFloat(form.costPrice)).toLocaleString()} per unit</p></div>}
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editProd} onClose={() => setEditProd(null)} title={`Edit: ${editProd?.name}`} size="lg"
        footer={<><button onClick={() => setEditProd(null)} className="btn-secondary">Cancel</button><button onClick={() => updateProd.mutate({ id: editProd?.id, ...form, images: imageUrl ? JSON.stringify([imageUrl]) : editProd?.images })} disabled={updateProd.isPending} className="btn-primary">{updateProd.isPending?'Saving...':'Save Changes'}</button></>}>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><label className="label">Product Name</label><input className="input" value={form.name} onChange={e => ff('name',e.target.value)}/></div>
          <div><label className="label">Selling Price</label><input className="input" type="number" value={form.price} onChange={e => ff('price',e.target.value)}/></div>
          <div><label className="label">Cost Price</label><input className="input" type="number" value={form.costPrice} onChange={e => ff('costPrice',e.target.value)}/></div>
          <div><label className="label">Category</label><select className="input" value={form.categoryId} onChange={e => ff('categoryId',e.target.value)}><option value="">None</option>{cats?.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label className="label">Low Stock Alert</label><input className="input" type="number" value={form.lowStockThreshold} onChange={e => ff('lowStockThreshold',e.target.value)}/></div>
          <div className="col-span-2"><label className="label">Image URL</label><input className="input" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..."/></div>
          <div className="col-span-2"><label className="label">Description</label><textarea className="input resize-none" rows={2} value={form.description} onChange={e => ff('description',e.target.value)}/></div>
        </div>
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal open={!!adjustProd} onClose={() => setAdjustProd(null)} title={`Adjust Stock — ${adjustProd?.name}`}
        footer={<><button onClick={() => setAdjustProd(null)} className="btn-secondary">Cancel</button><button onClick={() => adjustStock.mutate({ id: adjustProd?.id, ...adjustForm, quantity: parseInt(adjustForm.quantity) })} disabled={!adjustForm.quantity||adjustStock.isPending} className="btn-primary">Update Stock</button></>}>
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center"><p className="text-xs text-gray-500 mb-1">Current Stock</p><p className="text-4xl font-heading font-bold text-gray-900 dark:text-white">{adjustProd?.stock}</p></div>
          <div><label className="label">Adjustment Type</label>
            <select className="input" value={adjustForm.type} onChange={e => setAdjustForm(p=>({...p,type:e.target.value}))}>
              <option value="in">➕ Stock In (received new stock)</option>
              <option value="out">➖ Stock Out (remove stock)</option>
              <option value="set">📌 Set Exact Quantity</option>
            </select>
          </div>
          <div><label className="label">Quantity *</label><input className="input" type="number" min="0" value={adjustForm.quantity} onChange={e => setAdjustForm(p=>({...p,quantity:e.target.value}))}/></div>
          {adjustForm.quantity && <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 text-sm text-blue-700 dark:text-blue-400">
            New stock will be: <strong>{adjustForm.type==='in' ? (adjustProd?.stock||0)+parseInt(adjustForm.quantity||0) : adjustForm.type==='out' ? Math.max(0,(adjustProd?.stock||0)-parseInt(adjustForm.quantity||0)) : adjustForm.quantity}</strong>
          </div>}
          <div><label className="label">Reason</label><input className="input" value={adjustForm.reason} onChange={e => setAdjustForm(p=>({...p,reason:e.target.value}))} placeholder="e.g. New delivery from supplier, damaged stock..."/></div>
        </div>
      </Modal>
    </Page>
  );
}

// ─── CUSTOMERS ─────────────────────────────────────────────────
export function Customers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ name:'', phone:'', email:'', address:'', birthday:'', notes:'' });
  const { data } = useQuery({ queryKey: ['customers', search], queryFn: () => apiLib.customers.list({ search, limit: 100 }).then(r => r.data) });
  const { data: birthdays } = useQuery({ queryKey: ['birthdays'], queryFn: () => apiLib.customers.birthdays().then(r => r.data) });

  const create = useMutation({ mutationFn: d => apiLib.customers.create(d), onSuccess: () => { toast.success('Customer added!'); setShowAdd(false); setForm({name:'',phone:'',email:'',address:'',birthday:'',notes:''}); qc.invalidateQueries(['customers']); }, onError: e => toast.error(e.response?.data?.error||'Failed') });

  const wa = (c, msg) => {
    if (!c.phone) return toast.error('No phone number');
    const ph = c.phone.replace(/\D/g,'');
    const intl = ph.startsWith('0') ? '256'+ph.slice(1) : ph;
    window.open(`https://wa.me/${intl}?text=${encodeURIComponent(msg||`Hello ${c.name}! 👗 This is Villa Vogue Fashions. How can we help you today?`)}`, '_blank');
  };

  const tierColor = (t) => ({ platinum:'bg-purple-100 text-purple-700', gold:'badge-gold', silver:'badge-blue', bronze:'badge-gray' }[t||'bronze']||'badge-gray');

  return (
    <Page title="Customers" subtitle={`${data?.total||0} customers`} icon={Users}
      action={<button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={16}/> Add Customer</button>}>

      {birthdays?.length > 0 && (
        <div className="bg-gradient-to-r from-[#C9A96E]/20 to-[#A8824A]/10 border border-[#C9A96E]/30 rounded-xl p-4 flex items-center gap-3 flex-wrap">
          <span className="text-2xl">🎂</span>
          <div className="flex-1"><p className="font-semibold text-[#A8824A] text-sm">Birthday Today!</p><p className="text-sm text-gray-600">{birthdays.map(b=>b.name).join(', ')}</p></div>
          {birthdays.map(b => (
            <button key={b.id} onClick={() => wa(b, `🎂 Happy Birthday ${b.name}! 🎉\n\nWishing you a wonderful day! Visit Villa Vogue Fashions for a special birthday treat! 👗✨\n\n💛 Villa Vogue Fashions\n📞 0782 860372`)} className="btn-primary text-xs py-1.5">🎉 Wish {b.name.split(' ')[0]}</button>
          ))}
        </div>
      )}

      <div className="card">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input className="input pl-9" placeholder="Search by name, phone, email..." value={search} onChange={e => setSearch(e.target.value)}/></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50"><tr>{['Customer','Phone','Email','Tier','Spent','Points','Birthday','Actions'].map(h=><th key={h} className="table-header">{h}</th>)}</tr></thead>
            <tbody>
              {data?.customers?.map(c => (
                <tr key={c.id} className="table-row">
                  <td className="table-cell"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-[#C9A96E]/20 flex items-center justify-center text-[#A8824A] text-sm font-bold">{c.name[0]}</div><span className="font-medium text-sm">{c.name}</span></div></td>
                  <td className="table-cell text-sm">{c.phone||'—'}</td>
                  <td className="table-cell text-sm text-gray-500">{c.email||'—'}</td>
                  <td className="table-cell"><span className={`badge capitalize text-xs ${tierColor(c.tier)}`}>{c.tier||'bronze'}</span></td>
                  <td className="table-cell font-medium text-sm">UGX {Number(c.totalSpent||0).toLocaleString()}</td>
                  <td className="table-cell text-sm">{c.loyaltyPoints||0} pts</td>
                  <td className="table-cell text-xs text-gray-400">{c.birthday||'—'}</td>
                  <td className="table-cell">
                    <div className="flex gap-1">
                      <button onClick={() => setSelected(c)} className="btn-ghost py-1 px-2" title="View"><Eye size={13}/></button>
                      <button onClick={() => wa(c)} className="btn-ghost py-1 px-2 text-green-600" title="WhatsApp"><MessageCircle size={13}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!data?.customers?.length && <Empty icon={Users} message="No customers yet" sub="Add your first customer above"/>}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Customer"
        footer={<><button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button><button onClick={() => create.mutate(form)} disabled={!form.name||create.isPending} className="btn-primary">{create.isPending?'Saving...':'Add Customer'}</button></>}>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><label className="label">Full Name *</label><input className="input" value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} autoFocus/></div>
          <div><label className="label">Phone (WhatsApp)</label><input className="input" type="tel" placeholder="+256..." value={form.phone} onChange={e => setForm(p=>({...p,phone:e.target.value}))}/></div>
          <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={e => setForm(p=>({...p,email:e.target.value}))}/></div>
          <div><label className="label">Birthday (for free wishes!)</label><input className="input" type="date" value={form.birthday} onChange={e => setForm(p=>({...p,birthday:e.target.value}))}/></div>
          <div><label className="label">Address</label><input className="input" value={form.address} onChange={e => setForm(p=>({...p,address:e.target.value}))}/></div>
          <div className="col-span-2"><label className="label">Notes</label><textarea className="input resize-none" rows={2} value={form.notes} onChange={e => setForm(p=>({...p,notes:e.target.value}))}/></div>
        </div>
      </Modal>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name||''} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              {[['Total Spent','UGX '+Number(selected.totalSpent||0).toLocaleString(),'text-[#A8824A]'],['Loyalty Points',(selected.loyaltyPoints||0)+' pts','text-blue-600'],['Visits',(selected.visitCount||0),'text-green-600']].map(([l,v,c]) => (
                <div key={l} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3"><p className="text-xs text-gray-500 mb-1">{l}</p><p className={`font-bold text-lg ${c}`}>{v}</p></div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-gray-500">Phone</p><p className="font-medium">{selected.phone||'—'}</p></div>
              <div><p className="text-xs text-gray-500">Email</p><p className="font-medium">{selected.email||'—'}</p></div>
              <div><p className="text-xs text-gray-500">Birthday</p><p className="font-medium">{selected.birthday||'—'}</p></div>
              <div><p className="text-xs text-gray-500">Tier</p><span className={`badge capitalize ${tierColor(selected.tier)}`}>{selected.tier||'bronze'}</span></div>
              {selected.address && <div className="col-span-2"><p className="text-xs text-gray-500">Address</p><p>{selected.address}</p></div>}
              {selected.notes && <div className="col-span-2 bg-gray-50 dark:bg-gray-800 rounded-xl p-3"><p className="text-xs text-gray-500 mb-1">Notes</p><p className="text-sm">{selected.notes}</p></div>}
            </div>
            <button onClick={() => wa(selected)} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold transition-colors">
              <MessageCircle size={18}/> Send WhatsApp Message
            </button>
          </div>
        )}
      </Modal>
    </Page>
  );
}

// ─── EXPENSES ──────────────────────────────────────────────────
export function Expenses() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; });
  const [to, setTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [form, setForm] = useState({ title:'', amount:'', category:'General', description:'' });
  const { data } = useQuery({ queryKey: ['expenses', from, to], queryFn: () => apiLib.expenses.list({ from, to }).then(r => r.data) });
  const create = useMutation({ mutationFn: d => apiLib.expenses.create(d), onSuccess: () => { toast.success('Expense recorded'); setShowAdd(false); setForm({title:'',amount:'',category:'General',description:''}); qc.invalidateQueries(['expenses']); } });
  const remove = useMutation({ mutationFn: id => apiLib.expenses.delete(id), onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries(['expenses']); } });

  const byCategory = {};
  data?.expenses?.forEach(e => { byCategory[e.category] = (byCategory[e.category]||0) + e.amount; });
  const topCat = Object.entries(byCategory).sort((a,b)=>b[1]-a[1])[0];

  return (
    <Page title="Expenses" subtitle="Track business costs" icon={DollarSign}
      action={<button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={16}/> Record Expense</button>}>
      <div className="flex gap-3 flex-wrap items-center">
        <input type="date" className="input py-2 text-sm w-36" value={from} onChange={e => setFrom(e.target.value)}/>
        <span className="text-gray-400">to</span>
        <input type="date" className="input py-2 text-sm w-36" value={to} onChange={e => setTo(e.target.value)}/>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4 border-l-4 border-red-400"><p className="text-xs text-gray-500 mb-1">Total Period</p><p className="text-xl font-heading font-bold text-red-600">UGX {Number(data?.totalAmount||0).toLocaleString()}</p></div>
        <div className="card p-4 border-l-4 border-gray-300"><p className="text-xs text-gray-500 mb-1">Transactions</p><p className="text-xl font-heading font-bold">{data?.expenses?.length||0}</p></div>
        {topCat && <div className="card p-4 border-l-4 border-orange-300 col-span-2"><p className="text-xs text-gray-500 mb-1">Biggest Category</p><p className="text-xl font-heading font-bold text-orange-600">{topCat[0]}: UGX {topCat[1].toLocaleString()}</p></div>}
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800/50"><tr>{['Title','Category','Amount','Date','Notes','Actions'].map(h=><th key={h} className="table-header">{h}</th>)}</tr></thead>
          <tbody>
            {data?.expenses?.map(e => (
              <tr key={e.id} className="table-row">
                <td className="table-cell font-medium">{e.title}</td>
                <td className="table-cell"><span className="badge-gray text-xs">{e.category}</span></td>
                <td className="table-cell font-semibold text-red-600">UGX {Number(e.amount).toLocaleString()}</td>
                <td className="table-cell text-xs text-gray-400">{e.createdAt?format(new Date(e.createdAt),'MMM d, yyyy'):'—'}</td>
                <td className="table-cell text-xs text-gray-500 max-w-xs truncate">{e.description||'—'}</td>
                <td className="table-cell"><button onClick={() => window.confirm('Delete?')&&remove.mutate(e.id)} className="btn-ghost py-1 px-2 text-red-500"><Trash2 size={13}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data?.expenses?.length && <Empty icon={DollarSign} message="No expenses in this period"/>}
      </div>
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Record Expense"
        footer={<><button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button><button onClick={() => create.mutate(form)} disabled={!form.title||!form.amount||create.isPending} className="btn-primary">Save Expense</button></>}>
        <div className="space-y-3">
          <div><label className="label">Title *</label><input className="input" value={form.title} onChange={e => setForm(p=>({...p,title:e.target.value}))} autoFocus/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Amount (UGX) *</label><input className="input" type="number" value={form.amount} onChange={e => setForm(p=>({...p,amount:e.target.value}))}/></div>
            <div><label className="label">Category</label><select className="input" value={form.category} onChange={e => setForm(p=>({...p,category:e.target.value}))}>{['Rent','Utilities','Salaries','Stock Purchase','Marketing','Transport','Maintenance','Equipment','Cleaning','General'].map(c=><option key={c}>{c}</option>)}</select></div>
          </div>
          <div><label className="label">Description / Notes</label><textarea className="input resize-none" rows={2} value={form.description} onChange={e => setForm(p=>({...p,description:e.target.value}))}/></div>
        </div>
      </Modal>
    </Page>
  );
}

// ─── STAFF ─────────────────────────────────────────────────────
export function Staff() {
  const qc = useQueryClient();
  const { user } = useStore();
  const [now, setNow] = useState(new Date());
  const [showTarget, setShowTarget] = useState(false);
  const [targetForm, setTargetForm] = useState({ userId:'', period:'', targetSales:'', targetOrders:'' });

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  const { data: shifts } = useQuery({ queryKey: ['shifts'], queryFn: () => apiLib.staff.shifts().then(r => r.data), refetchInterval: 30000 });
  const { data: targets } = useQuery({ queryKey: ['targets'], queryFn: () => apiLib.staff.targets().then(r => r.data) });
  const { data: usersList } = useQuery({ queryKey: ['users-list'], queryFn: () => apiLib.users.list().then(r => r.data) });

  const clockIn = useMutation({ mutationFn: () => apiLib.staff.clockIn(), onSuccess: () => { toast.success('Clocked in! ✅'); qc.invalidateQueries(['shifts']); }, onError: e => toast.error(e.response?.data?.error||'Already clocked in') });
  const clockOut = useMutation({ mutationFn: () => apiLib.staff.clockOut(), onSuccess: () => { toast.success('Clocked out! 👋'); qc.invalidateQueries(['shifts']); }, onError: e => toast.error(e.response?.data?.error||'Not clocked in') });
  const setTarget = useMutation({ mutationFn: d => apiLib.staff.setTarget(d), onSuccess: () => { toast.success('Target set!'); setShowTarget(false); qc.invalidateQueries(['targets']); } });

  const myShift = shifts?.find(s => s.userId === user?.id && !s.clockOut);
  const elapsed = myShift ? (() => {
    const diff = now - new Date(myShift.clockIn);
    const h = Math.floor(diff/3600000), m = Math.floor((diff%3600000)/60000), s = Math.floor((diff%60000)/1000);
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  })() : null;

  return (
    <Page title="Staff & Shifts" subtitle="Clock in/out and performance tracking" icon={UserCircle}>
      <div className="card p-5">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Current Time</p>
            <p className="text-4xl font-mono font-bold text-gray-900 dark:text-white">{format(now,'HH:mm:ss')}</p>
            <p className="text-sm text-gray-400 mt-1">{format(now,'EEEE, MMMM d yyyy')}</p>
          </div>
          <div className="sm:border-l sm:pl-6 border-gray-100 dark:border-gray-800 flex-1">
            {myShift ? (
              <div>
                <div className="flex items-center gap-2 mb-1"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"/><span className="text-green-600 text-sm font-medium">Currently Clocked In</span></div>
                <p className="text-4xl font-mono font-bold text-[#C9A96E]">{elapsed}</p>
                <p className="text-xs text-gray-400 mt-1">Since {format(new Date(myShift.clockIn),'HH:mm')}</p>
              </div>
            ) : (
              <div><p className="text-gray-500 font-medium">You are not clocked in</p><p className="text-sm text-gray-400">Click Clock In to start your shift</p></div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <button onClick={() => clockIn.mutate()} disabled={!!myShift||clockIn.isPending} className="btn-primary px-8 disabled:opacity-40">▶ Clock In</button>
            <button onClick={() => clockOut.mutate()} disabled={!myShift||clockOut.isPending} className="btn-secondary px-8 disabled:opacity-40">⏹ Clock Out</button>
          </div>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-heading font-semibold">Recent Shifts</h3>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800/50"><tr>{['Staff','Clock In','Clock Out','Duration','Status'].map(h=><th key={h} className="table-header">{h}</th>)}</tr></thead>
          <tbody>
            {shifts?.map(s => (
              <tr key={s.id} className="table-row">
                <td className="table-cell font-medium">{s.user?.username||`#${s.userId}`}</td>
                <td className="table-cell text-sm">{format(new Date(s.clockIn),'MMM d, HH:mm')}</td>
                <td className="table-cell text-sm">{s.clockOut?format(new Date(s.clockOut),'MMM d, HH:mm'):'—'}</td>
                <td className="table-cell font-mono text-sm">{s.id===myShift?.id?elapsed:s.hoursWorked?(s.hoursWorked.toFixed(1)+' hrs'):'—'}</td>
                <td className="table-cell">{s.clockOut?<span className="badge-gray text-xs">Done</span>:<span className="badge-green text-xs flex w-fit items-center gap-1"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"/>Active</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!shifts?.length && <Empty icon={Clock} message="No shifts recorded yet"/>}
      </div>
    </Page>
  );
}

// ─── STOCK COUNT ───────────────────────────────────────────────
export function StockCount() {
  const qc = useQueryClient();
  const [counts, setCounts] = useState({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const { data } = useQuery({ queryKey: ['products',''], queryFn: () => apiLib.products.list({ limit: 500 }).then(r => r.data) });

  const filtered = data?.products?.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku||'').toLowerCase().includes(search.toLowerCase())) || [];
  const changed = Object.keys(counts).filter(k => counts[k] !== '');

  const handleSave = async () => {
    if (!changed.length) return toast.error('No counts entered');
    setSaving(true);
    let ok = 0, fail = 0;
    for (const id of changed) {
      try { await apiLib.products.adjustStock(parseInt(id), { type: 'set', quantity: parseInt(counts[id]), reason: `Stock count ${new Date().toLocaleDateString()}` }); ok++; }
      catch { fail++; }
    }
    setSaving(false);
    if (ok > 0) toast.success(`${ok} products updated!`);
    if (fail > 0) toast.error(`${fail} failed`);
    setCounts({});
    qc.invalidateQueries(['products']);
  };

  return (
    <Page title="Stock Count" subtitle="Physical stock reconciliation" icon={BookOpen}
      action={<button onClick={handleSave} disabled={!changed.length||saving} className="btn-primary disabled:opacity-40">{saving?'Saving...':changed.length?`Save ${changed.length} changes`:'Save Changes'}</button>}>
      <div className="card p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-700 dark:text-blue-400">Enter the <strong>actual physical count</strong> for each product. Only changed rows will be saved. Gold rows = you've entered a count.</p>
      </div>
      <div className="card">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input className="input pl-9" placeholder="Filter products..." value={search} onChange={e => setSearch(e.target.value)}/></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50"><tr>{['Product','SKU','System Stock','Physical Count','Variance','Status'].map(h=><th key={h} className="table-header">{h}</th>)}</tr></thead>
            <tbody>
              {filtered.map(p => {
                const cnt = counts[p.id];
                const hasCount = cnt !== undefined && cnt !== '';
                const variance = hasCount ? parseInt(cnt) - p.stock : null;
                return (
                  <tr key={p.id} className={`table-row ${hasCount?'bg-[#C9A96E]/5 dark:bg-[#C9A96E]/10':''}`}>
                    <td className="table-cell font-medium text-sm">{p.name}</td>
                    <td className="table-cell text-xs font-mono text-gray-400">{p.sku||'—'}</td>
                    <td className="table-cell"><span className={`badge ${p.stock===0?'badge-red':p.stock<=p.lowStockThreshold?'badge-yellow':'badge-green'}`}>{p.stock}</span></td>
                    <td className="table-cell">
                      <input type="number" min="0" placeholder={String(p.stock)}
                        className={`w-24 px-2.5 py-1.5 rounded-lg border text-sm text-center focus:outline-none transition-all ${hasCount?'border-[#C9A96E] bg-[#C9A96E]/10 font-bold focus:border-[#A8824A]':'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-[#C9A96E]'}`}
                        value={cnt??''} onChange={e => setCounts(prev => ({...prev,[p.id]:e.target.value}))}/>
                    </td>
                    <td className="table-cell">{variance!==null && <span className={`badge font-bold ${variance>0?'badge-green':variance<0?'badge-red':'badge-gray'}`}>{variance>0?'+':''}{variance}</span>}</td>
                    <td className="table-cell text-xs">{variance!==null?(variance===0?<span className="text-green-600">✓ Matches</span>:variance>0?<span className="text-blue-600">Surplus</span>:<span className="text-red-600">Shortage</span>):'—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!filtered.length && <Empty icon={Package} message="No products found"/>}
      </div>
    </Page>
  );
}

// ─── SUPPLIERS ─────────────────────────────────────────────────
export function Suppliers() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [showTxn, setShowTxn] = useState(null);
  const [form, setForm] = useState({ name:'', contactName:'', phone:'', email:'', address:'', notes:'' });
  const [txnForm, setTxnForm] = useState({ productName:'', quantity:'', unitCost:'', notes:'' });
  const { data: suppliersData } = useQuery({ queryKey: ['suppliers'], queryFn: () => apiLib.suppliers.list().then(r => r.data) });
  const { data: txns } = useQuery({ queryKey: ['supplier-txns', selected?.id], queryFn: () => apiLib.suppliers.transactions(selected?.id).then(r => r.data), enabled: !!selected?.id });

  const create = useMutation({ mutationFn: d => apiLib.suppliers.create(d), onSuccess: () => { toast.success('Supplier added!'); setShowAdd(false); setForm({name:'',contactName:'',phone:'',email:'',address:'',notes:''}); qc.invalidateQueries(['suppliers']); } });
  const addTxn = useMutation({ mutationFn: d => apiLib.suppliers.addTransaction(selected?.id, d), onSuccess: () => { toast.success('Transaction recorded!'); setShowTxn(false); setTxnForm({productName:'',quantity:'',unitCost:'',notes:''}); qc.invalidateQueries(['supplier-txns', selected?.id]); qc.invalidateQueries(['suppliers']); } });

  return (
    <Page title="Suppliers" subtitle={`${suppliersData?.length||0} suppliers`} icon={Truck}
      action={<button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={16}/> Add Supplier</button>}>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 font-heading font-semibold text-sm">All Suppliers</div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {suppliersData?.map(s => (
              <button key={s.id} onClick={() => setSelected(s)} className={`w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${selected?.id===s.id?'bg-[#C9A96E]/10 border-r-2 border-[#C9A96E]':''}`}>
                <p className="font-medium text-sm">{s.name}</p>
                <p className="text-xs text-gray-400">{s.phone||s.email||'No contact'}</p>
                <p className="text-xs text-[#A8824A] mt-0.5">UGX {Number(s.totalSupplied||0).toLocaleString()} supplied</p>
              </button>
            ))}
            {!suppliersData?.length && <div className="p-6 text-center text-gray-400 text-sm">No suppliers yet</div>}
          </div>
        </div>

        <div className="lg:col-span-2">
          {selected ? (
            <div className="card">
              <div className="flex items-start justify-between p-5 border-b border-gray-100 dark:border-gray-800">
                <div>
                  <h3 className="font-heading font-semibold text-lg">{selected.name}</h3>
                  {selected.contactName && <p className="text-sm text-gray-500">Contact: {selected.contactName}</p>}
                  <div className="flex gap-3 mt-1 text-sm text-gray-500">
                    {selected.phone && <span className="flex items-center gap-1"><Phone size={12}/> {selected.phone}</span>}
                    {selected.email && <span className="flex items-center gap-1"><Mail size={12}/> {selected.email}</span>}
                  </div>
                </div>
                <button onClick={() => setShowTxn(true)} className="btn-primary text-sm"><Plus size={15}/> Record Purchase</button>
              </div>
              <div className="p-4">
                <h4 className="font-semibold text-sm mb-3">Transaction History</h4>
                {txns?.length > 0 ? (
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800/50"><tr>{['Product','Qty','Unit Cost','Total','Date'].map(h=><th key={h} className="table-header">{h}</th>)}</tr></thead>
                    <tbody>
                      {txns.map(t => (
                        <tr key={t.id} className="table-row">
                          <td className="table-cell font-medium text-sm">{t.productName||'—'}</td>
                          <td className="table-cell text-sm">{t.quantity}</td>
                          <td className="table-cell text-sm">UGX {Number(t.unitCost||0).toLocaleString()}</td>
                          <td className="table-cell font-semibold text-sm text-[#A8824A]">UGX {Number(t.totalCost||0).toLocaleString()}</td>
                          <td className="table-cell text-xs text-gray-400">{t.createdAt?format(new Date(t.createdAt),'MMM d, yyyy'):'—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <Empty icon={Truck} message="No transactions yet" sub="Record your first purchase above"/>}
              </div>
            </div>
          ) : <div className="card flex items-center justify-center h-48"><p className="text-gray-400">Select a supplier to view details</p></div>}
        </div>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Supplier"
        footer={<><button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button><button onClick={() => create.mutate(form)} disabled={!form.name||create.isPending} className="btn-primary">Add Supplier</button></>}>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><label className="label">Supplier Name *</label><input className="input" value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))}/></div>
          <div><label className="label">Contact Person</label><input className="input" value={form.contactName} onChange={e => setForm(p=>({...p,contactName:e.target.value}))}/></div>
          <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => setForm(p=>({...p,phone:e.target.value}))}/></div>
          <div><label className="label">Email</label><input className="input" value={form.email} onChange={e => setForm(p=>({...p,email:e.target.value}))}/></div>
          <div><label className="label">Address</label><input className="input" value={form.address} onChange={e => setForm(p=>({...p,address:e.target.value}))}/></div>
          <div className="col-span-2"><label className="label">Notes</label><textarea className="input resize-none" rows={2} value={form.notes} onChange={e => setForm(p=>({...p,notes:e.target.value}))}/></div>
        </div>
      </Modal>

      <Modal open={!!showTxn} onClose={() => setShowTxn(false)} title={`Record Purchase — ${selected?.name}`}
        footer={<><button onClick={() => setShowTxn(false)} className="btn-secondary">Cancel</button><button onClick={() => addTxn.mutate({...txnForm, quantity:parseInt(txnForm.quantity), unitCost:parseFloat(txnForm.unitCost), totalCost:parseInt(txnForm.quantity)*parseFloat(txnForm.unitCost)})} disabled={!txnForm.quantity||!txnForm.unitCost||addTxn.isPending} className="btn-primary">Save Purchase</button></>}>
        <div className="space-y-3">
          <div><label className="label">Product / Item Name</label><input className="input" value={txnForm.productName} onChange={e => setTxnForm(p=>({...p,productName:e.target.value}))}/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Quantity</label><input className="input" type="number" value={txnForm.quantity} onChange={e => setTxnForm(p=>({...p,quantity:e.target.value}))}/></div>
            <div><label className="label">Unit Cost (UGX)</label><input className="input" type="number" value={txnForm.unitCost} onChange={e => setTxnForm(p=>({...p,unitCost:e.target.value}))}/></div>
          </div>
          {txnForm.quantity && txnForm.unitCost && <div className="bg-[#C9A96E]/10 rounded-xl p-3 text-sm font-semibold text-center text-[#A8824A]">Total: UGX {(parseInt(txnForm.quantity||0)*parseFloat(txnForm.unitCost||0)).toLocaleString()}</div>}
          <div><label className="label">Notes</label><input className="input" value={txnForm.notes} onChange={e => setTxnForm(p=>({...p,notes:e.target.value}))}/></div>
        </div>
      </Modal>
    </Page>
  );
}

// ─── LAYAWAY ───────────────────────────────────────────────────
export function Layaway() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [form, setForm] = useState({ customerName:'', customerPhone:'', totalAmount:'', depositPaid:'', dueDate:'', notes:'', items:'[]' });
  const { data } = useQuery({ queryKey: ['layaways'], queryFn: () => apiLib.layaways.list().then(r => r.data) });
  const create = useMutation({ mutationFn: d => apiLib.layaways.create(d), onSuccess: () => { toast.success('Layaway created!'); setShowAdd(false); qc.invalidateQueries(['layaways']); } });
  const addPayment = useMutation({ mutationFn: ({ id, amount }) => apiLib.layaways.addPayment(id, { amount: parseFloat(amount), note: 'Payment' }), onSuccess: () => { toast.success('Payment recorded!'); setPayAmount(''); qc.invalidateQueries(['layaways']); } });
  const cancel = useMutation({ mutationFn: id => apiLib.layaways.cancel(id), onSuccess: () => { toast.success('Layaway cancelled'); setSelected(null); qc.invalidateQueries(['layaways']); } });

  const statusColor = s => ({ active:'badge-blue', completed:'badge-green', cancelled:'badge-red' }[s]||'badge-gray');

  return (
    <Page title="Layaway" subtitle="Manage layaway plans" icon={Layers}
      action={<button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={16}/> New Layaway</button>}>
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800/50"><tr>{['#','Customer','Phone','Total','Deposit','Balance','Due Date','Status','Actions'].map(h=><th key={h} className="table-header">{h}</th>)}</tr></thead>
          <tbody>
            {data?.map(l => (
              <tr key={l.id} className="table-row">
                <td className="table-cell text-xs font-mono text-[#A8824A]">{l.layawayNumber}</td>
                <td className="table-cell font-medium text-sm">{l.customerName}</td>
                <td className="table-cell text-sm">{l.customerPhone||'—'}</td>
                <td className="table-cell font-semibold text-sm">UGX {Number(l.totalAmount||0).toLocaleString()}</td>
                <td className="table-cell text-sm text-green-600">UGX {Number(l.depositPaid||0).toLocaleString()}</td>
                <td className="table-cell font-semibold text-sm text-red-600">UGX {Number(l.balanceDue||0).toLocaleString()}</td>
                <td className="table-cell text-xs text-gray-400">{l.dueDate||'—'}</td>
                <td className="table-cell"><span className={`badge capitalize text-xs ${statusColor(l.status)}`}>{l.status}</span></td>
                <td className="table-cell">
                  <div className="flex gap-1">
                    <button onClick={() => setSelected(l)} className="btn-ghost py-1 px-2"><Eye size={13}/></button>
                    {l.status==='active' && <button onClick={() => window.confirm('Cancel this layaway?')&&cancel.mutate(l.id)} className="btn-ghost py-1 px-2 text-red-500"><X size={13}/></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data?.length && <Empty icon={Layers} message="No layaways yet" sub="Create your first layaway plan above"/>}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Create Layaway Plan"
        footer={<><button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button><button onClick={() => create.mutate(form)} disabled={!form.customerName||!form.totalAmount||create.isPending} className="btn-primary">Create Layaway</button></>}>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><label className="label">Customer Name *</label><input className="input" value={form.customerName} onChange={e => setForm(p=>({...p,customerName:e.target.value}))}/></div>
          <div><label className="label">Phone</label><input className="input" value={form.customerPhone} onChange={e => setForm(p=>({...p,customerPhone:e.target.value}))}/></div>
          <div><label className="label">Due Date</label><input className="input" type="date" value={form.dueDate} onChange={e => setForm(p=>({...p,dueDate:e.target.value}))}/></div>
          <div><label className="label">Total Amount (UGX) *</label><input className="input" type="number" value={form.totalAmount} onChange={e => setForm(p=>({...p,totalAmount:e.target.value}))}/></div>
          <div><label className="label">Deposit Paid (UGX)</label><input className="input" type="number" value={form.depositPaid} onChange={e => setForm(p=>({...p,depositPaid:e.target.value}))}/></div>
          {form.totalAmount && form.depositPaid && <div className="col-span-2 bg-orange-50 border border-orange-200 rounded-xl p-3 text-sm text-orange-700 font-medium">Balance due: UGX {(parseFloat(form.totalAmount||0)-parseFloat(form.depositPaid||0)).toLocaleString()}</div>}
          <div className="col-span-2"><label className="label">Notes (items being held)</label><textarea className="input resize-none" rows={3} value={form.notes} onChange={e => setForm(p=>({...p,notes:e.target.value}))} placeholder="e.g. 1x Floral Dress size M, 1x Gold Handbag"/></div>
        </div>
      </Modal>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Layaway ${selected?.layawayNumber}`}>
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              {[['Total',`UGX ${Number(selected.totalAmount||0).toLocaleString()}`,'text-gray-900 dark:text-white'],['Paid',`UGX ${Number(selected.depositPaid||0).toLocaleString()}`,'text-green-600'],['Balance',`UGX ${Number(selected.balanceDue||0).toLocaleString()}`,'text-red-600']].map(([l,v,c]) => (
                <div key={l} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3"><p className="text-xs text-gray-500">{l}</p><p className={`font-bold ${c}`}>{v}</p></div>
              ))}
            </div>
            <div className="text-sm space-y-1">
              <p><span className="text-gray-500">Customer:</span> <strong>{selected.customerName}</strong></p>
              <p><span className="text-gray-500">Phone:</span> {selected.customerPhone||'—'}</p>
              <p><span className="text-gray-500">Due:</span> {selected.dueDate||'No due date'}</p>
              {selected.notes && <p><span className="text-gray-500">Items:</span> {selected.notes}</p>}
            </div>
            {(() => { try { const pmts = JSON.parse(selected.payments||'[]'); return pmts.length > 0 && (<div><p className="font-semibold text-sm mb-2">Payment History</p>{pmts.map((p,i) => <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-100 dark:border-gray-800"><span>{new Date(p.date).toLocaleDateString()} — {p.note}</span><span className="font-medium text-green-600">+UGX {Number(p.amount).toLocaleString()}</span></div>)}</div>); } catch { return null; } })()}
            {selected.status==='active' && selected.balanceDue > 0 && (
              <div className="flex gap-2">
                <input className="input flex-1" type="number" placeholder="Payment amount (UGX)" value={payAmount} onChange={e => setPayAmount(e.target.value)}/>
                <button onClick={() => addPayment.mutate({ id: selected.id, amount: payAmount })} disabled={!payAmount||addPayment.isPending} className="btn-primary whitespace-nowrap">Record Payment</button>
              </div>
            )}
            {selected.status==='completed' && <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center text-green-700 font-semibold">✅ Fully Paid!</div>}
          </div>
        )}
      </Modal>
    </Page>
  );
}

// ─── CUSTOMER DEBTS ────────────────────────────────────────────
export function CustomerDebts() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [payAmt, setPayAmt] = useState('');
  const [form, setForm] = useState({ customerId:'', amount:'', description:'', dueDate:'' });
  const [custSearch, setCustSearch] = useState('');
  const { data } = useQuery({ queryKey: ['debts'], queryFn: () => apiLib.debts.list().then(r => r.data) });
  const { data: custData } = useQuery({ queryKey: ['cust-s', custSearch], queryFn: () => apiLib.customers.list({ search: custSearch, limit: 5 }).then(r => r.data), enabled: custSearch.length > 1 });
  const create = useMutation({ mutationFn: d => apiLib.debts.create(d), onSuccess: () => { toast.success('Debt recorded'); setShowAdd(false); qc.invalidateQueries(['debts']); } });
  const pay = useMutation({ mutationFn: ({ id, amount }) => apiLib.debts.pay(id, { amount: parseFloat(amount) }), onSuccess: () => { toast.success('Payment recorded!'); setPayAmt(''); setSelected(null); qc.invalidateQueries(['debts']); } });
  const totalOwed = data?.filter(d => d.status==='outstanding').reduce((s,d) => s+(d.amount-d.paidAmount), 0) || 0;

  return (
    <Page title="Customer Debts" subtitle="Track outstanding balances" icon={AlertTriangle}
      action={<button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={16}/> Record Debt</button>}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4 col-span-2 border-l-4 border-red-400"><p className="text-xs text-gray-500 mb-1">Total Outstanding</p><p className="text-2xl font-heading font-bold text-red-600">UGX {totalOwed.toLocaleString()}</p></div>
        <div className="card p-4 border-l-4 border-gray-300"><p className="text-xs text-gray-500 mb-1">Debtors</p><p className="text-2xl font-heading font-bold">{data?.filter(d=>d.status==='outstanding').length||0}</p></div>
        <div className="card p-4 border-l-4 border-green-400"><p className="text-xs text-gray-500 mb-1">Cleared</p><p className="text-2xl font-heading font-bold text-green-600">{data?.filter(d=>d.status==='paid').length||0}</p></div>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800/50"><tr>{['Customer','Description','Amount','Paid','Balance','Due Date','Status','Actions'].map(h=><th key={h} className="table-header">{h}</th>)}</tr></thead>
          <tbody>
            {data?.map(d => (
              <tr key={d.id} className="table-row">
                <td className="table-cell font-medium text-sm">{d.customer?.name||'Unknown'}</td>
                <td className="table-cell text-sm text-gray-600">{d.description||'—'}</td>
                <td className="table-cell font-semibold text-sm">UGX {Number(d.amount||0).toLocaleString()}</td>
                <td className="table-cell text-green-600 text-sm">UGX {Number(d.paidAmount||0).toLocaleString()}</td>
                <td className="table-cell font-bold text-red-600 text-sm">UGX {Number((d.amount||0)-(d.paidAmount||0)).toLocaleString()}</td>
                <td className="table-cell text-xs text-gray-400">{d.dueDate||'—'}</td>
                <td className="table-cell"><span className={`badge capitalize text-xs ${d.status==='paid'?'badge-green':'badge-red'}`}>{d.status}</span></td>
                <td className="table-cell">{d.status==='outstanding' && <button onClick={() => setSelected(d)} className="btn-ghost py-1 px-2 text-xs text-green-600">Pay</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data?.length && <Empty icon={AlertTriangle} message="No debts recorded" sub="Great news — all customers are paid up!"/>}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Record Customer Debt"
        footer={<><button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button><button onClick={() => create.mutate(form)} disabled={!form.customerId||!form.amount||create.isPending} className="btn-primary">Save Debt</button></>}>
        <div className="space-y-3">
          <div><label className="label">Customer *</label>
            <input className="input" placeholder="Type customer name to search..." value={custSearch} onChange={e => setCustSearch(e.target.value)}/>
            {custData?.customers?.length > 0 && !form.customerId && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl mt-1 overflow-hidden">
                {custData.customers.map(c => <button key={c.id} className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm transition-colors" onClick={() => { setForm(p=>({...p,customerId:c.id})); setCustSearch(c.name); }}>{c.name} — {c.phone||'No phone'}</button>)}
              </div>
            )}
          </div>
          <div><label className="label">Amount (UGX) *</label><input className="input" type="number" value={form.amount} onChange={e => setForm(p=>({...p,amount:e.target.value}))}/></div>
          <div><label className="label">Description</label><input className="input" value={form.description} onChange={e => setForm(p=>({...p,description:e.target.value}))} placeholder="What is this debt for?"/></div>
          <div><label className="label">Due Date</label><input className="input" type="date" value={form.dueDate} onChange={e => setForm(p=>({...p,dueDate:e.target.value}))}/></div>
        </div>
      </Modal>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Record Debt Payment">
        {selected && (
          <div className="space-y-4">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-600">{selected.customer?.name} owes</p>
              <p className="text-3xl font-heading font-bold text-red-600">UGX {Number((selected.amount||0)-(selected.paidAmount||0)).toLocaleString()}</p>
            </div>
            <div><label className="label">Payment Amount (UGX)</label><input className="input" type="number" value={payAmt} onChange={e => setPayAmt(e.target.value)} placeholder="Enter amount paid" autoFocus/></div>
            <button onClick={() => pay.mutate({ id: selected.id, amount: payAmt })} disabled={!payAmt||pay.isPending} className="btn-primary w-full justify-center">{pay.isPending?'Saving...':'Record Payment'}</button>
          </div>
        )}
      </Modal>
    </Page>
  );
}

// ─── DISCOUNTS ─────────────────────────────────────────────────
export function Discounts() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ code:'', type:'percent', value:'', minOrder:'', maxUses:'', expiresAt:'' });
  const { data } = useQuery({ queryKey: ['discounts'], queryFn: () => apiLib.discounts.list().then(r => r.data) });
  const create = useMutation({ mutationFn: d => apiLib.discounts.create(d), onSuccess: () => { toast.success('Discount created!'); setShowAdd(false); setForm({code:'',type:'percent',value:'',minOrder:'',maxUses:'',expiresAt:''}); qc.invalidateQueries(['discounts']); } });
  const remove = useMutation({ mutationFn: id => apiLib.discounts.delete(id), onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries(['discounts']); } });
  const randCode = () => setForm(p=>({...p, code:'VV'+Math.random().toString(36).substring(2,7).toUpperCase()}));

  return (
    <Page title="Discounts & Promotions" subtitle="Manage coupon codes" icon={Tag}
      action={<button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={16}/> Create Discount</button>}>
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800/50"><tr>{['Code','Type','Value','Min Order','Uses','Expires','Status','Actions'].map(h=><th key={h} className="table-header">{h}</th>)}</tr></thead>
          <tbody>
            {data?.map(d => (
              <tr key={d.id} className="table-row">
                <td className="table-cell font-mono font-bold text-[#A8824A] text-sm">{d.code}</td>
                <td className="table-cell capitalize text-sm">{d.type}</td>
                <td className="table-cell font-semibold text-sm">{d.type==='percent'?`${d.value}%`:`UGX ${Number(d.value).toLocaleString()}`}</td>
                <td className="table-cell text-sm">{d.minOrder>0?`UGX ${Number(d.minOrder).toLocaleString()}`:'None'}</td>
                <td className="table-cell text-sm">{d.usedCount}/{d.maxUses||'∞'}</td>
                <td className="table-cell text-xs text-gray-400">{d.expiresAt||'Never'}</td>
                <td className="table-cell"><span className={`badge text-xs ${d.isActive?'badge-green':'badge-red'}`}>{d.isActive?'Active':'Inactive'}</span></td>
                <td className="table-cell"><button onClick={() => window.confirm('Delete discount?')&&remove.mutate(d.id)} className="btn-ghost py-1 px-2 text-red-500"><Trash2 size={13}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data?.length && <Empty icon={Tag} message="No discount codes yet" sub="Create your first promotion above"/>}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Create Discount Code"
        footer={<><button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button><button onClick={() => create.mutate(form)} disabled={!form.code||!form.value||create.isPending} className="btn-primary">Create</button></>}>
        <div className="space-y-3">
          <div><label className="label">Discount Code *</label>
            <div className="flex gap-2"><input className="input flex-1 font-mono uppercase" value={form.code} onChange={e => setForm(p=>({...p,code:e.target.value.toUpperCase()}))} placeholder="SAVE20"/><button type="button" onClick={randCode} className="btn-secondary text-xs whitespace-nowrap">Generate</button></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Type</label><select className="input" value={form.type} onChange={e => setForm(p=>({...p,type:e.target.value}))}><option value="percent">Percentage (%)</option><option value="fixed">Fixed Amount (UGX)</option></select></div>
            <div><label className="label">Value *</label><input className="input" type="number" value={form.value} onChange={e => setForm(p=>({...p,value:e.target.value}))} placeholder={form.type==='percent'?'20':'5000'}/></div>
            <div><label className="label">Min Order (UGX)</label><input className="input" type="number" value={form.minOrder} onChange={e => setForm(p=>({...p,minOrder:e.target.value}))} placeholder="0 = no minimum"/></div>
            <div><label className="label">Max Uses (0 = unlimited)</label><input className="input" type="number" value={form.maxUses} onChange={e => setForm(p=>({...p,maxUses:e.target.value}))}/></div>
            <div className="col-span-2"><label className="label">Expires</label><input className="input" type="date" value={form.expiresAt} onChange={e => setForm(p=>({...p,expiresAt:e.target.value}))}/></div>
          </div>
          {form.value && <div className="bg-[#C9A96E]/10 rounded-xl p-3 text-sm text-center text-[#A8824A] font-medium">Customers get {form.type==='percent'?`${form.value}% off`:`UGX ${Number(form.value).toLocaleString()} off`} with code <strong>{form.code||'...'}</strong></div>}
        </div>
      </Modal>
    </Page>
  );
}

// ─── PURCHASE ORDERS ───────────────────────────────────────────
export function PurchaseOrders() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ supplierId:'', items:'', totalCost:'', expectedDate:'', notes:'' });
  const { data } = useQuery({ queryKey: ['pos'], queryFn: () => apiLib.purchaseOrders.list().then(r => r.data) });
  const { data: suppData } = useQuery({ queryKey: ['suppliers'], queryFn: () => apiLib.suppliers.list().then(r => r.data) });
  const create = useMutation({ mutationFn: d => apiLib.purchaseOrders.create({ ...d, items: [{name:d.items, quantity:1}] }), onSuccess: () => { toast.success('PO created!'); setShowAdd(false); qc.invalidateQueries(['pos']); } });
  const receive = useMutation({ mutationFn: id => apiLib.purchaseOrders.receive(id), onSuccess: () => { toast.success('Stock received and updated!'); qc.invalidateQueries(['pos']); } });

  return (
    <Page title="Purchase Orders" subtitle="Manage supplier orders" icon={ClipboardList}
      action={<button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={16}/> New PO</button>}>
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800/50"><tr>{['PO #','Supplier','Total Cost','Expected','Status','Actions'].map(h=><th key={h} className="table-header">{h}</th>)}</tr></thead>
          <tbody>
            {data?.map(po => (
              <tr key={po.id} className="table-row">
                <td className="table-cell font-mono text-xs text-[#A8824A]">{po.poNumber}</td>
                <td className="table-cell font-medium text-sm">{po.supplier?.name||'—'}</td>
                <td className="table-cell font-semibold text-sm">UGX {Number(po.totalCost||0).toLocaleString()}</td>
                <td className="table-cell text-xs text-gray-400">{po.expectedDate||'—'}</td>
                <td className="table-cell"><span className={`badge capitalize text-xs ${po.status==='received'?'badge-green':po.status==='pending'?'badge-yellow':'badge-gray'}`}>{po.status}</span></td>
                <td className="table-cell">{po.status==='pending'&&<button onClick={() => window.confirm('Mark as received? This will update stock.')&&receive.mutate(po.id)} className="btn-primary text-xs py-1 px-2">Receive</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data?.length && <Empty icon={ClipboardList} message="No purchase orders" sub="Create one above"/>}
      </div>
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New Purchase Order"
        footer={<><button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button><button onClick={() => create.mutate(form)} disabled={!form.supplierId||!form.totalCost||create.isPending} className="btn-primary">Create PO</button></>}>
        <div className="space-y-3">
          <div><label className="label">Supplier *</label><select className="input" value={form.supplierId} onChange={e => setForm(p=>({...p,supplierId:e.target.value}))}><option value="">Select supplier</option>{suppData?.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <div><label className="label">Items (describe what you're ordering)</label><textarea className="input resize-none" rows={3} value={form.items} onChange={e => setForm(p=>({...p,items:e.target.value}))} placeholder="10x Floral Dress, 5x Silk Blouse..."/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Total Cost (UGX) *</label><input className="input" type="number" value={form.totalCost} onChange={e => setForm(p=>({...p,totalCost:e.target.value}))}/></div>
            <div><label className="label">Expected Delivery</label><input className="input" type="date" value={form.expectedDate} onChange={e => setForm(p=>({...p,expectedDate:e.target.value}))}/></div>
          </div>
          <div><label className="label">Notes</label><input className="input" value={form.notes} onChange={e => setForm(p=>({...p,notes:e.target.value}))}/></div>
        </div>
      </Modal>
    </Page>
  );
}

// ─── QUOTATIONS ────────────────────────────────────────────────
export function Quotations() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ customerName:'', customerPhone:'', customerEmail:'', items:'', total:'', validUntil:'', notes:'' });
  const { data } = useQuery({ queryKey: ['quotes'], queryFn: () => apiLib.quotes.list().then(r => r.data) });
  const create = useMutation({ mutationFn: d => apiLib.quotes.create({ ...d, items: [{description:d.items}], subtotal:parseFloat(d.total), total:parseFloat(d.total) }), onSuccess: () => { toast.success('Quote created!'); setShowAdd(false); qc.invalidateQueries(['quotes']); } });
  const updateStatus = useMutation({ mutationFn: ({id,status}) => apiLib.quotes.updateStatus(id,{status}), onSuccess: () => { toast.success('Updated!'); setSelected(null); qc.invalidateQueries(['quotes']); } });

  const wa = (q) => {
    if (!q.customerPhone) return toast.error('No phone number');
    const ph = q.customerPhone.replace(/\D/g,'');
    const intl = ph.startsWith('0') ? '256'+ph.slice(1) : ph;
    const msg = encodeURIComponent(`📋 *QUOTATION FROM VILLA VOGUE FASHIONS*\n\nDear ${q.customerName||'Customer'},\n\nQuote #: ${q.quoteNumber}\nTotal: UGX ${Number(q.total).toLocaleString()}\nValid Until: ${q.validUntil||'5 days'}\n\n${q.notes||''}\n\nTo confirm this order, reply YES or call us:\n📞 0782 860372\n\n💛 Villa Vogue Fashions`);
    window.open(`https://wa.me/${intl}?text=${msg}`, '_blank');
  };

  return (
    <Page title="Quotations" subtitle="Create and manage price quotes" icon={FileText}
      action={<button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={16}/> New Quote</button>}>
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800/50"><tr>{['Quote #','Customer','Phone','Total','Valid Until','Status','Actions'].map(h=><th key={h} className="table-header">{h}</th>)}</tr></thead>
          <tbody>
            {data?.map(q => (
              <tr key={q.id} className="table-row">
                <td className="table-cell font-mono text-xs text-[#A8824A]">{q.quoteNumber}</td>
                <td className="table-cell font-medium text-sm">{q.customerName||'—'}</td>
                <td className="table-cell text-sm">{q.customerPhone||'—'}</td>
                <td className="table-cell font-semibold text-sm">UGX {Number(q.total||0).toLocaleString()}</td>
                <td className="table-cell text-xs text-gray-400">{q.validUntil||'—'}</td>
                <td className="table-cell"><span className={`badge capitalize text-xs ${q.status==='accepted'?'badge-green':q.status==='rejected'?'badge-red':q.status==='sent'?'badge-blue':'badge-gray'}`}>{q.status}</span></td>
                <td className="table-cell">
                  <div className="flex gap-1">
                    <button onClick={() => setSelected(q)} className="btn-ghost py-1 px-2"><Eye size={13}/></button>
                    <button onClick={() => wa(q)} className="btn-ghost py-1 px-2 text-green-600" title="Send via WhatsApp"><MessageCircle size={13}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data?.length && <Empty icon={FileText} message="No quotes yet" sub="Create your first quotation above"/>}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Create Quotation"
        footer={<><button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button><button onClick={() => create.mutate(form)} disabled={!form.customerName||!form.total||create.isPending} className="btn-primary">Create Quote</button></>}>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><label className="label">Customer Name *</label><input className="input" value={form.customerName} onChange={e => setForm(p=>({...p,customerName:e.target.value}))}/></div>
          <div><label className="label">Phone</label><input className="input" value={form.customerPhone} onChange={e => setForm(p=>({...p,customerPhone:e.target.value}))}/></div>
          <div><label className="label">Email</label><input className="input" value={form.customerEmail} onChange={e => setForm(p=>({...p,customerEmail:e.target.value}))}/></div>
          <div className="col-span-2"><label className="label">Items / Description *</label><textarea className="input resize-none" rows={3} value={form.items} onChange={e => setForm(p=>({...p,items:e.target.value}))} placeholder="2x Floral Dress UGX 85,000 each, 1x Handbag UGX 120,000..."/></div>
          <div><label className="label">Total (UGX) *</label><input className="input" type="number" value={form.total} onChange={e => setForm(p=>({...p,total:e.target.value}))}/></div>
          <div><label className="label">Valid Until</label><input className="input" type="date" value={form.validUntil} onChange={e => setForm(p=>({...p,validUntil:e.target.value}))}/></div>
          <div className="col-span-2"><label className="label">Notes</label><textarea className="input resize-none" rows={2} value={form.notes} onChange={e => setForm(p=>({...p,notes:e.target.value}))}/></div>
        </div>
      </Modal>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Quote ${selected?.quoteNumber}`}>
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-xs text-gray-500">Customer</p><p className="font-medium">{selected.customerName}</p></div>
              <div><p className="text-xs text-gray-500">Total</p><p className="font-bold text-[#A8824A] text-lg">UGX {Number(selected.total).toLocaleString()}</p></div>
            </div>
            {selected.notes && <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3"><p className="text-xs text-gray-500 mb-1">Items / Notes</p><p>{selected.notes}</p></div>}
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => updateStatus.mutate({id:selected.id,status:'sent'})} className="btn-secondary text-xs py-2 justify-center">Mark Sent</button>
              <button onClick={() => updateStatus.mutate({id:selected.id,status:'accepted'})} className="btn-primary text-xs py-2 justify-center bg-green-500 hover:bg-green-600">Accepted</button>
              <button onClick={() => updateStatus.mutate({id:selected.id,status:'rejected'})} className="btn-secondary text-xs py-2 justify-center text-red-500">Rejected</button>
            </div>
            <button onClick={() => wa(selected)} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold transition-colors">
              <MessageCircle size={16}/> Send Quote via WhatsApp
            </button>
          </div>
        )}
      </Modal>
    </Page>
  );
}

// ─── CASH FLOAT ────────────────────────────────────────────────
export function CashFloat() {
  const qc = useQueryClient();
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const { data: today } = useQuery({ queryKey: ['float-today'], queryFn: () => apiLib.cashFloat.today().then(r => r.data) });
  const { data: history } = useQuery({ queryKey: ['float-history'], queryFn: () => apiLib.cashFloat.history().then(r => r.data) });
  const openFloat = useMutation({ mutationFn: d => apiLib.cashFloat.open(d), onSuccess: () => { toast.success('Cash float opened!'); setAmount(''); setNotes(''); qc.invalidateQueries(['float-today']); qc.invalidateQueries(['float-history']); } });
  const closeFloat = useMutation({ mutationFn: d => apiLib.cashFloat.close(d), onSuccess: () => { toast.success('Cash float closed!'); setAmount(''); setNotes(''); qc.invalidateQueries(['float-today']); qc.invalidateQueries(['float-history']); } });
  const opened = today?.find(f => f.type==='open');
  const closed = today?.find(f => f.type==='close');

  return (
    <Page title="Cash Float" subtitle="Daily cash management" icon={Wallet}>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="font-heading font-semibold mb-4">Today's Float — {new Date().toLocaleDateString('en-GB', {day:'numeric',month:'long',year:'numeric'})}</h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className={`rounded-xl p-4 text-center border-2 ${opened?'border-green-400 bg-green-50 dark:bg-green-900/20':'border-gray-200'}`}>
              <p className="text-xs text-gray-500 mb-1">Opening Float</p>
              <p className={`text-xl font-bold ${opened?'text-green-600':'text-gray-400'}`}>{opened?`UGX ${Number(opened.amount).toLocaleString()}`:'Not opened'}</p>
              {opened && <p className="text-xs text-gray-400 mt-1">{format(new Date(opened.createdAt),'HH:mm')}</p>}
            </div>
            <div className={`rounded-xl p-4 text-center border-2 ${closed?'border-blue-400 bg-blue-50 dark:bg-blue-900/20':'border-gray-200'}`}>
              <p className="text-xs text-gray-500 mb-1">Closing Float</p>
              <p className={`text-xl font-bold ${closed?'text-blue-600':'text-gray-400'}`}>{closed?`UGX ${Number(closed.amount).toLocaleString()}`:'Not closed'}</p>
              {closed && <p className="text-xs text-gray-400 mt-1">{format(new Date(closed.createdAt),'HH:mm')}</p>}
            </div>
          </div>
          <div className="space-y-3">
            <div><label className="label">Amount (UGX)</label><input className="input" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Enter cash amount"/></div>
            <div><label className="label">Notes</label><input className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes"/></div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => openFloat.mutate({amount:parseFloat(amount),notes})} disabled={!amount||!!opened||openFloat.isPending} className="btn-primary justify-center disabled:opacity-40">Open Float</button>
              <button onClick={() => closeFloat.mutate({amount:parseFloat(amount),notes})} disabled={!amount||!opened||!!closed||closeFloat.isPending} className="btn-secondary justify-center disabled:opacity-40">Close Float</button>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-heading font-semibold mb-4">Float History</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {history?.map(f => (
              <div key={f.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <div><p className="text-xs font-medium capitalize">{f.type === 'open' ? '🟢 Opened' : '🔵 Closed'} — {f.date}</p><p className="text-xs text-gray-400">{f.notes||'No notes'}</p></div>
                <p className="font-semibold text-sm">UGX {Number(f.amount).toLocaleString()}</p>
              </div>
            ))}
            {!history?.length && <p className="text-gray-400 text-sm text-center py-6">No float history yet</p>}
          </div>
        </div>
      </div>
    </Page>
  );
}

// ─── FEEDBACK ──────────────────────────────────────────────────
export function Feedback() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ customerName:'', rating:5, comment:'', category:'General' });
  const { data } = useQuery({ queryKey: ['feedback'], queryFn: () => apiLib.feedback.list().then(r => r.data) });
  const { data: stats } = useQuery({ queryKey: ['feedback-stats'], queryFn: () => apiLib.feedback.stats().then(r => r.data) });
  const create = useMutation({ mutationFn: d => apiLib.feedback.create(d), onSuccess: () => { toast.success('Feedback saved!'); setShowAdd(false); setForm({customerName:'',rating:5,comment:'',category:'General'}); qc.invalidateQueries(['feedback']); qc.invalidateQueries(['feedback-stats']); } });

  return (
    <Page title="Customer Feedback" subtitle="Reviews and satisfaction scores" icon={MessageSquare}
      action={<button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={16}/> Add Feedback</button>}>
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="card p-4 text-center col-span-2 lg:col-span-1 border-l-4 border-[#C9A96E]">
            <p className="text-xs text-gray-500 mb-1">Average Rating</p>
            <p className="text-3xl font-heading font-bold text-[#A8824A]">⭐ {Number(stats.averageRating||0).toFixed(1)}</p>
            <p className="text-xs text-gray-400">{stats.totalReviews} reviews</p>
          </div>
          {(stats.distribution||[]).slice(0,3).map(d => (
            <div key={d.rating} className="card p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">{'⭐'.repeat(d.rating)}</p>
              <p className="text-2xl font-bold">{d.count}</p>
              <p className="text-xs text-gray-400">reviews</p>
            </div>
          ))}
        </div>
      )}
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800/50"><tr>{['Customer','Rating','Category','Comment','Date'].map(h=><th key={h} className="table-header">{h}</th>)}</tr></thead>
          <tbody>
            {data?.map(f => (
              <tr key={f.id} className="table-row">
                <td className="table-cell font-medium text-sm">{f.customerName||f.customer?.name||'Anonymous'}</td>
                <td className="table-cell">{'⭐'.repeat(f.rating||1)}</td>
                <td className="table-cell"><span className="badge-gray text-xs">{f.category||'General'}</span></td>
                <td className="table-cell text-sm text-gray-600 max-w-xs truncate">{f.comment||'—'}</td>
                <td className="table-cell text-xs text-gray-400">{f.createdAt?format(new Date(f.createdAt),'MMM d, yyyy'):'—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data?.length && <Empty icon={MessageSquare} message="No feedback yet" sub="Add customer reviews above"/>}
      </div>
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Customer Feedback"
        footer={<><button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button><button onClick={() => create.mutate(form)} disabled={create.isPending} className="btn-primary">Save Feedback</button></>}>
        <div className="space-y-3">
          <div><label className="label">Customer Name</label><input className="input" value={form.customerName} onChange={e => setForm(p=>({...p,customerName:e.target.value}))} placeholder="Optional"/></div>
          <div><label className="label">Rating</label>
            <div className="flex gap-2 mt-1">{[1,2,3,4,5].map(r => <button key={r} type="button" onClick={() => setForm(p=>({...p,rating:r}))} className={`text-2xl transition-transform hover:scale-125 ${r<=form.rating?'opacity-100':'opacity-30'}`}>⭐</button>)}</div>
          </div>
          <div><label className="label">Category</label><select className="input" value={form.category} onChange={e => setForm(p=>({...p,category:e.target.value}))}>{['Product Quality','Customer Service','Pricing','Delivery','Store Experience','General'].map(c=><option key={c}>{c}</option>)}</select></div>
          <div><label className="label">Comment</label><textarea className="input resize-none" rows={3} value={form.comment} onChange={e => setForm(p=>({...p,comment:e.target.value}))} placeholder="What did the customer say?"/></div>
        </div>
      </Modal>
    </Page>
  );
}

// ─── ACTIVITY LOG ──────────────────────────────────────────────
export function ActivityLog() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({ queryKey: ['activity', page], queryFn: () => apiLib.activity.list({ page, limit: 50 }).then(r => r.data) });

  const actionColor = (a) => a?.includes('login')?'badge-blue':a?.includes('create')?'badge-green':a?.includes('delete')?'badge-red':'badge-gray';

  return (
    <Page title="Activity Log" subtitle="Full audit trail of all actions" icon={Activity}>
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800/50"><tr>{['Time','User','Action','Entity','Details'].map(h=><th key={h} className="table-header">{h}</th>)}</tr></thead>
          <tbody>
            {data?.logs?.map(l => (
              <tr key={l.id} className="table-row">
                <td className="table-cell text-xs text-gray-400 whitespace-nowrap">{l.createdAt?format(new Date(l.createdAt),'MMM d, HH:mm:ss'):'—'}</td>
                <td className="table-cell"><div className="flex items-center gap-1.5"><div className="w-6 h-6 rounded-full bg-[#C9A96E]/20 flex items-center justify-center text-xs font-bold text-[#A8824A]">{(l.username||'S')[0].toUpperCase()}</div><span className="text-sm">{l.username||'System'}</span></div></td>
                <td className="table-cell"><span className={`badge text-xs ${actionColor(l.action)}`}>{l.action?.replace(/_/g,' ')}</span></td>
                <td className="table-cell text-xs text-gray-500">{l.entityType}{l.entityId?` #${l.entityId}`:''}</td>
                <td className="table-cell text-xs text-gray-400 max-w-xs truncate">{l.details ? (() => { try { const d = JSON.parse(l.details); return JSON.stringify(d).substring(0,80); } catch { return l.details; } })() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {isLoading && <Loader/>}
        {!isLoading && !data?.logs?.length && <Empty icon={Activity} message="No activity recorded yet"/>}
        {data?.total > 50 && (
          <div className="flex justify-between p-4 border-t border-gray-100 dark:border-gray-800 text-sm">
            <span className="text-gray-500">Page {page} · {data.total} entries</span>
            <div className="flex gap-2">
              <button disabled={page===1} onClick={() => setPage(p=>p-1)} className="btn-secondary py-1 px-3 text-xs disabled:opacity-40">Prev</button>
              <button disabled={data?.logs?.length < 50} onClick={() => setPage(p=>p+1)} className="btn-secondary py-1 px-3 text-xs disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </Page>
  );
}

// ─── SECURITY CENTER ───────────────────────────────────────────
export function SecurityCenter() {
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: () => apiLib.users.list().then(r => r.data) });
  const qc = useQueryClient();
  const unlock = useMutation({ mutationFn: id => apiLib.users.unlock(id), onSuccess: () => { toast.success('User unlocked'); qc.invalidateQueries(['users']); } });

  const locked = users?.filter(u => u.lockedUntil && new Date() < new Date(u.lockedUntil)) || [];
  const highAttempts = users?.filter(u => u.loginAttempts >= 3) || [];

  return (
    <Page title="Security Center" subtitle="Monitor access and threats" icon={Shield}>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-4 border-l-4 border-red-400"><p className="text-xs text-gray-500 mb-1">Locked Accounts</p><p className="text-3xl font-heading font-bold text-red-600">{locked.length}</p></div>
        <div className="card p-4 border-l-4 border-amber-400"><p className="text-xs text-gray-500 mb-1">High Failed Attempts</p><p className="text-3xl font-heading font-bold text-amber-600">{highAttempts.length}</p></div>
        <div className="card p-4 border-l-4 border-green-400"><p className="text-xs text-gray-500 mb-1">Active Users</p><p className="text-3xl font-heading font-bold text-green-600">{users?.filter(u=>u.isActive).length||0}</p></div>
      </div>

      {locked.length > 0 && (
        <div className="card p-5 border-2 border-red-200 dark:border-red-800">
          <h3 className="font-heading font-semibold text-red-600 mb-3 flex items-center gap-2"><Lock size={18}/> Locked Accounts</h3>
          {locked.map(u => (
            <div key={u.id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-xl mb-2">
              <div><p className="font-medium text-sm">{u.username}</p><p className="text-xs text-gray-500">Locked until {u.lockedUntil?format(new Date(u.lockedUntil),'MMM d, HH:mm'):'unknown'}</p></div>
              <button onClick={() => unlock.mutate(u.id)} className="btn-primary text-xs py-1.5 px-3"><Unlock size={13}/> Unlock</button>
            </div>
          ))}
        </div>
      )}

      <div className="card overflow-x-auto">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 font-heading font-semibold text-sm">All User Security Status</div>
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800/50"><tr>{['User','Role','Status','Failed Attempts','Last Login','2FA'].map(h=><th key={h} className="table-header">{h}</th>)}</tr></thead>
          <tbody>
            {users?.map(u => (
              <tr key={u.id} className="table-row">
                <td className="table-cell font-medium text-sm">{u.username}</td>
                <td className="table-cell"><span className={`badge capitalize text-xs ${u.role==='admin'?'bg-red-100 text-red-700':u.role==='manager'?'badge-gold':'badge-blue'}`}>{u.role}</span></td>
                <td className="table-cell">
                  {u.lockedUntil && new Date()<new Date(u.lockedUntil) ? <span className="badge-red text-xs flex items-center gap-1 w-fit"><Lock size={10}/> Locked</span>
                   : u.isActive ? <span className="badge-green text-xs">Active</span>
                   : <span className="badge-gray text-xs">Inactive</span>}
                </td>
                <td className="table-cell"><span className={`text-sm font-semibold ${u.loginAttempts>=3?'text-red-600':u.loginAttempts>0?'text-amber-600':'text-gray-400'}`}>{u.loginAttempts||0}</span></td>
                <td className="table-cell text-xs text-gray-400">{u.lastLogin?format(new Date(u.lastLogin),'MMM d, HH:mm'):'Never'}</td>
                <td className="table-cell">{u.role==='admin'?<span className="badge-green text-xs">✓ Email OTP</span>:<span className="badge-gray text-xs">Password only</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Page>
  );
}

// ─── USERS PAGE ────────────────────────────────────────────────
export function UsersPage() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [showReset, setShowReset] = useState(null);
  const [form, setForm] = useState({ username:'', email:'', phone:'', password:'', role:'staff' });
  const [newPass, setNewPass] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['users'], queryFn: () => apiLib.users.list().then(r => r.data) });

  const create = useMutation({ mutationFn: d => apiLib.users.create(d), onSuccess: () => { toast.success('User created!'); setShowAdd(false); setForm({username:'',email:'',phone:'',password:'',role:'staff'}); qc.invalidateQueries(['users']); }, onError: e => toast.error(e.response?.data?.error||'Failed — username may already exist') });
  const toggle = useMutation({ mutationFn: ({id,isActive}) => apiLib.users.update(id,{isActive}), onSuccess: () => { toast.success('Updated'); qc.invalidateQueries(['users']); } });
  const unlock = useMutation({ mutationFn: id => apiLib.users.unlock(id), onSuccess: () => { toast.success('Unlocked!'); qc.invalidateQueries(['users']); } });
  const resetPw = useMutation({ mutationFn: ({id,newPassword}) => apiLib.users.resetPassword(id,{newPassword}), onSuccess: () => { toast.success('Password reset!'); setShowReset(null); setNewPass(''); }, onError: e => toast.error(e.response?.data?.error||'Failed') });

  return (
    <Page title="User Management" subtitle="Manage staff accounts and access" icon={Shield}
      action={<button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={16}/> Add User</button>}>
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800/50"><tr>{['User','Email','Phone','Role','Status','Last Login','Actions'].map(h=><th key={h} className="table-header">{h}</th>)}</tr></thead>
          <tbody>
            {data?.map(u => (
              <tr key={u.id} className="table-row">
                <td className="table-cell"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-[#C9A96E]/20 flex items-center justify-center text-[#A8824A] text-sm font-bold">{u.username[0].toUpperCase()}</div><span className="font-medium text-sm">{u.username}</span></div></td>
                <td className="table-cell text-sm text-gray-500">{u.email||'—'}</td>
                <td className="table-cell text-sm text-gray-500">{u.phone||'—'}</td>
                <td className="table-cell"><span className={`badge capitalize text-xs ${u.role==='admin'?'bg-red-100 text-red-700':u.role==='manager'?'badge-gold':'badge-blue'}`}>{u.role}</span></td>
                <td className="table-cell">
                  {u.lockedUntil&&new Date()<new Date(u.lockedUntil)?<span className="badge-red text-xs flex items-center gap-1 w-fit"><Lock size={10}/> Locked</span>
                   :u.isActive?<span className="badge-green text-xs">Active</span>:<span className="badge-gray text-xs">Inactive</span>}
                </td>
                <td className="table-cell text-xs text-gray-400">{u.lastLogin?format(new Date(u.lastLogin),'MMM d, HH:mm'):'Never'}</td>
                <td className="table-cell">
                  <div className="flex gap-1">
                    {u.lockedUntil&&new Date()<new Date(u.lockedUntil)&&<button onClick={() => unlock.mutate(u.id)} className="btn-ghost py-1 px-2 text-xs text-orange-600" title="Unlock"><Unlock size={13}/></button>}
                    <button onClick={() => setShowReset(u)} className="btn-ghost py-1 px-2 text-xs" title="Reset Password"><Key size={13}/></button>
                    <button onClick={() => window.confirm(u.isActive?'Deactivate user?':'Activate user?')&&toggle.mutate({id:u.id,isActive:!u.isActive})} className={`btn-ghost py-1 px-2 text-xs ${u.isActive?'text-red-500':'text-green-600'}`}>{u.isActive?<XCircle size={13}/>:<CheckCircle size={13}/>}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {isLoading && <Loader/>}
        {!isLoading && !data?.length && <Empty icon={Users} message="No users found"/>}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Create New User"
        footer={<><button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button><button onClick={() => create.mutate(form)} disabled={!form.username||!form.password||form.password.length<6||create.isPending} className="btn-primary disabled:opacity-40">{create.isPending?'Creating...':'Create User'}</button></>}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="label">Username *</label><input className="input" value={form.username} onChange={e => setForm(p=>({...p,username:e.target.value}))} autoFocus/></div>
            <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={e => setForm(p=>({...p,email:e.target.value}))}/></div>
            <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => setForm(p=>({...p,phone:e.target.value}))}/></div>
            <div><label className="label">Password * (min 6)</label><input className="input" type="password" value={form.password} onChange={e => setForm(p=>({...p,password:e.target.value}))}/></div>
            <div><label className="label">Role</label>
              <select className="input" value={form.role} onChange={e => setForm(p=>({...p,role:e.target.value}))}>
                <option value="staff">Staff (basic access)</option>
                <option value="manager">Manager (reports + admin features)</option>
                <option value="admin">Admin (full access + 2FA)</option>
              </select>
            </div>
          </div>
          {form.role==='admin' && <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-400"><strong>⚠️ Admin Note:</strong> Admin accounts require email 2FA verification on every login. Make sure the email address above can receive emails.</div>}
        </div>
      </Modal>

      <Modal open={!!showReset} onClose={() => { setShowReset(null); setNewPass(''); }} title={`Reset Password — ${showReset?.username}`}
        footer={<><button onClick={() => { setShowReset(null); setNewPass(''); }} className="btn-secondary">Cancel</button><button onClick={() => resetPw.mutate({id:showReset?.id,newPassword:newPass})} disabled={newPass.length<6||resetPw.isPending} className="btn-primary disabled:opacity-40">Reset Password</button></>}>
        <div><label className="label">New Password (minimum 6 characters)</label><input className="input" type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Enter new password" autoFocus/>{newPass.length > 0 && newPass.length < 6 && <p className="text-red-500 text-xs mt-1">Too short — need at least 6 characters</p>}</div>
      </Modal>
    </Page>
  );
}

// ─── SETTINGS PAGE ─────────────────────────────────────────────
export function SettingsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({});
  const [saved, setSaved] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: () => apiLib.settings.get().then(r => r.data) });
  const { data: cats } = useQuery({ queryKey: ['categories'], queryFn: () => apiLib.categories.list().then(r => r.data) });
  const [newCat, setNewCat] = useState('');
  const qc2 = useQueryClient();

  useEffect(() => { if (data) setForm(data); }, [data]);

  const save = useMutation({ mutationFn: d => apiLib.settings.update(d), onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 3000); toast.success('Settings saved!'); qc.invalidateQueries(['settings']); } });
  const addCat = useMutation({ mutationFn: d => apiLib.categories.create(d), onSuccess: () => { toast.success(`Category "${newCat}" added!`); setNewCat(''); qc2.invalidateQueries(['categories']); } });
  const delCat = useMutation({ mutationFn: id => apiLib.categories.delete(id), onSuccess: () => { toast.success('Category deleted'); qc2.invalidateQueries(['categories']); } });

  const backup = () => {
    const blob = new Blob([JSON.stringify({ timestamp: new Date().toISOString(), settings: form, exportedBy: 'Villa Vogue BMS' }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `villavogue-backup-${new Date().toISOString().split('T')[0]}.json`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Backup downloaded!');
  };

  if (isLoading) return <Loader/>;

  return (
    <Page title="Settings" subtitle="Business configuration and preferences" icon={SettingsIcon}>
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <h3 className="font-heading font-semibold mb-4">Business Information</h3>
          <div className="space-y-3">
            {[['business_name','Business Name','Villa Vogue Fashions'],['business_email','Email','villavoguef@gmail.com'],['business_phone','Phone','+256 782 860372'],['business_address','Address','Kampala, Uganda']].map(([k,l,ph]) => (
              <div key={k}><label className="label">{l}</label><input className="input" value={form[k]||''} onChange={e => setForm(p=>({...p,[k]:e.target.value}))} placeholder={ph}/></div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-heading font-semibold mb-4">Financial Settings</h3>
          <div className="space-y-3">
            <div><label className="label">Currency Symbol</label>
              <select className="input" value={form.currency||'UGX'} onChange={e => setForm(p=>({...p,currency:e.target.value}))}>
                {['UGX','USD','KES','TZS','RWF','GHS','NGN'].map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label className="label">Tax Rate (%)</label><input className="input" type="number" value={form.tax_rate||'0'} onChange={e => setForm(p=>({...p,tax_rate:e.target.value}))} placeholder="0"/></div>
            <div><label className="label">Low Stock Alert Threshold</label><input className="input" type="number" value={form.low_stock_threshold||'5'} onChange={e => setForm(p=>({...p,low_stock_threshold:e.target.value}))}/></div>
            <div><label className="label">Loyalty Rate (UGX per 1 point earned)</label><input className="input" type="number" value={form.loyalty_rate||'1000'} onChange={e => setForm(p=>({...p,loyalty_rate:e.target.value}))}/></div>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-heading font-semibold mb-4">Receipt Settings</h3>
          <div><label className="label">Receipt Footer Message</label><textarea className="input resize-none" rows={3} value={form.receipt_footer||''} onChange={e => setForm(p=>({...p,receipt_footer:e.target.value}))} placeholder="Thank you for shopping at Villa Vogue!"/></div>
        </div>

        <div className="card p-5">
          <h3 className="font-heading font-semibold mb-4">Product Categories</h3>
          <div className="flex gap-2 mb-3">
            <input className="input flex-1 text-sm" placeholder="New category name..." value={newCat} onChange={e => setNewCat(e.target.value)} onKeyDown={e => e.key==='Enter'&&newCat.trim()&&addCat.mutate({name:newCat.trim()})}/>
            <button onClick={() => newCat.trim()&&addCat.mutate({name:newCat.trim()})} disabled={!newCat.trim()||addCat.isPending} className="btn-primary text-sm disabled:opacity-40">Add</button>
          </div>
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
            {cats?.map(c => (
              <div key={c.id} className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg px-2.5 py-1.5 text-sm">
                <span>{c.name}</span>
                <button onClick={() => window.confirm(`Delete "${c.name}"? This won't delete products.`)&&delCat.mutate(c.id)} className="text-gray-400 hover:text-red-500 ml-1"><X size={12}/></button>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-heading font-semibold mb-4">Data & Backup</h3>
          <p className="text-sm text-gray-500 mb-3">Download a local backup of your settings configuration.</p>
          <button onClick={backup} className="btn-secondary w-full justify-center mb-3"><Download size={16}/> Download Local Backup</button>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-400">
            💡 <strong>Full database backup</strong> (all orders, products, customers): Go to <strong>console.neon.tech</strong> → your project → Backups tab. Neon provides automatic daily backups.
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={() => save.mutate(form)} disabled={save.isPending} className="btn-primary px-10 text-base py-3">
          {saved?<><Check size={18}/> Saved!</>:save.isPending?'Saving...':'Save All Settings'}
        </button>
      </div>
    </Page>
  );
}

// ─── REPORTS stub (real page is Reports.jsx) ───────────────────
export function Reports() {
  return (
    <Page title="Reports" subtitle="Business performance reports" icon={BarChart3}>
      <div className="card p-8 text-center"><BarChart3 size={48} className="text-[#C9A96E]/30 mx-auto mb-3"/><p className="text-gray-500">The Reports page is now a dedicated page imported directly in App.jsx</p></div>
    </Page>
  );
}
