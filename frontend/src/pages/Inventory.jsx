import React, { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, Plus, Search, Edit2, Trash2, AlertTriangle, Upload, X, ChevronLeft, ChevronRight, Star, Image as ImageIcon, GripVertical, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { products as productsApi, categories, suppliers, uploads } from '../lib/api';

// ── Multi-Image Uploader ──────────────────────────────────────────────────────
const IMAGE_LABELS = ['Front', 'Back', 'Side', 'Detail', 'Color Alt', 'On Model', 'Packaging', 'Other'];

function MultiImageUploader({ images = [], onChange }) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);
  const fileRef = useRef();

  const uploadFiles = async (files) => {
    const arr = Array.from(files).slice(0, 8 - images.length);
    if (!arr.length) return;
    setUploading(true);
    try {
      const results = await Promise.all(arr.map(f => uploads.image(f).then(r => r.data?.url || r.data)));
      const newImgs = results.map((url, i) => ({
        url,
        label: IMAGE_LABELS[images.length + i] || 'Other',
        isPrimary: images.length === 0 && i === 0,
      }));
      onChange([...images, ...newImgs]);
      toast.success(`${results.length} image${results.length > 1 ? 's' : ''} uploaded`);
    } catch {
      toast.error('Upload failed — check file size and format');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (idx) => {
    const next = images.filter((_, i) => i !== idx);
    // If we removed the primary, make first remaining primary
    if (images[idx].isPrimary && next.length) next[0] = { ...next[0], isPrimary: true };
    onChange(next);
  };

  const setPrimary = (idx) => {
    onChange(images.map((img, i) => ({ ...img, isPrimary: i === idx })));
  };

  const setLabel = (idx, label) => {
    onChange(images.map((img, i) => i === idx ? { ...img, label } : img));
  };

  // Drag-to-reorder
  const onDragStart = (i) => setDragIdx(i);
  const onDragOver = (e, i) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === i) return;
    const next = [...images];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(i, 0, moved);
    setDragIdx(i);
    onChange(next);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    setDragIdx(null);
    if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="label">Product Images <span className="text-[#C9A96E]">*</span></label>
        <span className="text-xs text-gray-400">{images.length}/8 images · Drag to reorder</span>
      </div>

      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mb-3">
          {images.map((img, i) => (
            <div key={i} draggable
              onDragStart={() => onDragStart(i)}
              onDragOver={(e) => onDragOver(e, i)}
              onDragEnd={() => setDragIdx(null)}
              className={`relative group rounded-xl overflow-hidden border-2 transition-all cursor-grab ${img.isPrimary ? 'border-[#C9A96E]' : 'border-gray-200 dark:border-gray-700'} ${dragIdx === i ? 'opacity-50 scale-95' : ''}`}
              style={{ aspectRatio: '1' }}>
              <img src={img.url} alt={img.label} className="w-full h-full object-cover" />

              {/* Primary badge */}
              {img.isPrimary && (
                <div className="absolute top-1 left-1 bg-[#C9A96E] text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                  PRIMARY
                </div>
              )}

              {/* Drag handle */}
              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical size={12} className="text-white drop-shadow" />
              </div>

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-1">
                {!img.isPrimary && (
                  <button onClick={() => setPrimary(i)} className="text-[10px] bg-[#C9A96E] text-black font-bold px-2 py-1 rounded-full w-full text-center">
                    ★ Set Primary
                  </button>
                )}
                <select value={img.label} onChange={e => setLabel(i, e.target.value)}
                  className="text-[10px] bg-white/20 text-white border border-white/30 rounded-lg px-1 py-0.5 w-full">
                  {IMAGE_LABELS.map(l => <option key={l} value={l} className="text-black">{l}</option>)}
                </select>
                <button onClick={() => removeImage(i)} className="text-[10px] bg-red-500 text-white font-bold px-2 py-1 rounded-full w-full text-center">
                  Remove
                </button>
              </div>

              {/* Label badge at bottom */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[9px] text-center py-0.5">
                {img.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      {images.length < 8 && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
            dragOver ? 'border-[#C9A96E] bg-[#C9A96E]/10' : 'border-gray-300 dark:border-gray-600 hover:border-[#C9A96E]/50 hover:bg-gray-50 dark:hover:bg-gray-800/50'
          }`}>
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-[#C9A96E] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Uploading…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-[#C9A96E]/10 flex items-center justify-center">
                <ImageIcon size={18} className="text-[#C9A96E]" />
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                {dragOver ? 'Drop to upload' : 'Click or drag images here'}
              </p>
              <p className="text-xs text-gray-400">
                JPG, PNG, WEBP · Max 5MB each · {8 - images.length} remaining
              </p>
              <p className="text-xs text-gray-400">
                Tip: Upload front view first — it becomes the primary image
              </p>
            </div>
          )}
          <input ref={fileRef} type="file" multiple accept="image/*" className="hidden"
            onChange={e => uploadFiles(e.target.files)} />
        </div>
      )}

      {images.length > 0 && (
        <p className="text-xs text-gray-400 mt-2">
          💡 Hover over an image to set as primary, change label, or remove · Drag to reorder
        </p>
      )}
    </div>
  );
}

// ── Image preview in table ────────────────────────────────────────────────────
function ProductImages({ images }) {
  const parsed = (() => { try { return JSON.parse(images || '[]'); } catch { return []; } })();
  const imgs = parsed.map(i => typeof i === 'string' ? i : i.url).filter(Boolean);
  if (!imgs.length) return (
    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
      <ImageIcon size={14} className="text-gray-400" />
    </div>
  );
  return (
    <div className="flex -space-x-2">
      {imgs.slice(0, 3).map((url, i) => (
        <img key={i} src={url} alt="" className="w-10 h-10 rounded-lg object-cover border-2 border-white dark:border-gray-900 shadow-sm"
          style={{ zIndex: 3 - i }} />
      ))}
      {imgs.length > 3 && (
        <div className="w-10 h-10 rounded-lg bg-[#C9A96E]/20 border-2 border-white dark:border-gray-900 flex items-center justify-center text-[10px] font-bold text-[#A8824A]">
          +{imgs.length - 3}
        </div>
      )}
    </div>
  );
}

// ── Product form modal ────────────────────────────────────────────────────────
function ProductModal({ product, onClose, categories: cats = [], suppliers: sups = [] }) {
  const qc = useQueryClient();
  const isEdit = !!product;

  const parseImages = (raw) => {
    try {
      const parsed = JSON.parse(raw || '[]');
      return parsed.map(i => typeof i === 'string'
        ? { url: i, label: 'Front', isPrimary: false }
        : i
      ).map((i, idx) => ({ ...i, isPrimary: i.isPrimary || idx === 0 }));
    } catch { return []; }
  };

  const [form, setForm] = useState({
    name: product?.name || '',
    sku: product?.sku || '',
    barcode: product?.barcode || '',
    categoryId: product?.categoryId || '',
    price: product?.price || '',
    costPrice: product?.costPrice || '',
    stock: product?.stock || 0,
    lowStockThreshold: product?.lowStockThreshold || 5,
    description: product?.description || '',
    supplierId: product?.supplierId || '',
    isFeatured: product?.isFeatured || false,
    tags: (() => { try { return JSON.parse(product?.tags || '[]').join(', '); } catch { return ''; } })(),
  });
  const [images, setImages] = useState(parseImages(product?.images));
  const [tab, setTab] = useState('basic');

  const fi = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const mutation = useMutation({
    mutationFn: (data) => isEdit
      ? productsApi.update(product.id, data)
      : productsApi.create(data),
    onSuccess: () => {
      toast.success(isEdit ? 'Product updated!' : 'Product created!');
      qc.invalidateQueries(['products']);
      onClose();
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Save failed'),
  });

  const submit = () => {
    if (!form.name || !form.price) { toast.error('Name and price are required'); return; }
    // Serialize images: store full objects so labels/primary info is preserved
    const imageData = images.map(img => ({
      url: img.url,
      label: img.label || 'Front',
      isPrimary: img.isPrimary || false,
    }));
    mutation.mutate({
      ...form,
      price: parseFloat(form.price),
      costPrice: parseFloat(form.costPrice || 0),
      stock: parseInt(form.stock || 0),
      lowStockThreshold: parseInt(form.lowStockThreshold || 5),
      categoryId: form.categoryId || null,
      supplierId: form.supplierId || null,
      images: imageData,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    });
  };

  const margin = form.price && form.costPrice
    ? (((form.price - form.costPrice) / form.price) * 100).toFixed(1)
    : null;

  const tabs = [
    { k: 'basic', l: 'Basic Info' },
    { k: 'images', l: `Images (${images.length})` },
    { k: 'pricing', l: 'Pricing & Stock' },
    { k: 'details', l: 'Details' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl my-4">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h3 className="font-heading font-semibold text-lg">{isEdit ? 'Edit Product' : 'Add New Product'}</h3>
            <p className="text-xs text-gray-400 mt-0.5">All images are saved with labels for the customer portal</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={20} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-800 px-5">
          {tabs.map(t => (
            <button key={t.k} onClick={() => setTab(t.k)}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${tab === t.k ? 'border-[#C9A96E] text-[#A8824A]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              {t.l}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-5 space-y-4">

          {/* ── Basic Info ── */}
          {tab === 'basic' && (
            <>
              <div>
                <label className="label">Product Name *</label>
                <input className="input" value={form.name} onChange={e => fi('name', e.target.value)} placeholder="e.g. Floral Wrap Dress" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">SKU</label>
                  <input className="input" value={form.sku} onChange={e => fi('sku', e.target.value)} placeholder="VV-001" />
                </div>
                <div>
                  <label className="label">Barcode</label>
                  <input className="input" value={form.barcode} onChange={e => fi('barcode', e.target.value)} placeholder="Optional" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Category</label>
                  <select className="input" value={form.categoryId} onChange={e => fi('categoryId', e.target.value)}>
                    <option value="">Select category</option>
                    {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Supplier</label>
                  <select className="input" value={form.supplierId} onChange={e => fi('supplierId', e.target.value)}>
                    <option value="">Select supplier</option>
                    {sups.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input" rows={3} value={form.description} onChange={e => fi('description', e.target.value)}
                  placeholder="Describe the product — this appears on the customer portal" />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="feat" checked={form.isFeatured} onChange={e => fi('isFeatured', e.target.checked)} className="w-4 h-4 accent-[#C9A96E]" />
                <label htmlFor="feat" className="text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
                  ⭐ Feature this product (shows first on customer portal)
                </label>
              </div>
            </>
          )}

          {/* ── Images ── */}
          {tab === 'images' && (
            <MultiImageUploader images={images} onChange={setImages} />
          )}

          {/* ── Pricing & Stock ── */}
          {tab === 'pricing' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Selling Price (UGX) *</label>
                  <input className="input" type="number" value={form.price} onChange={e => fi('price', e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label className="label">Cost Price (UGX)</label>
                  <input className="input" type="number" value={form.costPrice} onChange={e => fi('costPrice', e.target.value)} placeholder="0" />
                </div>
              </div>
              {margin && (
                <div className={`rounded-xl p-3 flex items-center justify-between ${parseFloat(margin) >= 30 ? 'bg-green-50 dark:bg-green-900/20 border border-green-200' : parseFloat(margin) >= 15 ? 'bg-yellow-50 border border-yellow-200' : 'bg-red-50 border border-red-200'}`}>
                  <span className="text-sm font-medium">Profit Margin</span>
                  <span className={`font-bold text-lg ${parseFloat(margin) >= 30 ? 'text-green-600' : parseFloat(margin) >= 15 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {margin}% · UGX {(form.price - form.costPrice).toLocaleString()} profit
                  </span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {!isEdit && (
                  <div>
                    <label className="label">Opening Stock</label>
                    <input className="input" type="number" value={form.stock} onChange={e => fi('stock', e.target.value)} placeholder="0" />
                  </div>
                )}
                <div>
                  <label className="label">Low Stock Alert (units)</label>
                  <input className="input" type="number" value={form.lowStockThreshold} onChange={e => fi('lowStockThreshold', e.target.value)} />
                </div>
              </div>
            </>
          )}

          {/* ── Details ── */}
          {tab === 'details' && (
            <>
              <div>
                <label className="label">Tags (comma-separated)</label>
                <input className="input" value={form.tags} onChange={e => fi('tags', e.target.value)}
                  placeholder="new arrival, summer, floral, women" />
                <p className="text-xs text-gray-400 mt-1">Tags help customers find products via search</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Summary</p>
                <div className="space-y-2">
                  {[
                    { l: 'Images', v: `${images.length} uploaded` },
                    { l: 'Primary Image', v: images.find(i => i.isPrimary)?.label || (images.length ? 'First image' : 'None') },
                    { l: 'Selling Price', v: form.price ? `UGX ${Number(form.price).toLocaleString()}` : '—' },
                    { l: 'Margin', v: margin ? `${margin}%` : '—' },
                    { l: 'Category', v: cats.find(c => String(c.id) === String(form.categoryId))?.name || '—' },
                  ].map(r => (
                    <div key={r.l} className="flex justify-between text-sm">
                      <span className="text-gray-500">{r.l}</span>
                      <span className="font-medium">{r.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-gray-100 dark:border-gray-800">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={submit} disabled={mutation.isPending}
            className="btn-primary flex-1 justify-center">
            {mutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Product'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Inventory Page ───────────────────────────────────────────────────────
export default function Inventory() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [previewProduct, setPreviewProduct] = useState(null);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['products', search, catFilter, page],
    queryFn: () => productsApi.list({ search, category: catFilter, page, limit: 20 }).then(r => r.data),
    keepPreviousData: true,
  });

  const { data: catsData } = useQuery({ queryKey: ['categories'], queryFn: () => categories.list().then(r => r.data) });
  const { data: supsData } = useQuery({ queryKey: ['suppliers'], queryFn: () => suppliers.list().then(r => r.data) });

  const deleteMutation = useMutation({
    mutationFn: (id) => productsApi.delete(id),
    onSuccess: () => { toast.success('Product removed'); qc.invalidateQueries(['products']); },
  });

  const cats = catsData || [];
  const sups = supsData || [];
  const { products = [], total = 0, pages = 1 } = data || {};

  const openAdd = () => { setEditProduct(null); setShowModal(true); };
  const openEdit = (p) => { setEditProduct(p); setShowModal(true); };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Package size={22} className="text-[#C9A96E]" />
            <h1 className="page-title">Inventory</h1>
          </div>
          <p className="page-subtitle">{total} products · Multi-image with front/back/colour views</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus size={16} /> Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9 py-2 text-sm" placeholder="Search products…"
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="input py-2 text-sm w-44" value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1); }}>
          <option value="">All Categories</option>
          {cats.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              {['Images', 'Product', 'Category', 'Price', 'Cost', 'Margin', 'Stock', 'Status', 'Actions'].map(h => (
                <th key={h} className="table-header">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array(8).fill(null).map((_, i) => (
                <tr key={i} className="table-row">
                  {Array(9).fill(null).map((_, j) => (
                    <td key={j} className="table-cell"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : products.map(p => {
              const margin = p.costPrice > 0 ? ((p.price - p.costPrice) / p.price * 100).toFixed(0) : null;
              const imgCount = (() => { try { return JSON.parse(p.images || '[]').length; } catch { return 0; } })();
              return (
                <tr key={p.id} className="table-row">
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      <ProductImages images={p.images} />
                      {imgCount === 0 && (
                        <button onClick={() => openEdit(p)} className="text-[10px] text-[#C9A96E] font-semibold ml-1 hover:underline">
                          Add photos
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="table-cell">
                    <div>
                      <p className="font-medium text-sm">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.sku || '—'}</p>
                      {imgCount > 0 && <p className="text-[10px] text-[#C9A96E] mt-0.5">{imgCount} photo{imgCount > 1 ? 's' : ''}</p>}
                    </div>
                  </td>
                  <td className="table-cell"><span className="badge-gray text-xs">{p.category?.name || '—'}</span></td>
                  <td className="table-cell font-semibold text-sm">UGX {Number(p.price).toLocaleString()}</td>
                  <td className="table-cell text-sm text-gray-500">UGX {Number(p.costPrice || 0).toLocaleString()}</td>
                  <td className="table-cell">
                    {margin ? (
                      <span className={`badge text-xs font-bold ${parseFloat(margin) >= 30 ? 'badge-green' : parseFloat(margin) >= 15 ? 'badge-yellow' : 'badge-red'}`}>
                        {margin}%
                      </span>
                    ) : <span className="text-gray-400 text-xs">—</span>}
                  </td>
                  <td className="table-cell">
                    <span className={`badge text-xs font-bold ${p.stock === 0 ? 'badge-red' : p.stock <= p.lowStockThreshold ? 'badge-yellow' : 'badge-green'}`}>
                      {p.stock}
                    </span>
                    {p.stock <= p.lowStockThreshold && p.stock > 0 && (
                      <AlertTriangle size={10} className="inline ml-1 text-yellow-500" />
                    )}
                  </td>
                  <td className="table-cell">
                    <span className={`badge text-xs ${p.isActive ? 'badge-green' : 'badge-red'}`}>
                      {p.isActive ? 'Active' : 'Hidden'}
                    </span>
                    {p.isFeatured && <span className="text-[#C9A96E] text-xs ml-1">⭐</span>}
                  </td>
                  <td className="table-cell">
                    <div className="flex gap-1">
                      <button onClick={() => setPreviewProduct(p)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-[#C9A96E]" title="Preview">
                        <Eye size={14} />
                      </button>
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-[#C9A96E]">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => { if (window.confirm(`Remove "${p.name}"?`)) deleteMutation.mutate(p.id); }}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!isLoading && !products.length && (
          <div className="py-14 text-center text-gray-400">
            <Package size={32} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No products yet</p>
            <p className="text-sm mt-1">Click "Add Product" to get started</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">Showing {products.length} of {total}</p>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary py-1.5 px-3 text-sm disabled:opacity-40">
              <ChevronLeft size={14} /> Prev
            </button>
            <span className="py-1.5 px-3 text-sm text-gray-500">{page} / {pages}</span>
            <button disabled={page === pages} onClick={() => setPage(p => p + 1)} className="btn-secondary py-1.5 px-3 text-sm disabled:opacity-40">
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Product modal */}
      {showModal && (
        <ProductModal product={editProduct} onClose={() => setShowModal(false)} categories={cats} suppliers={sups} />
      )}

      {/* Quick preview modal */}
      {previewProduct && <PreviewModal product={previewProduct} onClose={() => setPreviewProduct(null)} />}
    </div>
  );
}

// ── Quick preview modal (shows all images) ───────────────────────────────────
function PreviewModal({ product: p, onClose }) {
  const [idx, setIdx] = useState(0);
  const images = (() => {
    try {
      const parsed = JSON.parse(p.images || '[]');
      return parsed.map(i => typeof i === 'string' ? { url: i, label: 'Image' } : i);
    } catch { return []; }
  })();

  const prev = () => setIdx(i => (i - 1 + images.length) % images.length);
  const next = () => setIdx(i => (i + 1) % images.length);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h3 className="font-semibold">{p.name}</h3>
            <p className="text-xs text-gray-400">{images.length} image{images.length !== 1 ? 's' : ''} · UGX {Number(p.price).toLocaleString()}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        {images.length > 0 ? (
          <>
            <div className="relative" style={{ aspectRatio: '4/3' }}>
              <img src={images[idx].url} alt={images[idx].label} className="w-full h-full object-contain bg-gray-50 dark:bg-gray-800" />
              {images[idx].isPrimary && (
                <div className="absolute top-3 left-3 bg-[#C9A96E] text-black text-xs font-bold px-2 py-1 rounded-full">Primary</div>
              )}
              <div className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full">{images[idx].label}</div>
              {images.length > 1 && (
                <>
                  <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 text-white rounded-full flex items-center justify-center hover:bg-black/60">
                    <ChevronLeft size={16} />
                  </button>
                  <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/40 text-white rounded-full flex items-center justify-center hover:bg-black/60">
                    <ChevronRight size={16} />
                  </button>
                </>
              )}
            </div>
            {/* Thumbnails */}
            <div className="flex gap-2 p-3 overflow-x-auto">
              {images.map((img, i) => (
                <button key={i} onClick={() => setIdx(i)}
                  className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${i === idx ? 'border-[#C9A96E]' : 'border-transparent'}`}>
                  <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="py-12 text-center text-gray-400">
            <ImageIcon size={32} className="mx-auto mb-2 opacity-30" />
            <p>No images uploaded yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
