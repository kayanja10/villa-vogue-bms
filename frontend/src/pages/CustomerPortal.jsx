/**
 * Villa Vogue – Customer Portal
 * ─────────────────────────────────────────────────────────────────
 * All original business logic + API calls preserved unchanged.
 * New features:
 *   ✦ Back button on Login page (→ /store)
 *   ✦ Cart side drawer (qty controls, remove, subtotal, checkout)
 *   ✦ Quick-view modal (image gallery, stock, add to cart)
 *   ✦ Wishlist page (localStorage, back button)
 *   ✦ Multi-image card gallery (hover dots)
 *   ✦ Scroll-triggered reveal (IntersectionObserver)
 *   ✦ Gold toast notifications (replace all alert())
 *   ✦ Live search suggestions dropdown (debounced)
 *   ✦ Glassmorphism nav / animated hero / 3D product cards
 */

import React, {
  useState, useEffect, useRef, useCallback,
} from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ShoppingBag, Search, Star, Heart, ChevronRight, Sparkles,
  User, LogOut, Package, X, ArrowLeft, Plus, Minus,
  Trash2, ChevronLeft, Eye, Check, Loader,
} from 'lucide-react';
import { products as productApi, customers } from '../../lib/api';

/* ══════════════════════════════════════════════════════════════════
   GLOBAL STYLES
══════════════════════════════════════════════════════════════════ */
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap');

    :root {
      --gold-light: #D4B483;
      --gold:       #C9A96E;
      --gold-deep:  #A8824A;
      --ink:        #0F0E0C;
      --cream:      #fdfaf6;
      --cream-dark: #f5f0e8;
    }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'DM Sans', sans-serif; }
    .font-display { font-family: 'Cormorant Garamond', Georgia, serif !important; }

    /* ─── Shimmer skeleton ─────────────────────────────────────── */
    @keyframes shimmer {
      0%   { background-position: -200% 0; }
      100% { background-position:  200% 0; }
    }
    .shimmer-card {
      background: linear-gradient(90deg,#ede8e0 25%,#f7f3ed 50%,#ede8e0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.6s ease-in-out infinite;
      border-radius: 14px;
    }

    /* ─── Gradient text ────────────────────────────────────────── */
    .gradient-text {
      background: linear-gradient(135deg,#D4B483 0%,#C9A96E 40%,#A8824A 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    /* ─── Buttons ──────────────────────────────────────────────── */
    .btn-gold {
      background: linear-gradient(135deg,#D4B483 0%,#C9A96E 50%,#A8824A 100%);
      position: relative; overflow: hidden;
      transition: all .35s cubic-bezier(.22,1,.36,1);
      cursor: pointer;
    }
    .btn-gold::before {
      content:''; position:absolute; inset:0;
      background: linear-gradient(105deg,transparent 30%,rgba(255,255,255,.28) 50%,transparent 70%);
      transform: translateX(-100%);
      transition: transform .55s ease;
    }
    .btn-gold:hover::before  { transform: translateX(100%); }
    .btn-gold:hover          { box-shadow:0 8px 32px rgba(201,169,110,.45); transform:translateY(-2px); }
    .btn-gold:active         { transform: translateY(0); }
    .btn-gold:disabled       { opacity:.55; cursor:not-allowed; transform:none; }

    .btn-outline-gold {
      border: 1.5px solid rgba(201,169,110,.5);
      color: #C9A96E; background: transparent;
      position: relative; overflow: hidden;
      transition: all .35s cubic-bezier(.22,1,.36,1);
      cursor: pointer;
    }
    .btn-outline-gold::before {
      content:''; position:absolute; inset:0;
      background: rgba(201,169,110,.08);
      transform: scaleX(0); transform-origin:left;
      transition: transform .35s ease;
    }
    .btn-outline-gold:hover::before { transform: scaleX(1); }
    .btn-outline-gold:hover         { border-color:#C9A96E; box-shadow:0 0 0 1px rgba(201,169,110,.3); }

    /* ─── Inputs ───────────────────────────────────────────────── */
    .luxury-input {
      font-family: 'DM Sans', sans-serif;
      background: rgba(253,250,246,.6);
      border: 1px solid rgba(201,169,110,.2);
      border-radius: 10px;
      padding: 13px 16px;
      width: 100%; font-size: 14px; color: #1a1a1a;
      transition: all .3s ease; outline: none;
    }
    .luxury-input:focus {
      background: #fdfaf6;
      border-color: #C9A96E;
      box-shadow: 0 0 0 3px rgba(201,169,110,.12);
    }
    .luxury-input::placeholder { color:#aaa; }
    .luxury-label {
      font-family:'DM Sans',sans-serif; font-size:11px; font-weight:500;
      letter-spacing:.08em; text-transform:uppercase; color:#888;
      display:block; margin-bottom:6px;
    }

    /* ─── Product card ─────────────────────────────────────────── */
    .product-card {
      transition: transform .45s cubic-bezier(.22,1,.36,1),
                  box-shadow .45s cubic-bezier(.22,1,.36,1);
      will-change: transform; cursor: pointer;
    }
    .product-card:hover {
      transform: translateY(-8px) scale(1.01);
      box-shadow: 0 20px 60px rgba(15,14,12,.14),
                  0 6px 20px rgba(201,169,110,.12);
    }
    .card-image-wrap { overflow:hidden; border-radius:16px; }
    .card-image { transition: transform .7s cubic-bezier(.22,1,.36,1); will-change:transform; }
    .product-card:hover .card-image { transform: scale(1.08); }

    .cart-reveal {
      transform: translateY(100%); opacity:0;
      transition: transform .4s cubic-bezier(.22,1,.36,1), opacity .3s ease;
    }
    .product-card:hover .cart-reveal { transform:translateY(0); opacity:1; }

    .action-btn-hover { opacity:0; transform:scale(.8); transition:all .3s cubic-bezier(.22,1,.36,1); }
    .product-card:hover .action-btn-hover { opacity:1; transform:scale(1); }

    .card-overlay {
      position:absolute; inset:0;
      background: linear-gradient(to top,rgba(10,8,5,.55) 0%,transparent 55%);
      opacity:0; transition:opacity .4s ease; border-radius:16px;
    }
    .product-card:hover .card-overlay { opacity:1; }

    /* ─── Image dots ───────────────────────────────────────────── */
    .img-dot {
      width:6px; height:6px; border-radius:50%;
      background:rgba(255,255,255,.4);
      transition:all .2s ease; cursor:pointer; border:none; padding:0;
    }
    .img-dot.active { background:#C9A96E; width:18px; border-radius:3px; }

    /* ─── Toast ────────────────────────────────────────────────── */
    @keyframes toastIn  { from{opacity:0;transform:translateX(110%)} to{opacity:1;transform:translateX(0)} }
    @keyframes toastOut { from{opacity:1;transform:translateX(0)}    to{opacity:0;transform:translateX(110%)} }
    .toast-in  { animation: toastIn  .4s cubic-bezier(.22,1,.36,1) both; }
    .toast-out { animation: toastOut .35s ease both; }

    /* ─── Drawer ───────────────────────────────────────────────── */
    @keyframes slideInRight  { from{transform:translateX(100%)} to{transform:translateX(0)} }
    @keyframes slideOutRight { from{transform:translateX(0)}    to{transform:translateX(100%)} }
    .drawer-in  { animation: slideInRight  .4s cubic-bezier(.22,1,.36,1) both; }

    /* ─── Modal ────────────────────────────────────────────────── */
    @keyframes modalIn { from{opacity:0;transform:translate(-50%,-46%) scale(.96)} to{opacity:1;transform:translate(-50%,-50%) scale(1)} }
    .modal-in { animation: modalIn .4s cubic-bezier(.22,1,.36,1) both; }

    /* ─── Scroll reveal ────────────────────────────────────────── */
    .sr-hidden  { opacity:0; transform:translateY(28px); transition:opacity .7s cubic-bezier(.22,1,.36,1),transform .7s cubic-bezier(.22,1,.36,1); }
    .sr-visible { opacity:1; transform:translateY(0); }

    /* ─── Nav ──────────────────────────────────────────────────── */
    .nav-scrolled {
      backdrop-filter:blur(24px) saturate(180%);
      -webkit-backdrop-filter:blur(24px) saturate(180%);
      box-shadow:0 2px 32px rgba(15,14,12,.10);
    }
    .nav-link { position:relative; transition:color .25s ease; }
    .nav-link::after {
      content:''; position:absolute; bottom:-2px; left:0; right:0; height:1.5px;
      background:linear-gradient(90deg,#C9A96E,#D4B483);
      transform:scaleX(0); transform-origin:right;
      transition:transform .3s cubic-bezier(.22,1,.36,1);
    }
    .nav-link:hover::after { transform:scaleX(1); transform-origin:left; }
    .nav-link:hover { color:#A8824A; }

    /* ─── Hero ─────────────────────────────────────────────────── */
    @keyframes gradientShift { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
    .hero-gradient {
      background: linear-gradient(-45deg,#0a0805,#1a140a,#0f0d09,#1a1208,#0a0805);
      background-size: 400% 400%;
      animation: gradientShift 16s ease infinite;
    }
    @keyframes revealUp { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
    .reveal-up      { animation: revealUp .9s cubic-bezier(.22,1,.36,1) both; }
    .rd1 { animation-delay:.15s; }
    .rd2 { animation-delay:.30s; }
    .rd3 { animation-delay:.45s; }
    .rd4 { animation-delay:.60s; }

    /* ─── Login float ──────────────────────────────────────────── */
    @keyframes loginFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
    .login-float { animation: loginFloat 6s ease-in-out infinite; }

    /* ─── Ambient particles ────────────────────────────────────── */
    @keyframes particleDrift {
      0%   { transform:translateY(0) translateX(0) scale(1); opacity:0; }
      20%  { opacity:.6; }
      80%  { opacity:.3; }
      100% { transform:translateY(-120px) translateX(30px) scale(.5); opacity:0; }
    }
    .particle {
      position:absolute; border-radius:50%;
      background:radial-gradient(circle,rgba(201,169,110,.8) 0%,transparent 70%);
      animation: particleDrift linear infinite;
      pointer-events:none;
    }

    /* ─── Orbs ─────────────────────────────────────────────────── */
    @keyframes float  { 0%,100%{transform:translateY(0)}    50%{transform:translateY(-14px)} }
    @keyframes float2 { 0%,100%{transform:translateY(0)}    50%{transform:translateY(-20px)} }
    .orb  { border-radius:50%; filter:blur(60px); pointer-events:none; }
    .fa1  { animation: float  7s ease-in-out infinite; }
    .fa2  { animation: float2 9s ease-in-out infinite; }

    /* ─── Badge glow ───────────────────────────────────────────── */
    .badge-glow { box-shadow:0 0 10px rgba(201,169,110,.6),0 0 20px rgba(201,169,110,.2); }

    /* ─── Search dropdown ──────────────────────────────────────── */
    @keyframes dropDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
    .search-drop { animation: dropDown .2s ease both; }

    /* ─── Spinner ──────────────────────────────────────────────── */
    @keyframes spin { to{transform:rotate(360deg)} }
    .spin { animation: spin 1s linear infinite; }

    /* ─── Fade in (wishlist cards) ─────────────────────────────── */
    @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
    .fade-up { animation: fadeUp .5s cubic-bezier(.22,1,.36,1) both; }

    /* ─── No scroll ────────────────────────────────────────────── */
    .no-scroll { overflow:hidden; }

    /* ─── Scrollbar ────────────────────────────────────────────── */
    ::-webkit-scrollbar { width:5px; height:5px; }
    ::-webkit-scrollbar-track { background:#f5f0e8; }
    ::-webkit-scrollbar-thumb { background:#C9A96E; border-radius:10px; }
  `}</style>
);

/* ══════════════════════════════════════════════════════════════════
   AMBIENT PARTICLES
══════════════════════════════════════════════════════════════════ */
function Particles({ count = 14 }) {
  const pts = useRef(
    Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      bottom: `${Math.random() * 45}%`,
      size: 3 + Math.random() * 5,
      dur: 6 + Math.random() * 10,
      delay: Math.random() * 8,
    }))
  ).current;
  return (
    <>
      {pts.map(p => (
        <span key={p.id} className="particle" style={{
          left: p.left, bottom: p.bottom,
          width: p.size, height: p.size,
          animationDuration: `${p.dur}s`,
          animationDelay: `${p.delay}s`,
        }} />
      ))}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════
   TOAST SYSTEM
══════════════════════════════════════════════════════════════════ */
function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback(({ type = 'success', title, message }) => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, { id, type, title, message, exiting: false }]);
    setTimeout(() => {
      setToasts(p => p.map(t => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 380);
    }, 3200);
  }, []);
  const remove = useCallback((id) => {
    setToasts(p => p.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 380);
  }, []);
  return { toasts, add, remove };
}

function ToastContainer({ toasts, removeToast }) {
  return (
    <div style={{ position:'fixed', top:24, right:24, zIndex:9999, display:'flex', flexDirection:'column', gap:10, pointerEvents:'none' }}>
      {toasts.map(t => (
        <div key={t.id} className={t.exiting ? 'toast-out' : 'toast-in'}
          style={{
            background: t.type === 'success' ? 'linear-gradient(135deg,#0e0c09,#1a1208)' : '#2d1a1a',
            border: `1px solid ${t.type === 'success' ? 'rgba(201,169,110,.35)' : 'rgba(239,68,68,.35)'}`,
            borderRadius:14, padding:'14px 18px',
            display:'flex', alignItems:'center', gap:12,
            boxShadow:'0 8px 32px rgba(0,0,0,.35)',
            minWidth:280, maxWidth:360,
            pointerEvents:'all',
            backdropFilter:'blur(20px)',
          }}>
          <div style={{
            width:28, height:28, borderRadius:'50%', flexShrink:0,
            background: t.type === 'success' ? 'linear-gradient(135deg,#D4B483,#A8824A)' : '#ef4444',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            {t.type === 'success' ? <Check size={13} color="white" /> : <X size={13} color="white" />}
          </div>
          <div style={{ flex:1 }}>
            {t.title && <p style={{ fontSize:13, fontWeight:600, color:'white', marginBottom:2 }}>{t.title}</p>}
            <p style={{ fontSize:12, color:'rgba(255,255,255,.6)' }}>{t.message}</p>
          </div>
          <button onClick={() => removeToast(t.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,.3)', padding:2 }}>
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   WISHLIST (localStorage)
══════════════════════════════════════════════════════════════════ */
function useWishlist() {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('vv_wishlist') || '[]'); } catch { return []; }
  });
  const toggle = useCallback((product) => {
    setItems(prev => {
      const exists = prev.find(p => p.id === product.id);
      const next = exists ? prev.filter(p => p.id !== product.id) : [...prev, product];
      localStorage.setItem('vv_wishlist', JSON.stringify(next));
      return next;
    });
  }, []);
  const isWished = useCallback((id) => !!items.find(p => p.id === id), [items]);
  return { items, toggle, isWished };
}

/* ══════════════════════════════════════════════════════════════════
   SCROLL REVEAL HOOK
══════════════════════════════════════════════════════════════════ */
function useScrollReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { el.classList.add('sr-visible'); obs.disconnect(); }
    }, { threshold: 0.10 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

/* ══════════════════════════════════════════════════════════════════
   LIVE SEARCH BAR
══════════════════════════════════════════════════════════════════ */
function SearchBar({ value, onChange }) {
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const debRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    clearTimeout(debRef.current);
    if (value.length < 2) { setSuggestions([]); return; }
    debRef.current = setTimeout(async () => {
      try {
        const res = await productApi.listPublic({ page:1, limit:5, search:value }).then(r => r.data);
        setSuggestions(res.products || []);
      } catch { setSuggestions([]); }
    }, 320);
  }, [value]);

  useEffect(() => {
    const fn = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setFocused(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const showDrop = focused && suggestions.length > 0;

  return (
    <div ref={wrapRef} style={{ flex:1, maxWidth:400, position:'relative' }}>
      <Search size={15} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'#aaa', pointerEvents:'none', zIndex:1 }} />
      <input
        className="luxury-input"
        style={{ paddingLeft:40, borderRadius:50, fontSize:13, height:40, background:'rgba(245,240,232,.7)' }}
        placeholder="Search dresses, bags, shoes…"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
      />
      {showDrop && (
        <div className="search-drop" style={{
          position:'absolute', top:'calc(100% + 8px)', left:0, right:0,
          background:'white', borderRadius:14, overflow:'hidden',
          boxShadow:'0 16px 48px rgba(15,14,12,.14),0 4px 12px rgba(15,14,12,.06)',
          border:'1px solid rgba(201,169,110,.15)', zIndex:200,
        }}>
          <p style={{ fontSize:10, color:'#aaa', padding:'10px 16px 6px', letterSpacing:'0.12em', textTransform:'uppercase', fontWeight:500 }}>Suggestions</p>
          {suggestions.map(p => {
            const imgs = (() => { try { return JSON.parse(p.images||'[]'); } catch { return []; } })();
            return (
              <div key={p.id}
                onClick={() => { onChange(p.name); setFocused(false); }}
                style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px', cursor:'pointer', transition:'background .15s' }}
                onMouseEnter={e => e.currentTarget.style.background='#fdfaf6'}
                onMouseLeave={e => e.currentTarget.style.background='white'}>
                <div style={{ width:36, height:44, borderRadius:6, overflow:'hidden', background:'#f5f0e8', flexShrink:0 }}>
                  {imgs[0] ? <img src={imgs[0]} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                           : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>👗</div>}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13, fontWeight:500, color:'#1a1a1a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</p>
                  <p className="gradient-text font-display" style={{ fontSize:13 }}>UGX {Number(p.price).toLocaleString()}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   CART DRAWER
══════════════════════════════════════════════════════════════════ */
function CartDrawer({ cart, setCart, open, onClose, toast }) {
  const total = cart.reduce((s, i) => s + Number(i.price) * i.qty, 0);

  const updateQty = (id, delta) =>
    setCart(p => p.map(i => i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i));

  const remove = (id) => {
    setCart(p => p.filter(i => i.id !== id));
    toast({ type:'success', title:'Removed', message:'Item removed from cart' });
  };

  useEffect(() => {
    document.body.classList.toggle('no-scroll', open);
    return () => document.body.classList.remove('no-scroll');
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(10,8,5,.55)', backdropFilter:'blur(4px)', zIndex:800 }} />
      <div className="drawer-in" style={{
        position:'fixed', top:0, right:0, bottom:0, width:'100%', maxWidth:420,
        background:'#fdfaf6', zIndex:801,
        display:'flex', flexDirection:'column',
        boxShadow:'-8px 0 48px rgba(15,14,12,.18)',
      }}>
        {/* Header */}
        <div style={{ padding:'24px 24px 20px', borderBottom:'1px solid rgba(201,169,110,.15)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <h2 className="font-display" style={{ fontSize:28, fontWeight:400, color:'#0F0E0C' }}>Your Cart</h2>
            <p style={{ fontSize:12, color:'#aaa', marginTop:2 }}>{cart.length} {cart.length===1?'item':'items'}</p>
          </div>
          <button onClick={onClose} style={{ width:38, height:38, borderRadius:10, background:'#f5f0e8', border:'1px solid rgba(201,169,110,.15)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            <X size={16} color="#666" />
          </button>
        </div>

        {/* Items */}
        <div style={{ flex:1, overflowY:'auto', padding:'16px 24px' }}>
          {cart.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px 0' }}>
              <ShoppingBag size={48} color="#ddd" style={{ margin:'0 auto 16px', display:'block' }} />
              <p style={{ color:'#bbb', fontSize:15, marginBottom:20 }}>Your cart is empty</p>
              <button onClick={onClose} className="btn-gold"
                style={{ padding:'11px 28px', border:'none', borderRadius:50, color:'white', fontSize:13, fontWeight:600 }}>
                Continue Shopping
              </button>
            </div>
          ) : (
            cart.map(item => {
              const imgs = (() => { try { return JSON.parse(item.images||'[]'); } catch { return []; } })();
              return (
                <div key={item.id} style={{ display:'flex', gap:14, paddingBottom:20, marginBottom:20, borderBottom:'1px solid rgba(201,169,110,.1)' }}>
                  <div style={{ width:72, height:90, borderRadius:10, overflow:'hidden', flexShrink:0, background:'#f5f0e8' }}>
                    {imgs[0]
                      ? <img src={imgs[0]} alt={item.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                      : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>👗</div>}
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:14, fontWeight:500, color:'#1a1a1a', marginBottom:3 }}>{item.name}</p>
                    {item.category && <p style={{ fontSize:11, color:'#aaa', marginBottom:8 }}>{item.category.name}</p>}
                    <p className="gradient-text font-display" style={{ fontSize:16, fontWeight:600, marginBottom:10 }}>UGX {Number(item.price).toLocaleString()}</p>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ display:'flex', alignItems:'center', border:'1px solid rgba(201,169,110,.25)', borderRadius:8, overflow:'hidden' }}>
                        <button onClick={() => updateQty(item.id,-1)} style={{ width:30, height:30, background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#666' }}><Minus size={12}/></button>
                        <span style={{ width:30, textAlign:'center', fontSize:13, fontWeight:600, color:'#1a1a1a' }}>{item.qty}</span>
                        <button onClick={() => updateQty(item.id, 1)} style={{ width:30, height:30, background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#666' }}><Plus  size={12}/></button>
                      </div>
                      <button onClick={() => remove(item.id)} style={{ width:30, height:30, borderRadius:8, background:'rgba(239,68,68,.08)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <Trash2 size={12} color="#ef4444" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div style={{ padding:'20px 24px', borderTop:'1px solid rgba(201,169,110,.15)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontSize:13, color:'#888' }}>Subtotal</span>
              <span className="gradient-text font-display" style={{ fontSize:22, fontWeight:600 }}>UGX {total.toLocaleString()}</span>
            </div>
            <p style={{ fontSize:11, color:'#aaa', marginBottom:16 }}>Shipping calculated at checkout</p>
            <button className="btn-gold" style={{ width:'100%', padding:'15px 0', border:'none', borderRadius:12, color:'white', fontSize:14, fontWeight:600, letterSpacing:'0.04em' }}>
              Proceed to Checkout
            </button>
            <button onClick={onClose} style={{ width:'100%', padding:'12px 0', background:'none', border:'none', cursor:'pointer', fontSize:13, color:'#aaa', marginTop:10 }}>
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════
   QUICK-VIEW MODAL
══════════════════════════════════════════════════════════════════ */
function QuickViewModal({ product, onClose, onAddToCart }) {
  const [imgIdx, setImgIdx] = useState(0);
  const imgs = (() => { try { return JSON.parse(product.images||'[]'); } catch { return []; } })();

  useEffect(() => {
    document.body.classList.add('no-scroll');
    const fn = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', fn);
    return () => { document.body.classList.remove('no-scroll'); window.removeEventListener('keydown', fn); };
  }, [onClose]);

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(10,8,5,.65)', backdropFilter:'blur(6px)', zIndex:900 }} />
      <div className="modal-in" style={{
        position:'fixed', top:'50%', left:'50%',
        width:'94%', maxWidth:820, maxHeight:'90vh',
        background:'#fdfaf6', borderRadius:24, zIndex:901,
        display:'flex', overflow:'hidden',
        boxShadow:'0 40px 100px rgba(0,0,0,.4)',
      }}>
        {/* Image */}
        <div style={{ width:'48%', position:'relative', background:'#f5f0e8', flexShrink:0 }}>
          {imgs.length > 0 ? (
            <>
              <img src={imgs[imgIdx]} alt={product.name} style={{ width:'100%', height:'100%', objectFit:'cover', transition:'opacity .3s ease' }} />
              {imgs.length > 1 && (
                <>
                  <button onClick={() => setImgIdx(p => (p-1+imgs.length)%imgs.length)}
                    style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', width:36, height:36, borderRadius:'50%', background:'rgba(253,250,246,.9)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 8px rgba(0,0,0,.15)' }}>
                    <ChevronLeft size={16} color="#666" />
                  </button>
                  <button onClick={() => setImgIdx(p => (p+1)%imgs.length)}
                    style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', width:36, height:36, borderRadius:'50%', background:'rgba(253,250,246,.9)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 8px rgba(0,0,0,.15)' }}>
                    <ChevronRight size={16} color="#666" />
                  </button>
                  <div style={{ position:'absolute', bottom:14, left:0, right:0, display:'flex', justifyContent:'center', gap:6 }}>
                    {imgs.map((_, i) => <button key={i} onClick={() => setImgIdx(i)} className={`img-dot ${i===imgIdx?'active':''}`} />)}
                  </div>
                </>
              )}
            </>
          ) : (
            <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:80 }}>👗</div>
          )}
          {product.isFeatured && (
            <div className="badge-glow" style={{ position:'absolute', top:14, left:14, background:'linear-gradient(135deg,#D4B483,#C9A96E)', color:'white', fontSize:9, fontWeight:700, padding:'4px 10px', borderRadius:50, display:'flex', alignItems:'center', gap:4, letterSpacing:'0.08em', textTransform:'uppercase' }}>
              <Sparkles size={8} /> Featured
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ flex:1, padding:32, overflowY:'auto', display:'flex', flexDirection:'column', gap:16, position:'relative' }}>
          <button onClick={onClose} style={{ position:'absolute', top:16, right:16, width:36, height:36, borderRadius:10, background:'#f5f0e8', border:'1px solid rgba(201,169,110,.15)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            <X size={15} color="#666" />
          </button>

          {product.category && <p style={{ fontSize:11, color:'#C9A96E', letterSpacing:'0.2em', textTransform:'uppercase', fontWeight:500 }}>{product.category.name}</p>}
          <h2 className="font-display" style={{ fontSize:28, fontWeight:400, color:'#0F0E0C', lineHeight:1.15 }}>{product.name}</h2>
          <p className="gradient-text font-display" style={{ fontSize:26, fontWeight:600 }}>UGX {Number(product.price).toLocaleString()}</p>

          {product.description && <p style={{ fontSize:14, color:'#666', lineHeight:1.75 }}>{product.description}</p>}

          <div>
            {product.stock > 0
              ? <span style={{ fontSize:12, padding:'5px 14px', borderRadius:50, background:'rgba(34,197,94,.1)', color:'#16a34a', fontWeight:600 }}>✓ In Stock ({product.stock} left)</span>
              : <span style={{ fontSize:12, padding:'5px 14px', borderRadius:50, background:'rgba(239,68,68,.08)', color:'#ef4444', fontWeight:600 }}>Sold Out</span>}
          </div>

          <button
            onClick={() => { onAddToCart(); onClose(); }}
            disabled={product.stock === 0}
            className="btn-gold"
            style={{ width:'100%', padding:'14px 0', border:'none', borderRadius:12, color:'white', fontSize:14, fontWeight:600, letterSpacing:'0.04em', marginTop:'auto' }}>
            {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SKELETON
══════════════════════════════════════════════════════════════════ */
function SkeletonCard() {
  return (
    <div>
      <div className="shimmer-card" style={{ aspectRatio:'3/4', marginBottom:12 }} />
      <div className="shimmer-card" style={{ height:14, width:'80%', marginBottom:8 }} />
      <div className="shimmer-card" style={{ height:12, width:'50%' }} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PRODUCT CARD
══════════════════════════════════════════════════════════════════ */
function ProductCard({ product, onAddToCart, onQuickView, wishlist }) {
  const imgs = (() => { try { return JSON.parse(product.images||'[]'); } catch { return []; } })();
  const [imgIdx, setImgIdx] = useState(0);
  const wished = wishlist.isWished(product.id);
  const ref = useScrollReveal();

  return (
    <div ref={ref} className="product-card sr-hidden">
      <div className="card-image-wrap" style={{ position:'relative', aspectRatio:'3/4', marginBottom:12, background:'linear-gradient(135deg,#f5f0e8,#ede8e0)' }}>
        {imgs.length > 0
          ? <img src={imgs[imgIdx]} alt={product.name} className="card-image" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
          : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:56 }}>👗</div>}

        <div className="card-overlay" />

        {product.isFeatured && (
          <div className="badge-glow" style={{ position:'absolute', top:12, left:12, background:'linear-gradient(135deg,#D4B483,#C9A96E)', color:'white', fontSize:9, fontWeight:700, padding:'4px 10px', borderRadius:50, display:'flex', alignItems:'center', gap:4, letterSpacing:'0.08em', textTransform:'uppercase' }}>
            <Sparkles size={8}/> Featured
          </div>
        )}

        {/* Action buttons */}
        <div style={{ position:'absolute', top:12, right:12, display:'flex', flexDirection:'column', gap:6 }}>
          <button className="action-btn-hover"
            onClick={e => { e.stopPropagation(); wishlist.toggle(product); }}
            style={{ width:34, height:34, borderRadius:'50%', background:'rgba(253,250,246,.9)', backdropFilter:'blur(8px)', border:'1px solid rgba(201,169,110,.2)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', boxShadow:'0 2px 8px rgba(0,0,0,.12)' }}>
            <Heart size={13} style={{ fill:wished?'#ef4444':'none', color:wished?'#ef4444':'#999', transition:'all .25s' }} />
          </button>
          <button className="action-btn-hover"
            onClick={e => { e.stopPropagation(); onQuickView(product); }}
            style={{ width:34, height:34, borderRadius:'50%', background:'rgba(253,250,246,.9)', backdropFilter:'blur(8px)', border:'1px solid rgba(201,169,110,.2)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', boxShadow:'0 2px 8px rgba(0,0,0,.12)' }}>
            <Eye size={13} color="#999" />
          </button>
        </div>

        {/* Multi-image dots */}
        {imgs.length > 1 && (
          <div style={{ position:'absolute', bottom:52, left:0, right:0, display:'flex', justifyContent:'center', gap:5 }}>
            {imgs.map((_, i) => (
              <button key={i}
                className={`img-dot ${i===imgIdx?'active':''}`}
                onMouseEnter={() => setImgIdx(i)}
                onClick={e => { e.stopPropagation(); setImgIdx(i); }}
              />
            ))}
          </div>
        )}

        {product.stock <= 3 && product.stock > 0 && (
          <div style={{ position:'absolute', bottom:52, left:12, background:'rgba(239,68,68,.9)', backdropFilter:'blur(8px)', color:'white', fontSize:10, fontWeight:600, padding:'3px 10px', borderRadius:50 }}>
            Only {product.stock} left
          </div>
        )}
        {product.stock === 0 && (
          <div style={{ position:'absolute', inset:0, background:'rgba(10,8,5,.5)', backdropFilter:'blur(2px)', display:'flex', alignItems:'center', justifyContent:'center', borderRadius:16 }}>
            <span style={{ background:'rgba(253,250,246,.95)', color:'#555', fontSize:13, fontWeight:600, padding:'8px 20px', borderRadius:50 }}>Sold Out</span>
          </div>
        )}

        {/* Add to cart */}
        <div className="cart-reveal" style={{ position:'absolute', inset:'0 0 0 0', display:'flex', alignItems:'flex-end', padding:10 }}>
          <button
            onClick={e => { e.stopPropagation(); onAddToCart(product); }}
            disabled={product.stock === 0}
            style={{ width:'100%', padding:'11px 0', background:'rgba(10,8,5,.88)', backdropFilter:'blur(12px)', color:'white', fontSize:12, fontWeight:600, border:'1px solid rgba(201,169,110,.3)', borderRadius:10, cursor:product.stock===0?'not-allowed':'pointer', letterSpacing:'0.08em', textTransform:'uppercase', transition:'background .25s', opacity:product.stock===0?.5:1 }}
            onMouseEnter={e => { if(product.stock>0) e.currentTarget.style.background='linear-gradient(135deg,#D4B483,#A8824A)'; }}
            onMouseLeave={e => e.currentTarget.style.background='rgba(10,8,5,.88)'}>
            Add to Cart
          </button>
        </div>
      </div>

      <p style={{ fontSize:13.5, fontWeight:500, color:'#1a1a1a', marginBottom:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{product.name}</p>
      {product.category && <p style={{ fontSize:11, color:'#aaa', marginBottom:5, letterSpacing:'0.05em' }}>{product.category.name}</p>}
      <p className="gradient-text font-display" style={{ fontSize:17, fontWeight:600 }}>UGX {Number(product.price).toLocaleString()}</p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   WISHLIST PAGE
══════════════════════════════════════════════════════════════════ */
function WishlistPage({ wishlist, onAddToCart, onQuickView, onBack }) {
  return (
    <div style={{ minHeight:'60vh', maxWidth:1280, margin:'0 auto', padding:'48px 24px' }}>
      {/* ── Back button ── */}
      <button onClick={onBack}
        style={{ display:'flex', alignItems:'center', gap:8, background:'none', border:'none', cursor:'pointer', color:'#888', fontSize:13, fontWeight:500, marginBottom:32, padding:0, transition:'color .2s' }}
        onMouseEnter={e => e.currentTarget.style.color='#A8824A'}
        onMouseLeave={e => e.currentTarget.style.color='#888'}>
        <ArrowLeft size={16}/> Back to Shop
      </button>

      <div style={{ marginBottom:40 }}>
        <p style={{ fontSize:11, color:'#C9A96E', letterSpacing:'0.3em', textTransform:'uppercase', marginBottom:8, fontWeight:500 }}>Saved Items</p>
        <h1 className="font-display" style={{ fontSize:42, fontWeight:400, color:'#0F0E0C' }}>Your Wishlist</h1>
        <p style={{ fontSize:13, color:'#aaa', marginTop:6 }}>{wishlist.items.length} {wishlist.items.length===1?'piece':'pieces'} saved</p>
      </div>

      {wishlist.items.length === 0 ? (
        <div style={{ textAlign:'center', padding:'80px 0' }}>
          <Heart size={52} color="#ddd" style={{ margin:'0 auto 16px', display:'block' }} />
          <p style={{ color:'#bbb', fontSize:15, marginBottom:20 }}>Nothing saved yet</p>
          <button onClick={onBack} className="btn-gold"
            style={{ padding:'12px 28px', border:'none', borderRadius:50, color:'white', fontSize:13, fontWeight:600 }}>
            Browse Collection
          </button>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:28 }}>
          {wishlist.items.map((p, i) => (
            <div key={p.id} className="fade-up" style={{ animationDelay:`${i*0.06}s` }}>
              <ProductCard product={p} onAddToCart={onAddToCart} onQuickView={onQuickView} wishlist={wishlist} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   STORE HOME
══════════════════════════════════════════════════════════════════ */
function StoreHome({ addToCart, onQuickView, wishlist }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['public-products', page],
    queryFn: () => productApi.listPublic({ page, limit:24 }).then(r => r.data),
  });

  const rest = data?.products || [];
  const featured = rest.filter(p => p.isFeatured).slice(0, 3);
  const collectionRef = useScrollReveal();

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="hero-gradient" style={{ position:'relative', overflow:'hidden', minHeight:600 }}>
        <div className="orb fa1" style={{ position:'absolute', width:500, height:500, background:'radial-gradient(circle,rgba(201,169,110,.12) 0%,transparent 70%)', top:-100, right:-100, zIndex:0 }} />
        <div className="orb fa2" style={{ position:'absolute', width:300, height:300, background:'radial-gradient(circle,rgba(212,180,131,.08) 0%,transparent 70%)', bottom:-50, left:-50, zIndex:0 }} />
        <div style={{ position:'absolute', inset:0, zIndex:0, opacity:.06, backgroundImage:'radial-gradient(circle,#C9A96E 1px,transparent 1px)', backgroundSize:'40px 40px' }} />
        <Particles count={16} />

        <div style={{ position:'relative', zIndex:1, maxWidth:1280, margin:'0 auto', padding:'100px 24px 90px', textAlign:'center' }}>
          <p className="reveal-up" style={{ color:'#C9A96E', fontSize:11, letterSpacing:'0.45em', textTransform:'uppercase', marginBottom:20, fontWeight:500 }}>
            ✦ &nbsp; New Collection 2025
          </p>
          <h1 className="reveal-up rd1 font-display" style={{ fontSize:'clamp(48px,8vw,96px)', fontWeight:300, color:'white', lineHeight:1, marginBottom:24, letterSpacing:'-0.02em' }}>
            Where Fashion<br /><em style={{ fontStyle:'italic', fontWeight:300 }}>Finds a Home</em>
          </h1>
          <p className="reveal-up rd2" style={{ color:'rgba(255,255,255,.5)', fontSize:16, maxWidth:440, margin:'0 auto 40px', lineHeight:1.7, fontWeight:300 }}>
            Discover curated pieces that celebrate the modern African woman
          </p>
          <div className="reveal-up rd3" style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap' }}>
            <button className="btn-gold" style={{ padding:'14px 36px', border:'none', borderRadius:50, color:'white', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:8, letterSpacing:'0.05em' }}>
              Shop Now <ChevronRight size={16}/>
            </button>
            <button className="btn-outline-gold" style={{ padding:'14px 36px', borderRadius:50, fontSize:13, fontWeight:500, letterSpacing:'0.05em' }}>
              View Lookbook
            </button>
          </div>
          <div className="reveal-up rd4" style={{ display:'flex', gap:40, justifyContent:'center', marginTop:60, flexWrap:'wrap' }}>
            {[['500+','Products'],['10K+','Customers'],['5★','Rated'],['2-Day','Delivery']].map(([n,l]) => (
              <div key={l} style={{ textAlign:'center' }}>
                <p className="font-display gradient-text" style={{ fontSize:26, fontWeight:600, lineHeight:1 }}>{n}</p>
                <p style={{ fontSize:11, color:'rgba(255,255,255,.4)', marginTop:4, letterSpacing:'0.08em', textTransform:'uppercase' }}>{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust strip ── */}
      {featured.length > 0 && (
        <div style={{ background:'linear-gradient(90deg,#f5f0e8,#ede8dc,#f5f0e8)', padding:'14px 0', overflowX:'auto' }}>
          <div style={{ maxWidth:1280, margin:'0 auto', padding:'0 24px', display:'flex', justifyContent:'center', gap:40 }}>
            {['Free Delivery on orders UGX 200K+','Authentic Fashion Pieces','MTN & Airtel MoMo Accepted','24hr Order Processing'].map(t => (
              <span key={t} style={{ display:'flex', alignItems:'center', gap:7, fontSize:12, color:'#A8824A', fontWeight:600, whiteSpace:'nowrap', letterSpacing:'0.03em' }}>
                <Star size={11} fill="currentColor" style={{ flexShrink:0 }}/> {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Collection ── */}
      <section ref={collectionRef} className="sr-hidden" style={{ maxWidth:1280, margin:'0 auto', padding:'60px 24px' }}>
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:40, flexWrap:'wrap', gap:16 }}>
          <div>
            <p style={{ fontSize:11, color:'#C9A96E', letterSpacing:'0.3em', textTransform:'uppercase', marginBottom:8, fontWeight:500 }}>Curated Selection</p>
            <h2 className="font-display" style={{ fontSize:42, fontWeight:400, color:'#0F0E0C', lineHeight:1 }}>Our Collection</h2>
            <p style={{ fontSize:13, color:'#aaa', marginTop:6 }}>{data?.total||0} pieces available</p>
          </div>
          <select style={{ fontSize:13, border:'1px solid rgba(201,169,110,.25)', borderRadius:10, padding:'10px 16px', outline:'none', background:'white', color:'#555', cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>
            <option>Sort: Featured</option>
            <option>Price: Low to High</option>
            <option>Price: High to Low</option>
            <option>Newest First</option>
          </select>
        </div>

        {isLoading ? (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:24 }}>
            {[...Array(8)].map((_,i) => <SkeletonCard key={i}/>)}
          </div>
        ) : rest.length ? (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:28 }}>
            {rest.map(p => <ProductCard key={p.id} product={p} onAddToCart={addToCart} onQuickView={onQuickView} wishlist={wishlist}/>)}
          </div>
        ) : (
          <div style={{ textAlign:'center', padding:'80px 0' }}>
            <Package size={52} color="#ddd" style={{ margin:'0 auto 16px', display:'block' }}/>
            <p style={{ color:'#bbb', fontSize:15 }}>No products available right now</p>
          </div>
        )}

        {data?.pages > 1 && (
          <div style={{ display:'flex', justifyContent:'center', gap:12, marginTop:60, alignItems:'center' }}>
            <button disabled={page===1} onClick={() => setPage(p=>p-1)} className="btn-outline-gold"
              style={{ padding:'11px 28px', borderRadius:50, fontSize:13, opacity:page===1?.4:1 }}>← Previous</button>
            <span style={{ fontSize:13, color:'#aaa', padding:'0 8px' }}>{page} / {data.pages}</span>
            <button disabled={page===data.pages} onClick={() => setPage(p=>p+1)} className="btn-gold"
              style={{ padding:'11px 28px', borderRadius:50, border:'none', color:'white', fontSize:13, opacity:page===data.pages?.4:1 }}>Next →</button>
          </div>
        )}
      </section>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   CUSTOMER LOGIN   ← includes Back button
══════════════════════════════════════════════════════════════════ */
function CustomerLogin() {
  const [form, setForm]       = useState({ email:'', password:'' });
  const [regForm, setRegForm] = useState({ name:'', email:'', phone:'', password:'' });
  const [mode, setMode]       = useState('login');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  /* ── All original business logic unchanged ── */
  const handleLogin = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const { data } = await customers.portalLogin(form);
      localStorage.setItem('vv_customer_token', data.token);
      localStorage.setItem('vv_customer', JSON.stringify(data.customer));
      navigate('/store');
    } catch (err) { alert(err.response?.data?.error || 'Login failed'); }
    finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const { data } = await customers.portalRegister(regForm);
      localStorage.setItem('vv_customer_token', data.token);
      localStorage.setItem('vv_customer', JSON.stringify(data.customer));
      navigate('/store');
    } catch (err) { alert(err.response?.data?.error || 'Registration failed'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px 16px', position:'relative', overflow:'hidden' }}>
      <GlobalStyles/>

      {/* ── Back button (top-left) ── */}
      <button
        onClick={() => navigate('/store')}
        style={{
          position:'absolute', top:24, left:24, zIndex:10,
          display:'flex', alignItems:'center', gap:8,
          background:'rgba(255,255,255,.08)', backdropFilter:'blur(12px)',
          border:'1px solid rgba(201,169,110,.25)',
          borderRadius:50, padding:'9px 18px',
          color:'rgba(255,255,255,.75)', fontSize:13, fontWeight:500,
          cursor:'pointer', transition:'all .25s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background='rgba(201,169,110,.18)'; e.currentTarget.style.color='#D4B483'; e.currentTarget.style.borderColor='#C9A96E'; }}
        onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,.08)'; e.currentTarget.style.color='rgba(255,255,255,.75)'; e.currentTarget.style.borderColor='rgba(201,169,110,.25)'; }}>
        <ArrowLeft size={15}/> Back to Store
      </button>

      {/* Animated background */}
      <div className="hero-gradient" style={{ position:'absolute', inset:0, zIndex:0 }}/>
      <div style={{ position:'absolute', inset:0, zIndex:0, opacity:.05, backgroundImage:'radial-gradient(circle,#C9A96E 1px,transparent 1px)', backgroundSize:'36px 36px' }}/>
      <div className="orb fa1" style={{ position:'absolute', width:600, height:600, background:'radial-gradient(circle,rgba(201,169,110,.15) 0%,transparent 65%)', top:-200, right:-200, zIndex:0 }}/>
      <div className="orb fa2" style={{ position:'absolute', width:400, height:400, background:'radial-gradient(circle,rgba(212,180,131,.10) 0%,transparent 65%)', bottom:-100, left:-100, zIndex:0 }}/>
      <Particles count={20}/>

      {/* Card */}
      <div className="login-float" style={{ position:'relative', zIndex:1, width:'100%', maxWidth:440 }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:72, height:72, borderRadius:20, margin:'0 auto 16px', background:'linear-gradient(135deg,#D4B483 0%,#C9A96E 50%,#A8824A 100%)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', boxShadow:'0 8px 32px rgba(201,169,110,.45),0 0 0 1px rgba(201,169,110,.2)' }}>
            <img src="/logo.png" alt="VV" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e => { e.target.style.display='none'; }}/>
          </div>
          <h1 className="font-display" style={{ fontSize:36, fontWeight:400, color:'white', lineHeight:1.1 }}>Villa Vogue</h1>
          <p style={{ fontSize:11, color:'#C9A96E', letterSpacing:'0.3em', textTransform:'uppercase', marginTop:4, fontWeight:500 }}>Customer Portal</p>
        </div>

        {/* Glass card */}
        <div style={{ background:'rgba(253,250,246,.10)', backdropFilter:'blur(32px) saturate(160%)', WebkitBackdropFilter:'blur(32px) saturate(160%)', border:'1px solid rgba(201,169,110,.2)', borderRadius:24, padding:36, boxShadow:'0 32px 80px rgba(0,0,0,.4),0 8px 32px rgba(0,0,0,.2),inset 0 1px 0 rgba(255,255,255,.08)' }}>

          {/* Tab toggle */}
          <div style={{ display:'flex', background:'rgba(0,0,0,.3)', borderRadius:12, padding:4, marginBottom:28, border:'1px solid rgba(201,169,110,.1)' }}>
            {[['login','Sign In'],['register','Create Account']].map(([m,label]) => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex:1, padding:'10px 0', borderRadius:9, border:'none',
                fontSize:13, fontWeight:600, cursor:'pointer',
                fontFamily:"'DM Sans',sans-serif",
                transition:'all .3s ease',
                ...(mode===m
                  ? { background:'linear-gradient(135deg,#D4B483 0%,#C9A96E 100%)', color:'white', boxShadow:'0 4px 16px rgba(201,169,110,.4)' }
                  : { background:'transparent', color:'rgba(255,255,255,.5)' }),
              }}>{label}</button>
            ))}
          </div>

          {mode === 'login' ? (
            <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:18 }}>
              {[{label:'Email',key:'email',type:'email'},{label:'Password',key:'password',type:'password'}].map(({label,key,type}) => (
                <div key={key}>
                  <label className="luxury-label" style={{ color:'rgba(201,169,110,.8)' }}>{label}</label>
                  <input className="luxury-input" style={{ background:'rgba(255,255,255,.07)', border:'1px solid rgba(201,169,110,.2)', color:'white' }}
                    type={type} value={form[key]} onChange={e => setForm({...form,[key]:e.target.value})} required/>
                </div>
              ))}
              <button type="submit" disabled={loading} className="btn-gold"
                style={{ width:'100%', padding:'14px 0', border:'none', borderRadius:12, color:'white', fontSize:14, fontWeight:600, letterSpacing:'0.04em', marginTop:4, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                {loading ? <><Loader size={15} className="spin"/> Signing in…</> : 'Sign In'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {[{label:'Full Name',key:'name',type:'text'},{label:'Email',key:'email',type:'email'},{label:'Phone',key:'phone',type:'tel',placeholder:'+256…'},{label:'Password',key:'password',type:'password'}].map(({label,key,type,placeholder}) => (
                <div key={key}>
                  <label className="luxury-label" style={{ color:'rgba(201,169,110,.8)' }}>{label}</label>
                  <input className="luxury-input" style={{ background:'rgba(255,255,255,.07)', border:'1px solid rgba(201,169,110,.2)', color:'white' }}
                    type={type} placeholder={placeholder} value={regForm[key]} onChange={e => setRegForm({...regForm,[key]:e.target.value})} required/>
                </div>
              ))}
              <button type="submit" disabled={loading} className="btn-gold"
                style={{ width:'100%', padding:'14px 0', border:'none', borderRadius:12, color:'white', fontSize:14, fontWeight:600, letterSpacing:'0.04em', marginTop:4, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                {loading ? <><Loader size={15} className="spin"/> Creating account…</> : 'Create Account'}
              </button>
            </form>
          )}

          <p style={{ textAlign:'center', fontSize:12, color:'rgba(255,255,255,.35)', marginTop:20 }}>
            <Link to="/store" style={{ color:'#C9A96E', textDecoration:'none', fontWeight:500 }}>← Continue as Guest</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PORTAL SHELL  (owns all shared state, renders nav + footer)
══════════════════════════════════════════════════════════════════ */
function PortalShell() {
  const [cart, setCart]                   = useState([]);
  const [cartOpen, setCartOpen]           = useState(false);
  const [quickViewProduct, setQV]         = useState(null);
  const [showWishlist, setShowWishlist]   = useState(false);
  const [search, setSearch]               = useState('');
  const [scrolled, setScrolled]           = useState(false);
  const [mobileSearch, setMobileSearch]   = useState(false);
  const [customerUser, setCustomerUser]   = useState(() => {
    try { return JSON.parse(localStorage.getItem('vv_customer')||'null'); } catch { return null; }
  });

  const { toasts, add: addToast, remove: removeToast } = useToast();
  const wishlist = useWishlist();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn, { passive:true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const addToCart = useCallback((product) => {
    setCart(prev => {
      const ex = prev.find(i => i.id === product.id);
      return ex ? prev.map(i => i.id===product.id ? {...i,qty:i.qty+1} : i) : [...prev,{...product,qty:1}];
    });
    addToast({ type:'success', title:'Added to Cart ✓', message:product.name });
  }, [addToast]);

  const logout = () => {
    localStorage.removeItem('vv_customer');
    localStorage.removeItem('vv_customer_token');
    setCustomerUser(null);
    addToast({ type:'success', title:'Signed out', message:'See you next time!' });
  };

  const cartTotal = cart.reduce((s,i) => s+i.qty, 0);
  const categories = ['All','Dresses','Tops','Trousers','Skirts','Suits','Accessories','Shoes','Bags','Outerwear'];

  return (
    <div style={{ minHeight:'100vh', background:'#fdfaf6', fontFamily:"'DM Sans',sans-serif" }}>
      <GlobalStyles/>
      <ToastContainer toasts={toasts} removeToast={removeToast}/>

      {quickViewProduct && <QuickViewModal product={quickViewProduct} onClose={() => setQV(null)} onAddToCart={() => addToCart(quickViewProduct)}/>}
      <CartDrawer cart={cart} setCart={setCart} open={cartOpen} onClose={() => setCartOpen(false)} toast={addToast}/>

      {/* ── Announcement ── */}
      <div style={{ background:'linear-gradient(90deg,#0a0805,#1a1208,#0a0805)', color:'#C9A96E', textAlign:'center', fontSize:11, padding:'9px 16px', letterSpacing:'0.2em', textTransform:'uppercase', fontWeight:500 }}>
        ✦ &nbsp; Free delivery within Kampala on orders above UGX 200,000 &nbsp; ✦ &nbsp; New Collection 2025 Now Live &nbsp; ✦
      </div>

      {/* ── Nav ── */}
      <header className={scrolled?'nav-scrolled':''} style={{ position:'sticky', top:0, zIndex:500, background:scrolled?'rgba(253,250,246,.88)':'rgba(253,250,246,.98)', borderBottom:'1px solid rgba(201,169,110,.15)', transition:'all .5s' }}>
        <div style={{ maxWidth:1280, margin:'0 auto', padding:'0 24px' }}>
          <div style={{ height:68, display:'flex', alignItems:'center', justifyContent:'space-between', gap:16 }}>

            {/* Logo */}
            <Link to="/store" style={{ display:'flex', alignItems:'center', gap:12, textDecoration:'none', flexShrink:0 }}>
              <div style={{ width:42, height:42, borderRadius:12, background:'linear-gradient(135deg,#D4B483,#C9A96E,#A8824A)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', boxShadow:'0 4px 16px rgba(201,169,110,.35)' }}>
                <img src="/logo.png" alt="VV" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e => { e.target.style.display='none'; }}/>
              </div>
              <div>
                <p className="font-display" style={{ fontWeight:600, fontSize:20, color:'#0F0E0C', lineHeight:1.1 }}>Villa Vogue</p>
                <p style={{ fontSize:9, color:'#C9A96E', letterSpacing:'0.35em', textTransform:'uppercase', fontWeight:500 }}>Fashions</p>
              </div>
            </Link>

            {/* Desktop search */}
            <div style={{ flex:1, display:'flex' }} className="hidden sm:flex">
              <SearchBar value={search} onChange={setSearch}/>
            </div>

            {/* Right */}
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              {/* Mobile search toggle */}
              <button onClick={() => setMobileSearch(s=>!s)}
                style={{ width:38, height:38, borderRadius:10, background:'transparent', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}
                className="sm:hidden">
                <Search size={18} color="#555"/>
              </button>

              {/* Wishlist */}
              <button onClick={() => setShowWishlist(s=>!s)}
                style={{ position:'relative', width:38, height:38, borderRadius:10, background:'rgba(245,240,232,.8)', border:'1px solid rgba(201,169,110,.15)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor='#C9A96E'}
                onMouseLeave={e => e.currentTarget.style.borderColor='rgba(201,169,110,.15)'}>
                <Heart size={16} color={wishlist.items.length>0?'#C9A96E':'#888'} fill={wishlist.items.length>0?'#C9A96E':'none'}/>
                {wishlist.items.length > 0 && <span style={{ position:'absolute', top:-3, right:-3, width:16, height:16, borderRadius:'50%', background:'#C9A96E', color:'white', fontSize:9, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid #fdfaf6' }}>{wishlist.items.length}</span>}
              </button>

              {/* Auth */}
              {customerUser ? (
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:13, color:'#666' }} className="hidden sm:block">Hi, {customerUser.name?.split(' ')[0]}</span>
                  <button onClick={logout} style={{ width:38, height:38, borderRadius:10, background:'rgba(245,240,232,.8)', border:'1px solid rgba(201,169,110,.15)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <LogOut size={15} color="#888"/>
                  </button>
                </div>
              ) : (
                <Link to="/store/login"
                  style={{ display:'flex', alignItems:'center', gap:6, textDecoration:'none', fontSize:13, fontWeight:500, color:'#555', padding:'8px 14px', borderRadius:50, border:'1px solid rgba(201,169,110,.25)', transition:'all .25s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='#C9A96E'; e.currentTarget.style.color='#A8824A'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(201,169,110,.25)'; e.currentTarget.style.color='#555'; }}>
                  <User size={14}/> Sign In
                </Link>
              )}

              {/* Cart */}
              <button onClick={() => setCartOpen(true)}
                style={{ position:'relative', width:42, height:42, borderRadius:12, background:'linear-gradient(135deg,#D4B483,#C9A96E,#A8824A)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 16px rgba(201,169,110,.3)', transition:'transform .2s,box-shadow .2s' }}
                onMouseEnter={e => { e.currentTarget.style.transform='scale(1.08)'; e.currentTarget.style.boxShadow='0 6px 24px rgba(201,169,110,.45)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.boxShadow='0 4px 16px rgba(201,169,110,.3)'; }}>
                <ShoppingBag size={18} color="white"/>
                {cartTotal > 0 && <span style={{ position:'absolute', top:-4, right:-4, width:18, height:18, borderRadius:'50%', background:'#0F0E0C', color:'white', fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid #fdfaf6' }}>{cartTotal}</span>}
              </button>
            </div>
          </div>

          {/* Mobile search expand */}
          {mobileSearch && (
            <div className="sm:hidden" style={{ paddingBottom:12 }}>
              <SearchBar value={search} onChange={setSearch}/>
            </div>
          )}
        </div>

        {/* Category nav */}
        <div style={{ borderTop:'1px solid rgba(201,169,110,.1)' }}>
          <div style={{ maxWidth:1280, margin:'0 auto', padding:'10px 24px', display:'flex', gap:28, overflowX:'auto' }}>
            {categories.map(cat => (
              <Link key={cat}
                to={cat==='All'?'/store':`/store?cat=${cat}`}
                className="nav-link"
                style={{ fontSize:12.5, fontWeight:500, color:'#666', textDecoration:'none', whiteSpace:'nowrap', letterSpacing:'0.04em', flexShrink:0 }}>
                {cat}
              </Link>
            ))}
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main>
        {showWishlist ? (
          <WishlistPage wishlist={wishlist} onAddToCart={addToCart} onQuickView={setQV} onBack={() => setShowWishlist(false)}/>
        ) : (
          <Routes>
            <Route index element={<StoreHome addToCart={addToCart} onQuickView={setQV} wishlist={wishlist}/>}/>
          </Routes>
        )}
      </main>

      {/* ── Footer ── */}
      <footer style={{ background:'#0a0805', color:'#888', marginTop:80 }}>
        <div style={{ height:2, background:'linear-gradient(90deg,transparent,#C9A96E 30%,#D4B483 50%,#C9A96E 70%,transparent)' }}/>
        <div style={{ maxWidth:1280, margin:'0 auto', padding:'64px 24px 40px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:40, marginBottom:48 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                <div style={{ width:34, height:34, borderRadius:8, background:'linear-gradient(135deg,#D4B483,#A8824A)', overflow:'hidden' }}>
                  <img src="/logo.png" alt="VV" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={() => {}}/>
                </div>
                <span className="font-display" style={{ color:'white', fontWeight:600, fontSize:18 }}>Villa Vogue</span>
              </div>
              <p style={{ fontSize:13, lineHeight:1.7 }}>Where Fashion Finds a Home. Premium fashion for the modern African woman.</p>
              <div style={{ display:'flex', gap:10, marginTop:20 }}>
                {['IG','FB','TW','TK'].map(s => (
                  <div key={s} style={{ width:32, height:32, borderRadius:8, background:'rgba(201,169,110,.12)', border:'1px solid rgba(201,169,110,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'#C9A96E', fontWeight:600, cursor:'pointer' }}>{s}</div>
                ))}
              </div>
            </div>
            <div>
              <h4 style={{ color:'white', fontWeight:600, marginBottom:16, fontSize:12, letterSpacing:'0.1em', textTransform:'uppercase' }}>Shop</h4>
              {['New Arrivals','Dresses','Accessories','Shoes','Sale'].map(l => (
                <Link key={l} to="/store" style={{ display:'block', fontSize:13, color:'#888', textDecoration:'none', marginBottom:10, transition:'color .2s' }}
                  onMouseEnter={e => e.target.style.color='#C9A96E'} onMouseLeave={e => e.target.style.color='#888'}>{l}</Link>
              ))}
            </div>
            <div>
              <h4 style={{ color:'white', fontWeight:600, marginBottom:16, fontSize:12, letterSpacing:'0.1em', textTransform:'uppercase' }}>Help</h4>
              {['Track Order','Returns','Size Guide','Contact Us','FAQ'].map(l => (
                <p key={l} style={{ fontSize:13, marginBottom:10, cursor:'pointer', transition:'color .2s' }}
                  onMouseEnter={e => e.target.style.color='#C9A96E'} onMouseLeave={e => e.target.style.color='#888'}>{l}</p>
              ))}
            </div>
            <div>
              <h4 style={{ color:'white', fontWeight:600, marginBottom:16, fontSize:12, letterSpacing:'0.1em', textTransform:'uppercase' }}>Contact</h4>
              {[{i:'📍',t:'Kampala, Uganda'},{i:'📞',t:'+256 782 860372'},{i:'📞',t:'+256 745 903189'},{i:'✉️',t:'villavoguef@gmail.com'}].map(({i,t}) => (
                <p key={t} style={{ fontSize:13, marginBottom:10, display:'flex', gap:8, alignItems:'center' }}><span>{i}</span>{t}</p>
              ))}
            </div>
          </div>
          <div style={{ borderTop:'1px solid rgba(255,255,255,.07)', paddingTop:24, display:'flex', flexWrap:'wrap', justifyContent:'space-between', alignItems:'center', gap:16 }}>
            <p style={{ fontSize:12 }}>© {new Date().getFullYear()} Villa Vogue Fashions. All rights reserved.</p>
            <div style={{ display:'flex', gap:8 }}>
              {['MTN MoMo','Airtel Money','Visa/MC'].map(p => (
                <span key={p} style={{ fontSize:11, background:'rgba(255,255,255,.07)', border:'1px solid rgba(201,169,110,.15)', color:'#C9A96E', borderRadius:6, padding:'4px 10px', fontWeight:500 }}>{p}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   CUSTOMER PORTAL ROUTER  (original structure preserved)
══════════════════════════════════════════════════════════════════ */
export default function CustomerPortal() {
  return (
    <Routes>
      <Route path="login" element={<CustomerLogin />} />
      <Route path="*"     element={<PortalShell />} />
    </Routes>
  );
}
