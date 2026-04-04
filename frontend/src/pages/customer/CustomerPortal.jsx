import React, { useState } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShoppingBag, Search, Star, Heart, ChevronRight, Sparkles, User, LogOut, Package } from 'lucide-react';
import { products as productApi, customers } from '../../lib/api';

// ─── STORE LAYOUT ────────────────────────────────────────────────
function StoreLayout({ children }) {
  const [customerUser, setCustomerUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('vv_customer') || 'null'); } catch { return null; }
  });
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const logout = () => { localStorage.removeItem('vv_customer'); localStorage.removeItem('vv_customer_token'); setCustomerUser(null); };

  return (
    <div className="min-h-screen bg-[#fdfaf6]">
      {/* Elegant top bar */}
      <div className="bg-[#1a1a1a] text-[#C9A96E] text-center text-xs py-2 tracking-widest uppercase">
        Free delivery within Kampala on orders above UGX 200,000
      </div>

      {/* Main nav */}
      <header className="bg-white border-b border-[#f0ebe0] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link to="/store" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C9A96E] to-[#A8824A] flex items-center justify-center overflow-hidden">
              <img src="/logo.png" alt="VV" className="w-full h-full object-cover" onError={(e) => { e.target.style.display='none'; }} />
            </div>
            <div>
              <p className="font-heading font-bold text-[#1a1a1a] text-lg leading-tight">Villa Vogue</p>
              <p className="text-[10px] text-[#C9A96E] tracking-widest uppercase">Fashions</p>
            </div>
          </Link>

          <div className="relative flex-1 max-w-md hidden sm:block">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full pl-9 pr-4 py-2 rounded-full border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#C9A96E] focus:bg-white transition-all"
              placeholder="Search dresses, bags, shoes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            {customerUser ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 hidden sm:block">Hi, {customerUser.name?.split(' ')[0]}</span>
                <button onClick={logout} className="text-gray-400 hover:text-gray-600"><LogOut size={16} /></button>
              </div>
            ) : (
              <Link to="/store/login" className="text-sm font-medium text-gray-700 hover:text-[#A8824A] flex items-center gap-1">
                <User size={16} /> Sign In
              </Link>
            )}
            <button className="relative p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ShoppingBag size={20} className="text-gray-700" />
              {cart.length > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#C9A96E] text-white text-[9px] font-bold rounded-full flex items-center justify-center">{cart.length}</span>}
            </button>
          </div>
        </div>

        {/* Category nav */}
        <div className="border-t border-gray-100 bg-white">
          <div className="max-w-7xl mx-auto px-4 flex gap-6 overflow-x-auto py-2.5">
            {['All', 'Dresses', 'Tops', 'Trousers', 'Skirts', 'Suits', 'Accessories', 'Shoes', 'Bags', 'Outerwear'].map(cat => (
              <Link key={cat} to={cat === 'All' ? '/store' : `/store?cat=${cat}`} className="shrink-0 text-sm font-medium text-gray-600 hover:text-[#A8824A] transition-colors whitespace-nowrap">
                {cat}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <main>{children}</main>

      {/* Footer */}
      <footer className="bg-[#1a1a1a] text-gray-400 mt-20">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#C9A96E] to-[#A8824A] overflow-hidden">
                  <img src="/logo.png" alt="VV" className="w-full h-full object-cover" onError={() => {}} />
                </div>
                <span className="font-heading text-white font-semibold">Villa Vogue</span>
              </div>
              <p className="text-sm leading-relaxed">Where Fashion Finds a Home. Premium fashion for the modern African woman.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3 text-sm">Shop</h4>
              {['New Arrivals', 'Dresses', 'Accessories', 'Shoes', 'Sale'].map(l => <Link key={l} to="/store" className="block text-sm hover:text-[#C9A96E] transition-colors mb-1.5">{l}</Link>)}
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3 text-sm">Help</h4>
              {['Track Order', 'Returns', 'Size Guide', 'Contact Us', 'FAQ'].map(l => <p key={l} className="text-sm mb-1.5">{l}</p>)}
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3 text-sm">Contact</h4>
              <p className="text-sm mb-1.5">📍 Kampala, Uganda</p>
              <p className="text-sm mb-1.5">📞 +256 782 860372</p>
              <p className="text-sm mb-1.5">📞 +256 745 903189</p>
              <p className="text-sm">✉️ villavoguef@gmail.com</p>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
            <p>© {new Date().getFullYear()} Villa Vogue Fashions. All rights reserved.</p>
            <div className="flex items-center gap-3">
              <span className="bg-gray-800 rounded px-2 py-1">MTN MoMo</span>
              <span className="bg-gray-800 rounded px-2 py-1">Airtel Money</span>
              <span className="bg-gray-800 rounded px-2 py-1">Visa/MC</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── PRODUCT CARD ────────────────────────────────────────────────
function ProductCard({ product }) {
  const [wished, setWished] = useState(false);
  const images = (() => { try { return JSON.parse(product.images || '[]'); } catch { return []; } })();
  const img = images[0];

  return (
    <div className="group cursor-pointer">
      <div className="relative bg-gray-100 rounded-2xl overflow-hidden aspect-[3/4] mb-3">
        {img ? (
          <img src={img} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-[#f5f0e8] to-[#e8d5b0]">👗</div>
        )}
        {product.isFeatured && (
          <div className="absolute top-3 left-3 bg-[#C9A96E] text-white text-[10px] font-semibold px-2 py-1 rounded-full flex items-center gap-1">
            <Sparkles size={9} /> Featured
          </div>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); setWished(!wished); }}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Heart size={14} className={wished ? 'fill-red-500 text-red-500' : 'text-gray-400'} />
        </button>
        {product.stock <= 3 && product.stock > 0 && (
          <div className="absolute bottom-3 left-3 bg-red-500 text-white text-[10px] px-2 py-1 rounded-full">Only {product.stock} left</div>
        )}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><span className="bg-white text-gray-800 text-sm font-semibold px-4 py-2 rounded-full">Sold Out</span></div>
        )}
        <div className="absolute inset-x-0 bottom-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="w-full bg-[#1a1a1a] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#C9A96E] transition-colors">
            Add to Cart
          </button>
        </div>
      </div>
      <p className="text-sm font-medium text-gray-900 mb-0.5 truncate">{product.name}</p>
      {product.category && <p className="text-xs text-gray-400 mb-1">{product.category.name}</p>}
      <div className="flex items-center gap-2">
        <p className="text-base font-bold text-[#A8824A]">UGX {Number(product.price).toLocaleString()}</p>
      </div>
    </div>
  );
}

// ─── STORE HOME ──────────────────────────────────────────────────
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
      {/* Hero */}
      <div className="relative bg-[#1a1a1a] overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #C9A96E 0, #C9A96E 1px, transparent 0, transparent 50%)', backgroundSize: '30px 30px' }} />
        <div className="relative max-w-7xl mx-auto px-4 py-24 text-center">
          <p className="text-[#C9A96E] text-xs tracking-[0.4em] uppercase mb-4 font-body">New Collection 2025</p>
          <h1 className="font-heading text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Where Fashion<br />Finds a Home
          </h1>
          <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto font-body">Discover curated pieces that celebrate the modern African woman</p>
          <div className="flex items-center justify-center gap-4">
            <button className="px-8 py-3.5 bg-[#C9A96E] text-white font-semibold rounded-full hover:bg-[#A8824A] transition-colors flex items-center gap-2">
              Shop Now <ChevronRight size={18} />
            </button>
            <button className="px-8 py-3.5 border border-gray-600 text-gray-300 font-medium rounded-full hover:border-[#C9A96E] hover:text-[#C9A96E] transition-colors">
              View Lookbook
            </button>
          </div>
        </div>
      </div>

      {/* Featured strip */}
      {featured.length > 0 && (
        <div className="bg-[#f5f0e8] py-3">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-center gap-8 text-sm">
            {['Free Delivery on orders UGX 200K+', 'Authentic Fashion Pieces', 'MTN & Airtel MoMo Accepted', '24hr Order Processing'].map(t => (
              <span key={t} className="flex items-center gap-2 text-[#A8824A] font-medium whitespace-nowrap">
                <Star size={12} fill="currentColor" /> {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Products grid */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-baseline justify-between mb-8">
          <div>
            <h2 className="font-heading text-3xl font-bold text-[#1a1a1a]">Our Collection</h2>
            <p className="text-gray-500 text-sm mt-1">{data?.total || 0} pieces available</p>
          </div>
          <div className="flex gap-2">
            <select className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#C9A96E]">
              <option>Sort: Featured</option>
              <option>Price: Low to High</option>
              <option>Price: High to Low</option>
              <option>Newest First</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => <div key={i} className="aspect-[3/4] bg-gray-200 rounded-2xl shimmer" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {rest.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}

        {!isLoading && !rest.length && (
          <div className="text-center py-20">
            <Package size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No products available right now</p>
          </div>
        )}

        {data?.pages > 1 && (
          <div className="flex justify-center gap-3 mt-12">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-6 py-2.5 border border-gray-200 rounded-full text-sm hover:border-[#C9A96E] transition-colors disabled:opacity-40">Previous</button>
            <span className="px-6 py-2.5 text-sm text-gray-500">{page} / {data.pages}</span>
            <button disabled={page === data.pages} onClick={() => setPage(p => p + 1)} className="px-6 py-2.5 bg-[#C9A96E] text-white rounded-full text-sm hover:bg-[#A8824A] transition-colors disabled:opacity-40">Next</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CUSTOMER LOGIN ───────────────────────────────────────────────
function CustomerLogin() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [mode, setMode] = useState('login');
  const [regForm, setRegForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
    <div className="min-h-screen bg-[#fdfaf6] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-[#C9A96E] to-[#A8824A] items-center justify-center mb-4 overflow-hidden">
            <img src="/logo.png" alt="VV" className="w-full h-full object-cover" onError={() => {}} />
          </div>
          <h1 className="font-heading text-3xl font-bold text-[#1a1a1a]">Villa Vogue</h1>
          <p className="text-[#C9A96E] text-sm">Customer Portal</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-[#f0ebe0] p-8">
          <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
            <button onClick={() => setMode('login')} className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${mode === 'login' ? 'bg-white shadow-sm text-[#A8824A]' : 'text-gray-500'}`}>Sign In</button>
            <button onClick={() => setMode('register')} className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${mode === 'register' ? 'bg-white shadow-sm text-[#A8824A]' : 'text-gray-500'}`}>Create Account</button>
          </div>

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div><label className="label">Password</label><input className="input" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
              <button type="submit" disabled={loading} className="w-full py-3 bg-gradient-to-r from-[#C9A96E] to-[#A8824A] text-white font-semibold rounded-xl hover:shadow-gold transition-all disabled:opacity-60">
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div><label className="label">Full Name</label><input className="input" value={regForm.name} onChange={e => setRegForm({ ...regForm, name: e.target.value })} /></div>
              <div><label className="label">Email</label><input className="input" type="email" value={regForm.email} onChange={e => setRegForm({ ...regForm, email: e.target.value })} /></div>
              <div><label className="label">Phone</label><input className="input" type="tel" placeholder="+256..." value={regForm.phone} onChange={e => setRegForm({ ...regForm, phone: e.target.value })} /></div>
              <div><label className="label">Password</label><input className="input" type="password" value={regForm.password} onChange={e => setRegForm({ ...regForm, password: e.target.value })} /></div>
              <button type="submit" disabled={loading} className="w-full py-3 bg-gradient-to-r from-[#C9A96E] to-[#A8824A] text-white font-semibold rounded-xl hover:shadow-gold transition-all disabled:opacity-60">
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          )}

          <p className="text-center text-xs text-gray-400 mt-4">
            <Link to="/store" className="text-[#A8824A] hover:underline">← Continue as Guest</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── CUSTOMER PORTAL ROUTER ───────────────────────────────────────
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
