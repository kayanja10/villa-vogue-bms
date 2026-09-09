// api/sitemap.xml.js
//
// Vercel serverless function that generates sitemap.xml on every request,
// pulling live product and category data from the Render backend. Because
// this is a Vite SPA (not Next.js), there's no built-in server-side
// rendering step to hook a sitemap into — a serverless function is the
// equivalent, zero-extra-infrastructure way to get the same "always
// up to date" behaviour Next.js's generateSitemaps would give you.
//
// URL once deployed: https://www.villavoguefashion.com/sitemap.xml
//
// IMPORTANT: SITE_URL must match your canonical domain exactly (the one
// Vercel actually serves, not the one that redirects to it). The apex
// domain (villavoguefashion.com) 301-redirects to www — using the apex
// here previously caused every single sitemap URL to be flagged by
// Google Search Console as "Page with redirect", since Googlebot had to
// follow a redirect on every URL instead of landing directly.
const SITE_URL = 'https://www.villavoguefashion.com';
const API_BASE = process.env.VITE_API_URL || 'https://villa-vogue-bms.onrender.com/api';

// XML special characters that must be escaped inside <url> entries —
// product names containing & < > " ' would otherwise produce invalid XML
// that Google Search Console rejects outright.
function escapeXml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlEntry({ loc, lastmod, changefreq, priority }) {
  return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

// Fetch with a timeout so a slow/cold Render instance can't hang the
// sitemap request indefinitely — Google's crawler (and Vercel's function
// timeout) won't wait forever, so we fail gracefully to a static-only
// sitemap rather than erroring out completely.
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
  const today = new Date().toISOString().split('T')[0];

  // ── Static pages — always present regardless of API availability ──────────
  // Only routes that genuinely exist in App.jsx are listed here. /shop,
  // /about, /register, and /cart were never real standalone routes in this
  // app — About is a homepage section, registration happens inside the
  // login modal, and cart is a slide-out drawer, not a page — so including
  // them would have sent Google to 404s or silent homepage redirects,
  // which actively hurts SEO rather than helping it.
  const staticUrls = [
    { loc: `${SITE_URL}/`,      lastmod: today, changefreq: 'daily',    priority: '1.0' },
    { loc: `${SITE_URL}/store`, lastmod: today, changefreq: 'daily',    priority: '0.9' },
    { loc: `${SITE_URL}/track`, lastmod: today, changefreq: 'monthly',  priority: '0.4' },
    // /login is intentionally excluded — it's the staff/admin login, not a
    // customer-facing page, and has no SEO value.
  ];

  let productUrls = [];

  try {
    // ── Products — fetched from the existing public products endpoint ───────
    // SEO: now points at the real, canonical /shop/:categorySlug/:productSlug
    // URL instead of the legacy id-based one — that route is 301-redirected
    // now (see api/redirect-product.js), so it must never appear in the
    // sitemap itself. Any product missing a slug or category slug (not yet
    // touched by the backfill script) is skipped rather than emitting a
    // broken URL — it'll appear automatically on the next sitemap request
    // once backfillSlugs.js has run.
    const productsData = await fetchWithTimeout(`${API_BASE}/products/public?limit=500`);
    const products = productsData?.products || [];
    productUrls = products
      .filter((p) => p.slug && p.category?.slug)
      .map((p) => ({
        loc: `${SITE_URL}/shop/${p.category.slug}/${p.slug}`,
        lastmod: p.updatedAt ? p.updatedAt.split('T')[0] : today,
        changefreq: 'weekly',
        priority: p.isFeatured ? '0.9' : '0.7',
      }));
  } catch (err) {
    console.error('Sitemap: failed to fetch products', err.message);
    // Fall through with an empty product list rather than failing the
    // whole sitemap — static pages should still be crawlable even if the
    // backend is cold-starting or briefly down.
  }

  // ── Categories ───────────────────────────────────────────────────────────
  // SEO: /shop/:categorySlug is now a real, working route (see App.jsx +
  // CategoryPage.jsx) that reads the category from the URL path itself —
  // unlike the old ?category= query param, this always resolves to the
  // right content on a fresh page load, so it's safe to list here. Only
  // categories the public endpoint returns are included, which already
  // excludes any category with zero active/in-stock products.
  let categoryUrls = [];
  try {
    const catData = await fetchWithTimeout(`${API_BASE}/categories/public`);
    const cats = Array.isArray(catData) ? catData : (catData?.categories || []);
    categoryUrls = cats
      .filter((c) => c.slug)
      .map((c) => ({
        loc: `${SITE_URL}/shop/${c.slug}`,
        lastmod: today,
        changefreq: 'weekly',
        priority: '0.8',
      }));
  } catch (err) {
    console.error('Sitemap: failed to fetch categories', err.message);
  }

  const allUrls = [...staticUrls, ...productUrls, ...categoryUrls];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(urlEntry).join('\n')}
</urlset>`;

  // Cache for 1 hour at the edge — keeps the sitemap "live" (new products
  // show up within an hour of being added) without hitting the Render API
  // on every single crawl request, which matters since Render's free/
  // starter tier has limited concurrent connection headroom (see the
  // earlier system audit on Prisma connection pooling).
  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(xml);
}
