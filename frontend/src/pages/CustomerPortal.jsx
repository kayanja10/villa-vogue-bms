import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Routes, Route, Link, useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ShoppingBag, Search, Star, Heart, Sparkles, Package, X, Plus, Minus,
  Trash2, MessageCircle, ArrowLeft, CheckCircle, Send, Phone, Mail,
  MapPin, Instagram, Facebook, Clock, Truck, ShieldCheck, RefreshCw,
  ZoomIn, ChevronRight, AlertCircle, Loader2, BadgeCheck, Award,
  Filter, SlidersHorizontal, ChevronUp, Gift, Zap, TrendingUp, Users,
  Crown, Flame, Tag,
} from 'lucide-react';
import { products as productApi, feedback, orders } from '../lib/api';

// ─── CONSTANTS ────────────────────────────────────────────────────
const WHATSAPP   = '256782860372';
const WHATSAPP2  = '256745903189';
const CATEGORIES = ['All','Dresses','Tops','Trousers','Skirts','Suits','Accessories','Shoes','Bags','Outerwear'];
const PAYMENT_METHODS = ['MTN Mobile Money','Airtel Money','Cash on Delivery','Visa / Mastercard'];
const formatUGX  = (n) => `UGX ${Number(n || 0).toLocaleString()}`;
const genOrderId = () => `VV-${Date.now().toString(36).toUpperCase()}`;

// Gender-inclusive category mapping
const GENDER_CATEGORIES = {
  Women: ['Dresses','Skirts','Tops','Bags','Accessories'],
  Men:   ['Suits','Trousers','Shoes','Outerwear'],
  Kids:  ['Tops','Shoes','Accessories'],
};

// ─── FONT & STYLE LOADER ──────────────────────────────────────────
function FontLoader() {
  useEffect(() => {
    if (document.getElementById('vv-fonts')) return;
    const link = document.createElement('link');
    link.id   = 'vv-fonts';
    link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,600&family=Jost:wght@300;400;500;600;700&display=swap';
    link.rel  = 'stylesheet';
    document.head.appendChild(link);

    const style = document.createElement('style');
    style.id = 'vv-styles';
    style.textContent = `
      :root {
        --gold: #C9A96E;
        --gold-dark: #A8824A;
        --gold-light: #E8C98A;
        --ink: #0F0F0F;
        --ink-soft: #1E1E1E;
        --sand: #F7F2EA;
        --sand-dark: #EDE5D5;
        --cream: #FDFAF5;
        --green-wa: #25D366;
      }
      .vv-display { font-family: 'Playfair Display', Georgia, serif; }
      .vv-body    { font-family: 'Jost', system-ui, sans-serif; }
      .vv-scroll::-webkit-scrollbar { display: none; }
      .vv-scroll  { -ms-overflow-style: none; scrollbar-width: none; }

      @keyframes vv-shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
      .vv-shimmer { background:linear-gradient(90deg,#f0ebe0 25%,#faf6ef 50%,#f0ebe0 75%);background-size:200% 100%;animation:vv-shimmer 1.5s infinite; }

      @keyframes vv-up { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
      .vv-up { animation: vv-up 0.5s cubic-bezier(0.22,1,0.36,1) forwards; }

      @keyframes vv-fade { from{opacity:0} to{opacity:1} }
      .vv-fade { animation: vv-fade 0.4s ease forwards; }

      @keyframes vv-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(201,169,110,0.6)} 60%{box-shadow:0 0 0 10px rgba(201,169,110,0)} }
      .vv-pulse { animation: vv-pulse 2.2s infinite; }

      @keyframes vv-wa-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(37,211,102,0.5)} 60%{box-shadow:0 0 0 12px rgba(37,211,102,0)} }
      .vv-wa-pulse { animation: vv-wa-pulse 2.5s infinite; }

      @keyframes vv-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
      .vv-float { animation: vv-float 3s ease-in-out infinite; }

      @keyframes vv-slide-in { from{transform:translateX(100%)} to{transform:translateX(0)} }
      @keyframes vv-slide-up { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }

      @keyframes vv-hero-reveal { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
      .vv-hero-1 { animation: vv-hero-reveal 0.8s cubic-bezier(0.22,1,0.36,1) 0.1s both; }
      .vv-hero-2 { animation: vv-hero-reveal 0.8s cubic-bezier(0.22,1,0.36,1) 0.25s both; }
      .vv-hero-3 { animation: vv-hero-reveal 0.8s cubic-bezier(0.22,1,0.36,1) 0.4s both; }
      .vv-hero-4 { animation: vv-hero-reveal 0.8s cubic-bezier(0.22,1,0.36,1) 0.55s both; }
      .vv-hero-5 { animation: vv-hero-reveal 0.8s cubic-bezier(0.22,1,0.36,1) 0.7s both; }

      .vv-clamp2 { display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden; }
      .vv-clamp3 { display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden; }

      .vv-card-hover { transition: transform 0.4s cubic-bezier(0.22,1,0.36,1), box-shadow 0.4s ease; }
      .vv-card-hover:hover { transform: translateY(-4px); box-shadow: 0 20px 40px -12px rgba(0,0,0,0.15); }

      .vv-btn-gold {
        background: linear-gradient(135deg, var(--gold) 0%, var(--gold-dark) 100%);
        transition: all 0.3s ease;
        position: relative; overflow: hidden;
      }
      .vv-btn-gold::after {
        content:''; position:absolute; inset:0;
        background: linear-gradient(135deg, var(--gold-light) 0%, var(--gold) 100%);
        opacity:0; transition:opacity 0.3s;
      }
      .vv-btn-gold:hover::after { opacity:1; }
      .vv-btn-gold > * { position:relative; z-index:1; }
      .vv-btn-gold:hover { transform:translateY(-2px); box-shadow:0 12px 30px -8px rgba(201,169,110,0.5); }

      .vv-img-zoom img { transition: transform 0.7s cubic-bezier(0.22,1,0.36,1); }
      .vv-img-zoom:hover img { transform: scale(1.08); }

      .vv-gold-line::after {
        content:''; display:block; width:48px; height:2px;
        background:linear-gradient(90deg,var(--gold),transparent);
        margin-top:12px;
      }

      .vv-section-label {
        font-family:'Jost',sans-serif; font-weight:500; letter-spacing:0.22em;
        font-size:10px; text-transform:uppercase; color:var(--gold);
      }

      @media (prefers-reduced-motion: reduce) {
        * { animation-duration:0.01ms !important; transition-duration:0.01ms !important; }
      }
    `;
    document.head.appendChild(style);
  }, []);
  return null;
}

// ─── CART HOOK ────────────────────────────────────────────────────
function useCart() {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('vv_cart4') || '[]'); } catch { return []; }
  });
  useEffect(() => { localStorage.setItem('vv_cart4', JSON.stringify(items)); }, [items]);

  const add = useCallback((p, qty = 1) => {
    setItems(prev => {
      const ex = prev.find(i => i.id === p.id);
      if (ex) return prev.map(i => i.id === p.id ? { ...i, qty: Math.min(i.qty + qty, p.stock || 99) } : i);
      return [...prev, { ...p, qty: Math.min(qty, p.stock || 99) }];
    });
  }, []);

  const remove = useCallback((id) => setItems(prev => prev.filter(i => i.id !== id)), []);
  const update = useCallback((id, qty) => {
    if (qty <= 0) return remove(id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, qty } : i));
  }, [remove]);
  const clear = useCallback(() => setItems([]), []);

  const total = useMemo(() => items.reduce((s, i) => s + i.price * i.qty, 0), [items]);
  const count = useMemo(() => items.reduce((s, i) => s + i.qty, 0), [items]);
  return { items, add, remove, update, clear, total, count };
}

// ─── WISHLIST HOOK ────────────────────────────────────────────────
function useWishlist() {
  const [ids, setIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('vv_wish2') || '[]'); } catch { return []; }
  });
  useEffect(() => { localStorage.setItem('vv_wish2', JSON.stringify(ids)); }, [ids]);
  const toggle = useCallback((id) => setIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]), []);
  const has    = useCallback((id) => ids.includes(id), [ids]);
  return { ids, toggle, has, count: ids.length };
}

// ─── WHATSAPP MESSAGE BUILDER ─────────────────────────────────────
function buildWA(items, total, info = {}, orderId = '') {
  const lines = items.map(i => `• ${i.qty}× ${i.name} — ${formatUGX(i.price * i.qty)}`).join('\n');
  return encodeURIComponent(
    `🛍️ *New Order — Villa Vogue Fashions*\nRef: *${orderId}*\n\n${lines}\n\n*Total: ${formatUGX(total)}*\n\n👤 ${info.name || '—'}\n📞 ${info.phone || '—'}\n📍 ${info.address || '—'}\n💳 ${info.payment || '—'}\n\nPlease confirm and arrange delivery. Thank you! 🙏`
  );
}

