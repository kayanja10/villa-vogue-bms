import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from 'framer-motion';
import {
  ShoppingBag, Search, Star, Heart, Sparkles, Package, X, Plus, Minus,
  Trash2, MessageCircle, ArrowLeft, CheckCircle, Send, Phone, Mail,
  MapPin, Instagram, Facebook, Truck, ShieldCheck, RefreshCw,
  ZoomIn, ChevronRight, AlertCircle, Loader2, BadgeCheck, Award,
  LogIn, ArrowUpRight, Eye
} from 'lucide-react';
import { products as productApi, feedback, orders } from '../lib/api';

// ─── CONSTANTS ────────────────────────────────────────────────────
const WHATSAPP = '256782860372';
const CATEGORIES = ['All','Dresses','Tops','Trousers','Skirts','Suits','Accessories','Shoes','Bags','Outerwear'];
const PAYMENT_METHODS = ['MTN Mobile Money','Airtel Money','Cash on Delivery','Visa / Mastercard'];
const formatUGX = (n) => `UGX ${Number(n || 0).toLocaleString()}`;
const genOrderId = () => `VV-${Date.now().toString(36).toUpperCase()}`;

// ─── ANIMATION VARIANTS ───────────────────────────────────────────
const fadeUp = { hidden:{opacity:0,y:24}, show:{opacity:1,y:0,transition:{duration:0.5,ease:[0.22,1,0.36,1]}} };
const fadeIn  = { hidden:{opacity:0}, show:{opacity:1,transition:{duration:0.4}} };
const stagger = { show:{ transition:{ staggerChildren:0.07 } } };
const scaleIn = { hidden:{opacity:0,scale:0.94}, show:{opacity:1,scale:1,transition:{duration:0.45,ease:[0.22,1,0.36,1]}} };
const slideRight = { hidden:{opacity:0,x:-20}, show:{opacity:1,x:0,transition:{duration:0.4,ease:[0.22,1,0.36,1]}} };

// ─── FONT + STYLE LOADER ──────────────────────────────────────────
function FontLoader() {
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    const s = document.createElement('style');
    s.textContent = `
      *{box-sizing:border-box;}
      .vv-display{font-family:'Cormorant Garamond',Georgia,serif;}
      .vv-body{font-family:'DM Sans',system-ui,sans-serif;}
      .vv-scroll::-webkit-scrollbar{display:none;}
      .vv-scroll{-ms-overflow-style:none;scrollbar-width:none;}
      .vv-clamp2{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
      .vv-clamp3{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}
      .glass{background:rgba(255,255,255,0.08);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);}
      .glass-light{background:rgba(255,255,255,0.7);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);}
      .gold-glow{box-shadow:0 0 30px rgba(201,169,110,0.25),0 0 60px rgba(201,169,110,0.1);}
      .card-shadow{box-shadow:0 4px 6px -1px rgba(0,0,0,0.04),0 20px 40px -8px rgba(0,0,0,0.08),0 0 0 1px rgba(0,0,0,0.04);}
      .card-shadow-hover{box-shadow:0 8px 12px -2px rgba(0,0,0,0.08),0 32px 64px -12px rgba(0,0,0,0.14),0 0 0 1px rgba(0,0,0,0.04);}
      .text-gradient{background:linear-gradient(135deg,#C9A96E 0%,#F5D89A 50%,#A8824A 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
      .border-gradient{border:1px solid;border-image:linear-gradient(135deg,rgba(201,169,110,0.5),rgba(168,130,74,0.2)) 1;}
      .shimmer{background:linear-gradient(90deg,#f0ebe0 25%,#faf6ef 50%,#f0ebe0 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;}
      @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
      @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
      @keyframes pulse-gold{0%,100%{box-shadow:0 0 0 0 rgba(201,169,110,0.5)}60%{box-shadow:0 0 0 8px rgba(201,169,110,0)}}
      .vv-pulse{animation:pulse-gold 2s infinite;}
      .noise{background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");background-repeat:repeat;}
    `;
    document.head.appendChild(s);
  }, []);
  return null;
}

// ─── HOOKS ────────────────────────────────────────────────────────
function useCart() {
  const [items, setItems] = useState(() => { try { return JSON.parse(localStorage.getItem('vv_cart4')||'[]'); } catch { return []; } });
  useEffect(() => { localStorage.setItem('vv_cart4', JSON.stringify(items)); }, [items]);
  const add = (p,qty=1) => setItems(prev=>{ const ex=prev.find(i=>i.id===p.id); if(ex) return prev.map(i=>i.id===p.id?{...i,qty:i.qty+qty}:i); return [...prev,{...p,qty}]; });
  const remove = (id) => setItems(prev=>prev.filter(i=>i.id!==id));
  const update = (id,qty) => { if(qty<=0) return remove(id); setItems(prev=>prev.map(i=>i.id===id?{...i,qty}:i)); };
  const clear = () => setItems([]);
  const total = items.reduce((s,i)=>s+i.price*i.qty,0);
  const count = items.reduce((s,i)=>s+i.qty,0);
  return { items,add,remove,update,clear,total,count };
}

function useWishlist() {
  const [ids, setIds] = useState(() => { try { return JSON.parse(localStorage.getItem('vv_wish2')||'[]'); } catch { return []; } });
  useEffect(() => { localStorage.setItem('vv_wish2', JSON.stringify(ids)); }, [ids]);
  const toggle = (id) => setIds(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);
  const has = (id) => ids.includes(id);
  return { ids,toggle,has,count:ids.length };
}

function buildWA(items,total,info={},orderId='') {
  const lines = items.map(i=>`• ${i.qty}× ${i.name} — ${formatUGX(i.price*i.qty)}`).join('\n');
  return encodeURIComponent(`🛍️ *New Order — Villa Vogue*\nRef: *${orderId}*\n\n${lines}\n\n*Total: ${formatUGX(total)}*\n\n👤 ${info.name||'—'}\n📞 ${info.phone||'—'}\n📍 ${info.address||'—'}\n💳 ${info.payment||'—'}\n\nPlease confirm and arrange delivery. Thank you! 🙏`);
}

// ─── SKELETON ─────────────────────────────────────────────────────
const Skel = ({c}) => <div className={`shimmer rounded-2xl ${c}`}/>;

// ─── ANNOUNCEMENT BAR ─────────────────────────────────────────────
function AnnouncBar() {
  const msgs = [
    '🚚 Free delivery in Kampala on orders above UGX 200,000',
    '✨ New arrivals — Dresses, Suits & Accessories now in stock',
    '📞 WhatsApp: +256 782 860372  |  +256 745 903189',
    '💳 MTN MoMo · Airtel Money · Cash on Delivery',
  ];
  const [i,setI] = useState(0);
  useEffect(() => { const t=setInterval(()=>setI(x=>(x+1)%msgs.length),4000); return ()=>clearInterval(t); },[]);
  return (
    <div className="bg-[#111] border-b border-[#C9A96E]/10 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
        <AnimatePresence mode="wait">
          <motion.p key={i} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:0.35}}
            className="text-[#C9A96E]/80 text-xs vv-body tracking-widest flex-1 text-center">{msgs[i]}</motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── NAVBAR ───────────────────────────────────────────────────────
