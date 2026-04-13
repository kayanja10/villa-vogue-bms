import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Routes, Route, Link, useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ShoppingBag, Search, Star, Heart, ChevronRight, Sparkles,
  Package, X, Plus, Minus, Trash2, MessageCircle, Filter,
  ChevronDown, ArrowLeft, Share2, CheckCircle, Send,
  Phone, Mail, MapPin, Instagram, Facebook, Clock, Truck,
  ShieldCheck, RefreshCw, ZoomIn
} from 'lucide-react';
import { products as productApi, feedback } from '../../lib/api';

const WHATSAPP_NUMBER = '256782860372';
const BRAND_GOLD = '#C9A96E';
const BRAND_DARK = '#1a1a1a';

const CATEGORIES = ['All', 'Dresses', 'Tops', 'Trousers', 'Skirts', 'Suits', 'Accessories', 'Shoes', 'Bags', 'Outerwear'];

function formatUGX(n) {
  return `UGX ${Number(n).toLocaleString()}`;
}

// ─── CART CONTEXT (local state only) ─────────────────────────────
function useCart() {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('vv_cart') || '[]'); } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('vv_cart', JSON.stringify(items));
  }, [items]);

  const add = (product, qty = 1) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + qty } : i);
      return [...prev, { ...product, qty }];
    });
  };

  const remove = (id) => setItems(prev => prev.filter(i => i.id !== id));

  const update = (id, qty) => {
    if (qty <= 0) return remove(id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, qty } : i));
  };

  const clear = () => setItems([]);

  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const count = items.reduce((s, i) => s + i.qty, 0);

  return { items, add, remove, update, clear, total, count };
}

// ─── WHATSAPP ORDER ───────────────────────────────────────────────
function buildWhatsAppMessage(items, total, customerInfo = {}) {
  const lines = items.map(i => `• ${i.qty}x ${i.name} — ${formatUGX(i.price * i.qty)}`).join('\n');
  const name = customerInfo.name ? `\nName: ${customerInfo.name}` : '';
  const phone = customerInfo.phone ? `\nPhone: ${customerInfo.phone}` : '';
  const address = customerInfo.address ? `\nDelivery: ${customerInfo.address}` : '';
  return encodeURIComponent(
    `Hello Villa Vogue! 🛍️ I'd like to place an order:\n\n${lines}\n\n*Total: ${formatUGX(total)}*${name}${phone}${address}\n\nPlease confirm availability and delivery details. Thank you!`
  );
}

