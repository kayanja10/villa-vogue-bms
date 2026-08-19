// scripts/prerender.js
//
// Runs AFTER `vite build` (see package.json: "build": "vite build && node
// scripts/prerender.js"). Serves the built dist/ folder locally, visits
// each public route with a headless browser, waits for the page to signal
// it has real content (via document.body.dataset.prerenderReady — set in
// App.jsx / ProductPage.jsx / TrackOrder.jsx), and overwrites that route's
// HTML in dist/ with the fully-rendered version. This is what lets
// Googlebot see real content immediately instead of an empty <div id="root">.
//
// Replaces vite-plugin-prerender, which fails to load under Node's ESM
// loader on Vercel ("require is not defined in ES module scope").

import { preview } from 'vite';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPrerenderRoutes } from './get-prerender-routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, '..', 'dist');
const READY_SELECTOR = '[data-prerender-ready]';
const PER_ROUTE_TIMEOUT_MS = 15000;

function routeToOutputPath(route) {
  // '/'                     -> dist/index.html
  // '/track'                -> dist/track/index.html
  // '/store/product/123'    -> dist/store/product/123/index.html
  const clean = route === '/' ? '' : route.replace(/^\/|\/$/g, '');
  return clean
    ? path.join(DIST_DIR, clean, 'index.html')
    : path.join(DIST_DIR, 'index.html');
}

async function main() {
  const routes = await getPrerenderRoutes();
  if (!routes.length) {
    console.warn('[prerender] No routes returned — skipping prerender step.');
    return;
  }
  console.log(`[prerender] Prerendering ${routes.length} route(s)...`);

  // Serve the just-built dist/ folder using Vite's own preview server —
  // no extra static-server dependency needed.
  const server = await preview({
    root: path.resolve(__dirname, '..'),
    preview: { port: 4173, strictPort: false },
  });
  const baseUrl = server.resolvedUrls.local[0].replace(/\/$/, '');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  let succeeded = 0;
  let failed = 0;

  try {
    for (const route of routes) {
      const page = await browser.newPage();
      try {
        await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle0', timeout: PER_ROUTE_TIMEOUT_MS });
        await page.waitForSelector(READY_SELECTOR, { timeout: PER_ROUTE_TIMEOUT_MS });

        const html = await page.content();
        const outPath = routeToOutputPath(route);
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.writeFileSync(outPath, html);
        console.log(`[prerender] OK   ${route}`);
        succeeded++;
      } catch (err) {
        // Don't fail the whole build over one route — a stale product ID
        // or a briefly slow API shouldn't block deploying everything else.
        // The route just stays as the plain CSR shell, same as before this
        // whole prerender feature existed — not worse than the status quo.
        console.warn(`[prerender] SKIP ${route} — ${err.message}`);
        failed++;
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.httpServer.close(resolve));
  }

  console.log(`[prerender] Done. ${succeeded} succeeded, ${failed} skipped.`);
}

main().catch((err) => {
  // A bug in this script itself (not a single route) — surface it clearly
  // but still don't hard-fail the deploy, since a broken prerender step
  // is recoverable (just means pages stay CSR-only until fixed), whereas
  // blocking the whole deploy over an SEO enhancement is worse.
  console.error('[prerender] Fatal error, continuing without prerendering:', err);
  process.exit(0);
});