function Navbar({ cart, wishlist, onCartOpen }) {
  const [search,setSearch] = useState('');
  const [mSearch,setMSearch] = useState(false);
  const [scrolled,setScrolled] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY>10);
    window.addEventListener('scroll',fn);
    return () => window.removeEventListener('scroll',fn);
  },[]);

  const go = (e) => { e.preventDefault(); if(search.trim()){navigate(`/store?search=${encodeURIComponent(search.trim())}`);setMSearch(false);} };

  return (
    <motion.header
      className={`sticky top-0 z-40 border-b transition-all duration-500 ${scrolled?'border-[#f0ebe0] bg-white/90':'border-transparent bg-white/70'} backdrop-blur-xl`}
      style={{boxShadow: scrolled?'0 4px 30px rgba(0,0,0,0.06)':'none'}}
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/store" className="flex items-center gap-3 shrink-0 group">
            <motion.div whileHover={{scale:1.05,rotate:-2}} transition={{type:'spring',stiffness:400}}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C9A96E] via-[#D4AF72] to-[#8B6914] flex items-center justify-center shadow-lg overflow-hidden">
              <img src="/logo.png" alt="VV" className="w-full h-full object-cover"
                onError={e=>{e.target.style.display='none';e.target.parentElement.innerHTML='<span style="color:white;font-weight:700;font-size:14px;font-family:Georgia,serif">VV</span>';}}/>
            </motion.div>
            <div className="hidden sm:block">
              <p className="vv-display font-semibold text-[#1a1a1a] text-xl leading-none tracking-wide">Villa Vogue</p>
              <p className="text-[9px] text-[#C9A96E] tracking-[0.3em] uppercase vv-body mt-0.5">Fashions</p>
            </div>
          </Link>

          {/* Desktop search */}
          <form onSubmit={go} className="relative flex-1 max-w-sm hidden md:block">
            <motion.div whileFocus={{scale:1.01}} className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 z-10"/>
              <input
                className="w-full pl-9 pr-4 py-2.5 text-sm rounded-full border border-gray-200 bg-gray-50/80 focus:outline-none focus:border-[#C9A96E] focus:bg-white focus:shadow-[0_0_0_3px_rgba(201,169,110,0.12)] transition-all vv-body"
                placeholder="Search dresses, bags, shoes..."
                value={search} onChange={e=>setSearch(e.target.value)}/>
            </motion.div>
          </form>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <motion.button whileTap={{scale:0.9}} onClick={()=>setMSearch(!mSearch)}
              className="md:hidden p-2.5 hover:bg-gray-100 rounded-full transition-colors">
              <Search size={19} className="text-gray-700"/>
            </motion.button>

            <Link to="/store/wishlist" className="relative p-2.5 hover:bg-gray-100 rounded-full transition-colors hidden sm:flex">
              <motion.div whileHover={{scale:1.1}} whileTap={{scale:0.9}}>
                <Heart size={19} className={wishlist.count>0?'text-red-500 fill-red-500':'text-gray-700'}/>
              </motion.div>
              <AnimatePresence>
                {wishlist.count>0&&<motion.span key="wc" initial={{scale:0}} animate={{scale:1}} exit={{scale:0}}
                  className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{wishlist.count}</motion.span>}
              </AnimatePresence>
            </Link>

            <motion.a whileHover={{scale:1.03}} whileTap={{scale:0.97}}
              href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 text-xs font-medium bg-[#25D366] text-white px-3.5 py-2 rounded-full hover:bg-[#1da851] transition-colors vv-body shadow-sm">
              <MessageCircle size={13}/> Chat
            </motion.a>

            <motion.button whileTap={{scale:0.9}} onClick={onCartOpen}
              className="relative p-2.5 hover:bg-gray-100 rounded-full transition-colors">
              <ShoppingBag size={19} className="text-gray-700"/>
              <AnimatePresence>
                {cart.count>0&&<motion.span key="cc" initial={{scale:0}} animate={{scale:1}} exit={{scale:0}}
                  className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-[#C9A96E] text-white text-[10px] font-bold rounded-full flex items-center justify-center vv-pulse">
                  {cart.count>9?'9+':cart.count}
                </motion.span>}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>

        {/* Mobile search */}
        <AnimatePresence>
          {mSearch&&<motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}}
            className="overflow-hidden pb-3 md:hidden">
            <form onSubmit={go} className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input autoFocus className="w-full pl-9 pr-4 py-2.5 text-sm rounded-full border border-gray-200 bg-gray-50 focus:outline-none focus:border-[#C9A96E] vv-body"
                placeholder="Search products..." value={search} onChange={e=>setSearch(e.target.value)}/>
            </form>
          </motion.div>}
        </AnimatePresence>

        {/* Category strip */}
        <div className="border-t border-gray-100/80 flex gap-1 overflow-x-auto py-2 vv-scroll">
          {CATEGORIES.map(cat=>{
            const active = searchParams.get('cat')===cat||(cat==='All'&&!searchParams.get('cat'));
            return (
              <Link key={cat} to={cat==='All'?'/store':`/store?cat=${cat}`}>
                <motion.span whileHover={{scale:1.04}} whileTap={{scale:0.97}}
                  className={`shrink-0 inline-block text-xs font-medium px-3.5 py-1.5 rounded-full transition-all whitespace-nowrap vv-body cursor-pointer ${active?'bg-[#1a1a1a] text-white shadow-sm':'text-gray-600 hover:bg-gray-100'}`}>
                  {cat}
                </motion.span>
              </Link>
            );
          })}
        </div>
      </div>
    </motion.header>
  );
}