// ─── STORE LAYOUT ─────────────────────────────────────────────────
function StoreLayout({ children, cart }) {
  const [search, setSearch] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const searchInputRef = useRef(null);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) navigate(`/store?search=${encodeURIComponent(search.trim())}`);
  };

  return (
    <div className="min-h-screen bg-[#fdfaf6]">
      {/* Announcement bar */}
      <div className="bg-[#1a1a1a] text-[#C9A96E] text-center text-xs py-2 tracking-widest uppercase font-medium">
        🚚 Free delivery in Kampala on orders above UGX 200,000 &nbsp;|&nbsp; 📞 0782 860372
      </div>

      {/* Main nav */}
      <header className="bg-white border-b border-[#f0ebe0] sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link to="/store" className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C9A96E] to-[#A8824A] flex items-center justify-center overflow-hidden shadow-md">
              <img src="/logo.png" alt="VV" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<span class="text-white font-bold text-sm">VV</span>'; }} />
            </div>
            <div className="hidden sm:block">
              <p className="font-bold text-[#1a1a1a] text-lg leading-tight" style={{ fontFamily: 'Georgia, serif' }}>Villa Vogue</p>
              <p className="text-[10px] text-[#C9A96E] tracking-widest uppercase">Fashions</p>
            </div>
          </Link>

          <form onSubmit={handleSearch} className="relative flex-1 max-w-md hidden sm:block">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={searchInputRef}
              className="w-full pl-9 pr-4 py-2.5 rounded-full border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#C9A96E] focus:bg-white transition-all"
              placeholder="Search dresses, bags, shoes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </form>

          <div className="flex items-center gap-2">
            <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 text-xs font-medium bg-[#25D366] text-white px-3 py-1.5 rounded-full hover:bg-[#1da851] transition-colors">
              <MessageCircle size={13} /> WhatsApp Us
            </a>

            <button onClick={() => setCartOpen(true)} className="relative p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ShoppingBag size={22} className="text-gray-700" />
              {cart.count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-[#C9A96E] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {cart.count > 9 ? '9+' : cart.count}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Category nav */}
        <div className="border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto py-2 scrollbar-hide">
            {CATEGORIES.map(cat => {
              const active = searchParams.get('cat') === cat || (cat === 'All' && !searchParams.get('cat'));
              return (
                <Link
                  key={cat}
                  to={cat === 'All' ? '/store' : `/store?cat=${cat}`}
                  className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-all whitespace-nowrap ${active ? 'bg-[#1a1a1a] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  {cat}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      <main>{children}</main>

      {/* Footer */}
      <footer className="bg-[#111] text-gray-400 mt-20">
        <div className="max-w-7xl mx-auto px-4 py-14">
          <div className="grid md:grid-cols-4 gap-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C9A96E] to-[#A8824A] flex items-center justify-center">
                  <span className="text-white font-bold text-xs">VV</span>
                </div>
                <span className="text-white font-semibold text-lg" style={{ fontFamily: 'Georgia, serif' }}>Villa Vogue</span>
              </div>
              <p className="text-sm leading-relaxed mb-4">Premium fashion for the modern African woman. Where style meets culture.</p>
              <div className="flex gap-3">
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-[#C9A96E] transition-colors">
                  <Instagram size={14} />
                </a>
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-[#C9A96E] transition-colors">
                  <Facebook size={14} />
                </a>
                <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-[#25D366] transition-colors">
                  <MessageCircle size={14} />
                </a>
              </div>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Shop</h4>
              {['New Arrivals', 'Dresses', 'Accessories', 'Shoes', 'Bags', 'Sale'].map(l => (
                <Link key={l} to={l === 'New Arrivals' ? '/store' : `/store?cat=${l}`} className="block text-sm hover:text-[#C9A96E] transition-colors mb-2">{l}</Link>
              ))}
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Help</h4>
              {['How to Order', 'Delivery Info', 'Returns Policy', 'Size Guide', 'Contact Us'].map(l => (
                <p key={l} className="text-sm mb-2 cursor-pointer hover:text-[#C9A96E] transition-colors">{l}</p>
              ))}
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Contact</h4>
              <div className="space-y-2.5">
                <a href="https://maps.google.com/?q=Kampala,Uganda" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm hover:text-[#C9A96E] transition-colors">
                  <MapPin size={14} className="text-[#C9A96E] shrink-0" /> Kampala, Uganda
                </a>
                <a href="tel:+256782860372" className="flex items-center gap-2 text-sm hover:text-[#C9A96E] transition-colors">
                  <Phone size={14} className="text-[#C9A96E] shrink-0" /> +256 782 860372
                </a>
                <a href="tel:+256745903189" className="flex items-center gap-2 text-sm hover:text-[#C9A96E] transition-colors">
                  <Phone size={14} className="text-[#C9A96E] shrink-0" /> +256 745 903189
                </a>
                <a href="mailto:villavoguef@gmail.com" className="flex items-center gap-2 text-sm hover:text-[#C9A96E] transition-colors">
                  <Mail size={14} className="text-[#C9A96E] shrink-0" /> villavoguef@gmail.com
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
            <p>© {new Date().getFullYear()} Villa Vogue Fashions. All rights reserved.</p>
            <div className="flex items-center gap-2">
              {['MTN MoMo', 'Airtel Money', 'Visa/MC', 'Cash on Delivery'].map(p => (
                <span key={p} className="bg-gray-800 rounded px-2 py-1">{p}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* Cart Drawer */}
      <CartDrawer cart={cart} open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}

// ─── CART DRAWER ─────────────────────────────────────────────────
function CartDrawer({ cart, open, onClose }) {
  const [step, setStep] = useState('cart'); // cart | checkout | success
  const [form, setForm] = useState({ name: '', phone: '', address: '' });
  const drawerRef = useRef(null);

  useEffect(() => {
    if (!open) { setTimeout(() => setStep('cart'), 300); }
  }, [open]);

  const handleWhatsAppOrder = () => {
    const msg = buildWhatsAppMessage(cart.items, cart.total, form);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank');
    cart.clear();
    setStep('success');
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          {step !== 'cart' && (
            <button onClick={() => setStep('cart')} className="p-1 hover:bg-gray-100 rounded-lg mr-2">
              <ArrowLeft size={18} />
            </button>
          )}
          <h2 className="font-semibold text-[#1a1a1a] flex items-center gap-2">
            <ShoppingBag size={18} className="text-[#C9A96E]" />
            {step === 'cart' ? `Your Cart (${cart.count})` : step === 'checkout' ? 'Checkout' : 'Order Sent!'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {step === 'cart' && (
            cart.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <ShoppingBag size={56} className="text-gray-200 mb-4" />
                <p className="text-gray-500 font-medium mb-2">Your cart is empty</p>
                <p className="text-gray-400 text-sm mb-6">Browse our collection and add items you love</p>
                <button onClick={onClose} className="bg-[#C9A96E] text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-[#A8824A] transition-colors">
                  Continue Shopping
                </button>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {cart.items.map(item => {
                  const images = (() => { try { return JSON.parse(item.images || '[]'); } catch { return []; } })();
                  return (
                    <div key={item.id} className="flex gap-3 bg-gray-50 rounded-xl p-3">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 shrink-0">
                        {images[0] ? <img src={images[0]} alt={item.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">👗</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-[#1a1a1a] truncate">{item.name}</p>
                        <p className="text-[#C9A96E] font-semibold text-sm">{formatUGX(item.price)}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <button onClick={() => cart.update(item.id, item.qty - 1)} className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-200 transition-colors">
                            <Minus size={11} />
                          </button>
                          <span className="text-sm font-medium w-6 text-center">{item.qty}</span>
                          <button onClick={() => cart.update(item.id, item.qty + 1)} className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-200 transition-colors">
                            <Plus size={11} />
                          </button>
                          <button onClick={() => cart.remove(item.id)} className="ml-auto text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {step === 'checkout' && (
            <div className="p-4 space-y-4">
              <div className="bg-[#fdfaf6] rounded-xl p-4 border border-[#f0ebe0]">
                <h3 className="font-semibold text-sm text-[#1a1a1a] mb-3">Your Details (optional)</h3>
                <div className="space-y-3">
                  <input
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#C9A96E] bg-white"
                    placeholder="Your name"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                  <input
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#C9A96E] bg-white"
                    placeholder="Phone number e.g. 0782 860372"
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                  />
                  <textarea
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#C9A96E] bg-white resize-none"
                    placeholder="Delivery address / area in Kampala"
                    rows={2}
                    value={form.address}
                    onChange={e => setForm({ ...form, address: e.target.value })}
                  />
                </div>
              </div>

              {/* Order summary */}
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <h3 className="font-semibold text-sm text-[#1a1a1a] mb-3">Order Summary</h3>
                {cart.items.map(item => (
                  <div key={item.id} className="flex justify-between text-sm text-gray-600 mb-1.5">
                    <span>{item.qty}x {item.name}</span>
                    <span>{formatUGX(item.price * item.qty)}</span>
                  </div>
                ))}
                <div className="border-t border-gray-100 mt-3 pt-3 flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="text-[#C9A96E]">{formatUGX(cart.total)}</span>
                </div>
                {cart.total >= 200000 && (
                  <p className="text-green-600 text-xs mt-2 flex items-center gap-1"><Truck size={12} /> Free delivery applies!</p>
                )}
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-800">
                <p className="font-medium flex items-center gap-1.5 mb-1"><MessageCircle size={14} /> How ordering works</p>
                <p className="text-xs text-green-700">Clicking "Order via WhatsApp" will open a pre-filled message to our team. We'll confirm your order and arrange delivery or pickup.</p>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle size={40} className="text-green-500" />
              </div>
              <h3 className="font-bold text-xl text-[#1a1a1a] mb-2">Order Sent! 🎉</h3>
              <p className="text-gray-500 text-sm mb-6">Your order has been sent to our WhatsApp. We'll confirm and arrange delivery shortly!</p>
              <button onClick={onClose} className="bg-[#C9A96E] text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-[#A8824A] transition-colors">
                Continue Shopping
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {(step === 'cart' && cart.items.length > 0) && (
          <div className="p-4 border-t border-gray-100 bg-white">
            <div className="flex justify-between font-semibold mb-3">
              <span>Total</span>
              <span className="text-[#C9A96E]">{formatUGX(cart.total)}</span>
            </div>
            <button
              onClick={() => setStep('checkout')}
              className="w-full py-3 bg-gradient-to-r from-[#C9A96E] to-[#A8824A] text-white font-semibold rounded-xl hover:shadow-lg transition-all text-sm"
            >
              Proceed to Checkout →
            </button>
          </div>
        )}

        {step === 'checkout' && (
          <div className="p-4 border-t border-gray-100 bg-white">
            <button
              onClick={handleWhatsAppOrder}
              className="w-full py-3 bg-[#25D366] text-white font-semibold rounded-xl hover:bg-[#1da851] transition-all text-sm flex items-center justify-center gap-2"
            >
              <MessageCircle size={18} /> Order via WhatsApp
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ─── PRODUCT CARD ─────────────────────────────────────────────────
function ProductCard({ product, onAddToCart }) {
  const [wished, setWished] = useState(false);
  const [added, setAdded] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const images = (() => { try { return JSON.parse(product.images || '[]'); } catch { return []; } })();

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onAddToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <Link to={`/store/product/${product.id}`} className="group cursor-pointer block">
      <div className="relative bg-gray-100 rounded-2xl overflow-hidden aspect-[3/4] mb-3">
        {images.length > 0 ? (
          <>
            <img
              src={images[imgIdx]}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            {images.length > 1 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onMouseEnter={(e) => { e.preventDefault(); setImgIdx(i); }}
                    onClick={e => { e.preventDefault(); setImgIdx(i); }}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${i === imgIdx ? 'bg-white' : 'bg-white/50'}`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl bg-gradient-to-br from-[#f5f0e8] to-[#e8d5b0]">👗</div>
        )}

        {product.isFeatured && (
          <div className="absolute top-3 left-3 bg-[#C9A96E] text-white text-[10px] font-semibold px-2 py-1 rounded-full flex items-center gap-1">
            <Sparkles size={9} /> Featured
          </div>
        )}

        <button
          onClick={(e) => { e.preventDefault(); setWished(!wished); }}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Heart size={14} className={wished ? 'fill-red-500 text-red-500' : 'text-gray-400'} />
        </button>

        {product.stock <= 3 && product.stock > 0 && (
          <div className="absolute bottom-10 left-3 bg-orange-500 text-white text-[10px] px-2 py-1 rounded-full">Only {product.stock} left</div>
        )}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-white/90 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-full">Out of Stock</span>
          </div>
        )}

        {/* Add to cart hover button */}
        {product.stock > 0 && (
          <button
            onClick={handleAdd}
            className={`absolute bottom-3 left-3 right-3 py-2 rounded-xl text-xs font-semibold transition-all transform ${added ? 'bg-green-500 text-white translate-y-0 opacity-100' : 'bg-white text-[#1a1a1a] translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100'}`}
          >
            {added ? '✓ Added to Cart' : '+ Add to Cart'}
          </button>
        )}
      </div>

      <div>
        <p className="text-xs text-[#C9A96E] font-medium mb-0.5">{product.category?.name || ''}</p>
        <p className="font-semibold text-[#1a1a1a] text-sm leading-tight mb-1 line-clamp-2">{product.name}</p>
        <p className="font-bold text-[#1a1a1a]">{formatUGX(product.price)}</p>
      </div>
    </Link>
  );
}

// ─── STORE HOME ───────────────────────────────────────────────────
function StoreHome({ cart }) {
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('featured');

  const category = searchParams.get('cat') || '';
  const search = searchParams.get('search') || '';

  useEffect(() => { setPage(1); }, [category, search]);

  const { data, isLoading } = useQuery({
    queryKey: ['public-products', category, search, page, sort],
    queryFn: () => productApi.listPublic({ category, search, page, limit: 24, sort }).then(r => r.data),
    keepPreviousData: true,
  });

  const featured = data?.products?.filter(p => p.isFeatured) || [];
  const rest = data?.products || [];

  return (
    <div>
      {/* Hero — only on homepage */}
      {!category && !search && page === 1 && (
        <div className="relative bg-gradient-to-r from-[#1a1a1a] to-[#2d2d2d] text-white overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23C9A96E\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
          <div className="max-w-7xl mx-auto px-4 py-16 sm:py-24 flex flex-col sm:flex-row items-center gap-8">
            <div className="flex-1 text-center sm:text-left">
              <p className="text-[#C9A96E] text-sm tracking-widest uppercase font-medium mb-3">New Collection 2025</p>
              <h1 className="text-4xl sm:text-6xl font-bold leading-tight mb-4" style={{ fontFamily: 'Georgia, serif' }}>
                Where Fashion<br />Finds a Home
              </h1>
              <p className="text-gray-300 text-lg mb-8 max-w-md">Premium fashion for the modern African woman. Shop the latest styles delivered to your door.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center sm:justify-start">
                <Link to="/store?cat=Dresses" className="bg-[#C9A96E] text-white px-8 py-3.5 rounded-full font-semibold hover:bg-[#A8824A] transition-all hover:shadow-lg text-sm">
                  Shop New Arrivals
                </Link>
                <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer"
                  className="bg-transparent border-2 border-white/30 text-white px-8 py-3.5 rounded-full font-semibold hover:bg-white/10 transition-all text-sm flex items-center justify-center gap-2">
                  <MessageCircle size={16} /> Chat With Us
                </a>
              </div>
            </div>
            <div className="hidden sm:flex gap-4 shrink-0">
              {['Dresses', 'Bags', 'Shoes'].map(cat => (
                <Link key={cat} to={`/store?cat=${cat}`}
                  className="w-28 h-36 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all hover:scale-105">
                  <span className="text-3xl">{cat === 'Dresses' ? '👗' : cat === 'Bags' ? '👜' : '👠'}</span>
                  <span className="text-xs font-medium">{cat}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Trust bar */}
      {!category && !search && page === 1 && (
        <div className="bg-[#faf6ef] border-y border-[#f0ebe0] py-3">
          <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: <Truck size={16} />, text: 'Free Delivery UGX 200K+' },
              { icon: <ShieldCheck size={16} />, text: 'Authentic Pieces' },
              { icon: <Phone size={16} />, text: 'MTN & Airtel MoMo' },
              { icon: <Clock size={16} />, text: '24hr Order Processing' },
            ].map(t => (
              <div key={t.text} className="flex items-center gap-2 text-[#A8824A] text-xs font-medium justify-center">
                {t.icon} {t.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Products section */}
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h2 className="font-bold text-2xl text-[#1a1a1a]" style={{ fontFamily: 'Georgia, serif' }}>
              {category || search ? (category || `"${search}"`) : 'Our Collection'}
            </h2>
            <p className="text-gray-500 text-sm mt-0.5">{data?.total || 0} pieces available</p>
          </div>
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#C9A96E] bg-white"
          >
            <option value="featured">Sort: Featured</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="newest">Newest First</option>
          </select>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-gray-200 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : rest.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {rest.map(p => <ProductCard key={p.id} product={p} onAddToCart={cart.add} />)}
          </div>
        ) : (
          <div className="text-center py-20">
            <Package size={52} className="text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium mb-1">No products found</p>
            <p className="text-gray-400 text-sm">Try a different category or search term</p>
            <Link to="/store" className="inline-block mt-4 text-[#C9A96E] text-sm hover:underline">View all products</Link>
          </div>
        )}

        {data?.pages > 1 && (
          <div className="flex justify-center gap-3 mt-12">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-6 py-2.5 border border-gray-200 rounded-full text-sm hover:border-[#C9A96E] transition-colors disabled:opacity-40">
              ← Previous
            </button>
            <span className="px-6 py-2.5 text-sm text-gray-500">{page} / {data.pages}</span>
            <button disabled={page === data.pages} onClick={() => setPage(p => p + 1)} className="px-6 py-2.5 bg-[#C9A96E] text-white rounded-full text-sm hover:bg-[#A8824A] transition-colors disabled:opacity-40">
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Review section */}
      <ReviewSection />
    </div>
  );
}

// ─── PRODUCT DETAIL ───────────────────────────────────────────────
function ProductDetail({ cart }) {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [imgIdx, setImgIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  const { data: product, isLoading } = useQuery({
    queryKey: ['public-product', productId],
    queryFn: () => productApi.listPublic({ search: '' }).then(r => {
      return r.data.products?.find(p => p.id === parseInt(productId)) || null;
    }),
  });

  const images = (() => { try { return JSON.parse(product?.images || '[]'); } catch { return []; } })();
  const tags = (() => { try { return JSON.parse(product?.tags || '[]'); } catch { return []; } })();

  const handleAdd = () => {
    cart.add(product, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleWhatsApp = () => {
    const msg = buildWhatsAppMessage([{ ...product, qty }], product.price * qty);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank');
  };

  if (isLoading) return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="grid md:grid-cols-2 gap-10">
        <div className="aspect-square bg-gray-200 rounded-2xl animate-pulse" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-6 bg-gray-200 rounded animate-pulse" />)}
        </div>
      </div>
    </div>
  );

  if (!product) return (
    <div className="max-w-7xl mx-auto px-4 py-20 text-center">
      <Package size={52} className="text-gray-200 mx-auto mb-4" />
      <p className="text-gray-500">Product not found</p>
      <Link to="/store" className="text-[#C9A96E] text-sm mt-2 inline-block hover:underline">← Back to store</Link>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-gray-500 hover:text-[#1a1a1a] text-sm mb-6 transition-colors">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="grid md:grid-cols-2 gap-10">
        {/* Images */}
        <div>
          <div className="relative aspect-square bg-gray-100 rounded-2xl overflow-hidden mb-3 cursor-zoom-in" onClick={() => setZoomed(true)}>
            {images[imgIdx] ? (
              <img src={images[imgIdx]} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-8xl">👗</div>
            )}
            <button className="absolute bottom-4 right-4 bg-white/80 p-2 rounded-full shadow-sm hover:bg-white transition-colors">
              <ZoomIn size={16} className="text-gray-600" />
            </button>
          </div>
          {images.length > 1 && (
            <div className="flex gap-2">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setImgIdx(i)}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${i === imgIdx ? 'border-[#C9A96E]' : 'border-transparent'}`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <p className="text-[#C9A96E] text-sm font-medium mb-1">{product.category?.name}</p>
          <h1 className="text-3xl font-bold text-[#1a1a1a] mb-3" style={{ fontFamily: 'Georgia, serif' }}>{product.name}</h1>

          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl font-bold text-[#1a1a1a]">{formatUGX(product.price)}</span>
            {product.stock > 0 ? (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">In Stock ({product.stock})</span>
            ) : (
              <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full font-medium">Out of Stock</span>
            )}
          </div>

          {product.description && (
            <p className="text-gray-600 text-sm leading-relaxed mb-5">{product.description}</p>
          )}

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {tags.map(tag => (
                <span key={tag} className="text-xs bg-[#faf6ef] text-[#A8824A] border border-[#f0ebe0] px-2 py-1 rounded-full">{tag}</span>
              ))}
            </div>
          )}

          {product.stock > 0 && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-sm font-medium text-gray-700">Qty:</span>
                <div className="flex items-center gap-2 bg-gray-100 rounded-full px-2 py-1">
                  <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-7 h-7 flex items-center justify-center hover:bg-white rounded-full transition-colors"><Minus size={13} /></button>
                  <span className="font-semibold w-6 text-center text-sm">{qty}</span>
                  <button onClick={() => setQty(q => Math.min(product.stock, q + 1))} className="w-7 h-7 flex items-center justify-center hover:bg-white rounded-full transition-colors"><Plus size={13} /></button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleAdd}
                  className={`flex-1 py-3.5 rounded-xl font-semibold text-sm transition-all ${added ? 'bg-green-500 text-white' : 'bg-[#1a1a1a] text-white hover:bg-[#333]'}`}
                >
                  {added ? '✓ Added to Cart' : 'Add to Cart'}
                </button>
                <button
                  onClick={handleWhatsApp}
                  className="flex-1 py-3.5 bg-[#25D366] text-white rounded-xl font-semibold text-sm hover:bg-[#1da851] transition-all flex items-center justify-center gap-2"
                >
                  <MessageCircle size={16} /> Order via WhatsApp
                </button>
              </div>
            </>
          )}

          {product.stock === 0 && (
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi! I'm interested in "${product.name}" — is it back in stock or can you get it?`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3.5 bg-[#25D366] text-white rounded-xl font-semibold text-sm hover:bg-[#1da851] transition-all text-center"
            >
              <MessageCircle size={16} className="inline mr-2" />Ask About Restock
            </a>
          )}

          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            {[
              { icon: <Truck size={16} />, text: 'Free delivery UGX 200K+' },
              { icon: <RefreshCw size={16} />, text: 'Easy returns' },
              { icon: <ShieldCheck size={16} />, text: 'Authentic pieces' },
            ].map(i => (
              <div key={i.text} className="bg-[#fdfaf6] rounded-xl p-3 text-xs text-gray-600">
                <div className="text-[#C9A96E] flex justify-center mb-1">{i.icon}</div>
                {i.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Zoom modal */}
      {zoomed && images[imgIdx] && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setZoomed(false)}>
          <button className="absolute top-4 right-4 text-white hover:text-gray-300"><X size={28} /></button>
          <img src={images[imgIdx]} alt={product.name} className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      )}
    </div>
  );
}

// ─── REVIEW SECTION ───────────────────────────────────────────────
function ReviewSection() {
  const [form, setForm] = useState({ name: '', rating: 5, message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);

  const { data: statsData } = useQuery({
    queryKey: ['feedback-stats-public'],
    queryFn: () => feedback.publicStats().then(r => r.data).catch(() => null),
  });

  const { data: reviewsData } = useQuery({
    queryKey: ['feedback-public'],
    queryFn: () => feedback.publicList().then(r => r.data).catch(() => ({ feedback: [] })),
  });

  const reviews = (reviewsData?.feedback || []).slice(0, 6);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.message.trim()) return;
    setLoading(true);
    try {
      await feedback.publicCreate({ ...form, source: 'portal' });
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#fdfaf6] border-t border-[#f0ebe0] py-16">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-[#1a1a1a] mb-2" style={{ fontFamily: 'Georgia, serif' }}>What Our Customers Say</h2>
          <p className="text-gray-500 text-sm">Real reviews from real customers</p>
          {statsData && (
            <div className="flex items-center justify-center gap-2 mt-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={20} className={i < Math.round(statsData.average || 0) ? 'fill-[#C9A96E] text-[#C9A96E]' : 'text-gray-300'} />
              ))}
              <span className="text-gray-600 text-sm ml-1">{statsData.average?.toFixed(1)} ({statsData.total || 0} reviews)</span>
            </div>
          )}
        </div>

        {/* Existing reviews */}
        {reviews.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
            {reviews.map((r, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-[#f0ebe0]">
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} size={14} className={j < r.rating ? 'fill-[#C9A96E] text-[#C9A96E]' : 'text-gray-200'} />
                  ))}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-3 line-clamp-3">"{r.message}"</p>
                <p className="font-semibold text-xs text-[#1a1a1a]">{r.customerName || r.name || 'Customer'}</p>
                {r.createdAt && <p className="text-gray-400 text-xs">{new Date(r.createdAt).toLocaleDateString()}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Submit review */}
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-2xl p-6 border border-[#f0ebe0]">
            {submitted ? (
              <div className="text-center py-6">
                <CheckCircle size={40} className="text-green-500 mx-auto mb-3" />
                <p className="font-semibold text-[#1a1a1a]">Thank you for your review! 🙏</p>
                <p className="text-gray-500 text-sm mt-1">We appreciate your feedback.</p>
              </div>
            ) : (
              <>
                <h3 className="font-semibold text-[#1a1a1a] mb-4">Leave a Review</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <input
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#C9A96E]"
                    placeholder="Your name"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Rating</p>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setForm({ ...form, rating: star })}
                        >
                          <Star size={24} className={star <= (hoverRating || form.rating) ? 'fill-[#C9A96E] text-[#C9A96E]' : 'text-gray-300'} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#C9A96E] resize-none"
                    placeholder="Share your experience..."
                    rows={3}
                    required
                    value={form.message}
                    onChange={e => setForm({ ...form, message: e.target.value })}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-gradient-to-r from-[#C9A96E] to-[#A8824A] text-white font-semibold rounded-xl text-sm hover:shadow-md transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    <Send size={14} /> {loading ? 'Submitting...' : 'Submit Review'}
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

// ─── CUSTOMER PORTAL ROUTER ───────────────────────────────────────
export default function CustomerPortal() {
  const cart = useCart();

  return (
    <Routes>
      <Route path="*" element={
        <StoreLayout cart={cart}>
          <Routes>
            <Route index element={<StoreHome cart={cart} />} />
            <Route path="product/:productId" element={<ProductDetail cart={cart} />} />
          </Routes>
        </StoreLayout>
      } />
    </Routes>
  );
}
