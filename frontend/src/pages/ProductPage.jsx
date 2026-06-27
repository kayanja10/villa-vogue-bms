import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Navbar, QuickViewModal, useToast, ToastProvider,
} from './CustomerPortal';
import { products as productsApi } from '../lib/api';

const BASE = import.meta.env.VITE_API_URL || 'https://villa-vogue-bms.onrender.com/api';

// ── SEO: set <title> and Open Graph / Twitter Card meta tags ────────────────
// Plain DOM manipulation rather than react-helmet-async — this is a Vite SPA
// with no server-side render step, so a dependency-free approach is simplest
// and works identically: it runs once the product data arrives, updates the
// tags, and reverts to the site defaults when the page unmounts. This is
// what makes a WhatsApp/Facebook link preview show the actual product image
// and name instead of the generic homepage card.
function useProductSeo(product) {
  useEffect(() => {
    if (!product) return;

    const prevTitle = document.title;
    const price = Number(product.price || 0).toLocaleString();
    const title = `${product.name} — UGX ${price} | Villa Vogue Fashions`;
    const description = (product.description || `${product.name} available now at Villa Vogue Fashions — Where Fashion Finds a Home.`).slice(0, 160);

    let image = '';
    try {
      const imgs = JSON.parse(product.images || '[]');
      const primary = imgs.find(i => i.isPrimary) || imgs[0];
      image = primary?.url || (typeof imgs[0] === 'string' ? imgs[0] : '');
    } catch { /* no images */ }

    document.title = title;

    const setMeta = (attr, key, value) => {
      let tag = document.querySelector(`meta[${attr}="${key}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attr, key);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', value);
    };

    setMeta('name', 'description', description);
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:type', 'product');
    setMeta('property', 'og:url', window.location.href);
    if (image) setMeta('property', 'og:image', image);
    setMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary');
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);
    if (image) setMeta('name', 'twitter:image', image);

    // Canonical link — tells Google this is the authoritative URL for this
    // product, preventing duplicate-content issues if the same product is
    // ever reachable via more than one URL pattern in the future.
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', window.location.href);

    return () => {
      document.title = prevTitle;
      // Meta tags are intentionally left in place rather than removed on
      // unmount — the next page will overwrite them via the same setMeta
      // calls (Navbar/App-level defaults, or another product), which is
      // simpler and avoids a flash of missing tags during navigation.
    };
  }, [product]);
}

function ProductPageInner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();

  const [product, setProduct] = useState(null);
  const [allProducts, setAllProducts] = useState([]); // for "You May Also Like"
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('vv_cart') || '[]'); } catch { return []; }
  });
  const [wishlist, setWishlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem('vv_wishlist') || '[]'); } catch { return []; }
  });

  useEffect(() => { localStorage.setItem('vv_cart', JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem('vv_wishlist', JSON.stringify(wishlist)); }, [wishlist]);

  // ── Fetch the single product ────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);

    const load = async () => {
      try {
        const res = await productsApi.getPublicOne(id);
        if (!cancelled) setProduct(res.data);
      } catch (err) {
        // Fall back to a raw fetch in case the axios client's base URL
        // hasn't picked up VITE_API_URL for any reason — same defensive
        // pattern used by the main portal's product list loader.
        try {
          const r = await fetch(`${BASE}/products/public/${id}`);
          if (r.status === 404) { if (!cancelled) setNotFound(true); return; }
          const d = await r.json();
          if (!cancelled) setProduct(d);
        } catch {
          if (!cancelled) setNotFound(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [id]);

  // ── Fetch the broader catalog once, for "Similar Products" inside the
  // reused QuickViewModal — same data shape the modal already expects ──────
  useEffect(() => {
    let cancelled = false;
    productsApi.listPublic({ limit: 100 })
      .then(res => {
        const items = res.data?.products || res.data?.data || res.data || [];
        if (!cancelled) setAllProducts(Array.isArray(items) ? items : []);
      })
      .catch(() => { if (!cancelled) setAllProducts([]); });
    return () => { cancelled = true; };
  }, []);

  useProductSeo(product);

  const addToCart = useCallback((p) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === p.id && i.selectedSize === p.selectedSize && i.selectedColor === p.selectedColor);
      if (existing) {
        return prev.map(i => i === existing ? { ...i, qty: i.qty + (p.qty || 1) } : i);
      }
      return [...prev, { ...p, qty: p.qty || 1 }];
    });
  }, []);

  const toggleWishlist = useCallback((p) => {
    setWishlist(prev => {
      const exists = prev.some(w => w.id === p.id);
      return exists ? prev.filter(w => w.id !== p.id) : [...prev, p];
    });
  }, []);

  // "Order Online" from the modal hands off to the cart and returns to the
  // main shop — there's no standalone checkout route, so the customer
  // completes checkout from the homepage's own cart drawer. The item is
  // already in the cart (persisted to localStorage) by the time they land
  // there, so nothing is lost in the handoff.
  const handleOrderOnline = useCallback((item) => {
    addToCart(item);
    showToast('Added to cart — continue to checkout below ✦');
    navigate('/store');
  }, [addToCart, navigate, showToast]);

  const handleSelectSimilarProduct = useCallback((p) => {
    navigate(`/store/product/${p.id}`);
  }, [navigate]);

  // ── Not found state ──────────────────────────────────────────────────────
  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--tp)' }}>
        <Navbar user={null} cart={cart} wishlist={wishlist}
          onLogin={() => navigate('/store')} onStaffLogin={() => navigate('/login')}
          onCartOpen={() => navigate('/store')} onSearchOpen={() => navigate('/store')}
          onWishlistOpen={() => navigate('/store')} onAccountOpen={() => navigate('/store')} />
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '120px 24px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--fd)', fontSize: 48, opacity: 0.15, marginBottom: 16 }}>VV</div>
          <h1 style={{ fontFamily: 'var(--fd)', fontSize: 26, fontWeight: 300, marginBottom: 10 }}>Product Not Found</h1>
          <p style={{ color: 'var(--tm)', fontSize: 14, marginBottom: 28 }}>
            This product may have sold out or is no longer available.
          </p>
          <button className="bg" onClick={() => navigate('/store')} style={{ padding: '12px 28px', fontSize: 13 }}>
            Back to Shop
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar user={null} cart={cart} wishlist={wishlist}
        onLogin={() => navigate('/store')} onStaffLogin={() => navigate('/login')}
        onCartOpen={() => navigate('/store')} onSearchOpen={() => navigate('/store')}
        onWishlistOpen={() => navigate('/store')} onAccountOpen={() => navigate('/store')} />

      {/* The modal is rendered permanently open as the page's main content.
          Closing it sends the customer back to the full shop rather than
          leaving an empty page behind — there is nothing else on this route
          to "reveal" once it closes. */}
      {!loading && product && (
        <QuickViewModal
          product={product}
          open={true}
          onClose={() => navigate('/store')}
          onAddToCart={(p) => { addToCart(p); showToast(`${p.name} added to cart ✦`); }}
          onOrderOnline={handleOrderOnline}
          products={allProducts}
          wishlist={wishlist}
          onWishlistToggle={toggleWishlist}
          onSelectProduct={handleSelectSimilarProduct}
        />
      )}

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div style={{ width: 32, height: 32, border: '3px solid var(--br)', borderTopColor: 'var(--gold)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
        </div>
      )}
    </div>
  );
}

// ── Default export — wraps the page with ToastProvider so both this page's
// own toasts AND QuickViewModal's internal useToast() call (it calls
// useToast() itself when "Add to Cart" is clicked from inside the modal)
// have a real ToastCtx.Provider ancestor. Without this wrapper, that
// internal call inside the reused QuickViewModal component would return
// undefined and crash the page on the very first add-to-cart click.
export default function ProductPage() {
  return (
    <ToastProvider>
      <ProductPageInner />
    </ToastProvider>
  );
}
