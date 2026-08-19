// scripts/get-prerender-routes.js
//
// Fetches real, live product IDs at BUILD TIME so each product gets its own
// prerendered page at /store/product/:id. Runs during `vite build` (imported
// by vite.config.js) — needs network access to your Render API, which Vercel
// build steps have by default.

const API_BASE =
  process.env.VITE_API_URL || 'https://villa-vogue-bms.onrender.com/api';

export async function getPrerenderRoutes() {
  const staticRoutes = ['/', '/track'];

  let productRoutes = [];
  try {
    const res = await fetch(`${API_BASE}/products/public?limit=500`);
    const data = await res.json();
    const products = data?.products || data?.data || (Array.isArray(data) ? data : []);
    productRoutes = products
      .filter((p) => p && (p.id ?? p._id))
      .map((p) => `/store/product/${p.id ?? p._id}`);
  } catch (err) {
    // Don't fail the whole build if the API is briefly unreachable —
    // just skip dynamic product prerendering for this build and log it.
    console.warn('[prerender] Could not fetch product list for prerendering:', err.message);
  }

  return [...staticRoutes, ...productRoutes];
}
