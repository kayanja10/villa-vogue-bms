import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ShoppingBag, Search, Star, Heart, Sparkles, Package, X, Plus, Minus,
  Trash2, MessageCircle, ArrowLeft, CheckCircle, Send, Phone, Mail,
  MapPin, Instagram, Facebook, Clock, Truck, ShieldCheck, RefreshCw,
  ZoomIn, ChevronRight, AlertCircle, Loader2, BadgeCheck, Award
} from 'lucide-react';
import { products as productApi, feedback, orders } from '../lib/api';

// ─── CONSTANTS ────────────────────────────────────────────────────
const WHATSAPP = '256782860372';
const CATEGORIES = ['All','Dresses','Tops','Trousers','Skirts','Suits','Accessories','Shoes','Bags','Outerwear'];
const PAYMENT_METHODS = ['MTN Mobile Money','Airtel Money','Cash on Delivery','Visa / Mastercard'];
const formatUGX = (n) => `UGX ${Number(n || 0).toLocaleString()}`;
const genOrderId = () => `VV-${Date.now().toString(36).toUpperCase()}`;

// ─── FONT LOADER ──────────────────────────────────────────────────
function FontLoader() {
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    const style = document.createElement('style');
    style.textContent = `
      .vv-display { font-family: 'Cormorant Garamond', Georgia, serif; }
      .vv-body { font-family: 'DM Sans', system-ui, sans-serif; }
      .vv-scroll::-webkit-scrollbar { display: none; }
      .vv-scroll { -ms-overflow-style:none; scrollbar-width:none; }
      @keyframes vv-shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
      .vv-shimmer { background:linear-gradient(90deg,#f0ebe0 25%,#faf6ef 50%,#f0ebe0 75%);background-size:200% 100%;animation:vv-shimmer 1.5s infinite; }
      @keyframes vv-up { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
      .vv-up { animation:vv-up 0.45s ease forwards; }
      @keyframes vv-pulse { 0%,100%{box-shadow:0 0 0 0 rgba(201,169,110,0.5)} 60%{box-shadow:0 0 0 7px rgba(201,169,110,0)} }
      .vv-pulse { animation:vv-pulse 2s infinite; }
      .vv-clamp2 { display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden; }
      .vv-clamp3 { display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden; }
    `;
    document.head.appendChild(style);
  }, []);
  return null;
}

// ─── CART HOOK ────────────────────────────────────────────────────
function useCart() {
  const [items, setItems] = useState(() => { try { return JSON.parse(localStorage.getItem('vv_cart3')||'[]'); } catch { return []; } });
  useEffect(() => { localStorage.setItem('vv_cart3', JSON.stringify(items)); }, [items]);
  const add = (p, qty=1) => setItems(prev => { const ex=prev.find(i=>i.id===p.id); if(ex) return prev.map(i=>i.id===p.id?{...i,qty:i.qty+qty}:i); return [...prev,{...p,qty}]; });
  const remove = (id) => setItems(prev=>prev.filter(i=>i.id!==id));
  const update = (id,qty) => { if(qty<=0) return remove(id); setItems(prev=>prev.map(i=>i.id===id?{...i,qty}:i)); };
  const clear = () => setItems([]);
  const total = items.reduce((s,i)=>s+i.price*i.qty,0);
  const count = items.reduce((s,i)=>s+i.qty,0);
  return { items, add, remove, update, clear, total, count };
}

// ─── WISHLIST HOOK ────────────────────────────────────────────────
function useWishlist() {
  const [ids, setIds] = useState(() => { try { return JSON.parse(localStorage.getItem('vv_wish')||'[]'); } catch { return []; } });
  useEffect(() => { localStorage.setItem('vv_wish', JSON.stringify(ids)); }, [ids]);
  const toggle = (id) => setIds(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);
  const has = (id) => ids.includes(id);
  return { ids, toggle, has, count: ids.length };
}

// ─── WHATSAPP MESSAGE ─────────────────────────────────────────────
function buildWA(items, total, info={}, orderId='') {
  const lines = items.map(i=>`• ${i.qty}× ${i.name} — ${formatUGX(i.price*i.qty)}`).join('\n');
  return encodeURIComponent(
    `🛍️ *New Order — Villa Vogue*\nRef: *${orderId}*\n\n${lines}\n\n*Total: ${formatUGX(total)}*\n\n👤 ${info.name||'—'}\n📞 ${info.phone||'—'}\n📍 ${info.address||'—'}\n💳 ${info.payment||'—'}\n\nPlease confirm and arrange delivery. Thank you! 🙏`
  );
}

// ─── SKELETON ─────────────────────────────────────────────────────
const Skel = ({c}) => <div className={`vv-shimmer rounded-xl ${c}`} />;

// ─── ANNOUNCEMENT BAR ─────────────────────────────────────────────
function AnnouncBar() {
  const msgs = [
    '🚚 Free delivery in Kampala on orders above UGX 200,000',
    '✨ New arrivals — Dresses, Suits & Accessories now in stock',
    '📞 Order on WhatsApp: +256 782 860372  |  +256 745 903189',
    '💳 Pay via MTN MoMo · Airtel Money · Cash on Delivery',
  ];
  const [i, setI] = useState(0);
  useEffect(() => { const t=setInterval(()=>setI(x=>(x+1)%msgs.length),4000); return ()=>clearInterval(t); }, []);
  return (
    <div className="bg-[#1a1a1a] text-[#C9A96E] text-center text-xs py-2.5 vv-body tracking-widest overflow-hidden">
      <div key={i} className="vv-up">{msgs[i]}</div>
    </div>
  );
}