// ─── SKELETON ─────────────────────────────────────────────────────
const Skel = ({ c }) => <div className={`vv-shimmer rounded-xl ${c}`} />;

// ─── BACK TO TOP ──────────────────────────────────────────────────
function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const fn = () => setShow(window.scrollY > 500);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);
  if (!show) return null;
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      className="fixed bottom-28 right-5 z-40 w-11 h-11 bg-[#0F0F0F] text-white rounded-full shadow-xl flex items-center justify-center hover:bg-[#C9A96E] transition-all duration-300 hover:-translate-y-1"
    >
      <ChevronUp size={18} />
    </button>
  );
}

// ─── ANNOUNCEMENT BAR ─────────────────────────────────────────────
function AnnouncBar() {
  const msgs = [
    '🚚 Free delivery in Kampala on orders above UGX 200,000',
    '✨ New arrivals — Dresses, Suits & Accessories now in stock',
    '📞 Order on WhatsApp: +256 782 860372  |  +256 745 903189',
    '💳 Pay via MTN MoMo · Airtel Money · Cash on Delivery',
    '👗 Fashion for Men, Women & Children — All under one roof!',
    '🎁 Loyalty rewards — earn points on every purchase!',
  ];
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI(x => (x + 1) % msgs.length), 4000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="bg-[var(--ink)] text-[var(--gold)] text-center py-2.5 overflow-hidden vv-body" style={{ fontSize: '11px', letterSpacing: '0.18em' }}>
      <div key={i} className="vv-up">{msgs[i]}</div>
    </div>
  );
}

