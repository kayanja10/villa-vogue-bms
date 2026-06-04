import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShoppingBag, Search, Star, Heart, ChevronRight, Sparkles, User, LogOut, Package, X, Menu } from 'lucide-react';
import { products as productApi, customers } from '../../lib/api';

/* ─── GLOBAL STYLES ─────────────────────────────────────────────── */
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300&display=swap');

    :root {
      --gold-light: #D4B483;
      --gold: #C9A96E;
      --gold-deep: #A8824A;
      --gold-dark: #8A6530;
      --ink: #0F0E0C;
      --ink-soft: #1a1a1a;
      --cream: #fdfaf6;
      --cream-dark: #f5f0e8;
      --glass-bg: rgba(253,250,246,0.72);
      --glass-border: rgba(201,169,110,0.18);
      --shadow-gold: 0 8px 32px rgba(201,169,110,0.22), 0 2px 8px rgba(201,169,110,0.12);
      --shadow-deep: 0 24px 64px rgba(15,14,12,0.18), 0 8px 24px rgba(15,14,12,0.10);
      --shadow-card: 0 4px 24px rgba(15,14,12,0.08), 0 1px 4px rgba(15,14,12,0.04);
    }

    *, *::before, *::after { box-sizing: border-box; }

    .font-display { font-family: 'Cormorant Garamond', Georgia, serif; }
    .font-body { font-family: 'DM Sans', sans-serif; }

    /* Glassmorphism */
    .glass {
      background: var(--glass-bg);
      backdrop-filter: blur(20px) saturate(160%);
      -webkit-backdrop-filter: blur(20px) saturate(160%);
      border: 1px solid var(--glass-border);
    }

    .glass-dark {
      background: rgba(15,14,12,0.72);
      backdrop-filter: blur(20px) saturate(160%);
      -webkit-backdrop-filter: blur(20px) saturate(160%);
      border: 1px solid rgba(201,169,110,0.15);
    }

    /* Shimmer loading */
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    .shimmer-card {
      background: linear-gradient(90deg, #ede8e0 25%, #f7f3ed 50%, #ede8e0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.6s ease-in-out infinite;
      border-radius: 16px;
    }

    /* Floating animation */
    @keyframes float {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      33% { transform: translateY(-12px) rotate(1deg); }
      66% { transform: translateY(-6px) rotate(-0.5deg); }
    }
    .float-anim { animation: float 7s ease-in-out infinite; }

    @keyframes float2 {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(-18px) rotate(-1.5deg); }
    }
    .float-anim-2 { animation: float2 9s ease-in-out infinite; }

    /* Gradient text */
    .gradient-text {
      background: linear-gradient(135deg, #D4B483 0%, #C9A96E 40%, #A8824A 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    /* Gold glow button */
    .btn-gold {
      background: linear-gradient(135deg, #D4B483 0%, #C9A96E 50%, #A8824A 100%);
      position: relative;
      overflow: hidden;
      transition: all 0.35s cubic-bezier(0.22,1,0.36,1);
    }
    .btn-gold::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.28) 50%, transparent 70%);
      transform: translateX(-100%);
      transition: transform 0.55s ease;
    }
    .btn-gold:hover::before { transform: translateX(100%); }
    .btn-gold:hover {
      box-shadow: 0 8px 32px rgba(201,169,110,0.45), 0 2px 8px rgba(201,169,110,0.25);
      transform: translateY(-2px);
    }
    .btn-gold:active { transform: translateY(0); }

    /* Outline gold button */
    .btn-outline-gold {
      border: 1.5px solid rgba(201,169,110,0.5);
      color: #C9A96E;
      background: transparent;
      transition: all 0.35s cubic-bezier(0.22,1,0.36,1);
      position: relative;
      overflow: hidden;
    }
    .btn-outline-gold::before {
      content: '';
      position: absolute;
      inset: 0;
      background: rgba(201,169,110,0.08);
      transform: scaleX(0);
      transform-origin: left;
      transition: transform 0.35s ease;
    }
    .btn-outline-gold:hover::before { transform: scaleX(1); }
    .btn-outline-gold:hover {
      border-color: #C9A96E;
      box-shadow: 0 0 0 1px rgba(201,169,110,0.3), inset 0 0 20px rgba(201,169,110,0.06);
    }

    /* Luxury input */
    .luxury-input {
      font-family: 'DM Sans', sans-serif;
      background: rgba(253,250,246,0.6);
      border: 1px solid rgba(201,169,110,0.2);
      border-radius: 10px;
      padding: 13px 16px;
      width: 100%;
      font-size: 14px;
      color: #1a1a1a;
      transition: all 0.3s ease;
      outline: none;
    }
    .luxury-input:focus {
      background: rgba(253,250,246,1);
      border-color: #C9A96E;
      box-shadow: 0 0 0 3px rgba(201,169,110,0.12), 0 2px 8px rgba(201,169,110,0.08);
    }
    .luxury-input::placeholder { color: #aaa; }

    .luxury-label {
      font-family: 'DM Sans', sans-serif;
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #888;
      display: block;
      margin-bottom: 6px;
    }

    /* Product card 3D lift */
    .product-card {
      transition: transform 0.45s cubic-bezier(0.22,1,0.36,1), box-shadow 0.45s cubic-bezier(0.22,1,0.36,1);
      will-change: transform;
    }
    .product-card:hover {
      transform: translateY(-8px) scale(1.01);
      box-shadow: 0 20px 60px rgba(15,14,12,0.14), 0 6px 20px rgba(201,169,110,0.12);
    }

    /* Image parallax on hover */
    .card-image-wrap {
      overflow: hidden;
      border-radius: 16px;
    }
    .card-image {
      transition: transform 0.7s cubic-bezier(0.22,1,0.36,1);
      will-change: transform;
    }
    .product-card:hover .card-image {
      transform: scale(1.08);
    }

    /* Add to cart reveal */
    .cart-reveal {
      transform: translateY(100%);
      opacity: 0;
      transition: transform 0.4s cubic-bezier(0.22,1,0.36,1), opacity 0.3s ease;
    }
    .product-card:hover .cart-reveal {
      transform: translateY(0);
      opacity: 1;
    }

    /* Heart button */
    .wish-btn {
      transition: all 0.3s cubic-bezier(0.22,1,0.36,1);
      opacity: 0;
      transform: scale(0.8);
    }
    .product-card:hover .wish-btn {
      opacity: 1;
      transform: scale(1);
    }

    /* Glass overlay on card hover */
    .card-glass-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(to top, rgba(10,8,5,0.55) 0%, transparent 55%);
      opacity: 0;
      transition: opacity 0.4s ease;
      border-radius: 16px;
    }
    .product-card:hover .card-glass-overlay { opacity: 1; }

    /* Hero gradient animation */
    @keyframes gradientShift {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }
    .hero-gradient {
      background: linear-gradient(-45deg, #0a0805, #1a140a, #0f0d09, #1a1208, #0a0805);
      background-size: 400% 400%;
      animation: gradientShift 16s ease infinite;
    }

    /* Text reveal */
    @keyframes revealUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .reveal-up { animation: revealUp 0.9s cubic-bezier(0.22,1,0.36,1) both; }
    .reveal-delay-1 { animation-delay: 0.15s; }
    .reveal-delay-2 { animation-delay: 0.3s; }
    .reveal-delay-3 { animation-delay: 0.45s; }
    .reveal-delay-4 { animation-delay: 0.6s; }

    /* Scroll bar */
    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-track { background: #f5f0e8; }
    ::-webkit-scrollbar-thumb { background: #C9A96E; border-radius: 10px; }

    /* Navigation gold underline */
    .nav-link {
      position: relative;
      transition: color 0.25s ease;
    }
    .nav-link::after {
      content: '';
      position: absolute;
      bottom: -2px; left: 0; right: 0;
      height: 1.5px;
      background: linear-gradient(90deg, #C9A96E, #D4B483);
      transform: scaleX(0);
      transform-origin: right;
      transition: transform 0.3s cubic-bezier(0.22,1,0.36,1);
    }
    .nav-link:hover::after { transform: scaleX(1); transform-origin: left; }
    .nav-link:hover { color: #A8824A; }

    /* Badge glow */
    .badge-glow {
      box-shadow: 0 0 10px rgba(201,169,110,0.6), 0 0 20px rgba(201,169,110,0.2);
    }

    /* Login card float */
    @keyframes loginFloat {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }
    .login-float { animation: loginFloat 6s ease-in-out infinite; }

    /* Ambient particles */
    @keyframes particleDrift {
      0% { transform: translateY(0) translateX(0) scale(1); opacity: 0; }
      20% { opacity: 0.6; }
      80% { opacity: 0.3; }
      100% { transform: translateY(-120px) translateX(30px) scale(0.5); opacity: 0; }
    }
    .particle {
      position: absolute;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(201,169,110,0.8) 0%, transparent 70%);
      animation: particleDrift linear infinite;
      pointer-events: none;
    }

    /* Sticky nav blur transition */
    .nav-scrolled {
      backdrop-filter: blur(24px) saturate(180%);
      -webkit-backdrop-filter: blur(24px) saturate(180%);
      box-shadow: 0 2px 32px rgba(15,14,12,0.10);
    }

    /* Tab toggle luxury */
    .tab-active {
      background: linear-gradient(135deg, #D4B483 0%, #C9A96E 100%);
      color: white;
      box-shadow: 0 4px 16px rgba(201,169,110,0.3);
    }

    /* Category pill */
    .cat-pill {
      position: relative;
      transition: all 0.25s ease;
    }
    .cat-pill.active {
      color: #A8824A;
    }
    .cat-pill.active::after {
      content: '';
      display: block;
      position: absolute;
      bottom: -4px; left: 0; right: 0;
      height: 2px;
      border-radius: 2px;
      background: linear-gradient(90deg, #C9A96E, #D4B483);
    }

    /* Decorative orb */
    .orb {
      border-radius: 50%;
      filter: blur(60px);
      pointer-events: none;
    }
  `}</style>
);

/* ─── PARTICLES ─────────────────────────────────────────────────── */
function Particles({ count = 12 }) {
  const pts = Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    bottom: `${Math.random() * 40}%`,
    size: 3 + Math.random() * 5,
    duration: 6 + Math.random() * 10,
    delay: Math.random() * 8,
  }));
  return (
    <>
      {pts.map(p => (
        <span key={p.id} className="particle" style={{
          left: p.left, bottom: p.bottom,
          width: p.size, height: p.size,
          animationDuration: `${p.duration}s`,
          animationDelay: `${p.delay}s`,
        }} />
      ))}
    </>
  );
}

/* ─── STORE LAYOUT ───────────────────────────────────────────────── */
function StoreLayout({ children }) {
  const [customerUser, setCustomerUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('vv_customer') || 'null'); } catch { return null; }
  });
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const logout = () => {
    localStorage.removeItem('vv_customer');
    localStorage.removeItem('vv_customer_token');
    setCustomerUser(null);
  };

  const categories = ['All', 'Dresses', 'Tops', 'Trousers', 'Skirts', 'Suits', 'Accessories', 'Shoes', 'Bags', 'Outerwear'];

  return (
    <div className="min-h-screen font-body" style={{ background: '#fdfaf6' }}>
      <GlobalStyles />

      {/* Announcement bar */}
      <div style={{
        background: 'linear-gradient(90deg, #0a0805 0%, #1a1208 50%, #0a0805 100%)',
        color: '#C9A96E',
        textAlign: 'center',
        fontSize: '11px',
        padding: '9px 16px',
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: 500,
      }}>
        ✦ &nbsp; Free delivery within Kampala on orders above UGX 200,000 &nbsp; ✦ &nbsp; New Collection 2025 Now Live &nbsp; ✦
      </div>

      {/* Main nav */}
      <header className={`sticky top-0 z-50 transition-all duration-500 ${scrolled ? 'nav-scrolled' : ''}`}
        style={{
          background: scrolled ? 'rgba(253,250,246,0.88)' : 'rgba(253,250,246,0.98)',
          borderBottom: '1px solid rgba(201,169,110,0.15)',
        }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>

            {/* Logo */}
            <Link to="/store" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', flexShrink: 0 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12,
                background: 'linear-gradient(135deg, #D4B483 0%, #C9A96E 50%, #A8824A 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
                boxShadow: '0 4px 16px rgba(201,169,110,0.35)',
              }}>
                <img src="/logo.png" alt="VV" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => { e.target.style.display = 'none'; }} />
              </div>
              <div>
                <p className="font-display" style={{ fontWeight: 600, fontSize: 20, color: '#0F0E0C', lineHeight: 1.1, letterSpacing: '-0.01em' }}>Villa Vogue</p>
                <p style={{ fontSize: 9, color: '#C9A96E', letterSpacing: '0.35em', textTransform: 'uppercase', fontWeight: 500 }}>Fashions</p>
              </div>
            </Link>

            {/* Search bar - desktop */}
            <div className="hidden sm:block" style={{ flex: 1, maxWidth: 400, position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#aaa', pointerEvents: 'none' }} />
              <input
                className="luxury-input"
                style={{ paddingLeft: 40, borderRadius: 50, fontSize: 13, height: 40, background: 'rgba(245,240,232,0.7)' }}
                placeholder="Search dresses, bags, shoes…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {/* Right actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Mobile search */}
              <button onClick={() => setSearchOpen(!searchOpen)}
                className="sm:hidden"
                style={{ width: 38, height: 38, borderRadius: 10, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Search size={18} color="#555" />
              </button>

              {customerUser ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="hidden sm:block" style={{ fontSize: 13, color: '#666' }}>Hi, {customerUser.name?.split(' ')[0]}</span>
                  <button onClick={logout} style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(245,240,232,0.8)', border: '1px solid rgba(201,169,110,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                    <LogOut size={15} color="#888" />
                  </button>
                </div>
              ) : (
                <Link to="/store/login" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontSize: 13, fontWeight: 500, color: '#555', padding: '8px 14px', borderRadius: 50, border: '1px solid rgba(201,169,110,0.25)', transition: 'all 0.25s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#C9A96E'; e.currentTarget.style.color = '#A8824A'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(201,169,110,0.25)'; e.currentTarget.style.color = '#555'; }}>
                  <User size={14} /> Sign In
                </Link>
              )}

              <button style={{
                position: 'relative', width: 42, height: 42, borderRadius: 12,
                background: 'linear-gradient(135deg, #D4B483 0%, #C9A96E 50%, #A8824A 100%)',
                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(201,169,110,0.3)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(201,169,110,0.45)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(201,169,110,0.3)'; }}>
                <ShoppingBag size={18} color="white" />
                {cart.length > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -4,
                    width: 18, height: 18, borderRadius: '50%',
                    background: '#0F0E0C', color: 'white',
                    fontSize: 10, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid #fdfaf6',
                  }}>{cart.length}</span>
                )}
              </button>
            </div>
          </div>

          {/* Mobile search expand */}
          {searchOpen && (
            <div className="sm:hidden" style={{ paddingBottom: 12, position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#aaa' }} />
              <input className="luxury-input" style={{ paddingLeft: 38, fontSize: 13 }}
                placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} autoFocus />
            </div>
          )}
        </div>

        {/* Category nav */}
        <div style={{ borderTop: '1px solid rgba(201,169,110,0.1)', background: 'transparent' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', display: 'flex', gap: 28, overflowX: 'auto', padding: '10px 24px' }}>
            {categories.map(cat => (
              <Link key={cat}
                to={cat === 'All' ? '/store' : `/store?cat=${cat}`}
                className="nav-link shrink-0"
                style={{ fontSize: 12.5, fontWeight: 500, color: '#666', textDecoration: 'none', whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>
                {cat}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <main>{children}</main>

      {/* Footer */}
      <footer style={{ background: '#0a0805', color: '#888', marginTop: 80 }}>
        {/* Decorative top border */}
        <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, #C9A96E 30%, #D4B483 50%, #C9A96E 70%, transparent)' }} />

        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '64px 24px 40px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 40, marginBottom: 48 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: 'linear-gradient(135deg, #D4B483, #A8824A)', overflow: 'hidden' }}>
                  <img src="/logo.png" alt="VV" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => {}} />
                </div>
                <span className="font-display" style={{ color: 'white', fontWeight: 600, fontSize: 18 }}>Villa Vogue</span>
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.7, maxWidth: 220 }}>Where Fashion Finds a Home. Premium fashion for the modern African woman.</p>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                {['IG', 'FB', 'TW', 'TK'].map(s => (
                  <div key={s} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(201,169,110,0.12)', border: '1px solid rgba(201,169,110,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#C9A96E', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>{s}</div>
                ))}
              </div>
            </div>

            <div>
              <h4 style={{ color: 'white', fontWeight: 600, marginBottom: 16, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Shop</h4>
              {['New Arrivals', 'Dresses', 'Accessories', 'Shoes', 'Sale'].map(l => (
                <Link key={l} to="/store" style={{ display: 'block', fontSize: 13, color: '#888', textDecoration: 'none', marginBottom: 10, transition: 'color 0.2s' }}
                  onMouseEnter={e => e.target.style.color = '#C9A96E'}
                  onMouseLeave={e => e.target.style.color = '#888'}>{l}</Link>
              ))}
            </div>

            <div>
              <h4 style={{ color: 'white', fontWeight: 600, marginBottom: 16, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Help</h4>
              {['Track Order', 'Returns', 'Size Guide', 'Contact Us', 'FAQ'].map(l => (
                <p key={l} style={{ fontSize: 13, marginBottom: 10, cursor: 'pointer', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.target.style.color = '#C9A96E'}
                  onMouseLeave={e => e.target.style.color = '#888'}>{l}</p>
              ))}
            </div>

            <div>
              <h4 style={{ color: 'white', fontWeight: 600, marginBottom: 16, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Contact</h4>
              {[
                { icon: '📍', text: 'Kampala, Uganda' },
                { icon: '📞', text: '+256 782 860372' },
                { icon: '📞', text: '+256 745 903189' },
                { icon: '✉️', text: 'villavoguef@gmail.com' },
              ].map(({ icon, text }) => (
                <p key={text} style={{ fontSize: 13, marginBottom: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span>{icon}</span> {text}
                </p>
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 24, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
            <p style={{ fontSize: 12 }}>© {new Date().getFullYear()} Villa Vogue Fashions. All rights reserved.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {['MTN MoMo', 'Airtel Money', 'Visa/MC'].map(p => (
                <span key={p} style={{ fontSize: 11, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(201,169,110,0.15)', color: '#C9A96E', borderRadius: 6, padding: '4px 10px', fontWeight: 500 }}>{p}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─── PRODUCT CARD ──────────────────────────────────────────────── */
function ProductCard({ product }) {
  const [wished, setWished] = useState(false);
  const images = (() => { try { return JSON.parse(product.images || '[]'); } catch { return []; } })();
  const img = images[0];

  return (
    <div className="product-card" style={{ cursor: 'pointer' }}>
      {/* Image container */}
      <div className="card-image-wrap" style={{ position: 'relative', aspectRatio: '3/4', marginBottom: 12, borderRadius: 16, background: 'linear-gradient(135deg, #f5f0e8, #ede8e0)' }}>
        {img ? (
          <img src={img} alt={product.name} className="card-image"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56 }}>👗</div>
        )}

        {/* Glass overlay */}
        <div className="card-glass-overlay" />

        {/* Featured badge */}
        {product.isFeatured && (
          <div className="badge-glow" style={{
            position: 'absolute', top: 12, left: 12,
            background: 'linear-gradient(135deg, #D4B483 0%, #C9A96E 100%)',
            color: 'white', fontSize: 9, fontWeight: 700,
            padding: '4px 10px', borderRadius: 50,
            display: 'flex', alignItems: 'center', gap: 4,
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            <Sparkles size={8} /> Featured
          </div>
        )}

        {/* Wishlist */}
        <button className="wish-btn"
          onClick={e => { e.stopPropagation(); setWished(!wished); }}
          style={{
            position: 'absolute', top: 12, right: 12,
            width: 34, height: 34, borderRadius: '50%',
            background: 'rgba(253,250,246,0.9)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(201,169,110,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          }}>
          <Heart size={13} style={{ fill: wished ? '#ef4444' : 'none', color: wished ? '#ef4444' : '#999', transition: 'all 0.25s' }} />
        </button>

        {/* Stock badges */}
        {product.stock <= 3 && product.stock > 0 && (
          <div style={{
            position: 'absolute', bottom: 50, left: 12,
            background: 'rgba(239,68,68,0.9)', backdropFilter: 'blur(8px)',
            color: 'white', fontSize: 10, fontWeight: 600,
            padding: '3px 10px', borderRadius: 50,
          }}>Only {product.stock} left</div>
        )}
        {product.stock === 0 && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(10,8,5,0.5)',
            backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 16,
          }}>
            <span style={{ background: 'rgba(253,250,246,0.95)', color: '#555', fontSize: 13, fontWeight: 600, padding: '8px 20px', borderRadius: 50 }}>Sold Out</span>
          </div>
        )}

        {/* Add to cart */}
        <div className="cart-reveal" style={{ position: 'absolute', inset: '0 0 0 0', display: 'flex', alignItems: 'flex-end', padding: 12 }}>
          <button
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', padding: '11px 0',
              background: 'rgba(10,8,5,0.88)', backdropFilter: 'blur(12px)',
              color: 'white', fontSize: 12, fontWeight: 600,
              border: '1px solid rgba(201,169,110,0.3)',
              borderRadius: 10, cursor: 'pointer',
              letterSpacing: '0.08em', textTransform: 'uppercase',
              transition: 'background 0.25s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'linear-gradient(135deg, #D4B483, #A8824A)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(10,8,5,0.88)'}>
            Add to Cart
          </button>
        </div>
      </div>

      {/* Product info */}
      <p style={{ fontSize: 13.5, fontWeight: 500, color: '#1a1a1a', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</p>
      {product.category && <p style={{ fontSize: 11, color: '#aaa', marginBottom: 6, letterSpacing: '0.05em' }}>{product.category.name}</p>}
      <p className="gradient-text font-display" style={{ fontSize: 17, fontWeight: 600 }}>UGX {Number(product.price).toLocaleString()}</p>
    </div>
  );
}

/* ─── SKELETON CARD ─────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div>
      <div className="shimmer-card" style={{ aspectRatio: '3/4', marginBottom: 12 }} />
      <div className="shimmer-card" style={{ height: 14, width: '80%', marginBottom: 8, borderRadius: 6 }} />
      <div className="shimmer-card" style={{ height: 12, width: '50%', borderRadius: 6 }} />
    </div>
  );
}

/* ─── STORE HOME ────────────────────────────────────────────────── */
function StoreHome() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['public-products', page],
    queryFn: () => productApi.listPublic({ page, limit: 24 }).then(r => r.data),
  });

  const featured = data?.products?.filter(p => p.isFeatured).slice(0, 3) || [];
  const rest = data?.products || [];

  return (
    <div>
      {/* ── Hero ── */}
      <section className="hero-gradient" style={{ position: 'relative', overflow: 'hidden', minHeight: 600 }}>
        {/* Decorative orbs */}
        <div className="orb float-anim" style={{ position: 'absolute', width: 500, height: 500, background: 'radial-gradient(circle, rgba(201,169,110,0.12) 0%, transparent 70%)', top: -100, right: -100, zIndex: 0 }} />
        <div className="orb float-anim-2" style={{ position: 'absolute', width: 300, height: 300, background: 'radial-gradient(circle, rgba(212,180,131,0.08) 0%, transparent 70%)', bottom: -50, left: -50, zIndex: 0 }} />

        {/* Subtle pattern */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0, opacity: 0.06,
          backgroundImage: 'radial-gradient(circle, #C9A96E 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

        {/* Particles */}
        <Particles count={16} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1280, margin: '0 auto', padding: '100px 24px 90px', textAlign: 'center' }}>
          <p className="reveal-up font-body" style={{ color: '#C9A96E', fontSize: 11, letterSpacing: '0.45em', textTransform: 'uppercase', marginBottom: 20, fontWeight: 500 }}>
            ✦ &nbsp; New Collection 2025
          </p>

          <h1 className="reveal-up reveal-delay-1 font-display" style={{ fontSize: 'clamp(48px, 8vw, 96px)', fontWeight: 300, color: 'white', lineHeight: 1.0, marginBottom: 24, letterSpacing: '-0.02em' }}>
            Where Fashion<br />
            <em style={{ fontStyle: 'italic', fontWeight: 300 }}>Finds a Home</em>
          </h1>

          <p className="reveal-up reveal-delay-2 font-body" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16, maxWidth: 440, margin: '0 auto 40px', lineHeight: 1.7, fontWeight: 300 }}>
            Discover curated pieces that celebrate the modern African woman
          </p>

          <div className="reveal-up reveal-delay-3" style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-gold" style={{ padding: '14px 36px', border: 'none', borderRadius: 50, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, letterSpacing: '0.05em' }}>
              Shop Now <ChevronRight size={16} />
            </button>
            <button className="btn-outline-gold" style={{ padding: '14px 36px', borderRadius: 50, fontSize: 13, fontWeight: 500, cursor: 'pointer', letterSpacing: '0.05em' }}>
              View Lookbook
            </button>
          </div>

          {/* Stats */}
          <div className="reveal-up reveal-delay-4" style={{ display: 'flex', gap: 40, justifyContent: 'center', marginTop: 60, flexWrap: 'wrap' }}>
            {[['500+', 'Products'], ['10K+', 'Customers'], ['5★', 'Rated'], ['2-Day', 'Delivery']].map(([n, l]) => (
              <div key={l} style={{ textAlign: 'center' }}>
                <p className="font-display gradient-text" style={{ fontSize: 26, fontWeight: 600, lineHeight: 1 }}>{n}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust strip ── */}
      {featured.length > 0 && (
        <div style={{ background: 'linear-gradient(90deg, #f5f0e8, #ede8dc, #f5f0e8)', padding: '14px 0', overflowX: 'auto' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', display: 'flex', justifyContent: 'center', gap: 40 }}>
            {['Free Delivery on orders UGX 200K+', 'Authentic Fashion Pieces', 'MTN & Airtel MoMo Accepted', '24hr Order Processing'].map(t => (
              <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#A8824A', fontWeight: 600, whiteSpace: 'nowrap', letterSpacing: '0.03em' }}>
                <Star size={11} fill="currentColor" style={{ flexShrink: 0 }} /> {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Products ── */}
      <section style={{ maxWidth: 1280, margin: '0 auto', padding: '60px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 40, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <p style={{ fontSize: 11, color: '#C9A96E', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 500 }}>Curated Selection</p>
            <h2 className="font-display" style={{ fontSize: 42, fontWeight: 400, color: '#0F0E0C', lineHeight: 1, letterSpacing: '-0.01em' }}>Our Collection</h2>
            <p style={{ fontSize: 13, color: '#aaa', marginTop: 6 }}>{data?.total || 0} pieces available</p>
          </div>
          <select style={{
            fontSize: 13, border: '1px solid rgba(201,169,110,0.25)', borderRadius: 10,
            padding: '10px 16px', outline: 'none', background: 'white', color: '#555',
            cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
          }}>
            <option>Sort: Featured</option>
            <option>Price: Low to High</option>
            <option>Price: High to Low</option>
            <option>Newest First</option>
          </select>
        </div>

        {isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 24 }}>
            {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 28 }}>
            {rest.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}

        {!isLoading && !rest.length && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <Package size={52} color="#ddd" style={{ margin: '0 auto 16px' }} />
            <p style={{ color: '#bbb', fontSize: 15 }}>No products available right now</p>
          </div>
        )}

        {data?.pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 60, alignItems: 'center' }}>
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="btn-outline-gold"
              style={{ padding: '11px 28px', borderRadius: 50, fontSize: 13, cursor: 'pointer', opacity: page === 1 ? 0.4 : 1 }}>
              ← Previous
            </button>
            <span style={{ fontSize: 13, color: '#aaa', padding: '0 8px' }}>{page} / {data.pages}</span>
            <button disabled={page === data.pages} onClick={() => setPage(p => p + 1)}
              className="btn-gold"
              style={{ padding: '11px 28px', borderRadius: 50, border: 'none', color: 'white', fontSize: 13, cursor: 'pointer', opacity: page === data.pages ? 0.4 : 1 }}>
              Next →
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

/* ─── CUSTOMER LOGIN ─────────────────────────────────────────────── */
function CustomerLogin() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [mode, setMode] = useState('login');
  const [regForm, setRegForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // ── All business logic preserved unchanged ──
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await customers.portalLogin(form);
      localStorage.setItem('vv_customer_token', data.token);
      localStorage.setItem('vv_customer', JSON.stringify(data.customer));
      navigate('/store');
    } catch (err) {
      alert(err.response?.data?.error || 'Login failed');
    } finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await customers.portalRegister(regForm);
      localStorage.setItem('vv_customer_token', data.token);
      localStorage.setItem('vv_customer', JSON.stringify(data.customer));
      navigate('/store');
    } catch (err) {
      alert(err.response?.data?.error || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
      position: 'relative', overflow: 'hidden',
    }}>
      <GlobalStyles />

      {/* Animated background */}
      <div className="hero-gradient" style={{ position: 'absolute', inset: 0, zIndex: 0 }} />
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.05, backgroundImage: 'radial-gradient(circle, #C9A96E 1px, transparent 1px)', backgroundSize: '36px 36px' }} />

      {/* Orbs */}
      <div className="orb float-anim" style={{ position: 'absolute', width: 600, height: 600, background: 'radial-gradient(circle, rgba(201,169,110,0.15) 0%, transparent 65%)', top: -200, right: -200, zIndex: 0 }} />
      <div className="orb float-anim-2" style={{ position: 'absolute', width: 400, height: 400, background: 'radial-gradient(circle, rgba(212,180,131,0.1) 0%, transparent 65%)', bottom: -100, left: -100, zIndex: 0 }} />
      <Particles count={20} />

      {/* Card */}
      <div className="login-float" style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 440 }}>

        {/* Logo header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #D4B483 0%, #C9A96E 50%, #A8824A 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(201,169,110,0.45), 0 0 0 1px rgba(201,169,110,0.2)',
          }}>
            <img src="/logo.png" alt="VV" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => {}} />
          </div>
          <h1 className="font-display" style={{ fontSize: 36, fontWeight: 400, color: 'white', lineHeight: 1.1, letterSpacing: '-0.01em' }}>Villa Vogue</h1>
          <p style={{ fontSize: 11, color: '#C9A96E', letterSpacing: '0.3em', textTransform: 'uppercase', marginTop: 4, fontWeight: 500 }}>Customer Portal</p>
        </div>

        {/* Glass card */}
        <div style={{
          background: 'rgba(253,250,246,0.10)',
          backdropFilter: 'blur(32px) saturate(160%)',
          WebkitBackdropFilter: 'blur(32px) saturate(160%)',
          border: '1px solid rgba(201,169,110,0.2)',
          borderRadius: 24,
          padding: 36,
          boxShadow: '0 32px 80px rgba(0,0,0,0.4), 0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}>

          {/* Tab toggle */}
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 4, marginBottom: 28, border: '1px solid rgba(201,169,110,0.1)' }}>
            {[['login', 'Sign In'], ['register', 'Create Account']].map(([m, label]) => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex: 1, padding: '10px 0', borderRadius: 9, border: 'none',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                letterSpacing: '0.02em',
                transition: 'all 0.3s ease',
                ...(mode === m
                  ? { background: 'linear-gradient(135deg, #D4B483 0%, #C9A96E 100%)', color: 'white', boxShadow: '0 4px 16px rgba(201,169,110,0.4)' }
                  : { background: 'transparent', color: 'rgba(255,255,255,0.5)' }
                ),
              }}>{label}</button>
            ))}
          </div>

          {mode === 'login' ? (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label className="luxury-label" style={{ color: 'rgba(201,169,110,0.8)' }}>Email</label>
                <input className="luxury-input" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(201,169,110,0.2)', color: 'white' }}
                  type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div>
                <label className="luxury-label" style={{ color: 'rgba(201,169,110,0.8)' }}>Password</label>
                <input className="luxury-input" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(201,169,110,0.2)', color: 'white' }}
                  type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
              </div>
              <button type="submit" disabled={loading} className="btn-gold"
                style={{ width: '100%', padding: '14px 0', border: 'none', borderRadius: 12, color: 'white', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 4, letterSpacing: '0.04em' }}>
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { label: 'Full Name', key: 'name', type: 'text' },
                { label: 'Email', key: 'email', type: 'email' },
                { label: 'Phone', key: 'phone', type: 'tel', placeholder: '+256…' },
                { label: 'Password', key: 'password', type: 'password' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="luxury-label" style={{ color: 'rgba(201,169,110,0.8)' }}>{label}</label>
                  <input className="luxury-input"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(201,169,110,0.2)', color: 'white' }}
                    type={type} placeholder={placeholder}
                    value={regForm[key]}
                    onChange={e => setRegForm({ ...regForm, [key]: e.target.value })}
                    required />
                </div>
              ))}
              <button type="submit" disabled={loading} className="btn-gold"
                style={{ width: '100%', padding: '14px 0', border: 'none', borderRadius: 12, color: 'white', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 4, letterSpacing: '0.04em' }}>
                {loading ? 'Creating account…' : 'Create Account'}
              </button>
            </form>
          )}

          <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 20 }}>
            <Link to="/store" style={{ color: '#C9A96E', textDecoration: 'none', fontWeight: 500 }}>← Continue as Guest</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── CUSTOMER PORTAL ROUTER (UNCHANGED) ────────────────────────── */
export default function CustomerPortal() {
  return (
    <Routes>
      <Route path="login" element={<CustomerLogin />} />
      <Route path="*" element={
        <StoreLayout>
          <Routes>
            <Route index element={<StoreHome />} />
          </Routes>
        </StoreLayout>
      } />
    </Routes>
  );
}