// ─── NAVBAR ───────────────────────────────────────────────────────
function Navbar({ cart, wishlist, onCartOpen }) {
  const [search, setSearch] = useState('');
  const [mSearch, setMSearch] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  useEffect(() => { const fn=()=>setScrolled(window.scrollY>8); window.addEventListener('scroll',fn); return ()=>window.removeEventListener('scroll',fn); }, []);
  const go = (e) => { e.preventDefault(); if(search.trim()){navigate(`/store?search=${encodeURIComponent(search.trim())}`);setMSearch(false);} };

  return (
    <header className={`sticky top-0 z-40 border-b border-[#f0ebe0] transition-all duration-300 ${scrolled?'bg-white shadow-sm':'bg-white/96 backdrop-blur-md'}`}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/store" className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C9A96E] to-[#8B6914] flex items-center justify-center shadow-md overflow-hidden">
              <img src="/logo.png" alt="VV" className="w-full h-full object-cover" onError={e=>{e.target.style.display='none';e.target.parentElement.innerHTML='<span style="color:white;font-weight:bold;font-size:14px;font-family:Georgia,serif">VV</span>';}} />
            </div>
            <div className="hidden sm:block">
              <p className="vv-display font-semibold text-[#1a1a1a] text-xl leading-none">Villa Vogue</p>
              <p className="text-[9px] text-[#C9A96E] tracking-[0.25em] uppercase vv-body mt-0.5">Fashions</p>
            </div>
          </Link>

          {/* Desktop search */}
          <form onSubmit={go} className="relative flex-1 max-w-sm hidden md:block">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="w-full pl-9 pr-4 py-2.5 text-sm rounded-full border border-gray-200 bg-gray-50 focus:outline-none focus:border-[#C9A96E] focus:bg-white transition-all vv-body"
              placeholder="Search dresses, bags, shoes..." value={search} onChange={e=>setSearch(e.target.value)} />
          </form>

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            <button onClick={()=>setMSearch(!mSearch)} className="md:hidden p-2.5 hover:bg-gray-100 rounded-full transition-colors"><Search size={20} className="text-gray-700" /></button>
            <Link to="/store/wishlist" className="relative p-2.5 hover:bg-gray-100 rounded-full transition-colors hidden sm:flex">
              <Heart size={20} className={wishlist.count>0?'text-red-500 fill-red-500':'text-gray-700'} />
              {wishlist.count>0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{wishlist.count}</span>}
            </Link>
            <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 text-xs font-medium bg-[#25D366] text-white px-3 py-2 rounded-full hover:bg-[#1da851] transition-colors vv-body">
              <MessageCircle size={13} /> Chat
            </a>
            <button onClick={onCartOpen} className="relative p-2.5 hover:bg-gray-100 rounded-full transition-colors">
              <ShoppingBag size={20} className="text-gray-700" />
              {cart.count>0 && <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-[#C9A96E] text-white text-[10px] font-bold rounded-full flex items-center justify-center vv-pulse">{cart.count>9?'9+':cart.count}</span>}
            </button>
          </div>
        </div>

        {/* Mobile search */}
        {mSearch && (
          <div className="pb-3 md:hidden vv-up">
            <form onSubmit={go} className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input autoFocus className="w-full pl-9 pr-4 py-2.5 text-sm rounded-full border border-gray-200 bg-gray-50 focus:outline-none focus:border-[#C9A96E] vv-body"
                placeholder="Search products..." value={search} onChange={e=>setSearch(e.target.value)} />
            </form>
          </div>
        )}

        {/* Category strip */}
        <div className="border-t border-gray-100 flex gap-1 overflow-x-auto py-2 vv-scroll">
          {CATEGORIES.map(cat => {
            const active = searchParams.get('cat')===cat || (cat==='All' && !searchParams.get('cat'));
            return (
              <Link key={cat} to={cat==='All'?'/store':`/store?cat=${cat}`}
                className={`shrink-0 text-xs font-medium px-3.5 py-1.5 rounded-full transition-all whitespace-nowrap vv-body ${active?'bg-[#1a1a1a] text-white':'text-gray-600 hover:bg-gray-100'}`}>
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
  const [added, setAdded] = useState(false);
  const imgs = (() => { try { return JSON.parse(product.images||'[]'); } catch { return []; } })();
  const isLow = product.stock>0 && product.stock<=3;
  const isOut = product.stock===0;

  const handleAdd = (e) => { e.preventDefault(); e.stopPropagation(); onAdd(product); setAdded(true); setTimeout(()=>setAdded(false),1800); };

  return (
    <Link to={`/store/product/${product.id}`} className="group block">
      <div className="relative bg-[#f5f0e8] rounded-2xl overflow-hidden aspect-[3/4] mb-3">
        {imgs[0] ? (
          <img src={imgs[imgIdx]} alt={product.name}
            className={`w-full h-full object-cover transition-all duration-700 ${isOut?'opacity-50 grayscale':'group-hover:scale-105'}`} />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#f5f0e8] to-[#e8d5b0]">
            <span className="text-5xl opacity-30">👗</span>
          </div>
        )}

        {imgs.length>1 && !isOut && (
          <div className="absolute bottom-12 left-0 right-0 flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {imgs.slice(0,4).map((_,i)=>(
              <button key={i} onMouseEnter={e=>{e.preventDefault();setImgIdx(i);}} onClick={e=>{e.preventDefault();setImgIdx(i);}}
                className={`w-1.5 h-1.5 rounded-full transition-all ${i===imgIdx?'bg-white scale-125':'bg-white/60'}`} />
            ))}
          </div>
        )}

        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.isFeatured && <span className="bg-[#C9A96E] text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 vv-body"><Sparkles size={8}/>Featured</span>}
          {isLow && <span className="bg-orange-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full vv-body">Only {product.stock} left!</span>}
        </div>

        <button onClick={e=>{e.preventDefault();wishlist.toggle(product.id);}}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110">
          <Heart size={14} className={wishlist.has(product.id)?'fill-red-500 text-red-500':'text-gray-400'} />
        </button>

        {isOut && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <span className="bg-white/95 text-gray-800 text-xs font-semibold px-4 py-1.5 rounded-full vv-body tracking-wide">Out of Stock</span>
          </div>
        )}

        {!isOut && (
          <button onClick={handleAdd}
            className={`absolute bottom-3 left-3 right-3 py-2 rounded-xl text-xs font-semibold transition-all duration-300 vv-body
              ${added?'bg-green-500 text-white opacity-100 translate-y-0':'bg-white/95 text-[#1a1a1a] opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0'}`}>
            {added?'✓ Added!':'+ Add to Cart'}
          </button>
        )}
      </div>
      <div className="px-0.5">
        <p className="text-[10px] text-[#C9A96E] font-medium tracking-wider uppercase vv-body mb-0.5">{product.category?.name}</p>
        <p className="vv-display text-[#1a1a1a] text-base leading-snug mb-1 vv-clamp2">{product.name}</p>
        <p className="vv-body font-semibold text-[#1a1a1a] text-sm">{formatUGX(product.price)}</p>
      </div>
    </Link>
  );
}

// ─── HERO ─────────────────────────────────────────────────────────
function Hero() {
  return (
    <div className="relative bg-[#1a1a1a] overflow-hidden">
      <div className="absolute inset-0 opacity-[0.06]" style={{backgroundImage:`url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23C9A96E' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E")`}} />
      <div className="absolute top-0 right-0 w-80 h-80 bg-[#C9A96E]/15 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-20 w-56 h-56 bg-[#C9A96E]/8 rounded-full blur-[70px]" />

      <div className="relative max-w-7xl mx-auto px-4 py-20 sm:py-28">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 bg-[#C9A96E]/15 border border-[#C9A96E]/25 rounded-full px-4 py-1.5 mb-6">
            <Sparkles size={11} className="text-[#C9A96E]" />
            <span className="text-[#C9A96E] text-[11px] tracking-widest uppercase vv-body">New Collection 2025</span>
          </div>
          <h1 className="vv-display text-white text-5xl sm:text-[68px] font-light leading-[1.05] mb-5">
            Where Fashion<br /><em className="text-[#C9A96E] not-italic font-medium">Finds a Home</em>
          </h1>
          <p className="text-gray-400 text-lg vv-body leading-relaxed mb-8 max-w-sm">
            Premium fashion for the modern African woman. Curated pieces delivered across Uganda.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/store?cat=Dresses"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#C9A96E] to-[#A8824A] text-white px-8 py-3.5 rounded-full font-semibold text-sm vv-body hover:shadow-xl hover:shadow-[#C9A96E]/25 transition-all hover:-translate-y-0.5">
              Shop New Arrivals <ChevronRight size={16} />
            </Link>
            <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 border border-white/20 text-white px-8 py-3.5 rounded-full font-semibold text-sm vv-body hover:bg-white/10 transition-all">
              <MessageCircle size={16} className="text-[#25D366]" /> Chat on WhatsApp
            </a>
          </div>
          <div className="flex gap-8 mt-10 pt-8 border-t border-white/10">
            {[['500+','Products'],['2,000+','Happy Customers'],['Same Day','Kampala Delivery']].map(([v,l])=>(
              <div key={l}><p className="vv-display text-[#C9A96E] text-2xl font-medium">{v}</p><p className="text-gray-500 text-xs vv-body mt-0.5">{l}</p></div>
            ))}
          </div>
        </div>
      </div>

      <div className="relative border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex gap-2.5 overflow-x-auto vv-scroll">
          {[['👗','Dresses'],['👜','Bags'],['👠','Shoes'],['💍','Accessories'],['🧥','Outerwear'],['👔','Suits'],['👒','Hats'],['🧣','Scarves']].map(([e,c])=>(
            <Link key={c} to={`/store?cat=${c}`}
              className="shrink-0 flex items-center gap-2 bg-white/8 hover:bg-white/15 border border-white/10 hover:border-[#C9A96E]/40 rounded-xl px-4 py-2.5 transition-all group">
              <span className="text-base">{e}</span>
              <span className="text-white text-xs vv-body whitespace-nowrap group-hover:text-[#C9A96E] transition-colors">{c}</span>
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
    <div className="bg-[#faf6ef] border-y border-[#f0ebe0]">
      <div className="max-w-7xl mx-auto px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {icon:<Truck size={15} className="text-[#C9A96E]"/>, text:'Free Delivery UGX 200K+'},
          {icon:<ShieldCheck size={15} className="text-[#C9A96E]"/>, text:'100% Authentic Pieces'},
          {icon:<Phone size={15} className="text-[#C9A96E]"/>, text:'MTN & Airtel MoMo'},
          {icon:<RefreshCw size={15} className="text-[#C9A96E]"/>, text:'7-Day Easy Returns'},
        ].map(t=>(
          <div key={t.text} className="flex items-center justify-center gap-2 text-xs text-gray-600 vv-body font-medium">{t.icon}{t.text}</div>
        ))}
      </div>
    </div>
  );
}

// ─── STORE HOME ───────────────────────────────────────────────────
function StoreHome({ cart, wishlist }) {
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('featured');
  const cat = searchParams.get('cat')||'';
  const search = searchParams.get('search')||'';
  const isHome = !cat && !search && page===1;

  useEffect(()=>{setPage(1); if(!isHome) window.scrollTo({top:0,behavior:'smooth'});}, [cat, search]);

  const { data, isLoading } = useQuery({
    queryKey: ['vv-products', cat, search, page, sort],
    queryFn: () => productApi.listPublic({ category:cat, search, page, limit:24, sort }).then(r=>r.data),
    keepPreviousData: true,
  });

  const products = data?.products || [];

  return (
    <div>
      {isHome && <Hero />}
      {isHome && <TrustBar />}

      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
          <div>
            <h2 className="vv-display text-3xl text-[#1a1a1a]">{cat||search?(cat||`"${search}"`):isHome?'Our Collection':'All Products'}</h2>
            <p className="text-gray-500 text-sm vv-body mt-1">{data?.total||0} pieces available</p>
          </div>
          <select value={sort} onChange={e=>setSort(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#C9A96E] bg-white vv-body text-gray-700">
            <option value="featured">Featured</option>
            <option value="price_asc">Price: Low → High</option>
            <option value="price_desc">Price: High → Low</option>
            <option value="newest">Newest First</option>
          </select>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {[...Array(8)].map((_,i)=>(
              <div key={i}><Skel c="aspect-[3/4] mb-3"/><Skel c="h-3 w-1/2 mb-2"/><Skel c="h-4 w-3/4 mb-2"/><Skel c="h-4 w-1/3"/></div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {products.map((p,i)=>(
              <div key={p.id} className="vv-up" style={{animationDelay:`${i*35}ms`}}>
                <ProductCard product={p} onAdd={cart.add} wishlist={wishlist} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-[#faf6ef] rounded-full flex items-center justify-center mx-auto mb-4"><Package size={32} className="text-[#C9A96E]"/></div>
            <p className="vv-display text-2xl text-gray-600 mb-2">No products found</p>
            <p className="text-gray-400 text-sm vv-body mb-6">Try a different category or search</p>
            <Link to="/store" className="inline-flex items-center gap-2 bg-[#1a1a1a] text-white px-6 py-2.5 rounded-full text-sm vv-body hover:bg-[#333] transition-colors">View All Products</Link>
          </div>
        )}

        {data?.pages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-14">
            <button disabled={page===1} onClick={()=>setPage(p=>p-1)}
              className="px-5 py-2 border border-gray-200 rounded-full text-sm vv-body hover:border-[#C9A96E] transition-colors disabled:opacity-40">← Prev</button>
            {[...Array(Math.min(data.pages,7))].map((_,i)=>(
              <button key={i} onClick={()=>setPage(i+1)}
                className={`w-9 h-9 rounded-full text-sm vv-body transition-all ${page===i+1?'bg-[#1a1a1a] text-white':'hover:bg-gray-100 text-gray-600'}`}>{i+1}</button>
            ))}
            <button disabled={page===data.pages} onClick={()=>setPage(p=>p+1)}
              className="px-5 py-2 bg-[#C9A96E] text-white rounded-full text-sm vv-body hover:bg-[#A8824A] transition-colors disabled:opacity-40">Next →</button>
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
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [tab, setTab] = useState('description');

  const { data: allData, isLoading } = useQuery({
    queryKey: ['vv-products-all'],
    queryFn: () => productApi.listPublic({ limit:200 }).then(r=>r.data),
  });

  const product = allData?.products?.find(p=>p.id===parseInt(productId));
  const related = allData?.products?.filter(p=>p.id!==parseInt(productId)&&p.category?.name===product?.category?.name).slice(0,4)||[];
  const imgs = (() => { try { return JSON.parse(product?.images||'[]'); } catch { return []; } })();
  const tags = (() => { try { return JSON.parse(product?.tags||'[]'); } catch { return []; } })();

  const handleAdd = () => { cart.add(product,qty); setAdded(true); setTimeout(()=>setAdded(false),2000); };
  const handleWA = () => { window.open(`https://wa.me/${WHATSAPP}?text=${buildWA([{...product,qty}],product.price*qty,{},genOrderId())}`, '_blank'); };

  if (isLoading) return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="grid md:grid-cols-2 gap-12">
        <Skel c="aspect-square" />
        <div className="space-y-4">{[...Array(5)].map((_,i)=><Skel key={i} c="h-6 w-3/4"/>)}</div>
      </div>
    </div>
  );

  if (!product) return (
    <div className="max-w-7xl mx-auto px-4 py-24 text-center">
      <Package size={56} className="text-gray-200 mx-auto mb-4"/>
      <p className="vv-display text-2xl text-gray-500 mb-3">Product not found</p>
      <Link to="/store" className="text-[#C9A96E] text-sm vv-body hover:underline">← Back to store</Link>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 vv-body">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-gray-400 mb-6">
        <Link to="/store" className="hover:text-[#C9A96E]">Store</Link>
        <ChevronRight size={11}/>
        {product.category?.name && <><Link to={`/store?cat=${product.category.name}`} className="hover:text-[#C9A96E]">{product.category.name}</Link><ChevronRight size={11}/></>}
        <span className="text-gray-600 truncate">{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-10 lg:gap-16">
        {/* Images */}
        <div>
          <div className="relative aspect-square bg-[#f5f0e8] rounded-2xl overflow-hidden mb-3 cursor-zoom-in group" onClick={()=>imgs[imgIdx]&&setZoomed(true)}>
            {imgs[imgIdx]
              ? <img src={imgs[imgIdx]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
              : <div className="w-full h-full flex items-center justify-center text-8xl opacity-20">👗</div>}
            <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow">
              <ZoomIn size={15} className="text-gray-600"/>
            </div>
            <button onClick={e=>{e.stopPropagation();wishlist.toggle(product.id);}}
              className="absolute top-4 right-4 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow hover:scale-110 transition-transform">
              <Heart size={16} className={wishlist.has(product.id)?'fill-red-500 text-red-500':'text-gray-400'}/>
            </button>
          </div>
          {imgs.length>1 && (
            <div className="flex gap-2 vv-scroll overflow-x-auto">
              {imgs.map((img,i)=>(
                <button key={i} onClick={()=>setImgIdx(i)}
                  className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${i===imgIdx?'border-[#C9A96E] scale-105':'border-transparent opacity-60 hover:opacity-100'}`}>
                  <img src={img} alt="" className="w-full h-full object-cover"/>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <p className="text-[#C9A96E] text-[11px] tracking-widest uppercase mb-1">{product.category?.name}</p>
          <h1 className="vv-display text-4xl text-[#1a1a1a] leading-tight mb-4">{product.name}</h1>

          <div className="flex items-center gap-4 mb-5">
            <span className="vv-display text-3xl font-medium text-[#1a1a1a]">{formatUGX(product.price)}</span>
            {product.stock>0
              ? <span className="bg-green-100 text-green-700 text-xs font-medium px-3 py-1 rounded-full">{product.stock>10?'In Stock':`Only ${product.stock} left`}</span>
              : <span className="bg-red-100 text-red-600 text-xs font-medium px-3 py-1 rounded-full">Out of Stock</span>}
          </div>

          {tags.length>0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {tags.map(t=><span key={t} className="text-xs bg-[#faf6ef] text-[#A8824A] border border-[#f0ebe0] px-3 py-1 rounded-full">{t}</span>)}
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-5 flex gap-5">
            {['description','delivery','returns'].map(t=>(
              <button key={t} onClick={()=>setTab(t)}
                className={`pb-3 text-sm capitalize transition-colors ${tab===t?'border-b-2 border-[#C9A96E] text-[#1a1a1a] font-medium':'text-gray-400 hover:text-gray-600'}`}>{t}</button>
            ))}
          </div>
          <div className="text-sm text-gray-600 leading-relaxed mb-6 min-h-[56px]">
            {tab==='description' && (product.description||'Premium quality fashion piece from Villa Vogue Fashions. Crafted with attention to detail for the modern African woman.')}
            {tab==='delivery' && '📍 Kampala: Same day or next day delivery. 🚌 Upcountry: 2–5 business days. Free delivery on orders above UGX 200,000 within Kampala.'}
            {tab==='returns' && 'Returns accepted within 7 days of delivery for unworn items in original condition. Contact us on WhatsApp to initiate. Exchange or store credit offered.'}
          </div>

          {product.stock>0 ? (
            <>
              <div className="flex items-center gap-3 mb-5">
                <span className="text-sm text-gray-600">Qty:</span>
                <div className="flex items-center bg-gray-100 rounded-full px-1 py-1 gap-1">
                  <button onClick={()=>setQty(q=>Math.max(1,q-1))} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white transition-colors"><Minus size={14}/></button>
                  <span className="w-8 text-center font-semibold text-sm">{qty}</span>
                  <button onClick={()=>setQty(q=>Math.min(product.stock,q+1))} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white transition-colors"><Plus size={14}/></button>
                </div>
                <span className="text-xs text-gray-400">{product.stock} available</span>
              </div>
              <div className="flex flex-col gap-3">
                <button onClick={handleAdd}
                  className={`w-full py-4 rounded-xl font-semibold text-sm transition-all ${added?'bg-green-500 text-white':'bg-[#1a1a1a] text-white hover:bg-[#333] hover:-translate-y-0.5 hover:shadow-lg'}`}>
                  {added?'✓ Added to Cart!':`Add to Cart — ${formatUGX(product.price*qty)}`}
                </button>
                <button onClick={handleWA}
                  className="w-full py-4 bg-[#25D366] text-white rounded-xl font-semibold text-sm hover:bg-[#1da851] transition-all hover:-translate-y-0.5 hover:shadow-lg flex items-center justify-center gap-2">
                  <MessageCircle size={17}/> Order via WhatsApp
                </button>
              </div>
            </>
          ) : (
            <a href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Hi! I'm interested in "${product.name}" — is it back in stock?`)}`}
              target="_blank" rel="noopener noreferrer"
              className="block w-full py-4 bg-[#25D366] text-white rounded-xl font-semibold text-sm text-center hover:bg-[#1da851] transition-all">
              <MessageCircle size={16} className="inline mr-2"/>Ask About Restock
            </a>
          )}

          <div className="grid grid-cols-3 gap-2 mt-5">
            {[{icon:<Truck size={14}/>,text:'Free delivery 200K+'},{icon:<RefreshCw size={14}/>,text:'7-day returns'},{icon:<ShieldCheck size={14}/>,text:'100% Authentic'}].map(b=>(
              <div key={b.text} className="bg-[#fafaf8] border border-gray-100 rounded-xl p-2.5 text-center">
                <div className="text-[#C9A96E] flex justify-center mb-1">{b.icon}</div>
                <p className="text-[10px] text-gray-500 leading-tight">{b.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-[#faf6ef] rounded-xl border border-[#f0ebe0]">
            <p className="text-xs text-gray-500 font-medium mb-2">Accepted Payments</p>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map(m=><span key={m} className="text-[10px] bg-white border border-gray-200 text-gray-600 px-2 py-1 rounded-lg">{m}</span>)}
            </div>
          </div>
        </div>
      </div>

      {/* Related */}
      {related.length>0 && (
        <div className="mt-16">
          <h2 className="vv-display text-2xl text-[#1a1a1a] mb-6">You May Also Like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {related.map(p=><ProductCard key={p.id} product={p} onAdd={cart.add} wishlist={wishlist}/>)}
          </div>
        </div>
      )}

      {/* Zoom */}
      {zoomed && imgs[imgIdx] && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4" onClick={()=>setZoomed(false)}>
          <button className="absolute top-5 right-5 text-white/60 hover:text-white"><X size={28}/></button>
          <img src={imgs[imgIdx]} alt={product.name} className="max-w-full max-h-full object-contain rounded-xl"/>
        </div>
      )}
    </div>
  );
}

// ─── WISHLIST PAGE ────────────────────────────────────────────────
function WishlistPage({ cart, wishlist }) {
  const { data } = useQuery({ queryKey:['vv-products-all'], queryFn:()=>productApi.listPublic({limit:200}).then(r=>r.data) });
  const products = (data?.products||[]).filter(p=>wishlist.has(p.id));
  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="vv-display text-3xl text-[#1a1a1a] mb-2">My Wishlist</h1>
      <p className="text-gray-500 text-sm vv-body mb-8">{products.length} saved item{products.length!==1?'s':''}</p>
      {products.length===0 ? (
        <div className="text-center py-20">
          <Heart size={52} className="text-gray-200 mx-auto mb-4"/>
          <p className="vv-display text-2xl text-gray-500 mb-2">Your wishlist is empty</p>
          <Link to="/store" className="inline-flex items-center gap-2 bg-[#1a1a1a] text-white px-6 py-2.5 rounded-full text-sm vv-body mt-4 hover:bg-[#333] transition-colors">Explore Collection</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {products.map(p=><ProductCard key={p.id} product={p} onAdd={cart.add} wishlist={wishlist}/>)}
        </div>
      )}
    </div>
  );
}

// ─── CART DRAWER ─────────────────────────────────────────────────
function CartDrawer({ cart, open, onClose }) {
  const [step, setStep] = useState('cart');
  const [form, setForm] = useState({ name:'', phone:'', address:'', payment:'MTN Mobile Money' });
  const [errors, setErrors] = useState({});
  const [orderId] = useState(genOrderId);
  const [successId, setSuccessId] = useState('');

  useEffect(()=>{ if(!open) setTimeout(()=>{setStep('cart');setErrors({});},350); }, [open]);

  const validate = () => {
    const e={};
    if(!form.name.trim()) e.name='Name is required';
    if(!form.phone.trim()) e.phone='Phone required';
    else if(!/^[0-9+\s]{9,15}$/.test(form.phone.trim())) e.phone='Enter valid phone number';
    if(!form.address.trim()) e.address='Delivery address required';
    setErrors(e); return Object.keys(e).length===0;
  };

  const handleOrder = async () => {
    if(!validate()) return;
    try {
      await orders.create({
        customerName:form.name, customerPhone:form.phone, deliveryAddress:form.address,
        paymentMethod:form.payment, items:cart.items.map(i=>({productId:i.id,name:i.name,qty:i.qty,price:i.price})),
        total:cart.total, orderRef:orderId, source:'portal',
      });
    } catch {}
    window.open(`https://wa.me/${WHATSAPP}?text=${buildWA(cart.items,cart.total,form,orderId)}`,'_blank');
    cart.clear(); setSuccessId(orderId); setStep('success');
  };

  const FInput = ({k,label,placeholder,type='text'}) => (
    <div>
      <label className="text-xs text-gray-600 vv-body font-medium mb-1 block">{label}</label>
      <input type={type} placeholder={placeholder}
        className={`w-full px-3 py-2.5 rounded-lg border text-sm vv-body focus:outline-none focus:border-[#C9A96E] bg-white transition-colors ${errors[k]?'border-red-400 bg-red-50':'border-gray-200'}`}
        value={form[k]} onChange={e=>{setForm({...form,[k]:e.target.value});setErrors({...errors,[k]:''});}} />
      {errors[k] && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={11}/>{errors[k]}</p>}
    </div>
  );

  return (
    <>
      <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300 ${open?'opacity-100':'opacity-0 pointer-events-none'}`} onClick={onClose}/>
      <div className={`fixed right-0 top-0 h-full w-full max-w-[420px] bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-out ${open?'translate-x-0':'translate-x-full'}`}>

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          {step==='checkout' && <button onClick={()=>setStep('cart')} className="p-1.5 hover:bg-gray-100 rounded-lg mr-2 text-gray-500"><ArrowLeft size={17}/></button>}
          <div className="flex items-center gap-2 flex-1">
            <ShoppingBag size={18} className="text-[#C9A96E]"/>
            <h2 className="vv-display text-lg text-[#1a1a1a]">
              {step==='cart'?`Cart (${cart.count})`:step==='checkout'?'Checkout':'Order Confirmed!'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400"><X size={18}/></button>
        </div>

        {(step==='cart'||step==='checkout') && (
          <div className="flex gap-2 px-5 py-2 bg-[#fafaf8] border-b border-gray-100">
            {['cart','checkout'].map((s,i)=>(
              <div key={s} className="flex items-center gap-1.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step===s||(s==='cart'&&step==='checkout')?'bg-[#C9A96E] text-white':'bg-gray-200 text-gray-400'}`}>{i+1}</div>
                <span className={`text-xs capitalize vv-body ${step===s?'text-[#1a1a1a] font-medium':'text-gray-400'}`}>{s}</span>
                {i===0 && <ChevronRight size={11} className="text-gray-300"/>}
              </div>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {/* CART */}
          {step==='cart' && (
            cart.items.length===0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="w-20 h-20 bg-[#faf6ef] rounded-full flex items-center justify-center mb-4"><ShoppingBag size={32} className="text-[#C9A96E]"/></div>
                <p className="vv-display text-xl text-gray-700 mb-2">Your cart is empty</p>
                <p className="text-gray-400 text-sm vv-body mb-6">Add some beautiful pieces to get started</p>
                <button onClick={onClose} className="bg-[#1a1a1a] text-white px-6 py-2.5 rounded-full text-sm vv-body hover:bg-[#333] transition-colors">Continue Shopping</button>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {cart.total>=200000 && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2 text-green-700 text-xs vv-body">
                    <Truck size={13}/><span><strong>Free delivery</strong> applies to your order!</span>
                  </div>
                )}
                {cart.items.map(item=>{
                  const imgs=(()=>{try{return JSON.parse(item.images||'[]');}catch{return[];}})();
                  return (
                    <div key={item.id} className="flex gap-3 bg-gray-50 rounded-xl p-3">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-[#f5f0e8] shrink-0">
                        {imgs[0]?<img src={imgs[0]} alt={item.name} className="w-full h-full object-cover"/>:<div className="w-full h-full flex items-center justify-center text-2xl">👗</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="vv-body font-medium text-sm text-[#1a1a1a] truncate">{item.name}</p>
                        <p className="text-[#C9A96E] font-semibold text-sm vv-body">{formatUGX(item.price)}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <button onClick={()=>cart.update(item.id,item.qty-1)} className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-200 transition-colors"><Minus size={10}/></button>
                          <span className="text-sm font-semibold w-5 text-center vv-body">{item.qty}</span>
                          <button onClick={()=>cart.update(item.id,item.qty+1)} className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-200 transition-colors"><Plus size={10}/></button>
                          <button onClick={()=>cart.remove(item.id)} className="ml-auto text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* CHECKOUT */}
          {step==='checkout' && (
            <div className="p-4 space-y-4">
              <div className="bg-[#faf6ef] rounded-xl p-4 border border-[#f0ebe0]">
                <h3 className="vv-display text-base text-[#1a1a1a] mb-3">Your Details</h3>
                <div className="space-y-3">
                  <FInput k="name" label="Full Name *" placeholder="e.g. Aisha Nakato"/>
                  <FInput k="phone" label="Phone Number *" placeholder="e.g. 0782 860372" type="tel"/>
                  <FInput k="address" label="Delivery Address *" placeholder="Area / street in Kampala or town"/>
                  <div>
                    <label className="text-xs text-gray-600 vv-body font-medium mb-1 block">Payment Method</label>
                    <select className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm vv-body focus:outline-none focus:border-[#C9A96E] bg-white"
                      value={form.payment} onChange={e=>setForm({...form,payment:e.target.value})}>
                      {PAYMENT_METHODS.map(m=><option key={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <h3 className="vv-display text-base text-[#1a1a1a] mb-3">Order Summary</h3>
                <div className="space-y-1.5 mb-3">
                  {cart.items.map(item=>(
                    <div key={item.id} className="flex justify-between text-sm text-gray-600 vv-body">
                      <span>{item.qty}× {item.name}</span>
                      <span className="font-medium">{formatUGX(item.price*item.qty)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-100 pt-3 space-y-1">
                  <div className="flex justify-between text-sm vv-body text-gray-500">
                    <span>Delivery</span>
                    <span className={cart.total>=200000?'text-green-600 font-medium':''}>
                      {cart.total>=200000?'FREE':'To be confirmed'}
                    </span>
                  </div>
                  <div className="flex justify-between vv-body font-bold text-base text-[#1a1a1a]">
                    <span>Total</span>
                    <span className="text-[#C9A96E]">{formatUGX(cart.total)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700 vv-body flex gap-2">
                <MessageCircle size={13} className="shrink-0 mt-0.5 text-[#25D366]"/>
                <p>"Confirm Order" opens WhatsApp with your order pre-filled. Our team confirms and arranges delivery.</p>
              </div>
            </div>
          )}

          {/* SUCCESS */}
          {step==='success' && (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4"><CheckCircle size={40} className="text-green-500"/></div>
              <h3 className="vv-display text-2xl text-[#1a1a1a] mb-2">Order Sent! 🎉</h3>
              <p className="text-gray-500 text-sm vv-body mb-4">Sent to our WhatsApp team. We'll confirm shortly.</p>
              <div className="bg-[#faf6ef] rounded-xl p-3 border border-[#f0ebe0] mb-6 w-full">
                <p className="text-xs text-gray-400 vv-body mb-1">Your Order Reference</p>
                <p className="vv-display text-lg text-[#C9A96E] font-medium">{successId}</p>
                <p className="text-xs text-gray-400 vv-body mt-1">Save this to track your order</p>
              </div>
              <button onClick={onClose} className="bg-[#1a1a1a] text-white px-8 py-3 rounded-full text-sm vv-body hover:bg-[#333] transition-colors">Continue Shopping</button>
            </div>
          )}
        </div>

        {step==='cart' && cart.items.length>0 && (
          <div className="p-4 border-t border-gray-100 bg-white">
            <div className="flex justify-between items-center mb-3">
              <span className="vv-body text-gray-600 text-sm">Subtotal</span>
              <span className="vv-display text-xl text-[#1a1a1a]">{formatUGX(cart.total)}</span>
            </div>
            <button onClick={()=>setStep('checkout')}
              className="w-full py-3.5 bg-gradient-to-r from-[#C9A96E] to-[#A8824A] text-white font-semibold rounded-xl hover:shadow-lg transition-all text-sm vv-body hover:-translate-y-0.5">
              Proceed to Checkout →
            </button>
          </div>
        )}

        {step==='checkout' && (
          <div className="p-4 border-t border-gray-100 bg-white">
            <button onClick={handleOrder}
              className="w-full py-3.5 bg-[#25D366] text-white font-semibold rounded-xl hover:bg-[#1da851] transition-all text-sm vv-body flex items-center justify-center gap-2 hover:-translate-y-0.5 hover:shadow-lg">
              <MessageCircle size={18}/> Confirm Order via WhatsApp
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ─── REVIEWS ─────────────────────────────────────────────────────
function ReviewSection() {
  const [form, setForm] = useState({name:'',rating:5,message:''});
  const [hover, setHover] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const { data:stats } = useQuery({ queryKey:['vv-fb-stats'], queryFn:()=>feedback.publicStats().then(r=>r.data).catch(()=>null) });
  const { data:revData, refetch } = useQuery({ queryKey:['vv-fb-list'], queryFn:()=>feedback.publicList().then(r=>r.data).catch(()=>({feedback:[]})) });
  const reviews = revData?.feedback||[];

  const submit = async (e) => {
    e.preventDefault(); if(!form.message.trim()) return;
    setLoading(true);
    try { await feedback.publicCreate(form); setSubmitted(true); refetch(); } catch { setSubmitted(true); }
    finally { setLoading(false); }
  };

  return (
    <div className="bg-[#faf6ef] border-t border-[#f0ebe0] py-16">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-10">
          <p className="text-[#C9A96E] text-[11px] tracking-widest uppercase vv-body mb-2">Customer Reviews</p>
          <h2 className="vv-display text-4xl text-[#1a1a1a] mb-2">What Our Clients Say</h2>
          {stats && (
            <div className="flex items-center justify-center gap-2 mt-3">
              <div className="flex gap-0.5">{[...Array(5)].map((_,i)=><Star key={i} size={17} className={i<Math.round(stats.average||0)?'fill-[#C9A96E] text-[#C9A96E]':'text-gray-300'}/>)}</div>
              <span className="text-gray-600 text-sm vv-body">{stats.average?.toFixed(1)} avg · {stats.total||0} reviews</span>
            </div>
          )}
        </div>

        {stats?.breakdown && stats.total>0 && (
          <div className="max-w-xs mx-auto mb-10 space-y-1.5">
            {stats.breakdown.map(b=>(
              <div key={b.rating} className="flex items-center gap-2">
                <span className="text-xs vv-body text-gray-500 w-3">{b.rating}</span>
                <Star size={10} className="text-[#C9A96E] fill-[#C9A96E] shrink-0"/>
                <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                  <div className="bg-[#C9A96E] h-1.5 rounded-full" style={{width:`${stats.total>0?(b.count/stats.total)*100:0}%`}}/>
                </div>
                <span className="text-xs text-gray-400 vv-body w-4">{b.count}</span>
              </div>
            ))}
          </div>
        )}

        {reviews.length>0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
            {reviews.slice(0,6).map((r,i)=>(
              <div key={i} className="bg-white rounded-2xl p-5 border border-[#f0ebe0] hover:shadow-md transition-shadow">
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_,j)=><Star key={j} size={12} className={j<r.rating?'fill-[#C9A96E] text-[#C9A96E]':'text-gray-200'}/>)}
                  <span className="text-xs text-gray-400 vv-body ml-auto">{r.createdAt?new Date(r.createdAt).toLocaleDateString('en-UG',{month:'short',day:'numeric',year:'numeric'}):''}</span>
                </div>
                <p className="text-gray-700 text-sm vv-body leading-relaxed mb-3 vv-clamp3">"{r.message}"</p>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#C9A96E] to-[#A8824A] flex items-center justify-center text-white text-xs font-bold">
                    {(r.customerName||'C')[0].toUpperCase()}
                  </div>
                  <p className="vv-body font-medium text-xs text-[#1a1a1a]">{r.customerName||'Customer'}</p>
                  <BadgeCheck size={13} className="text-[#C9A96E] ml-auto"/>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-2xl p-6 border border-[#f0ebe0] shadow-sm">
            {submitted ? (
              <div className="text-center py-6">
                <CheckCircle size={44} className="text-green-500 mx-auto mb-3"/>
                <p className="vv-display text-xl text-[#1a1a1a] mb-1">Thank you! 🙏</p>
                <p className="text-gray-400 text-sm vv-body">Your review means the world to us.</p>
              </div>
            ) : (
              <>
                <h3 className="vv-display text-xl text-[#1a1a1a] mb-4">Leave a Review</h3>
                <form onSubmit={submit} className="space-y-4">
                  <input className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm vv-body focus:outline-none focus:border-[#C9A96E]"
                    placeholder="Your name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
                  <div>
                    <p className="text-xs text-gray-500 vv-body mb-2">Your Rating</p>
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(s=>(
                        <button key={s} type="button" onMouseEnter={()=>setHover(s)} onMouseLeave={()=>setHover(0)} onClick={()=>setForm({...form,rating:s})}>
                          <Star size={27} className={`transition-all ${s<=(hover||form.rating)?'fill-[#C9A96E] text-[#C9A96E] scale-110':'text-gray-300'}`}/>
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm vv-body focus:outline-none focus:border-[#C9A96E] resize-none"
                    placeholder="Share your experience..." rows={3} required value={form.message}
                    onChange={e=>setForm({...form,message:e.target.value})}/>
                  <button type="submit" disabled={loading}
                    className="w-full py-3 bg-gradient-to-r from-[#C9A96E] to-[#A8824A] text-white font-semibold rounded-xl text-sm vv-body hover:shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-60 flex items-center justify-center gap-2">
                    {loading?<Loader2 size={15} className="animate-spin"/>:<><Send size={14}/> Submit Review</>}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── BRAND STORY ─────────────────────────────────────────────────
function BrandStory() {
  return (
    <div className="bg-[#1a1a1a] text-white py-16 overflow-hidden relative">
      <div className="absolute right-0 top-0 w-72 h-72 bg-[#C9A96E]/10 rounded-full blur-[80px]"/>
      <div className="max-w-7xl mx-auto px-4 relative">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-[#C9A96E] text-[11px] tracking-widest uppercase vv-body mb-3">Our Story</p>
            <h2 className="vv-display text-4xl text-white leading-snug mb-5">Born in Kampala,<br/><em className="text-[#C9A96E] not-italic">Made for the World</em></h2>
            <p className="text-gray-400 vv-body leading-relaxed mb-5">Villa Vogue Fashions was born from a passion for celebrating the modern African woman — her confidence, her grace, her power. Every piece in our collection is curated to complement her journey.</p>
            <p className="text-gray-400 vv-body leading-relaxed mb-8">From the vibrant streets of Kampala to upcountry Uganda, we bring premium fashion to your doorstep with dedication to quality and style.</p>
            <div className="flex gap-3 flex-wrap">
              <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 bg-[#25D366] text-white px-5 py-2.5 rounded-full text-sm vv-body font-medium hover:bg-[#1da851] transition-colors">
                <MessageCircle size={14}/> WhatsApp Us
              </a>
              <a href="mailto:villavoguef@gmail.com"
                className="flex items-center gap-2 border border-white/20 text-white px-5 py-2.5 rounded-full text-sm vv-body font-medium hover:bg-white/10 transition-colors">
                <Mail size={14}/> Email Us
              </a>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              {icon:<Award size={22}/>, title:'Premium Quality', text:'Every piece carefully selected for quality and style'},
              {icon:<Truck size={22}/>, title:'Fast Delivery', text:'Same day Kampala delivery, nationwide coverage'},
              {icon:<MessageCircle size={22}/>, title:'Personal Service', text:'Direct WhatsApp ordering — real people, real help'},
              {icon:<ShieldCheck size={22}/>, title:'100% Authentic', text:'We guarantee authenticity on every item we sell'},
            ].map(v=>(
              <div key={v.title} className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-colors">
                <div className="text-[#C9A96E] mb-2">{v.icon}</div>
                <p className="vv-display text-white text-sm mb-1">{v.title}</p>
                <p className="text-gray-500 text-xs vv-body leading-relaxed">{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── FOOTER ──────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-[#111] text-gray-400">
      <div className="max-w-7xl mx-auto px-4 py-14">
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C9A96E] to-[#8B6914] flex items-center justify-center">
                <span className="text-white vv-display font-bold text-sm">VV</span>
              </div>
              <span className="vv-display text-white text-lg">Villa Vogue</span>
            </div>
            <p className="text-sm vv-body leading-relaxed mb-4">Premium fashion for the modern African woman. Where style meets culture.</p>
            <div className="flex gap-3">
              {[{href:'https://instagram.com',icon:<Instagram size={14}/>},{href:'https://facebook.com',icon:<Facebook size={14}/>},{href:`https://wa.me/${WHATSAPP}`,icon:<MessageCircle size={14}/>}].map((s,i)=>(
                <a key={i} href={s.href} target="_blank" rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-[#C9A96E] transition-colors">{s.icon}</a>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-white vv-body font-semibold text-xs uppercase tracking-wider mb-4">Shop</h4>
            {['New Arrivals','Dresses','Bags','Shoes','Accessories','Outerwear'].map(l=>(
              <Link key={l} to={l==='New Arrivals'?'/store':`/store?cat=${l}`} className="block text-sm vv-body hover:text-[#C9A96E] transition-colors mb-2">{l}</Link>
            ))}
          </div>
          <div>
            <h4 className="text-white vv-body font-semibold text-xs uppercase tracking-wider mb-4">Info</h4>
            {['How to Order','Delivery Info','Returns Policy','Size Guide','About Us'].map(l=>(
              <p key={l} className="text-sm vv-body mb-2 cursor-pointer hover:text-[#C9A96E] transition-colors">{l}</p>
            ))}
          </div>
          <div>
            <h4 className="text-white vv-body font-semibold text-xs uppercase tracking-wider mb-4">Contact</h4>
            <div className="space-y-3">
              {[
                {icon:<MapPin size={12}/>, text:'Kampala, Uganda', href:'https://maps.google.com/?q=Kampala,Uganda'},
                {icon:<Phone size={12}/>, text:'+256 782 860372', href:'tel:+256782860372'},
                {icon:<Phone size={12}/>, text:'+256 745 903189', href:'tel:+256745903189'},
                {icon:<Mail size={12}/>, text:'villavoguef@gmail.com', href:'mailto:villavoguef@gmail.com'},
              ].map((c,i)=>(
                <a key={i} href={c.href} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm vv-body hover:text-[#C9A96E] transition-colors">
                  <span className="text-[#C9A96E]">{c.icon}</span>{c.text}
                </a>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs vv-body">
          <p>© {new Date().getFullYear()} Villa Vogue Fashions · All rights reserved</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {['MTN MoMo','Airtel Money','Visa/MC','Cash on Delivery'].map(p=>(
              <span key={p} className="bg-gray-800 rounded-lg px-2.5 py-1">{p}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── LAYOUT ──────────────────────────────────────────────────────
function Layout({ children, cart, wishlist, onCartOpen }) {
  return (
    <div className="min-h-screen bg-white vv-body">
      <AnnouncBar />
      <Navbar cart={cart} wishlist={wishlist} onCartOpen={onCartOpen} />
      <main>{children}</main>
      <Footer />
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────
export default function CustomerPortal() {
  const cart = useCart();
  const wishlist = useWishlist();
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <>
      <FontLoader />
      <Routes>
        <Route path="*" element={
          <Layout cart={cart} wishlist={wishlist} onCartOpen={()=>setCartOpen(true)}>
            <Routes>
              <Route index element={<StoreHome cart={cart} wishlist={wishlist} />} />
              <Route path="product/:productId" element={<ProductDetail cart={cart} wishlist={wishlist} />} />
              <Route path="wishlist" element={<WishlistPage cart={cart} wishlist={wishlist} />} />
            </Routes>
          </Layout>
        } />
      </Routes>
      <CartDrawer cart={cart} open={cartOpen} onClose={()=>setCartOpen(false)} />
    </>
  );
}
