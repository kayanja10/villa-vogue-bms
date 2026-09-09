// frontend/src/pages/CategoryPage.jsx
//
// SEO: real, standalone, crawlable landing page for one product category —
// e.g. /shop/dresses, /shop/kids-wear. Mirrors the SEO approach already
// established in ProductPage.jsx (plain DOM meta manipulation, no
// react-helmet-async, same data-prerender-ready signal) so both pages are
// consistent and both get picked up by the same prerender pipeline.
//
// NOTE ON IMPORTS: this reuses Navbar/ProductCard/ToastProvider/useToast
// from CustomerPortal.jsx, the same way ProductPage.jsx already does. If
// your current CustomerPortal.jsx doesn't export ProductCard under that
// exact name, check its `export { ... }` list at the bottom of the file
// and adjust this import line to match.

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navbar, ProductCard, useToast, ToastProvider } from './CustomerPortal';
import { products as productsApi, categories as categoriesApi } from '../lib/api';

const SITE_URL = 'https://www.villavoguefashion.com';

function useCategorySeo(category, productCount) {
  useEffect(() => {
    if (!category) return;

    const prevTitle = document.title;
    const title = `${category.name} in Kampala, Uganda | Villa Vogue Fashions`;
    const description = (
      category.description ||
      `Shop ${category.name.toLowerCase()} at Villa Vogue Fashions — quality fashion for Kampala and across Uganda, with fast WhatsApp ordering.`
    ).slice(0, 160);
    const cleanUrl = `${SITE_URL}/shop/${category.slug}`;

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

    setMeta('name', 'robots', 'index, follow');
    setMeta('name', 'description', description);
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:url', cleanUrl);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', cleanUrl);

    // SEO: BreadcrumbList + ItemList JSON-LD. No fake ratings/review counts —
    // just the real category name and how many products are currently shown.
    const ldId = 'vv-category-jsonld';
    document.getElementById(ldId)?.remove();
    const ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.id = ldId;
    ld.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
            { '@type': 'ListItem', position: 2, name: category.name, item: cleanUrl },
          ],
        },
        {
          '@type': 'ItemList',
          name: category.name,
          numberOfItems: productCount,
        },
      ],
    });
    document.head.appendChild(ld);

    document.body.setAttribute('data-prerender-ready', 'true');

    return () => {
      document.title = prevTitle;
      document.body.removeAttribute('data-prerender-ready');
      document.getElementById(ldId)?.remove();
    };
  }, [category, productCount]);
}

function CategoryPageInner() {
  const { categorySlug } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();

  const [category, setCategory] = useState(null);
  const [productList, setProductList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [wishlist, setWishlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem('vv_wishlist') || '[]'); } catch { return []; }
  });
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('vv_cart') || '[]'); } catch { return []; }
  });
  useEffect(() => { localStorage.setItem('vv_cart', JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem('vv_wishlist', JSON.stringify(wishlist)); }, [wishlist]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);

    (async () => {
      try {
        const catRes = await categoriesApi.getPublicBySlug(categorySlug);
        if (cancelled) return;
        setCategory(catRes.data);

        const prodRes = await productsApi.listPublic({ categorySlug, limit: 100 });
        if (cancelled) return;
        const items = prodRes.data?.products || prodRes.data?.data || prodRes.data || [];
        setProductList(Array.isArray(items) ? items : []);
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [categorySlug]);

  useCategorySeo(category, productList.length);

  const addToCart = (p) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === p.id);
      if (existing) return prev.map(i => i === existing ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...p, qty: 1 }];
    });
    showToast(`${p.name} added to cart ✦`);
  };

  const toggleWishlist = (p) => {
    setWishlist(prev => prev.some(w => w.id === p.id) ? prev.filter(w => w.id !== p.id) : [...prev, p]);
  };

  const goToProduct = (p) => {
    if (p.category?.slug && p.slug) navigate(`/shop/${p.category.slug}/${p.slug}`);
    else navigate(`/store/product/${p.id}`);
  };

  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--tp)' }}>
        <Navbar user={null} cart={cart} wishlist={wishlist}
          onLogin={() => navigate('/store')} onStaffLogin={() => navigate('/login')}
          onCartOpen={() => navigate('/store')} onSearchOpen={() => navigate('/store')}
          onWishlistOpen={() => navigate('/store')} onAccountOpen={() => navigate('/store')} />
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '120px 24px', textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'var(--fd)', fontSize: 26, fontWeight: 300, marginBottom: 10 }}>Category Not Found</h1>
          <p style={{ color: 'var(--tm)', fontSize: 14, marginBottom: 28 }}>This category may no longer be available.</p>
          <button className="bg" onClick={() => navigate('/store')} style={{ padding: '12px 28px', fontSize: 13 }}>Back to Shop</button>
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

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '120px 24px 80px' }}>
        {/* Breadcrumb — visible, crawlable text link, matching the JSON-LD above */}
        <nav aria-label="Breadcrumb" style={{ fontSize: 12, color: 'var(--tm)', marginBottom: 18 }}>
          <a href="/" style={{ color: 'var(--tm)', textDecoration: 'none' }}>Home</a>
          <span style={{ margin: '0 8px' }}>/</span>
          <span style={{ color: 'var(--tp)' }}>{category?.name || '...'}</span>
        </nav>

        <h1 style={{ fontFamily: 'var(--fd)', fontSize: 'clamp(28px,4vw,44px)', fontWeight: 300, marginBottom: 12, color: 'var(--tp)' }}>
          {category?.name || 'Loading…'}
        </h1>

        {/* Real, unique intro copy per category — written once per category
            in your Settings description field. Falls back to a short
            factual sentence rather than leaving the page thin if a
            description hasn't been written yet. */}
        <p style={{ fontSize: 14, color: 'var(--ts)', maxWidth: 640, lineHeight: 1.7, marginBottom: 36 }}>
          {category?.description ||
            `Browse our ${category?.name?.toLowerCase() || ''} collection — quality fashion available now in Kampala, Uganda, with fast WhatsApp ordering and delivery across the country.`}
        </p>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div style={{ width: 32, height: 32, border: '3px solid var(--br)', borderTopColor: 'var(--gold)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
          </div>
        ) : productList.length === 0 ? (
          <p style={{ color: 'var(--tm)', fontSize: 14 }}>No products currently available in this category — check back soon.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 24 }}>
            {productList.map(p => (
              <ProductCard
                key={p.id}
                product={p}
                onAddToCart={addToCart}
                onQuickView={goToProduct}
                onWishlistToggle={toggleWishlist}
                wishlisted={wishlist.some(w => w.id === p.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CategoryPage() {
  return (
    <ToastProvider>
      <CategoryPageInner />
    </ToastProvider>
  );
}