// ─── PRODUCT CARD ─────────────────────────────────────────────────
function ProductCard({ product, onAdd, wishlist }) {
  const [imgIdx,setImgIdx] = useState(0);
  const [added,setAdded] = useState(false);
  const [hovered,setHovered] = useState(false);
  const imgs = (() => { try { return JSON.parse(product.images||'[]'); } catch { return []; } })();
  const isLow = product.stock>0&&product.stock<=3;
  const isOut = product.stock===0;

  const handleAdd = (e) => { e.preventDefault(); e.stopPropagation(); onAdd(product); setAdded(true); setTimeout(()=>setAdded(false),1800); };

  return (
    <motion.div variants={fadeUp} onHoverStart={()=>setHovered(true)} onHoverEnd={()=>setHovered(false)}>
      <Link to={`/store/product/${product.id}`} className="block">
        <motion.div
          animate={{ y: hovered?-6:0, boxShadow: hovered?'0 20px 60px rgba(0,0,0,0.12), 0 8px 20px rgba(0,0,0,0.08)':'0 2px 8px rgba(0,0,0,0.04)' }}
          transition={{ type:'spring', stiffness:300, damping:25 }}
          className="relative bg-[#f5f0e8] rounded-2xl overflow-hidden aspect-[3/4] mb-3">

          {imgs[0] ? (
            <motion.img src={imgs[imgIdx]} alt={product.name}
              animate={{ scale: hovered?1.06:1 }}
              transition={{ duration:0.6, ease:[0.22,1,0.36,1] }}
              className={`w-full h-full object-cover ${isOut?'opacity-50 grayscale':''}`}/>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#f5f0e8] to-[#e8d5b0]">
              <span className="text-5xl opacity-20">👗</span>
            </div>
          )}

          {/* Glass hover overlay */}
          <AnimatePresence>
            {hovered&&!isOut&&<motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"/>}
          </AnimatePresence>

          {/* Image dots */}
          {imgs.length>1&&!isOut&&(
            <div className="absolute bottom-14 left-0 right-0 flex justify-center gap-1.5 z-10">
              {imgs.slice(0,4).map((_,i)=>(
                <button key={i}
                  onMouseEnter={e=>{e.preventDefault();setImgIdx(i);}}
                  onClick={e=>{e.preventDefault();setImgIdx(i);}}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${i===imgIdx?'bg-white scale-125':'bg-white/50'}`}/>
              ))}
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
            {product.isFeatured&&(
              <motion.span initial={{scale:0}} animate={{scale:1}}
                className="bg-gradient-to-r from-[#C9A96E] to-[#A8824A] text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 vv-body shadow-lg">
                <Sparkles size={8}/> Featured
              </motion.span>
            )}
            {isLow&&<span className="bg-orange-500 text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full vv-body shadow-lg">Only {product.stock} left!</span>}
          </div>

          {/* Wishlist */}
          <motion.button
            whileHover={{scale:1.15}} whileTap={{scale:0.9}}
            onClick={e=>{e.preventDefault();wishlist.toggle(product.id);}}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-md flex items-center justify-center z-10">
            <Heart size={14} className={wishlist.has(product.id)?'fill-red-500 text-red-500':'text-gray-400'}/>
          </motion.button>

          {/* Out of stock */}
          {isOut&&(
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-10">
              <span className="glass-light text-gray-800 text-xs font-semibold px-4 py-1.5 rounded-full vv-body tracking-wide">Out of Stock</span>
            </div>
          )}

          {/* Add to cart */}
          {!isOut&&(
            <AnimatePresence>
              {hovered&&(
                <motion.button
                  initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:4}}
                  transition={{duration:0.2}}
                  onClick={handleAdd}
                  className={`absolute bottom-3 left-3 right-3 py-2.5 rounded-xl text-xs font-semibold z-20 vv-body transition-colors ${added?'bg-green-500 text-white':'bg-white text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white'}`}>
                  {added?'✓ Added!':'+ Add to Cart'}
                </motion.button>
              )}
            </AnimatePresence>
          )}
        </motion.div>

        <div className="px-0.5">
          <p className="text-[10px] text-[#C9A96E] font-medium tracking-wider uppercase vv-body mb-0.5">{product.category?.name}</p>
          <p className="vv-display text-[#1a1a1a] text-[17px] leading-snug mb-1 vv-clamp2">{product.name}</p>
          <p className="vv-body font-semibold text-[#1a1a1a] text-sm">{formatUGX(product.price)}</p>
        </div>
      </Link>
    </motion.div>
  );
}

// ─── HERO ─────────────────────────────────────────────────────────
function Hero() {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY,[0,400],[0,80]);
  const opacity = useTransform(scrollY,[0,300],[1,0]);

  return (
    <div className="relative bg-[#0f0f0f] overflow-hidden min-h-[92vh] flex items-center">
      {/* Layered background */}
      <div className="absolute inset-0 noise opacity-30"/>
      <motion.div style={{y}} className="absolute inset-0">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#C9A96E]/12 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3"/>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#C9A96E]/8 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4"/>
        <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-[#8B6914]/10 rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2"/>
      </motion.div>

      {/* Grid texture */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{backgroundImage:'linear-gradient(#C9A96E 1px,transparent 1px),linear-gradient(90deg,#C9A96E 1px,transparent 1px)',backgroundSize:'60px 60px'}}/>

      <motion.div style={{opacity}} className="relative max-w-7xl mx-auto px-4 py-24 w-full">
        <motion.div variants={stagger} initial="hidden" animate="show" className="max-w-2xl">

          <motion.div variants={fadeUp}
            className="inline-flex items-center gap-2 glass border border-[#C9A96E]/25 rounded-full px-4 py-1.5 mb-8">
            <motion.div animate={{rotate:[0,360]}} transition={{duration:8,repeat:Infinity,ease:'linear'}}>
              <Sparkles size={11} className="text-[#C9A96E]"/>
            </motion.div>
            <span className="text-[#C9A96E]/90 text-[11px] tracking-widest uppercase vv-body">New Collection 2025</span>
          </motion.div>

          <motion.h1 variants={fadeUp}
            className="vv-display text-white text-[56px] sm:text-[80px] font-light leading-[0.97] mb-6 tracking-tight">
            Where Fashion<br/>
            <em className="not-italic font-medium text-gradient">Finds a Home</em>
          </motion.h1>

          <motion.p variants={fadeUp} className="text-gray-400 text-lg vv-body leading-relaxed mb-10 max-w-md">
            Premium fashion for the modern African woman. Curated pieces delivered across Uganda.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3">
            <Link to="/store?cat=Dresses">
              <motion.span whileHover={{scale:1.03,y:-2}} whileTap={{scale:0.97}}
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#C9A96E] to-[#A8824A] text-white px-8 py-4 rounded-full font-semibold text-sm vv-body shadow-xl shadow-[#C9A96E]/20 cursor-pointer">
                Shop New Arrivals <ArrowUpRight size={15}/>
              </motion.span>
            </Link>
            <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer">
              <motion.span whileHover={{scale:1.03,y:-2}} whileTap={{scale:0.97}}
                className="inline-flex items-center justify-center gap-2 glass border border-white/15 text-white px-8 py-4 rounded-full font-semibold text-sm vv-body cursor-pointer hover:border-white/30 transition-colors">
                <MessageCircle size={15} className="text-[#25D366]"/> Chat on WhatsApp
              </motion.span>
            </a>
          </motion.div>

          {/* Stats */}
          <motion.div variants={fadeUp} className="flex gap-10 mt-14 pt-10 border-t border-white/8">
            {[['500+','Products'],['2,000+','Happy Customers'],['Same Day','Kampala Delivery']].map(([v,l],i)=>(
              <motion.div key={l} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.6+i*0.1}}>
                <p className="vv-display text-[#C9A96E] text-3xl font-medium">{v}</p>
                <p className="text-gray-600 text-xs vv-body mt-0.5 tracking-wide">{l}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Category pills */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-white/8 glass">
        <div className="max-w-7xl mx-auto px-4 py-4 flex gap-2.5 overflow-x-auto vv-scroll">
          {[['👗','Dresses'],['👜','Bags'],['👠','Shoes'],['💍','Accessories'],['🧥','Outerwear'],['👔','Suits'],['🧣','Scarves']].map(([e,c])=>(
            <Link key={c} to={`/store?cat=${c}`}>
              <motion.span whileHover={{scale:1.05,y:-2}} whileTap={{scale:0.95}}
                className="shrink-0 inline-flex items-center gap-2 glass border border-white/10 hover:border-[#C9A96E]/40 rounded-xl px-4 py-2.5 transition-all cursor-pointer group">
                <span className="text-base">{e}</span>
                <span className="text-white/80 text-xs vv-body whitespace-nowrap group-hover:text-[#C9A96E] transition-colors">{c}</span>
              </motion.span>
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
    <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} transition={{delay:0.3}}
      className="bg-[#faf6ef] border-y border-[#f0ebe0]">
      <div className="max-w-7xl mx-auto px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {icon:<Truck size={15}/>, text:'Free Delivery UGX 200K+'},
          {icon:<ShieldCheck size={15}/>, text:'100% Authentic'},
          {icon:<Phone size={15}/>, text:'MTN & Airtel MoMo'},
          {icon:<RefreshCw size={15}/>, text:'7-Day Easy Returns'},
        ].map(t=>(
          <motion.div key={t.text} whileHover={{scale:1.02}}
            className="flex items-center justify-center gap-2 text-xs text-gray-600 vv-body font-medium">
            <span className="text-[#C9A96E]">{t.icon}</span>{t.text}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── STORE HOME ───────────────────────────────────────────────────
function StoreHome({ cart, wishlist }) {
  const [searchParams] = useSearchParams();
  const [page,setPage] = useState(1);
  const [sort,setSort] = useState('featured');
  const cat = searchParams.get('cat')||'';
  const search = searchParams.get('search')||'';
  const isHome = !cat&&!search&&page===1;

  useEffect(()=>{setPage(1);if(!isHome)window.scrollTo({top:0,behavior:'smooth'});},[cat,search]);

  const {data,isLoading} = useQuery({
    queryKey:['vv-products',cat,search,page,sort],
    queryFn:()=>productApi.listPublic({category:cat,search,page,limit:24,sort}).then(r=>r.data),
    keepPreviousData:true,
  });
  const products = data?.products||[];

  return (
    <div>
      {isHome&&<Hero/>}
      {isHome&&<TrustBar/>}

      <div className="max-w-7xl mx-auto px-4 py-12">
        <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:0.4}}
          className="flex items-end justify-between mb-10 flex-wrap gap-4">
          <div>
            <h2 className="vv-display text-4xl text-[#1a1a1a] tracking-tight">
              {cat||search?(cat||`"${search}"`):isHome?'Our Collection':'All Products'}
            </h2>
            <p className="text-gray-400 text-sm vv-body mt-1">{data?.total||0} pieces available</p>
          </div>
          <motion.select whileFocus={{scale:1.01}} value={sort} onChange={e=>setSort(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#C9A96E] focus:shadow-[0_0_0_3px_rgba(201,169,110,0.1)] bg-white vv-body text-gray-700 transition-all">
            <option value="featured">Featured</option>
            <option value="price_asc">Price: Low → High</option>
            <option value="price_desc">Price: High → Low</option>
            <option value="newest">Newest First</option>
          </motion.select>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {[...Array(8)].map((_,i)=>(
              <div key={i}><Skel c="aspect-[3/4] mb-3"/><Skel c="h-3 w-1/2 mb-2"/><Skel c="h-5 w-3/4 mb-2"/><Skel c="h-4 w-1/3"/></div>
            ))}
          </div>
        ) : products.length>0 ? (
          <motion.div variants={stagger} initial="hidden" animate="show"
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {products.map(p=><ProductCard key={p.id} product={p} onAdd={cart.add} wishlist={wishlist}/>)}
          </motion.div>
        ) : (
          <motion.div variants={scaleIn} initial="hidden" animate="show" className="text-center py-24">
            <div className="w-20 h-20 bg-[#faf6ef] rounded-full flex items-center justify-center mx-auto mb-4">
              <Package size={32} className="text-[#C9A96E]"/>
            </div>
            <p className="vv-display text-3xl text-gray-600 mb-2">No products found</p>
            <p className="text-gray-400 text-sm vv-body mb-6">Try a different category or search</p>
            <Link to="/store">
              <motion.span whileHover={{scale:1.03}} whileTap={{scale:0.97}}
                className="inline-flex items-center gap-2 bg-[#1a1a1a] text-white px-6 py-3 rounded-full text-sm vv-body cursor-pointer">
                View All Products
              </motion.span>
            </Link>
          </motion.div>
        )}

        {data?.pages>1&&(
          <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.3}}
            className="flex justify-center items-center gap-2 mt-14">
            <motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}} disabled={page===1} onClick={()=>setPage(p=>p-1)}
              className="px-5 py-2.5 border border-gray-200 rounded-full text-sm vv-body hover:border-[#C9A96E] transition-colors disabled:opacity-40">← Prev</motion.button>
            {[...Array(Math.min(data.pages,7))].map((_,i)=>(
              <motion.button key={i} whileHover={{scale:1.05}} whileTap={{scale:0.95}} onClick={()=>setPage(i+1)}
                className={`w-9 h-9 rounded-full text-sm vv-body transition-all ${page===i+1?'bg-[#1a1a1a] text-white':'hover:bg-gray-100 text-gray-600'}`}>{i+1}</motion.button>
            ))}
            <motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}} disabled={page===data.pages} onClick={()=>setPage(p=>p+1)}
              className="px-5 py-2.5 bg-[#C9A96E] text-white rounded-full text-sm vv-body hover:bg-[#A8824A] transition-colors disabled:opacity-40">Next →</motion.button>
          </motion.div>
        )}
      </div>

      {isHome&&<ReviewSection/>}
      {isHome&&<BrandStory/>}
    </div>
  );
}

// ─── PRODUCT DETAIL ───────────────────────────────────────────────
function ProductDetail({ cart, wishlist }) {
  const {productId} = useParams();
  const navigate = useNavigate();
  const [imgIdx,setImgIdx] = useState(0);
  const [qty,setQty] = useState(1);
  const [added,setAdded] = useState(false);
  const [zoomed,setZoomed] = useState(false);
  const [tab,setTab] = useState('description');

  const {data:allData,isLoading} = useQuery({
    queryKey:['vv-products-all'],
    queryFn:()=>productApi.listPublic({limit:200}).then(r=>r.data),
  });

  const product = allData?.products?.find(p=>p.id===parseInt(productId));
  const related = allData?.products?.filter(p=>p.id!==parseInt(productId)&&p.category?.name===product?.category?.name).slice(0,4)||[];
  const imgs = (() => { try { return JSON.parse(product?.images||'[]'); } catch { return []; } })();
  const tags = (() => { try { return JSON.parse(product?.tags||'[]'); } catch { return []; } })();

  const handleAdd = () => { cart.add(product,qty); setAdded(true); setTimeout(()=>setAdded(false),2000); };
  const handleWA = () => { window.open(`https://wa.me/${WHATSAPP}?text=${buildWA([{...product,qty}],product.price*qty,{},genOrderId())}`,'_blank'); };

  if(isLoading) return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="grid md:grid-cols-2 gap-12"><Skel c="aspect-square"/><div className="space-y-4">{[...Array(5)].map((_,i)=><Skel key={i} c="h-6 w-3/4"/>)}</div></div>
    </div>
  );

  if(!product) return (
    <motion.div variants={scaleIn} initial="hidden" animate="show" className="max-w-7xl mx-auto px-4 py-24 text-center">
      <Package size={56} className="text-gray-200 mx-auto mb-4"/>
      <p className="vv-display text-2xl text-gray-500 mb-3">Product not found</p>
      <Link to="/store" className="text-[#C9A96E] text-sm vv-body hover:underline">← Back to store</Link>
    </motion.div>
  );

  return (
    <motion.div variants={fadeIn} initial="hidden" animate="show" className="max-w-7xl mx-auto px-4 py-8 vv-body">
      <nav className="flex items-center gap-2 text-xs text-gray-400 mb-8">
        <Link to="/store" className="hover:text-[#C9A96E] transition-colors">Store</Link>
        <ChevronRight size={11}/>
        {product.category?.name&&<><Link to={`/store?cat=${product.category.name}`} className="hover:text-[#C9A96E] transition-colors">{product.category.name}</Link><ChevronRight size={11}/></>}
        <span className="text-gray-600 truncate max-w-[200px]">{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-10 lg:gap-16">
        {/* Images */}
        <motion.div variants={slideRight} initial="hidden" animate="show">
          <motion.div
            whileHover={{scale:1.01}}
            className="relative aspect-square bg-[#f5f0e8] rounded-3xl overflow-hidden mb-4 cursor-zoom-in group card-shadow"
            onClick={()=>imgs[imgIdx]&&setZoomed(true)}>
            {imgs[imgIdx]
              ? <motion.img src={imgs[imgIdx]} alt={product.name}
                  whileHover={{scale:1.05}} transition={{duration:0.5,ease:[0.22,1,0.36,1]}}
                  className="w-full h-full object-cover"/>
              : <div className="w-full h-full flex items-center justify-center text-8xl opacity-20">👗</div>}
            <div className="absolute bottom-4 right-4 glass-light p-2.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
              <ZoomIn size={15} className="text-gray-700"/>
            </div>
            <motion.button whileHover={{scale:1.1}} whileTap={{scale:0.9}}
              onClick={e=>{e.stopPropagation();wishlist.toggle(product.id);}}
              className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg">
              <Heart size={17} className={wishlist.has(product.id)?'fill-red-500 text-red-500':'text-gray-400'}/>
            </motion.button>
          </motion.div>

          {imgs.length>1&&(
            <div className="flex gap-2.5 vv-scroll overflow-x-auto">
              {imgs.map((img,i)=>(
                <motion.button key={i} whileHover={{scale:1.05}} whileTap={{scale:0.95}}
                  onClick={()=>setImgIdx(i)}
                  className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${i===imgIdx?'border-[#C9A96E] shadow-md shadow-[#C9A96E]/20':'border-transparent opacity-60 hover:opacity-100'}`}>
                  <img src={img} alt="" className="w-full h-full object-cover"/>
                </motion.button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Info */}
        <motion.div variants={fadeUp} initial="hidden" animate="show">
          <p className="text-[#C9A96E] text-[11px] tracking-[0.2em] uppercase mb-2">{product.category?.name}</p>
          <h1 className="vv-display text-4xl sm:text-5xl text-[#1a1a1a] leading-tight mb-4 tracking-tight">{product.name}</h1>

          <div className="flex items-center gap-4 mb-6">
            <span className="vv-display text-4xl font-medium text-[#1a1a1a]">{formatUGX(product.price)}</span>
            <motion.span initial={{scale:0.8}} animate={{scale:1}}
              className={`text-xs font-medium px-3 py-1.5 rounded-full ${product.stock>0?'bg-green-100 text-green-700':'bg-red-100 text-red-600'}`}>
              {product.stock>0?(product.stock>10?'In Stock':`Only ${product.stock} left`):'Out of Stock'}
            </motion.span>
          </div>

          {tags.length>0&&(
            <div className="flex flex-wrap gap-2 mb-6">
              {tags.map(t=>(
                <motion.span key={t} whileHover={{scale:1.03}}
                  className="text-xs bg-[#faf6ef] text-[#A8824A] border border-[#f0ebe0] px-3 py-1 rounded-full cursor-default">{t}</motion.span>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-5 flex gap-6">
            {['description','delivery','returns'].map(t=>(
              <button key={t} onClick={()=>setTab(t)}
                className={`pb-3 text-sm capitalize transition-all relative ${tab===t?'text-[#1a1a1a] font-medium':'text-gray-400 hover:text-gray-600'}`}>
                {t}
                {tab===t&&<motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C9A96E] rounded-full"/>}
              </button>
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-4}} transition={{duration:0.2}}
              className="text-sm text-gray-600 leading-relaxed mb-6 min-h-[56px]">
              {tab==='description'&&(product.description||'Premium quality fashion piece from Villa Vogue Fashions. Crafted with attention to detail for the modern African woman.')}
              {tab==='delivery'&&'📍 Kampala: Same day or next day delivery. 🚌 Upcountry: 2–5 business days. Free delivery on orders above UGX 200,000 within Kampala.'}
              {tab==='returns'&&'Returns accepted within 7 days of delivery for unworn items in original condition. Contact us on WhatsApp. Exchange or store credit offered.'}
            </motion.div>
          </AnimatePresence>

          {product.stock>0?(
            <>
              <div className="flex items-center gap-3 mb-5">
                <span className="text-sm text-gray-500">Qty:</span>
                <div className="flex items-center bg-gray-100 rounded-full px-1 py-1 gap-1">
                  <motion.button whileTap={{scale:0.85}} onClick={()=>setQty(q=>Math.max(1,q-1))}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white transition-colors"><Minus size={13}/></motion.button>
                  <span className="w-8 text-center font-semibold text-sm">{qty}</span>
                  <motion.button whileTap={{scale:0.85}} onClick={()=>setQty(q=>Math.min(product.stock,q+1))}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white transition-colors"><Plus size={13}/></motion.button>
                </div>
                <span className="text-xs text-gray-400">{product.stock} available</span>
              </div>
              <div className="flex flex-col gap-3">
                <motion.button whileHover={{scale:1.02,y:-1}} whileTap={{scale:0.98}} onClick={handleAdd}
                  className={`w-full py-4 rounded-xl font-semibold text-sm transition-all shadow-lg ${added?'bg-green-500 text-white shadow-green-500/20':'bg-[#1a1a1a] text-white hover:shadow-black/20'}`}>
                  {added?'✓ Added to Cart!':`Add to Cart — ${formatUGX(product.price*qty)}`}
                </motion.button>
                <motion.button whileHover={{scale:1.02,y:-1}} whileTap={{scale:0.98}} onClick={handleWA}
                  className="w-full py-4 bg-[#25D366] text-white rounded-xl font-semibold text-sm hover:bg-[#1da851] transition-all shadow-lg shadow-green-500/20 flex items-center justify-center gap-2">
                  <MessageCircle size={17}/> Order via WhatsApp
                </motion.button>
              </div>
            </>
          ):(
            <a href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Hi! I'm interested in "${product.name}" — is it back in stock?`)}`}
              target="_blank" rel="noopener noreferrer">
              <motion.span whileHover={{scale:1.02}} whileTap={{scale:0.98}}
                className="block w-full py-4 bg-[#25D366] text-white rounded-xl font-semibold text-sm text-center cursor-pointer">
                <MessageCircle size={16} className="inline mr-2"/>Ask About Restock
              </motion.span>
            </a>
          )}

          <div className="grid grid-cols-3 gap-2.5 mt-5">
            {[{icon:<Truck size={14}/>,text:'Free delivery 200K+'},{icon:<RefreshCw size={14}/>,text:'7-day returns'},{icon:<ShieldCheck size={14}/>,text:'100% Authentic'}].map(b=>(
              <motion.div key={b.text} whileHover={{scale:1.03,y:-2}}
                className="bg-[#fafaf8] border border-gray-100 rounded-2xl p-3 text-center cursor-default transition-shadow hover:shadow-md">
                <div className="text-[#C9A96E] flex justify-center mb-1.5">{b.icon}</div>
                <p className="text-[10px] text-gray-500 leading-tight">{b.text}</p>
              </motion.div>
            ))}
          </div>

          <div className="mt-4 p-3.5 bg-[#faf6ef] rounded-2xl border border-[#f0ebe0]">
            <p className="text-xs text-gray-500 font-medium mb-2">Accepted Payments</p>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map(m=><span key={m} className="text-[10px] bg-white border border-gray-200 text-gray-600 px-2.5 py-1 rounded-lg">{m}</span>)}
            </div>
          </div>
        </motion.div>
      </div>

      {related.length>0&&(
        <motion.div initial={{opacity:0,y:24}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:0.5}} className="mt-20">
          <h2 className="vv-display text-3xl text-[#1a1a1a] mb-8">You May Also Like</h2>
          <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {related.map(p=><ProductCard key={p.id} product={p} onAdd={cart.add} wishlist={wishlist}/>)}
          </motion.div>
        </motion.div>
      )}

      <AnimatePresence>
        {zoomed&&imgs[imgIdx]&&(
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
            onClick={()=>setZoomed(false)}>
            <motion.button initial={{opacity:0,scale:0.8}} animate={{opacity:1,scale:1}}
              className="absolute top-5 right-5 text-white/60 hover:text-white"><X size={28}/></motion.button>
            <motion.img src={imgs[imgIdx]} alt={product.name}
              initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} transition={{type:'spring',stiffness:250,damping:25}}
              className="max-w-full max-h-full object-contain rounded-2xl"/>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── WISHLIST PAGE ────────────────────────────────────────────────
function WishlistPage({ cart, wishlist }) {
  const {data} = useQuery({queryKey:['vv-products-all'],queryFn:()=>productApi.listPublic({limit:200}).then(r=>r.data)});
  const products = (data?.products||[]).filter(p=>wishlist.has(p.id));
  return (
    <motion.div variants={fadeIn} initial="hidden" animate="show" className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="vv-display text-4xl text-[#1a1a1a] mb-2 tracking-tight">My Wishlist</h1>
      <p className="text-gray-400 text-sm vv-body mb-10">{products.length} saved item{products.length!==1?'s':''}</p>
      {products.length===0?(
        <motion.div variants={scaleIn} initial="hidden" animate="show" className="text-center py-24">
          <Heart size={52} className="text-gray-200 mx-auto mb-4"/>
          <p className="vv-display text-3xl text-gray-500 mb-3">Your wishlist is empty</p>
          <Link to="/store">
            <motion.span whileHover={{scale:1.03}} className="inline-flex items-center gap-2 bg-[#1a1a1a] text-white px-6 py-3 rounded-full text-sm vv-body mt-2 cursor-pointer">Explore Collection</motion.span>
          </Link>
        </motion.div>
      ):(
        <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {products.map(p=><ProductCard key={p.id} product={p} onAdd={cart.add} wishlist={wishlist}/>)}
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── CART DRAWER ─────────────────────────────────────────────────
function CartDrawer({ cart, open, onClose }) {
  const [step,setStep] = useState('cart');
  const [form,setForm] = useState({name:'',phone:'',address:'',payment:'MTN Mobile Money'});
  const [errors,setErrors] = useState({});
  const [orderId] = useState(genOrderId);
  const [successId,setSuccessId] = useState('');

  useEffect(()=>{if(!open) setTimeout(()=>{setStep('cart');setErrors({});},350);},[open]);

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
        customerName:form.name,customerPhone:form.phone,deliveryAddress:form.address,
        paymentMethod:form.payment,items:cart.items.map(i=>({productId:i.id,name:i.name,qty:i.qty,price:i.price})),
        total:cart.total,orderRef:orderId,source:'portal',
      });
    } catch {}
    window.open(`https://wa.me/${WHATSAPP}?text=${buildWA(cart.items,cart.total,form,orderId)}`,'_blank');
    cart.clear(); setSuccessId(orderId); setStep('success');
  };

  const FInput = ({k,label,placeholder,type='text'}) => (
    <div>
      <label className="text-xs text-gray-500 vv-body font-medium mb-1.5 block">{label}</label>
      <input type={type} placeholder={placeholder}
        className={`w-full px-3.5 py-3 rounded-xl border text-sm vv-body focus:outline-none focus:border-[#C9A96E] focus:shadow-[0_0_0_3px_rgba(201,169,110,0.1)] bg-white transition-all ${errors[k]?'border-red-400 bg-red-50/50':'border-gray-200'}`}
        value={form[k]} onChange={e=>{setForm({...form,[k]:e.target.value});setErrors({...errors,[k]:''});}}/>
      <AnimatePresence>
        {errors[k]&&<motion.p initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
          className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={11}/>{errors[k]}</motion.p>}
      </AnimatePresence>
    </div>
  );

  return (
    <AnimatePresence>
      {open&&(
        <>
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose}/>
          <motion.div initial={{x:'100%'}} animate={{x:0}} exit={{x:'100%'}} transition={{type:'spring',stiffness:300,damping:35}}
            className="fixed right-0 top-0 h-full w-full max-w-[420px] bg-white z-50 shadow-2xl flex flex-col">

            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              {step==='checkout'&&<motion.button whileTap={{scale:0.9}} onClick={()=>setStep('cart')} className="p-1.5 hover:bg-gray-100 rounded-lg mr-2 text-gray-500"><ArrowLeft size={17}/></motion.button>}
              <div className="flex items-center gap-2 flex-1">
                <ShoppingBag size={18} className="text-[#C9A96E]"/>
                <h2 className="vv-display text-xl text-[#1a1a1a]">
                  {step==='cart'?`Cart (${cart.count})`:step==='checkout'?'Checkout':'Order Confirmed!'}
                </h2>
              </div>
              <motion.button whileTap={{scale:0.9}} onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400"><X size={18}/></motion.button>
            </div>

            {(step==='cart'||step==='checkout')&&(
              <div className="flex gap-2 px-5 py-2.5 bg-[#fafaf8] border-b border-gray-100">
                {['cart','checkout'].map((s,i)=>(
                  <div key={s} className="flex items-center gap-1.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${step===s||(s==='cart'&&step==='checkout')?'bg-[#C9A96E] text-white':'bg-gray-200 text-gray-400'}`}>{i+1}</div>
                    <span className={`text-xs capitalize vv-body ${step===s?'text-[#1a1a1a] font-medium':'text-gray-400'}`}>{s}</span>
                    {i===0&&<ChevronRight size={11} className="text-gray-300"/>}
                  </div>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                {step==='cart'&&(
                  <motion.div key="cart" initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} exit={{opacity:0,x:10}}>
                    {cart.items.length===0?(
                      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8">
                        <motion.div animate={{y:[0,-8,0]}} transition={{duration:3,repeat:Infinity,ease:'easeInOut'}}
                          className="w-20 h-20 bg-[#faf6ef] rounded-full flex items-center justify-center mb-4">
                          <ShoppingBag size={32} className="text-[#C9A96E]"/>
                        </motion.div>
                        <p className="vv-display text-2xl text-gray-700 mb-2">Your cart is empty</p>
                        <p className="text-gray-400 text-sm vv-body mb-6">Add some beautiful pieces to get started</p>
                        <motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}} onClick={onClose}
                          className="bg-[#1a1a1a] text-white px-6 py-2.5 rounded-full text-sm vv-body">Continue Shopping</motion.button>
                      </div>
                    ):(
                      <div className="p-4 space-y-3">
                        {cart.total>=200000&&(
                          <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}}
                            className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2 text-green-700 text-xs vv-body">
                            <Truck size={13}/><span><strong>Free delivery</strong> applies!</span>
                          </motion.div>
                        )}
                        {cart.items.map((item,idx)=>{
                          const imgs=(()=>{try{return JSON.parse(item.images||'[]');}catch{return[];}})();
                          return (
                            <motion.div key={item.id} layout initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,x:-20}} transition={{delay:idx*0.05}}
                              className="flex gap-3 bg-gray-50 rounded-2xl p-3 group">
                              <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#f5f0e8] shrink-0">
                                {imgs[0]?<img src={imgs[0]} alt={item.name} className="w-full h-full object-cover"/>:<div className="w-full h-full flex items-center justify-center text-2xl">👗</div>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="vv-body font-medium text-sm text-[#1a1a1a] truncate">{item.name}</p>
                                <p className="text-[#C9A96E] font-semibold text-sm vv-body">{formatUGX(item.price)}</p>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <motion.button whileTap={{scale:0.85}} onClick={()=>cart.update(item.id,item.qty-1)} className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-200"><Minus size={10}/></motion.button>
                                  <span className="text-sm font-semibold w-5 text-center vv-body">{item.qty}</span>
                                  <motion.button whileTap={{scale:0.85}} onClick={()=>cart.update(item.id,item.qty+1)} className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-200"><Plus size={10}/></motion.button>
                                  <motion.button whileTap={{scale:0.85}} onClick={()=>cart.remove(item.id)} className="ml-auto text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={14}/></motion.button>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}

                {step==='checkout'&&(
                  <motion.div key="checkout" initial={{opacity:0,x:10}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-10}} className="p-4 space-y-4">
                    <div className="bg-[#faf6ef] rounded-2xl p-4 border border-[#f0ebe0]">
                      <h3 className="vv-display text-lg text-[#1a1a1a] mb-4">Your Details</h3>
                      <div className="space-y-3">
                        <FInput k="name" label="Full Name *" placeholder="e.g. Aisha Nakato"/>
                        <FInput k="phone" label="Phone Number *" placeholder="e.g. 0782 860372" type="tel"/>
                        <FInput k="address" label="Delivery Address *" placeholder="Area / street in Kampala"/>
                        <div>
                          <label className="text-xs text-gray-500 vv-body font-medium mb-1.5 block">Payment Method</label>
                          <select className="w-full px-3.5 py-3 rounded-xl border border-gray-200 text-sm vv-body focus:outline-none focus:border-[#C9A96E] focus:shadow-[0_0_0_3px_rgba(201,169,110,0.1)] bg-white transition-all"
                            value={form.payment} onChange={e=>setForm({...form,payment:e.target.value})}>
                            {PAYMENT_METHODS.map(m=><option key={m}>{m}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-100 p-4">
                      <h3 className="vv-display text-lg text-[#1a1a1a] mb-3">Order Summary</h3>
                      <div className="space-y-1.5 mb-3">
                        {cart.items.map(item=>(
                          <div key={item.id} className="flex justify-between text-sm text-gray-600 vv-body">
                            <span>{item.qty}× {item.name}</span><span className="font-medium">{formatUGX(item.price*item.qty)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-gray-100 pt-3 space-y-1">
                        <div className="flex justify-between text-sm vv-body text-gray-500">
                          <span>Delivery</span>
                          <span className={cart.total>=200000?'text-green-600 font-medium':''}>{cart.total>=200000?'FREE':'To be confirmed'}</span>
                        </div>
                        <div className="flex justify-between vv-body font-bold text-lg text-[#1a1a1a]">
                          <span>Total</span><span className="text-[#C9A96E]">{formatUGX(cart.total)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700 vv-body flex gap-2">
                      <MessageCircle size={13} className="shrink-0 mt-0.5 text-[#25D366]"/>
                      <p>Opens WhatsApp with your order pre-filled. Our team confirms and arranges delivery.</p>
                    </div>
                  </motion.div>
                )}

                {step==='success'&&(
                  <motion.div key="success" initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}}
                    className="flex flex-col items-center justify-center h-[70vh] text-center p-8">
                    <motion.div animate={{scale:[1,1.1,1]}} transition={{duration:0.5,delay:0.1}}
                      className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-5">
                      <CheckCircle size={40} className="text-green-500"/>
                    </motion.div>
                    <h3 className="vv-display text-3xl text-[#1a1a1a] mb-2">Order Sent! 🎉</h3>
                    <p className="text-gray-500 text-sm vv-body mb-5">Sent to our WhatsApp team. We'll confirm shortly.</p>
                    <div className="bg-[#faf6ef] rounded-2xl p-4 border border-[#f0ebe0] mb-6 w-full">
                      <p className="text-xs text-gray-400 vv-body mb-1">Your Order Reference</p>
                      <p className="vv-display text-2xl text-[#C9A96E] font-medium">{successId}</p>
                      <p className="text-xs text-gray-400 vv-body mt-1">Save this to track your order</p>
                    </div>
                    <motion.button whileHover={{scale:1.03}} whileTap={{scale:0.97}} onClick={onClose}
                      className="bg-[#1a1a1a] text-white px-8 py-3.5 rounded-full text-sm vv-body">Continue Shopping</motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {step==='cart'&&cart.items.length>0&&(
              <motion.div initial={{y:20,opacity:0}} animate={{y:0,opacity:1}} className="p-4 border-t border-gray-100 bg-white">
                <div className="flex justify-between items-center mb-3">
                  <span className="vv-body text-gray-500 text-sm">Subtotal</span>
                  <span className="vv-display text-2xl text-[#1a1a1a]">{formatUGX(cart.total)}</span>
                </div>
                <motion.button whileHover={{scale:1.02,y:-1}} whileTap={{scale:0.98}} onClick={()=>setStep('checkout')}
                  className="w-full py-4 bg-gradient-to-r from-[#C9A96E] to-[#A8824A] text-white font-semibold rounded-xl text-sm vv-body shadow-lg shadow-[#C9A96E]/20">
                  Proceed to Checkout →
                </motion.button>
              </motion.div>
            )}

            {step==='checkout'&&(
              <div className="p-4 border-t border-gray-100 bg-white">
                <motion.button whileHover={{scale:1.02,y:-1}} whileTap={{scale:0.98}} onClick={handleOrder}
                  className="w-full py-4 bg-[#25D366] text-white font-semibold rounded-xl text-sm vv-body shadow-lg shadow-green-500/20 flex items-center justify-center gap-2">
                  <MessageCircle size={18}/> Confirm Order via WhatsApp
                </motion.button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── REVIEWS ─────────────────────────────────────────────────────
function ReviewSection() {
  const [form,setForm] = useState({name:'',rating:5,message:''});
  const [hover,setHover] = useState(0);
  const [submitted,setSubmitted] = useState(false);
  const [loading,setLoading] = useState(false);

  const {data:stats} = useQuery({queryKey:['vv-fb-stats'],queryFn:()=>feedback.publicStats().then(r=>r.data).catch(()=>null)});
  const {data:revData,refetch} = useQuery({queryKey:['vv-fb-list'],queryFn:()=>feedback.publicList().then(r=>r.data).catch(()=>({feedback:[]}))});
  const reviews = revData?.feedback||[];

  const submit = async (e) => {
    e.preventDefault(); if(!form.message.trim()) return;
    setLoading(true);
    try { await feedback.publicCreate(form); setSubmitted(true); refetch(); } catch { setSubmitted(true); }
    finally { setLoading(false); }
  };

  return (
    <div className="bg-[#faf6ef] border-t border-[#f0ebe0] py-20">
      <div className="max-w-7xl mx-auto px-4">
        <motion.div initial={{opacity:0,y:24}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:0.5}} className="text-center mb-12">
          <p className="text-[#C9A96E] text-[11px] tracking-[0.25em] uppercase vv-body mb-3">Customer Reviews</p>
          <h2 className="vv-display text-5xl text-[#1a1a1a] mb-3">What Our Clients Say</h2>
          {stats&&(
            <div className="flex items-center justify-center gap-2 mt-4">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_,i)=><Star key={i} size={18} className={i<Math.round(stats.average||0)?'fill-[#C9A96E] text-[#C9A96E]':'text-gray-300'}/>)}
              </div>
              <span className="text-gray-600 text-sm vv-body">{stats.average?.toFixed(1)} avg · {stats.total||0} reviews</span>
            </div>
          )}
        </motion.div>

        {stats?.breakdown&&stats.total>0&&(
          <motion.div initial={{opacity:0}} whileInView={{opacity:1}} viewport={{once:true}} className="max-w-xs mx-auto mb-12 space-y-2">
            {stats.breakdown.map(b=>(
              <div key={b.rating} className="flex items-center gap-2">
                <span className="text-xs vv-body text-gray-500 w-3">{b.rating}</span>
                <Star size={10} className="text-[#C9A96E] fill-[#C9A96E] shrink-0"/>
                <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                  <motion.div className="bg-gradient-to-r from-[#C9A96E] to-[#A8824A] h-1.5 rounded-full"
                    initial={{width:0}} whileInView={{width:`${stats.total>0?(b.count/stats.total)*100:0}%`}}
                    viewport={{once:true}} transition={{duration:0.8,delay:0.2}}/>
                </div>
                <span className="text-xs text-gray-400 vv-body w-4">{b.count}</span>
              </div>
            ))}
          </motion.div>
        )}

        {reviews.length>0&&(
          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{once:true}} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-14">
            {reviews.slice(0,6).map((r,i)=>(
              <motion.div key={i} variants={fadeUp}
                whileHover={{y:-4,boxShadow:'0 12px 40px rgba(0,0,0,0.1)'}}
                className="bg-white rounded-2xl p-5 border border-[#f0ebe0] transition-shadow">
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_,j)=><Star key={j} size={13} className={j<r.rating?'fill-[#C9A96E] text-[#C9A96E]':'text-gray-200'}/>)}
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
              </motion.div>
            ))}
          </motion.div>
        )}

        <motion.div initial={{opacity:0,y:24}} whileInView={{opacity:1,y:0}} viewport={{once:true}} className="max-w-lg mx-auto">
          <div className="bg-white rounded-3xl p-7 border border-[#f0ebe0] card-shadow">
            <AnimatePresence mode="wait">
              {submitted?(
                <motion.div key="done" initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} className="text-center py-8">
                  <motion.div animate={{scale:[1,1.15,1]}} transition={{duration:0.5}}>
                    <CheckCircle size={48} className="text-green-500 mx-auto mb-4"/>
                  </motion.div>
                  <p className="vv-display text-2xl text-[#1a1a1a] mb-1">Thank you! 🙏</p>
                  <p className="text-gray-400 text-sm vv-body">Your review means the world to us.</p>
                </motion.div>
              ):(
                <motion.div key="form" initial={{opacity:0}} animate={{opacity:1}}>
                  <h3 className="vv-display text-2xl text-[#1a1a1a] mb-5">Leave a Review</h3>
                  <form onSubmit={submit} className="space-y-4">
                    <input className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm vv-body focus:outline-none focus:border-[#C9A96E] focus:shadow-[0_0_0_3px_rgba(201,169,110,0.1)] transition-all"
                      placeholder="Your name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
                    <div>
                      <p className="text-xs text-gray-500 vv-body mb-2">Your Rating</p>
                      <div className="flex gap-1.5">
                        {[1,2,3,4,5].map(s=>(
                          <motion.button key={s} type="button" whileHover={{scale:1.2}} whileTap={{scale:0.9}}
                            onMouseEnter={()=>setHover(s)} onMouseLeave={()=>setHover(0)} onClick={()=>setForm({...form,rating:s})}>
                            <Star size={28} className={`transition-all ${s<=(hover||form.rating)?'fill-[#C9A96E] text-[#C9A96E]':'text-gray-300'}`}/>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                    <textarea className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm vv-body focus:outline-none focus:border-[#C9A96E] focus:shadow-[0_0_0_3px_rgba(201,169,110,0.1)] resize-none transition-all"
                      placeholder="Share your experience..." rows={3} required value={form.message}
                      onChange={e=>setForm({...form,message:e.target.value})}/>
                    <motion.button type="submit" disabled={loading} whileHover={{scale:1.02,y:-1}} whileTap={{scale:0.98}}
                      className="w-full py-3.5 bg-gradient-to-r from-[#C9A96E] to-[#A8824A] text-white font-semibold rounded-xl text-sm vv-body shadow-lg shadow-[#C9A96E]/20 disabled:opacity-60 flex items-center justify-center gap-2">
                      {loading?<Loader2 size={15} className="animate-spin"/>:<><Send size={14}/> Submit Review</>}
                    </motion.button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ─── BRAND STORY ─────────────────────────────────────────────────
function BrandStory() {
  return (
    <div className="bg-[#0f0f0f] text-white py-20 overflow-hidden relative">
      <div className="absolute right-0 top-0 w-80 h-80 bg-[#C9A96E]/10 rounded-full blur-[100px]"/>
      <div className="absolute left-0 bottom-0 w-60 h-60 bg-[#C9A96E]/6 rounded-full blur-[80px]"/>
      <div className="noise absolute inset-0 opacity-20"/>
      <div className="max-w-7xl mx-auto px-4 relative">
        <div className="grid md:grid-cols-2 gap-14 items-center">
          <motion.div initial={{opacity:0,x:-30}} whileInView={{opacity:1,x:0}} viewport={{once:true}} transition={{duration:0.6}}>
            <p className="text-[#C9A96E] text-[11px] tracking-[0.25em] uppercase vv-body mb-4">Our Story</p>
            <h2 className="vv-display text-5xl text-white leading-snug mb-6">Born in Kampala,<br/><em className="text-gradient not-italic">Made for the World</em></h2>
            <p className="text-gray-400 vv-body leading-relaxed mb-5 text-[15px]">Villa Vogue Fashions was born from a passion for celebrating the modern African woman — her confidence, her grace, her power.</p>
            <p className="text-gray-500 vv-body leading-relaxed mb-10 text-[15px]">From the vibrant streets of Kampala to upcountry Uganda, we bring premium fashion to your doorstep.</p>
            <div className="flex gap-3 flex-wrap">
              <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer">
                <motion.span whileHover={{scale:1.05,y:-2}} className="inline-flex items-center gap-2 bg-[#25D366] text-white px-5 py-3 rounded-full text-sm vv-body font-medium cursor-pointer shadow-lg shadow-green-900/30">
                  <MessageCircle size={14}/> WhatsApp Us
                </motion.span>
              </a>
              <a href="mailto:villavoguef@gmail.com">
                <motion.span whileHover={{scale:1.05,y:-2}} className="inline-flex items-center gap-2 glass border border-white/15 text-white px-5 py-3 rounded-full text-sm vv-body font-medium cursor-pointer hover:border-white/30 transition-colors">
                  <Mail size={14}/> Email Us
                </motion.span>
              </a>
            </div>
          </motion.div>

          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{once:true}} className="grid grid-cols-2 gap-4">
            {[
              {icon:<Award size={22}/>,title:'Premium Quality',text:'Every piece carefully selected for quality and style'},
              {icon:<Truck size={22}/>,title:'Fast Delivery',text:'Same day Kampala, nationwide coverage'},
              {icon:<MessageCircle size={22}/>,title:'Personal Service',text:'WhatsApp ordering — real people, real help'},
              {icon:<ShieldCheck size={22}/>,title:'100% Authentic',text:'We guarantee authenticity on every item'},
            ].map(v=>(
              <motion.div key={v.title} variants={scaleIn}
                whileHover={{scale:1.03,y:-3}}
                className="glass border border-white/8 hover:border-[#C9A96E]/30 rounded-2xl p-5 transition-all cursor-default">
                <div className="text-[#C9A96E] mb-3">{v.icon}</div>
                <p className="vv-display text-white text-base mb-1">{v.title}</p>
                <p className="text-gray-500 text-xs vv-body leading-relaxed">{v.text}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// ─── FOOTER ──────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-[#0a0a0a] text-gray-500 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-10 mb-14">
          <div>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C9A96E] to-[#8B6914] flex items-center justify-center shadow-lg">
                <span className="text-white vv-display font-bold text-sm">VV</span>
              </div>
              <span className="vv-display text-white text-xl tracking-wide">Villa Vogue</span>
            </div>
            <p className="text-sm vv-body leading-relaxed mb-5">Premium fashion for the modern African woman. Where style meets culture.</p>
            <div className="flex gap-2.5">
              {[{href:'https://instagram.com',icon:<Instagram size={14}/>},{href:'https://facebook.com',icon:<Facebook size={14}/>},{href:`https://wa.me/${WHATSAPP}`,icon:<MessageCircle size={14}/>}].map((s,i)=>(
                <motion.a key={i} whileHover={{scale:1.1,y:-2}} href={s.href} target="_blank" rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#C9A96E] hover:border-[#C9A96E] transition-all">{s.icon}</motion.a>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-white vv-body font-semibold text-xs uppercase tracking-widest mb-5">Shop</h4>
            {['New Arrivals','Dresses','Bags','Shoes','Accessories','Outerwear'].map(l=>(
              <Link key={l} to={l==='New Arrivals'?'/store':`/store?cat=${l}`}>
                <motion.span whileHover={{x:3,color:'#C9A96E'}} className="block text-sm vv-body transition-colors mb-2.5 cursor-pointer">{l}</motion.span>
              </Link>
            ))}
          </div>
          <div>
            <h4 className="text-white vv-body font-semibold text-xs uppercase tracking-widest mb-5">Info</h4>
            {['How to Order','Delivery Info','Returns Policy','Size Guide','About Us'].map(l=>(
              <motion.p key={l} whileHover={{x:3,color:'#C9A96E'}} className="text-sm vv-body mb-2.5 cursor-pointer transition-colors">{l}</motion.p>
            ))}
          </div>
          <div>
            <h4 className="text-white vv-body font-semibold text-xs uppercase tracking-widest mb-5">Contact</h4>
            <div className="space-y-3.5">
              {[
                {icon:<MapPin size={12}/>,text:'Kampala, Uganda',href:'https://maps.google.com/?q=Kampala,Uganda'},
                {icon:<Phone size={12}/>,text:'+256 782 860372',href:'tel:+256782860372'},
                {icon:<Phone size={12}/>,text:'+256 745 903189',href:'tel:+256745903189'},
                {icon:<Mail size={12}/>,text:'villavoguef@gmail.com',href:'mailto:villavoguef@gmail.com'},
              ].map((c,i)=>(
                <motion.a key={i} whileHover={{x:3,color:'#C9A96E'}} href={c.href} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm vv-body transition-colors">
                  <span className="text-[#C9A96E]">{c.icon}</span>{c.text}
                </motion.a>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-white/5 pt-7 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs vv-body">
          <p>© {new Date().getFullYear()} Villa Vogue Fashions · All rights reserved</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {['MTN MoMo','Airtel Money','Visa/MC','Cash on Delivery'].map(p=>(
              <span key={p} className="bg-white/5 border border-white/8 rounded-lg px-2.5 py-1">{p}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── BACK TO LOGIN BUTTON ─────────────────────────────────────────
function BackToLogin() {
  return (
    <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:0.5}}
      className="fixed bottom-6 left-6 z-30">
      <Link to="/login">
        <motion.span whileHover={{scale:1.05,y:-2}} whileTap={{scale:0.95}}
          className="inline-flex items-center gap-2 glass-light border border-gray-200 text-gray-700 px-4 py-2.5 rounded-full text-xs vv-body font-medium shadow-lg cursor-pointer hover:border-[#C9A96E] hover:text-[#C9A96E] transition-colors">
          <LogIn size={13}/> Staff Login
        </motion.span>
      </Link>
    </motion.div>
  );
}

// ─── LAYOUT ──────────────────────────────────────────────────────
function Layout({ children, cart, wishlist, onCartOpen }) {
  return (
    <div className="min-h-screen bg-white vv-body">
      <AnnouncBar/>
      <Navbar cart={cart} wishlist={wishlist} onCartOpen={onCartOpen}/>
      <main>{children}</main>
      <Footer/>
      <BackToLogin/>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────
export default function CustomerPortal() {
  const cart = useCart();
  const wishlist = useWishlist();
  const [cartOpen,setCartOpen] = useState(false);

  return (
    <>
      <FontLoader/>
      <Routes>
        <Route path="*" element={
          <Layout cart={cart} wishlist={wishlist} onCartOpen={()=>setCartOpen(true)}>
            <Routes>
              <Route index element={<StoreHome cart={cart} wishlist={wishlist}/>}/>
              <Route path="product/:productId" element={<ProductDetail cart={cart} wishlist={wishlist}/>}/>
              <Route path="wishlist" element={<WishlistPage cart={cart} wishlist={wishlist}/>}/>
            </Routes>
          </Layout>
        }/>
      </Routes>
      <CartDrawer cart={cart} open={cartOpen} onClose={()=>setCartOpen(false)}/>
    </>
  );
}