// ─── NAVBAR ───────────────────────────────────────────────────────
function Navbar({ cart, wishlist, onCartOpen }) {
  const [search,    setSearch]   = useState('');
  const [mSearch,   setMSearch]  = useState(false);
  const [scrolled,  setScrolled] = useState(false);
  const [mMenuOpen, setMMenu]    = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const go = (e) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/store?search=${encodeURIComponent(search.trim())}`);
      setMSearch(false);
      setSearch('');
    }
  };

  return (
    <header className={`sticky top-0 z-40 transition-all duration-300 border-b ${scrolled ? 'bg-white shadow-md border-gray-100' : 'bg-white/98 backdrop-blur-lg border-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="h-16 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link to="/store" className="flex items-center gap-3 shrink-0 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C9A96E] to-[#8B6914] flex items-center justify-center shadow-md overflow-hidden transition-shadow group-hover:shadow-[#C9A96E]/40">
              <img src="/logo.png" alt="VV" className="w-full h-full object-cover"
                onError={e => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<span style="color:white;font-weight:700;font-size:14px;font-family:Playfair Display,serif">VV</span>'; }} />
            </div>
            <div className="hidden sm:block">
              <p className="vv-display font-semibold text-[#0F0F0F] text-lg leading-none group-hover:text-[#C9A96E] transition-colors">Villa Vogue</p>
              <p className="text-[9px] text-[#C9A96E] tracking-[0.28em] uppercase vv-body mt-0.5">Fashions · Kampala</p>
            </div>
          </Link>

          {/* Desktop search */}
          <form onSubmit={go} className="relative flex-1 max-w-md hidden md:block">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-full border border-gray-200 bg-[#faf7f2] focus:outline-none focus:border-[#C9A96E] focus:bg-white focus:shadow-[0_0_0_3px_rgba(201,169,110,0.12)] transition-all vv-body placeholder-gray-400"
              placeholder="Search dresses, bags, shoes, suits..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </form>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button onClick={() => setMSearch(!mSearch)} className="md:hidden p-2.5 hover:bg-gray-100 rounded-full transition-colors" aria-label="Search">
              <Search size={20} className="text-gray-700" />
            </button>
            <Link to="/store/wishlist" className="relative p-2.5 hover:bg-gray-100 rounded-full transition-colors hidden sm:flex" title="Wishlist">
              <Heart size={20} className={wishlist.count > 0 ? 'text-red-500 fill-red-500' : 'text-gray-600'} />
              {wishlist.count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{wishlist.count}</span>
              )}
            </Link>
            <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold bg-[#25D366] text-white px-3.5 py-2 rounded-full hover:bg-[#1da851] transition-all vv-body hover:shadow-md">
              <MessageCircle size={13} /> WhatsApp
            </a>
            <button onClick={onCartOpen} className="relative p-2.5 hover:bg-gray-100 rounded-full transition-colors ml-0.5" aria-label="Open cart">
              <ShoppingBag size={20} className="text-gray-700" />
              {cart.count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-[#C9A96E] text-white text-[10px] font-bold rounded-full flex items-center justify-center vv-pulse">{cart.count > 9 ? '9+' : cart.count}</span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile search */}
        {mSearch && (
          <div className="pb-3 md:hidden vv-up">
            <form onSubmit={go} className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input autoFocus
                className="w-full pl-9 pr-4 py-2.5 text-sm rounded-full border border-gray-200 bg-[#faf7f2] focus:outline-none focus:border-[#C9A96E] vv-body"
                placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
            </form>
          </div>
        )}

        {/* Category strip */}
        <div className="border-t border-gray-100 flex gap-1 overflow-x-auto py-2 vv-scroll">
          {CATEGORIES.map(cat => {
            const active = searchParams.get('cat') === cat || (cat === 'All' && !searchParams.get('cat'));
            return (
              <Link key={cat} to={cat === 'All' ? '/store' : `/store?cat=${cat}`}
                className={`shrink-0 text-xs font-medium px-3.5 py-1.5 rounded-full transition-all whitespace-nowrap vv-body ${active ? 'bg-[#0F0F0F] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100 hover:text-[#0F0F0F]'}`}>
                {cat}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}

// ─── PRODUCT CARD ─────────────────────────────────────────────────
function ProductCard({ product, onAdd, wishlist }) {
  const [imgIdx, setImgIdx] = useState(0);
  const [added,  setAdded]  = useState(false);
  const imgs  = useMemo(() => { try { return JSON.parse(product.images || '[]'); } catch { return []; } }, [product.images]);
  const isLow = product.stock > 0 && product.stock <= 3;
  const isOut = product.stock === 0;

  const handleAdd = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    onAdd(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }, [onAdd, product]);

  return (
    <Link to={`/store/product/${product.id}`} className="group block vv-card-hover">
      {/* Image */}
      <div className="relative bg-[#F7F2EA] rounded-2xl overflow-hidden aspect-[3/4] mb-3 shadow-sm vv-img-zoom">
        {imgs[0] ? (
          <img src={imgs[imgIdx]} alt={product.name}
            className={`w-full h-full object-cover ${isOut ? 'opacity-40 grayscale' : ''}`}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#F7F2EA] to-[#EDE5D5]">
            <span className="text-5xl opacity-20">👗</span>
          </div>
        )}

        {/* Image dots */}
        {imgs.length > 1 && !isOut && (
          <div className="absolute bottom-12 left-0 right-0 flex justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {imgs.slice(0, 4).map((_, i) => (
              <button key={i}
                onMouseEnter={e => { e.preventDefault(); setImgIdx(i); }}
                onClick={e => { e.preventDefault(); setImgIdx(i); }}
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === imgIdx ? 'bg-white scale-125' : 'bg-white/60'}`} />
            ))}
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.isFeatured && (
            <span className="bg-[#C9A96E] text-white text-[10px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 vv-body shadow-sm">
              <Crown size={8} />Featured
            </span>
          )}
          {isLow && !isOut && (
            <span className="bg-orange-500 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full vv-body shadow-sm">
              Only {product.stock} left!
            </span>
          )}
        </div>

        {/* Wishlist */}
        <button
          onClick={e => { e.preventDefault(); wishlist.toggle(product.id); }}
          className={`absolute top-3 right-3 w-8 h-8 rounded-full shadow-md flex items-center justify-center transition-all hover:scale-110 ${wishlist.has(product.id) ? 'bg-white opacity-100' : 'bg-white/90 opacity-0 group-hover:opacity-100'}`}
          aria-label="Toggle wishlist">
          <Heart size={14} className={wishlist.has(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'} />
        </button>

        {/* Out of stock overlay */}
        {isOut && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <span className="bg-white/95 text-gray-800 text-xs font-semibold px-4 py-1.5 rounded-full vv-body shadow tracking-wide">Out of Stock</span>
          </div>
        )}

        {/* Add to cart */}
        {!isOut && (
          <button onClick={handleAdd}
            className={`absolute bottom-3 left-3 right-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-300 vv-body shadow-lg
              ${added
                ? 'bg-green-500 text-white opacity-100 translate-y-0'
                : 'bg-white/95 text-[#0F0F0F] opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 hover:bg-[#C9A96E] hover:text-white'}`}>
            {added ? '✓ Added to Cart!' : '+ Add to Cart'}
          </button>
        )}
      </div>

      {/* Info */}
      <div className="px-0.5">
        <p className="vv-section-label mb-1" style={{ fontSize: '10px' }}>{product.category?.name}</p>
        <p className="vv-display text-[#0F0F0F] text-base leading-snug mb-1.5 vv-clamp2">{product.name}</p>
        <p className="vv-body font-semibold text-[#0F0F0F] text-sm">{formatUGX(product.price)}</p>
      </div>
    </Link>
  );
}

// ─── HERO ─────────────────────────────────────────────────────────
function Hero() {
  const genderCards = [
    { label: 'Women', emoji: '👩🏾', desc: 'Dresses, Bags & More', cat: 'Dresses', color: 'from-rose-900/80 to-rose-700/60' },
    { label: 'Men',   emoji: '👔',   desc: 'Suits, Shoes & Style', cat: 'Suits',   color: 'from-slate-900/80 to-slate-700/60' },
    { label: 'Kids',  emoji: '🧒🏾', desc: 'Cute & Comfortable',   cat: 'Tops',    color: 'from-amber-900/80 to-amber-700/60' },
  ];

  return (
    <div className="relative bg-[#0A0A0A] overflow-hidden min-h-[85vh] flex flex-col">
      {/* Layered background effects */}
      <div className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23C9A96E' fill-opacity='1'%3E%3Cpath d='M40 0l2 2-2 2-2-2zm0 76l2 2-2 2-2-2zM4 40l2-2 2 2-2 2zm72 0l2-2 2 2-2 2z'/%3E%3C/g%3E%3C/svg%3E")` }} />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#C9A96E]/10 rounded-full blur-[150px] -translate-y-1/3 translate-x-1/4 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#C9A96E]/6 rounded-full blur-[100px] translate-y-1/3 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0A0A0A]/50 pointer-events-none" />

      {/* Main content */}
      <div className="relative flex-1 max-w-7xl mx-auto px-4 py-20 sm:py-28 lg:py-32 flex flex-col justify-center">
        <div className="vv-hero-1">
          <div className="inline-flex items-center gap-2 bg-[#C9A96E]/12 border border-[#C9A96E]/25 rounded-full px-4 py-1.5 mb-6">
            <Sparkles size={10} className="text-[#C9A96E]" />
            <span className="vv-section-label">New Collection 2026</span>
          </div>
        </div>

        <div className="max-w-3xl">
          <h1 className="vv-display text-white leading-[1.04] mb-5 vv-hero-2">
            <span className="block" style={{ fontSize: 'clamp(2.5rem, 7vw, 5rem)', fontWeight: 300 }}>Where Fashion</span>
            <em className="text-[#C9A96E] not-italic block" style={{ fontSize: 'clamp(3rem, 8.5vw, 6rem)', fontWeight: 600 }}>Finds a Home</em>
          </h1>

          <p className="text-gray-400 vv-body leading-relaxed mb-8 max-w-lg vv-hero-3" style={{ fontSize: '1.05rem' }}>
            Premium fashion for the modern family — Men, Women & Children. Curated pieces, fast delivery across Uganda.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-12 vv-hero-4">
            <Link to="/store"
              className="vv-btn-gold inline-flex items-center justify-center gap-2 text-white px-8 py-4 rounded-full font-semibold text-sm vv-body">
              <span>Shop New Arrivals</span><ChevronRight size={16} />
            </Link>
            <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 border border-white/20 text-white px-8 py-4 rounded-full font-semibold text-sm vv-body hover:bg-white/8 hover:border-white/35 transition-all">
              <MessageCircle size={16} className="text-[#25D366]" /> Chat on WhatsApp
            </a>
          </div>

          {/* Stats */}
          <div className="flex gap-8 pt-8 border-t border-white/8 vv-hero-5">
            {[['500+', 'Products'], ['2,000+', 'Happy Customers'], ['Same Day', 'Kampala Delivery']].map(([v, l]) => (
              <div key={l}>
                <p className="vv-display text-[#C9A96E] font-semibold" style={{ fontSize: 'clamp(1.4rem, 3vw, 1.9rem)' }}>{v}</p>
                <p className="text-gray-500 text-xs vv-body mt-1">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gender cards */}
      <div className="relative border-t border-white/8">
        <div className="max-w-7xl mx-auto px-4 py-5 grid grid-cols-3 gap-3 sm:gap-4">
          {genderCards.map(({ label, emoji, desc, cat, color }) => (
            <Link key={label} to={`/store?cat=${cat}`}
              className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 bg-gradient-to-br ${color} border border-white/10 hover:border-[#C9A96E]/40 transition-all duration-300 group hover:-translate-y-1`}>
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors duration-300 rounded-2xl" />
              <div className="relative">
                <span className="text-2xl sm:text-3xl block mb-2">{emoji}</span>
                <p className="vv-display text-white font-semibold text-base sm:text-lg leading-none">{label}</p>
                <p className="text-white/60 text-[10px] sm:text-xs vv-body mt-1">{desc}</p>
                <div className="mt-3 flex items-center gap-1 text-[#C9A96E] text-[10px] vv-body font-semibold">
                  Shop Now <ChevronRight size={11} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Category strip */}
      <div className="relative border-t border-white/6">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex gap-2.5 overflow-x-auto vv-scroll">
          {[['👗', 'Dresses'], ['👜', 'Bags'], ['👠', 'Shoes'], ['💍', 'Accessories'], ['🧥', 'Outerwear'], ['👔', 'Suits'], ['👕', 'Tops'], ['🩱', 'Skirts']].map(([em, c]) => (
            <Link key={c} to={`/store?cat=${c}`}
              className="shrink-0 flex items-center gap-2 bg-white/5 hover:bg-white/12 border border-white/8 hover:border-[#C9A96E]/35 rounded-xl px-4 py-2 transition-all group">
              <span className="text-base">{em}</span>
              <span className="text-white text-xs vv-body whitespace-nowrap group-hover:text-[#C9A96E] transition-colors font-medium">{c}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── TRUST BAR ────────────────────────────────────────────────────
function TrustBar() {
  return (
    <div className="bg-[#F7F2EA] border-b border-[#EDE5D5]">
      <div className="max-w-7xl mx-auto px-4 py-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: <Truck size={14} className="text-[#C9A96E]" />,       text: 'Free Delivery on UGX 200K+' },
          { icon: <ShieldCheck size={14} className="text-[#C9A96E]" />, text: '100% Authentic Pieces' },
          { icon: <Phone size={14} className="text-[#C9A96E]" />,       text: 'MTN & Airtel MoMo' },
          { icon: <RefreshCw size={14} className="text-[#C9A96E]" />,   text: '7-Day Easy Returns' },
        ].map(t => (
          <div key={t.text} className="flex items-center justify-center gap-2 text-xs text-gray-600 vv-body font-medium">
            {t.icon}{t.text}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── FEATURED BANNER ──────────────────────────────────────────────
function FeaturedBanner() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="rounded-3xl overflow-hidden bg-gradient-to-r from-[#0F0F0F] via-[#1a1208] to-[#0F0F0F] relative">
        <div className="absolute inset-0 opacity-30"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23C9A96E' fill-opacity='0.15'%3E%3Ccircle cx='20' cy='20' r='1'/%3E%3C/g%3E%3C/svg%3E")` }} />
        <div className="absolute right-0 top-0 w-64 h-full bg-[#C9A96E]/15 blur-3xl pointer-events-none" />
        <div className="relative px-6 sm:px-10 py-8 sm:flex sm:items-center sm:justify-between gap-6">
          <div className="mb-5 sm:mb-0">
            <div className="flex items-center gap-2 mb-2">
              <Flame size={15} className="text-[#C9A96E]" />
              <span className="vv-section-label">Limited Offer</span>
            </div>
            <p className="vv-display text-white text-2xl sm:text-3xl mb-1">
              Free delivery on orders over <span className="text-[#C9A96E]">UGX 200,000</span>
            </p>
            <p className="text-gray-400 text-sm vv-body">Within Kampala · Same day available · Men, Women & Kids</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Link to="/store"
              className="vv-btn-gold inline-flex items-center justify-center gap-2 text-white font-semibold text-sm vv-body px-6 py-3 rounded-full whitespace-nowrap">
              <ShoppingBag size={14} /><span>Shop Now</span>
            </Link>
            <a href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Hi! I\'d like to place an order.')}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-[#25D366] text-white font-semibold text-sm vv-body px-6 py-3 rounded-full hover:bg-[#1da851] transition-all whitespace-nowrap">
              <MessageCircle size={14} /> Order via WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── FEATURED PRODUCTS SECTION ────────────────────────────────────
function FeaturedProducts({ cart, wishlist }) {
  const { data, isLoading } = useQuery({
    queryKey: ['vv-featured'],
    queryFn: () => productApi.listPublic({ sort: 'featured', limit: 8 }).then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });
  const prods = data?.products?.filter(p => p.isFeatured || p.stock > 0).slice(0, 8) || [];
  if (!isLoading && prods.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 pb-12">
      <div className="flex items-end justify-between mb-7">
        <div>
          <p className="vv-section-label mb-2">Hand-picked For You</p>
          <h2 className="vv-display text-3xl sm:text-4xl text-[#0F0F0F] vv-gold-line">Featured Pieces</h2>
        </div>
        <Link to="/store" className="text-sm text-[#C9A96E] vv-body font-semibold hover:underline flex items-center gap-1">
          View All <ChevronRight size={14} />
        </Link>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {[...Array(8)].map((_, i) => <div key={i}><Skel c="aspect-[3/4] mb-3" /><Skel c="h-3 w-1/2 mb-2" /><Skel c="h-4 w-3/4 mb-2" /><Skel c="h-4 w-1/3" /></div>)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {prods.map((p, i) => (
            <div key={p.id} className="vv-up" style={{ animationDelay: `${i * 50}ms` }}>
              <ProductCard product={p} onAdd={cart.add} wishlist={wishlist} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── STORE HOME ───────────────────────────────────────────────────
function StoreHome({ cart, wishlist }) {
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('featured');
  const cat    = searchParams.get('cat')    || '';
  const search = searchParams.get('search') || '';
  const isHome = !cat && !search && page === 1;

  useEffect(() => { setPage(1); }, [cat, search]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey:        ['vv-products', cat, search, page, sort],
    queryFn:         () => productApi.listPublic({ category: cat, search, page, limit: 24, sort }).then(r => r.data),
    keepPreviousData: true,
    staleTime:        2 * 60 * 1000,
  });

  const prods = data?.products || [];

  return (
    <div>
      {isHome && <Hero />}
      {isHome && <TrustBar />}
      {isHome && <FeaturedBanner />}
      {isHome && <FeaturedProducts cart={cart} wishlist={wishlist} />}

      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Section header */}
        <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
          <div>
            {isHome && <p className="vv-section-label mb-2">Browse the Full Range</p>}
            <h2 className="vv-display text-3xl sm:text-4xl text-[#0F0F0F]">
              {cat || search ? (cat || `Results: "${search}"`) : 'Our Collection'}
            </h2>
            <p className="text-gray-400 text-sm vv-body mt-1 flex items-center gap-1">
              <TrendingUp size={12} className="text-[#C9A96E]" />
              {data?.total || 0} pieces available
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isFetching && !isLoading && <Loader2 size={14} className="animate-spin text-[#C9A96E]" />}
            <select value={sort} onChange={e => setSort(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#C9A96E] bg-white vv-body text-gray-700 cursor-pointer hover:border-gray-300 transition-colors">
              <option value="featured">Featured</option>
              <option value="price_asc">Price: Low → High</option>
              <option value="price_desc">Price: High → Low</option>
              <option value="newest">Newest First</option>
            </select>
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i}><Skel c="aspect-[3/4] mb-3" /><Skel c="h-2.5 w-1/2 mb-2" /><Skel c="h-4 w-3/4 mb-2" /><Skel c="h-4 w-1/3" /></div>
            ))}
          </div>
        ) : prods.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {prods.map((p, i) => (
              <div key={p.id} className="vv-up" style={{ animationDelay: `${Math.min(i, 7) * 40}ms` }}>
                <ProductCard product={p} onAdd={cart.add} wishlist={wishlist} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-28">
            <div className="w-20 h-20 bg-[#F7F2EA] rounded-full flex items-center justify-center mx-auto mb-5">
              <Package size={32} className="text-[#C9A96E]" />
            </div>
            <p className="vv-display text-2xl text-gray-600 mb-2">No products found</p>
            <p className="text-gray-400 text-sm vv-body mb-6">Try a different category or search term</p>
            <Link to="/store" className="inline-flex items-center gap-2 bg-[#0F0F0F] text-white px-7 py-3.5 rounded-full text-sm vv-body hover:bg-[#333] transition-colors font-medium">
              View All Products
            </Link>
          </div>
        )}

        {/* Pagination */}
        {data?.pages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-14">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="px-5 py-2.5 border border-gray-200 rounded-full text-sm vv-body hover:border-[#C9A96E] hover:text-[#C9A96E] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              ← Prev
            </button>
            {[...Array(Math.min(data.pages, 7))].map((_, i) => (
              <button key={i} onClick={() => setPage(i + 1)}
                className={`w-9 h-9 rounded-full text-sm vv-body transition-all ${page === i + 1 ? 'bg-[#0F0F0F] text-white shadow-sm' : 'hover:bg-gray-100 text-gray-600'}`}>
                {i + 1}
              </button>
            ))}
            <button disabled={page === data.pages} onClick={() => setPage(p => p + 1)}
              className="px-5 py-2.5 bg-[#C9A96E] text-white rounded-full text-sm vv-body hover:bg-[#A8824A] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm">
              Next →
            </button>
          </div>
        )}
      </div>

      {isHome && <ReviewSection />}
      {isHome && <BrandStory />}
    </div>
  );
}

// ─── PRODUCT DETAIL ───────────────────────────────────────────────
function ProductDetail({ cart, wishlist }) {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [imgIdx, setImgIdx] = useState(0);
  const [qty,    setQty]    = useState(1);
  const [added,  setAdded]  = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [tab,    setTab]    = useState('description');

  const { data: allData, isLoading } = useQuery({
    queryKey: ['vv-products-all'],
    queryFn:  () => productApi.listPublic({ limit: 200 }).then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const product = allData?.products?.find(p => p.id === parseInt(productId));
  const related = allData?.products?.filter(p => p.id !== parseInt(productId) && p.category?.name === product?.category?.name).slice(0, 4) || [];
  const imgs    = useMemo(() => { try { return JSON.parse(product?.images || '[]'); } catch { return []; } }, [product?.images]);
  const tags    = useMemo(() => { try { return JSON.parse(product?.tags   || '[]'); } catch { return []; } }, [product?.tags]);

  const handleAdd = () => { cart.add(product, qty); setAdded(true); setTimeout(() => setAdded(false), 2000); };
  const handleWA  = () => { window.open(`https://wa.me/${WHATSAPP}?text=${buildWA([{ ...product, qty }], product.price * qty, {}, genOrderId())}`, '_blank'); };

  if (isLoading) return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="grid md:grid-cols-2 gap-12">
        <Skel c="aspect-square rounded-2xl" />
        <div className="space-y-4 pt-4">{[...Array(5)].map((_, i) => <Skel key={i} c={`h-${[10, 6, 8, 6, 12][i]} w-${['full', '2/3', '3/4', '1/2', 'full'][i]}`} />)}</div>
      </div>
    </div>
  );

  if (!product) return (
    <div className="max-w-7xl mx-auto px-4 py-24 text-center">
      <Package size={56} className="text-gray-200 mx-auto mb-4" />
      <p className="vv-display text-2xl text-gray-500 mb-3">Product not found</p>
      <Link to="/store" className="inline-flex items-center gap-2 text-[#C9A96E] text-sm vv-body hover:underline">
        <ArrowLeft size={14} /> Back to store
      </Link>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 vv-body">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-gray-400 mb-7">
        <Link to="/store" className="hover:text-[#C9A96E] transition-colors">Store</Link>
        <ChevronRight size={11} />
        {product.category?.name && (
          <><Link to={`/store?cat=${product.category.name}`} className="hover:text-[#C9A96E] transition-colors">{product.category.name}</Link><ChevronRight size={11} /></>
        )}
        <span className="text-gray-600 truncate">{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-10 lg:gap-16">
        {/* Images */}
        <div>
          <div className="relative aspect-square bg-[#F7F2EA] rounded-2xl overflow-hidden mb-3 cursor-zoom-in group shadow-sm vv-img-zoom"
            onClick={() => imgs[imgIdx] && setZoomed(true)}>
            {imgs[imgIdx]
              ? <img src={imgs[imgIdx]} alt={product.name} className="w-full h-full object-cover" loading="eager" />
              : <div className="w-full h-full flex items-center justify-center text-8xl opacity-20">👗</div>}
            <div className="absolute bottom-4 right-4 bg-white/85 backdrop-blur p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
              <ZoomIn size={14} className="text-gray-600" />
            </div>
            <button onClick={e => { e.stopPropagation(); wishlist.toggle(product.id); }}
              className="absolute top-4 right-4 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform">
              <Heart size={17} className={wishlist.has(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'} />
            </button>
            {product.isFeatured && (
              <div className="absolute top-4 left-4 bg-[#C9A96E] text-white text-[10px] font-semibold px-3 py-1 rounded-full flex items-center gap-1 vv-body shadow-md">
                <Crown size={9} /> Featured
              </div>
            )}
          </div>
          {imgs.length > 1 && (
            <div className="flex gap-2 vv-scroll overflow-x-auto">
              {imgs.map((img, i) => (
                <button key={i} onClick={() => setImgIdx(i)}
                  className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${i === imgIdx ? 'border-[#C9A96E] scale-105 shadow-md' : 'border-transparent opacity-55 hover:opacity-90'}`}>
                  <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <p className="vv-section-label mb-2">{product.category?.name}</p>
          <h1 className="vv-display text-4xl sm:text-5xl text-[#0F0F0F] leading-tight mb-4">{product.name}</h1>

          <div className="flex items-center gap-4 mb-5">
            <span className="vv-display text-3xl font-semibold text-[#0F0F0F]">{formatUGX(product.price)}</span>
            {product.stock > 0
              ? <span className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full vv-body">{product.stock > 10 ? 'In Stock' : `Only ${product.stock} left`}</span>
              : <span className="bg-red-100 text-red-600 text-xs font-semibold px-3 py-1 rounded-full vv-body">Out of Stock</span>}
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {tags.map(t => <span key={t} className="text-xs bg-[#F7F2EA] text-[#A8824A] border border-[#EDE5D5] px-3 py-1 rounded-full font-medium vv-body">{t}</span>)}
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-5 flex gap-6">
            {['description', 'delivery', 'returns'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`pb-3 text-sm capitalize transition-all vv-body ${tab === t ? 'border-b-2 border-[#C9A96E] text-[#0F0F0F] font-semibold' : 'text-gray-400 hover:text-gray-600'}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="text-sm text-gray-600 leading-relaxed mb-7 min-h-[56px] vv-fade" key={tab}>
            {tab === 'description' && (product.description || 'Premium quality fashion piece from Villa Vogue Fashions. Crafted with attention to detail for the modern African family.')}
            {tab === 'delivery' && '📍 Kampala: Same day or next day delivery. 🚌 Upcountry: 2–5 business days. Free delivery on orders above UGX 200,000 within Kampala.'}
            {tab === 'returns' && 'Returns accepted within 7 days of delivery for unworn items in original condition. Contact us on WhatsApp to initiate. Exchange or store credit offered.'}
          </div>

          {product.stock > 0 ? (
            <>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-sm text-gray-500 font-medium vv-body">Qty:</span>
                <div className="flex items-center bg-gray-100 rounded-full px-1 py-1 gap-1">
                  <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white transition-colors shadow-sm"><Minus size={13} /></button>
                  <span className="w-9 text-center font-bold text-sm vv-body">{qty}</span>
                  <button onClick={() => setQty(q => Math.min(product.stock, q + 1))} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white transition-colors shadow-sm"><Plus size={13} /></button>
                </div>
                <span className="text-xs text-gray-400 vv-body">{product.stock} available</span>
              </div>
              <div className="flex flex-col gap-3">
                <button onClick={handleAdd}
                  className={`w-full py-4 rounded-xl font-semibold text-sm transition-all vv-body ${added ? 'bg-green-500 text-white' : 'bg-[#0F0F0F] text-white hover:bg-[#333] hover:-translate-y-0.5 hover:shadow-xl'}`}>
                  {added ? '✓ Added to Cart!' : `Add to Cart — ${formatUGX(product.price * qty)}`}
                </button>
                <button onClick={handleWA}
                  className="w-full py-4 bg-[#25D366] text-white rounded-xl font-semibold text-sm hover:bg-[#1da851] transition-all hover:-translate-y-0.5 hover:shadow-lg flex items-center justify-center gap-2 vv-body">
                  <MessageCircle size={17} /> Order via WhatsApp
                </button>
              </div>
            </>
          ) : (
            <a href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Hi! I'm interested in "${product.name}" — is it back in stock?`)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex w-full py-4 bg-[#25D366] text-white rounded-xl font-semibold text-sm text-center hover:bg-[#1da851] transition-all hover:shadow-lg vv-body items-center justify-center gap-2">
              <MessageCircle size={16} />Ask About Restock
            </a>
          )}

          {/* Trust signals */}
          <div className="mt-6 pt-5 border-t border-gray-100 grid grid-cols-3 gap-3">
            {[
              { icon: <ShieldCheck size={14} />, text: 'Authentic' },
              { icon: <Truck size={14} />,       text: 'Fast Delivery' },
              { icon: <RefreshCw size={14} />,   text: '7-Day Returns' },
            ].map(s => (
              <div key={s.text} className="flex flex-col items-center gap-1.5 text-center">
                <div className="w-9 h-9 rounded-full bg-[#F7F2EA] flex items-center justify-center text-[#C9A96E]">{s.icon}</div>
                <span className="text-[10px] text-gray-500 vv-body font-medium">{s.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Related products */}
      {related.length > 0 && (
        <div className="mt-16 pt-10 border-t border-gray-100">
          <p className="vv-section-label mb-2">More From This Category</p>
          <h2 className="vv-display text-2xl text-[#0F0F0F] mb-6 vv-gold-line">You May Also Like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {related.map(p => <ProductCard key={p.id} product={p} onAdd={cart.add} wishlist={wishlist} />)}
          </div>
        </div>
      )}

      {/* Zoom modal */}
      {zoomed && imgs[imgIdx] && (
        <div className="fixed inset-0 bg-black/97 z-50 flex items-center justify-center p-4 vv-fade" onClick={() => setZoomed(false)}>
          <button className="absolute top-5 right-5 text-white/50 hover:text-white transition-colors"><X size={28} /></button>
          <img src={imgs[imgIdx]} alt={product.name} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
        </div>
      )}
    </div>
  );
}

// ─── WISHLIST PAGE ────────────────────────────────────────────────
function WishlistPage({ cart, wishlist }) {
  const { data } = useQuery({
    queryKey: ['vv-products-all'],
    queryFn:  () => productApi.listPublic({ limit: 200 }).then(r => r.data),
  });
  const prods = (data?.products || []).filter(p => wishlist.has(p.id));

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-2">
        <Heart size={22} className={prods.length > 0 ? 'fill-red-500 text-red-500' : 'text-gray-300'} />
        <h1 className="vv-display text-3xl text-[#0F0F0F]">My Wishlist</h1>
      </div>
      <p className="text-gray-500 text-sm vv-body mb-8 pl-9">{prods.length} saved item{prods.length !== 1 ? 's' : ''}</p>
      {prods.length === 0 ? (
        <div className="text-center py-24">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart size={36} className="text-red-200" />
          </div>
          <p className="vv-display text-2xl text-gray-500 mb-2">Your wishlist is empty</p>
          <p className="text-gray-400 text-sm vv-body mb-6">Save items you love and come back to them later</p>
          <Link to="/store" className="inline-flex items-center gap-2 bg-[#0F0F0F] text-white px-7 py-3.5 rounded-full text-sm vv-body hover:bg-[#333] transition-colors font-medium">
            Explore Collection
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {prods.map(p => <ProductCard key={p.id} product={p} onAdd={cart.add} wishlist={wishlist} />)}
        </div>
      )}
    </div>
  );
}

// ─── CART DRAWER ─────────────────────────────────────────────────
function CartDrawer({ cart, open, onClose }) {
  const [step,      setStep]      = useState('cart');
  const [form,      setForm]      = useState({ name: '', phone: '', address: '', payment: 'MTN Mobile Money' });
  const [errors,    setErrors]    = useState({});
  const [orderId]                 = useState(genOrderId);
  const [successId, setSuccessId] = useState('');
  const [placing,   setPlacing]   = useState(false);

  useEffect(() => {
    if (!open) setTimeout(() => { setStep('cart'); setErrors({}); }, 350);
  }, [open]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const validate = () => {
    const e = {};
    if (!form.name.trim())    e.name    = 'Name is required';
    if (!form.phone.trim())   e.phone   = 'Phone is required';
    else if (!/^[0-9+\s]{9,15}$/.test(form.phone.trim())) e.phone = 'Enter a valid phone number';
    if (!form.address.trim()) e.address = 'Delivery address is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleOrder = async () => {
    if (!validate() || placing) return;
    setPlacing(true);
    try {
      await orders.create({
        customerName: form.name, customerPhone: form.phone,
        deliveryAddress: form.address, paymentMethod: form.payment,
        items: cart.items.map(i => ({ productId: i.id, name: i.name, qty: i.qty, price: i.price })),
        total: cart.total, orderRef: orderId, source: 'portal',
      });
    } catch { /* silent fail — WA still opens */ }
    window.open(`https://wa.me/${WHATSAPP}?text=${buildWA(cart.items, cart.total, form, orderId)}`, '_blank');
    cart.clear();
    setSuccessId(orderId);
    setStep('success');
    setPlacing(false);
  };

  const FInput = ({ k, label, placeholder, type = 'text' }) => (
    <div>
      <label className="text-xs text-gray-600 vv-body font-semibold mb-1.5 block">{label}</label>
      <input type={type} placeholder={placeholder}
        className={`w-full px-3.5 py-3 rounded-xl border text-sm vv-body focus:outline-none focus:border-[#C9A96E] focus:shadow-[0_0_0_3px_rgba(201,169,110,0.1)] bg-white transition-all ${errors[k] ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
        value={form[k]} onChange={e => { setForm({ ...form, [k]: e.target.value }); setErrors({ ...errors, [k]: '' }); }} />
      {errors[k] && <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1 vv-body"><AlertCircle size={11} />{errors[k]}</p>}
    </div>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={`fixed right-0 top-0 h-full w-full max-w-[440px] bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          {step === 'checkout' && (
            <button onClick={() => setStep('cart')} className="p-1.5 hover:bg-gray-100 rounded-lg mr-2 text-gray-500 transition-colors">
              <ArrowLeft size={17} />
            </button>
          )}
          <div className="flex items-center gap-2 flex-1">
            <ShoppingBag size={18} className="text-[#C9A96E]" />
            <h2 className="vv-display text-lg text-[#0F0F0F]">
              {step === 'cart' ? `Cart (${cart.count})` : step === 'checkout' ? 'Checkout' : 'Order Placed! 🎉'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Step indicator */}
        {(step === 'cart' || step === 'checkout') && (
          <div className="flex gap-3 px-5 py-2.5 bg-[#fafaf8] border-b border-gray-100 shrink-0">
            {['cart', 'checkout'].map((s, i) => (
              <div key={s} className="flex items-center gap-1.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold vv-body transition-all ${step === s || (s === 'cart' && step === 'checkout') ? 'bg-[#0F0F0F] text-white' : 'bg-gray-200 text-gray-400'}`}>{i + 1}</div>
                <span className={`text-xs vv-body capitalize font-medium ${step === s ? 'text-[#0F0F0F]' : 'text-gray-400'}`}>{s}</span>
                {i === 0 && <ChevronRight size={11} className="text-gray-300 ml-1" />}
              </div>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto vv-scroll">

          {/* CART STEP */}
          {step === 'cart' && (
            <div className="p-4 space-y-3">
              {cart.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-20 h-20 bg-[#F7F2EA] rounded-full flex items-center justify-center mb-4">
                    <ShoppingBag size={32} className="text-[#C9A96E]" />
                  </div>
                  <p className="vv-display text-xl text-gray-600 mb-2">Your cart is empty</p>
                  <p className="text-gray-400 text-sm vv-body mb-6">Add some beautiful pieces to get started</p>
                  <button onClick={onClose} className="inline-flex items-center gap-2 bg-[#0F0F0F] text-white px-7 py-3 rounded-full text-sm vv-body hover:bg-[#333] transition-colors font-medium">
                    Browse Collection
                  </button>
                </div>
              ) : (
                cart.items.map(item => {
                  const imgs2 = (() => { try { return JSON.parse(item.images || '[]'); } catch { return []; } })();
                  return (
                    <div key={item.id} className="flex gap-3 bg-white rounded-2xl p-3 border border-gray-100 hover:border-gray-200 transition-colors">
                      <div className="w-18 h-18 rounded-xl overflow-hidden bg-[#F7F2EA] shrink-0" style={{ width: 72, height: 72 }}>
                        {imgs2[0]
                          ? <img src={imgs2[0]} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                          : <div className="w-full h-full flex items-center justify-center text-2xl opacity-30">👗</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[#C9A96E] vv-body font-semibold mb-0.5">{item.category?.name}</p>
                        <p className="text-sm font-medium text-[#0F0F0F] vv-body leading-snug vv-clamp2 mb-1.5">{item.name}</p>
                        <p className="text-sm font-bold text-[#0F0F0F] vv-body">{formatUGX(item.price * item.qty)}</p>
                        <p className="text-[10px] text-gray-400 vv-body">{formatUGX(item.price)} each</p>
                      </div>
                      <div className="flex flex-col items-end justify-between shrink-0">
                        <button onClick={() => cart.remove(item.id)} className="p-1 text-gray-300 hover:text-red-400 transition-colors rounded-lg hover:bg-red-50">
                          <Trash2 size={14} />
                        </button>
                        <div className="flex items-center bg-gray-100 rounded-full px-1 py-0.5 gap-0.5">
                          <button onClick={() => cart.update(item.id, item.qty - 1)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white transition-colors text-gray-600">
                            <Minus size={11} />
                          </button>
                          <span className="w-6 text-center text-xs font-bold vv-body">{item.qty}</span>
                          <button onClick={() => cart.update(item.id, item.qty + 1)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white transition-colors text-gray-600">
                            <Plus size={11} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* CHECKOUT STEP */}
          {step === 'checkout' && (
            <div className="p-4 space-y-4">
              <div className="bg-[#fafaf8] rounded-2xl p-4 border border-gray-100 space-y-4">
                <h3 className="vv-display text-base text-[#0F0F0F] mb-1">Your Details</h3>
                <FInput k="name"    label="Full Name *"          placeholder="Enter your full name" />
                <FInput k="phone"   label="Phone Number *"       placeholder="+256 7XX XXX XXX" type="tel" />
                <FInput k="address" label="Delivery Address *"   placeholder="Area / street in Kampala or town" />
                <div>
                  <label className="text-xs text-gray-600 vv-body font-semibold mb-1.5 block">Payment Method</label>
                  <select className="w-full px-3.5 py-3 rounded-xl border border-gray-200 text-sm vv-body focus:outline-none focus:border-[#C9A96E] bg-white hover:border-gray-300 transition-colors cursor-pointer"
                    value={form.payment} onChange={e => setForm({ ...form, payment: e.target.value })}>
                    {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <h3 className="vv-display text-base text-[#0F0F0F] mb-3">Order Summary</h3>
                <div className="space-y-2 mb-3">
                  {cart.items.map(item => (
                    <div key={item.id} className="flex justify-between text-sm text-gray-600 vv-body">
                      <span className="flex items-center gap-1.5">
                        <span className="w-5 h-5 bg-gray-100 rounded-full text-[10px] flex items-center justify-center font-bold shrink-0">{item.qty}</span>
                        <span className="vv-clamp2">{item.name}</span>
                      </span>
                      <span className="font-semibold shrink-0 ml-2">{formatUGX(item.price * item.qty)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-100 pt-3 space-y-1.5">
                  <div className="flex justify-between text-sm vv-body text-gray-500">
                    <span>Delivery</span>
                    <span className={cart.total >= 200000 ? 'text-green-600 font-semibold' : ''}>
                      {cart.total >= 200000 ? 'FREE 🎉' : 'To be confirmed'}
                    </span>
                  </div>
                  <div className="flex justify-between vv-body font-bold text-[#0F0F0F]">
                    <span>Total</span>
                    <span className="text-[#C9A96E] text-lg vv-display">{formatUGX(cart.total)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-xs text-green-800 vv-body flex gap-2 items-start">
                <MessageCircle size={13} className="shrink-0 mt-0.5 text-[#25D366]" />
                <p>"Confirm Order" will open WhatsApp with your order pre-filled. Our team confirms and arranges delivery within minutes.</p>
              </div>
            </div>
          )}

          {/* SUCCESS STEP */}
          {step === 'success' && (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 vv-up">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-5 shadow-sm">
                <CheckCircle size={44} className="text-green-500" />
              </div>
              <h3 className="vv-display text-2xl text-[#0F0F0F] mb-2">Order Confirmed! 🎉</h3>
              <p className="text-gray-500 text-sm vv-body mb-6 leading-relaxed">Your order has been sent to our WhatsApp team. We'll confirm and arrange delivery shortly.</p>
              <div className="bg-[#F7F2EA] rounded-2xl p-5 border border-[#EDE5D5] mb-6 w-full">
                <p className="text-xs text-gray-400 vv-body mb-1">Order Reference</p>
                <p className="vv-display text-xl text-[#C9A96E] font-semibold">{successId}</p>
                <p className="text-xs text-gray-400 vv-body mt-1">Screenshot this to track your order</p>
              </div>
              <a href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Hi! I just placed order ${successId}. Please confirm.`)}`}
                target="_blank" rel="noopener noreferrer"
                className="w-full py-3.5 bg-[#25D366] text-white rounded-xl font-semibold text-sm vv-body flex items-center justify-center gap-2 hover:bg-[#1da851] transition-colors mb-3">
                <MessageCircle size={15} /> Follow up on WhatsApp
              </a>
              <button onClick={onClose} className="bg-[#0F0F0F] text-white px-8 py-3.5 rounded-full text-sm vv-body hover:bg-[#333] transition-colors font-medium">
                Continue Shopping
              </button>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        {step === 'cart' && cart.items.length > 0 && (
          <div className="p-4 border-t border-gray-100 bg-white shrink-0">
            {cart.total < 200000 && (
              <div className="mb-3 bg-amber-50 rounded-xl px-3 py-2 text-xs text-amber-700 vv-body flex items-center gap-2">
                <Truck size={12} className="text-amber-500 shrink-0" />
                Add <strong>{formatUGX(200000 - cart.total)}</strong> more for free Kampala delivery!
              </div>
            )}
            {cart.total >= 200000 && (
              <div className="mb-3 bg-green-50 rounded-xl px-3 py-2 text-xs text-green-700 vv-body flex items-center gap-2">
                <Truck size={12} className="text-green-500 shrink-0" />
                🎉 You qualify for <strong>FREE delivery</strong> in Kampala!
              </div>
            )}
            <div className="flex justify-between items-center mb-3">
              <span className="vv-body text-gray-500 text-sm">Subtotal ({cart.count} item{cart.count !== 1 ? 's' : ''})</span>
              <span className="vv-display text-xl text-[#0F0F0F]">{formatUGX(cart.total)}</span>
            </div>
            <button onClick={() => setStep('checkout')}
              className="vv-btn-gold w-full py-4 text-white font-semibold rounded-xl text-sm vv-body">
              <span>Proceed to Checkout →</span>
            </button>
          </div>
        )}

        {step === 'checkout' && (
          <div className="p-4 border-t border-gray-100 bg-white shrink-0">
            <button onClick={handleOrder} disabled={placing}
              className="w-full py-4 bg-[#25D366] text-white font-semibold rounded-xl hover:bg-[#1da851] transition-all text-sm vv-body flex items-center justify-center gap-2 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed">
              {placing ? <Loader2 size={17} className="animate-spin" /> : <MessageCircle size={17} />}
              {placing ? 'Placing Order…' : 'Confirm Order via WhatsApp'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ─── REVIEWS ─────────────────────────────────────────────────────
function ReviewSection() {
  const [form,      setForm]      = useState({ name: '', rating: 5, message: '' });
  const [hover,     setHover]     = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [loading,   setLoading]   = useState(false);

  const { data: stats } = useQuery({ queryKey: ['vv-fb-stats'], queryFn: () => feedback.publicStats().then(r => r.data).catch(() => null) });
  const { data: revData, refetch } = useQuery({ queryKey: ['vv-fb-list'], queryFn: () => feedback.publicList().then(r => r.data).catch(() => ({ feedback: [] })) });
  const reviews = revData?.feedback || [];

  const submit = async (e) => {
    e.preventDefault();
    if (!form.message.trim()) return;
    setLoading(true);
    try { await feedback.publicCreate(form); setSubmitted(true); refetch(); } catch { setSubmitted(true); }
    finally { setLoading(false); }
  };

  return (
    <div className="bg-[#F7F2EA] border-t border-[#EDE5D5] py-16 sm:py-20">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="vv-section-label mb-2">Customer Reviews</p>
          <h2 className="vv-display text-4xl sm:text-5xl text-[#0F0F0F] mb-3">What Our Clients Say</h2>
          {stats && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <div className="flex gap-0.5">{[...Array(5)].map((_, i) => <Star key={i} size={18} className={i < Math.round(stats.average || 0) ? 'fill-[#C9A96E] text-[#C9A96E]' : 'text-gray-200 fill-gray-200'} />)}</div>
              <span className="text-gray-600 text-sm vv-body font-medium">{stats.average?.toFixed(1)} · {stats.total || 0} reviews</span>
            </div>
          )}
        </div>

        {/* Rating breakdown */}
        {stats?.breakdown && stats.total > 0 && (
          <div className="max-w-xs mx-auto mb-12 space-y-2">
            {stats.breakdown.map(b => (
              <div key={b.rating} className="flex items-center gap-3">
                <span className="text-xs vv-body text-gray-500 w-3 font-semibold">{b.rating}</span>
                <Star size={10} className="text-[#C9A96E] fill-[#C9A96E] shrink-0" />
                <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                  <div className="bg-[#C9A96E] h-1.5 rounded-full transition-all" style={{ width: `${stats.total > 0 ? (b.count / stats.total) * 100 : 0}%` }} />
                </div>
                <span className="text-xs text-gray-400 vv-body w-4 text-right">{b.count}</span>
              </div>
            ))}
          </div>
        )}

        {/* Reviews grid */}
        {reviews.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
            {reviews.slice(0, 6).map((r, idx) => (
              <div key={r.id || idx} className="bg-white rounded-2xl p-5 border border-[#EDE5D5] shadow-sm hover:shadow-md transition-shadow vv-up" style={{ animationDelay: `${idx * 60}ms` }}>
                <div className="flex gap-0.5 mb-3">
                  {[...Array(5)].map((_, i) => <Star key={i} size={13} className={i < r.rating ? 'fill-[#C9A96E] text-[#C9A96E]' : 'text-gray-200 fill-gray-200'} />)}
                </div>
                <p className="text-sm text-gray-700 vv-body leading-relaxed mb-4 vv-clamp3 italic">"{r.message}"</p>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#C9A96E]/20 flex items-center justify-center text-[#C9A96E] font-bold text-sm vv-body">
                    {r.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#0F0F0F] vv-body">{r.name || 'Anonymous'}</p>
                    <p className="text-[10px] text-gray-400 vv-body">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'Verified buyer'}</p>
                  </div>
                  <BadgeCheck size={14} className="text-[#C9A96E] ml-auto" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Review form */}
        <div className="max-w-lg mx-auto bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#EDE5D5]">
          {submitted ? (
            <div className="text-center py-6 vv-up">
              <CheckCircle size={44} className="text-green-500 mx-auto mb-3" />
              <h3 className="vv-display text-xl text-[#0F0F0F] mb-2">Thank You!</h3>
              <p className="text-gray-500 text-sm vv-body">Your review has been submitted.</p>
            </div>
          ) : (
            <>
              <h3 className="vv-display text-xl text-[#0F0F0F] mb-5 text-center">Share Your Experience</h3>
              <form onSubmit={submit} className="space-y-4">
                <input
                  className="w-full px-3.5 py-3 rounded-xl border border-gray-200 text-sm vv-body focus:outline-none focus:border-[#C9A96E] focus:shadow-[0_0_0_3px_rgba(201,169,110,0.1)] bg-white transition-all"
                  placeholder="Your name (optional)" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} />
                <div>
                  <p className="text-xs text-gray-500 vv-body font-medium mb-2">Your Rating</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button type="button" key={n}
                        onClick={() => setForm({ ...form, rating: n })}
                        onMouseEnter={() => setHover(n)}
                        onMouseLeave={() => setHover(0)}
                        className="transition-transform hover:scale-110">
                        <Star size={28} className={(hover || form.rating) >= n ? 'fill-[#C9A96E] text-[#C9A96E]' : 'text-gray-200 fill-gray-200'} />
                      </button>
                    ))}
                  </div>
                </div>
                <textarea rows={4}
                  className="w-full px-3.5 py-3 rounded-xl border border-gray-200 text-sm vv-body focus:outline-none focus:border-[#C9A96E] focus:shadow-[0_0_0_3px_rgba(201,169,110,0.1)] bg-white transition-all resize-none"
                  placeholder="Tell us about your experience with Villa Vogue..." required
                  value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} />
                <button type="submit" disabled={loading}
                  className="vv-btn-gold w-full py-3.5 text-white font-semibold rounded-xl text-sm vv-body flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={14} />}
                  <span>{loading ? 'Submitting…' : 'Submit Review'}</span>
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── BRAND STORY ──────────────────────────────────────────────────
function BrandStory() {
  return (
    <div className="bg-[#0A0A0A] py-16 sm:py-20">
      <div className="max-w-7xl mx-auto px-4">
        {/* Inclusive fashion highlight */}
        <div className="text-center mb-14">
          <p className="vv-section-label mb-2">For Everyone</p>
          <h2 className="vv-display text-4xl sm:text-5xl text-white mb-4">Fashion Without Boundaries</h2>
          <p className="text-gray-500 vv-body text-base max-w-2xl mx-auto leading-relaxed">
            At Villa Vogue, we believe style belongs to everyone. Our curated collections celebrate Men, Women, and Children — all equally, all beautifully.
          </p>
        </div>

        {/* Gender/family pillars */}
        <div className="grid sm:grid-cols-3 gap-5 mb-14">
          {[
            { icon: '👩🏾‍🦱', label: 'Women', count: '300+ Styles', desc: 'Dresses, Bags, Shoes, Accessories — everything for the modern woman' },
            { icon: '👨🏾‍💼', label: 'Men',   count: '150+ Styles', desc: 'Suits, Trousers, Shoes, Outerwear — sharp looks for every occasion' },
            { icon: '🧒🏾',   label: 'Kids',  count: '80+ Styles',  desc: 'Comfortable, cute, and durable clothing for your little ones' },
          ].map(g => (
            <div key={g.label} className="bg-white/4 border border-white/8 rounded-2xl p-6 hover:bg-white/8 hover:border-[#C9A96E]/25 transition-all duration-300 group text-center">
              <div className="text-4xl mb-3 group-hover:scale-110 transition-transform inline-block">{g.icon}</div>
              <p className="vv-display text-white text-xl mb-1">{g.label}</p>
              <p className="text-[#C9A96E] text-xs vv-body font-semibold tracking-wider mb-3">{g.count}</p>
              <p className="text-gray-500 text-xs vv-body leading-relaxed">{g.desc}</p>
            </div>
          ))}
        </div>

        {/* Value props */}
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: <Truck size={20} />,       title: 'Fast Delivery',      text: 'Same-day Kampala delivery. 2–5 days upcountry.' },
            { icon: <Gift size={20} />,         title: 'Loyalty Rewards',    text: 'Earn points on every purchase and redeem for discounts.' },
            { icon: <RefreshCw size={20} />,    title: '7-Day Returns',      text: 'No-hassle returns on unworn items within 7 days.' },
            { icon: <ShieldCheck size={20} />,  title: '100% Authentic',     text: 'We guarantee authenticity on every item we sell.' },
          ].map(v => (
            <div key={v.title} className="bg-white/4 border border-white/8 rounded-2xl p-5 hover:bg-white/8 hover:border-white/14 transition-all duration-300 group">
              <div className="text-[#C9A96E] mb-3 group-hover:scale-110 transition-transform inline-block">{v.icon}</div>
              <p className="vv-display text-white text-sm mb-1.5 font-medium">{v.title}</p>
              <p className="text-gray-500 text-xs vv-body leading-relaxed">{v.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── FOOTER ──────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-[#0A0A0A] text-gray-500">
      <div className="max-w-7xl mx-auto px-4 py-14 sm:py-16">
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C9A96E] to-[#8B6914] flex items-center justify-center shadow-md">
                <span className="text-white vv-display font-bold text-sm">VV</span>
              </div>
              <span className="vv-display text-white text-lg font-medium">Villa Vogue</span>
            </div>
            <p className="text-sm vv-body leading-relaxed mb-5 text-gray-600">Premium fashion for the whole family. Where style meets culture — Men, Women & Children.</p>
            <div className="flex gap-2.5">
              {[
                { href: 'https://instagram.com',     icon: <Instagram size={14} /> },
                { href: 'https://facebook.com',      icon: <Facebook size={14} /> },
                { href: `https://wa.me/${WHATSAPP}`, icon: <MessageCircle size={14} /> },
              ].map((s, i) => (
                <a key={i} href={s.href} target="_blank" rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-white/5 border border-white/8 flex items-center justify-center hover:bg-[#C9A96E] hover:border-[#C9A96E] transition-all hover:text-white text-gray-500">
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="text-white vv-body font-semibold text-xs uppercase tracking-wider mb-4">Shop</h4>
            {['New Arrivals', 'Dresses', 'Suits', 'Bags', 'Shoes', 'Accessories', 'Outerwear'].map(l => (
              <Link key={l} to={l === 'New Arrivals' ? '/store' : `/store?cat=${l}`}
                className="block text-sm vv-body hover:text-[#C9A96E] transition-colors mb-2.5">{l}</Link>
            ))}
          </div>

          {/* Info */}
          <div>
            <h4 className="text-white vv-body font-semibold text-xs uppercase tracking-wider mb-4">Information</h4>
            {['How to Order', 'Delivery Info', 'Returns Policy', 'Size Guide', 'About Us'].map(l => (
              <p key={l} className="text-sm vv-body mb-2.5 cursor-pointer hover:text-[#C9A96E] transition-colors">{l}</p>
            ))}
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white vv-body font-semibold text-xs uppercase tracking-wider mb-4">Contact Us</h4>
            <div className="space-y-3">
              {[
                { icon: <MapPin size={12} />,  text: 'Kampala, Uganda',       href: 'https://maps.google.com/?q=Kampala,Uganda' },
                { icon: <Phone size={12} />,   text: '+256 782 860372',       href: 'tel:+256782860372' },
                { icon: <Phone size={12} />,   text: '+256 745 903189',       href: 'tel:+256745903189' },
                { icon: <Mail size={12} />,    text: 'villavoguef@gmail.com', href: 'mailto:villavoguef@gmail.com' },
              ].map((c, i) => (
                <a key={i} href={c.href} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm vv-body hover:text-[#C9A96E] transition-colors group">
                  <span className="text-[#C9A96E] group-hover:scale-110 transition-transform">{c.icon}</span>
                  {c.text}
                </a>
              ))}
            </div>
            <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer"
              className="mt-5 flex items-center gap-2 bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] px-4 py-2.5 rounded-xl text-xs font-semibold vv-body hover:bg-[#25D366]/20 transition-colors">
              <MessageCircle size={13} /> Chat on WhatsApp
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs vv-body">
          <p>© {new Date().getFullYear()} Villa Vogue Fashions · All rights reserved · Kampala, Uganda</p>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {['MTN MoMo', 'Airtel Money', 'Visa/MC', 'Cash on Delivery'].map(p => (
              <span key={p} className="bg-white/5 border border-white/8 rounded-lg px-2.5 py-1 text-gray-600">{p}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── PORTAL LAYOUT ────────────────────────────────────────────────
function PortalLayout({ children, cart, wishlist, onCartOpen }) {
  return (
    <div className="min-h-screen bg-white vv-body">
      <AnnouncBar />
      <Navbar cart={cart} wishlist={wishlist} onCartOpen={onCartOpen} />
      <main>{children}</main>
      <Footer />
      <BackToTop />
    </div>
  );
}

// ─── FLOATING WHATSAPP BUTTON ─────────────────────────────────────
function FloatingWA() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2 transition-all duration-500 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <a
        href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Hi! I\'d like to enquire about an item at Villa Vogue Fashions.')}`}
        target="_blank" rel="noopener noreferrer"
        title="Chat on WhatsApp"
        className="w-14 h-14 bg-[#25D366] text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-[#1da851] hover:scale-110 transition-all vv-wa-pulse vv-float"
      >
        <MessageCircle size={24} fill="white" />
      </a>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────
export default function CustomerPortal() {
  const cart     = useCart();
  const wishlist = useWishlist();
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <>
      <FontLoader />
      <FloatingWA />
      <Routes>
        <Route path="*" element={
          <PortalLayout cart={cart} wishlist={wishlist} onCartOpen={() => setCartOpen(true)}>
            <Routes>
              <Route index                     element={<StoreHome    cart={cart} wishlist={wishlist} />} />
              <Route path="product/:productId" element={<ProductDetail cart={cart} wishlist={wishlist} />} />
              <Route path="wishlist"           element={<WishlistPage  cart={cart} wishlist={wishlist} />} />
            </Routes>
          </PortalLayout>
        } />
      </Routes>
      <CartDrawer cart={cart} open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
