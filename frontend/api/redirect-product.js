// frontend/api/redirect-product.js
//
// Permanently redirects old-style product links (/store/product/:id) to
// their new SEO-friendly URL (/shop/:categorySlug/:productSlug), so any
// link already shared, bookmarked, or indexed by Google under the old
// scheme keeps working and passes its ranking signal to the new URL
// instead of 404ing or splitting into duplicate content.
//
// Wired up in vercel.json:
//   { "source": "/store/product/:id", "destination": "/api/redirect-product?id=:id" }
//
// Same fetch-with-timeout pattern as api/sitemap.xml.js, for the same
// reason: Render's free/starter tier can cold-start, and this must fail
// gracefully rather than hang the request.

const API_BASE = process.env.VITE_API_URL || 'https://villa-vogue-bms.onrender.com/api';
const SITE_URL = 'https://www.villavoguefashion.com';

async function fetchWithTimeout(url, ms = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req, res) {
  const { id } = req.query;
  const numericId = parseInt(id, 10);

  if (!numericId || Number.isNaN(numericId)) {
    res.writeHead(302, { Location: `${SITE_URL}/` });
    return res.end();
  }

  try {
    const product = await fetchWithTimeout(`${API_BASE}/products/public/${numericId}`);
    const categorySlug = product?.category?.slug;
    const productSlug = product?.slug;

    if (categorySlug && productSlug) {
      // Permanent redirect — this is what transfers the old URL's existing
      // Google ranking signal to the new one instead of starting from zero.
      res.writeHead(301, { Location: `${SITE_URL}/shop/${categorySlug}/${productSlug}` });
      return res.end();
    }

    // Slug not backfilled yet for this specific product (only possible in
    // the brief window between the schema migration and running
    // backfillSlugs.js) — use a TEMPORARY redirect to the homepage rather
    // than a 301, and rather than looping back into /store/product/:id
    // (which this same rewrite would just intercept again). This self-
    // resolves permanently once the backfill script has run.
    res.writeHead(302, { Location: `${SITE_URL}/` });
    return res.end();
  } catch (err) {
    // Product not found, API down, or request timed out — send to the
    // homepage rather than a dead end. Temporary (302), since this may
    // well be a transient backend issue rather than a genuinely gone URL.
    res.writeHead(302, { Location: `${SITE_URL}/` });
    return res.end();
  }
}
