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
// Uses puppeteer-core + @sparticuz/chromium instead of plain puppeteer.
// Vercel's build container is missing several shared libraries (libnss3.so
// and others) that a normal desktop Chrome download needs, causing
// "error while loading shared libraries" on launch. @sparticuz/chromium is
// a Chromium build compiled specifically for minimal serverless/CI
// environments like this one, so it launches cleanly with no extra
// system packages needed.

import { preview } from 'vite';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPrerenderRoutes } from './get-prerender-routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, '..', 'dist');
const READY_SELECTOR = '[data-prerender-ready]';
const PER_ROUTE_TIMEOUT_MS = 15000;

// True on Vercel's build machines (and most CI), false when you run this
// locally on Windows/Mac to test — locally, fall back to a normal Chrome/
// Chromium install on your machine instead of the serverless binary.
const IS_SERVERLESS_BUILD = !!process.env.VERCEL || !!process.env.CI;

function routeToOutputPath(route) {
  const clean = route === '/' ? '' : route.replace(/^\/|\/$/g, '');
  return clean
    ? path.join(DIST_DIR, clean, 'index.html')
    : path.join(DIST_DIR, 'index.html');
}

async function launchBrowser() {
  if (IS_SERVERLESS_BUILD) {
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  }
  // Local dev fallback — uses whatever Chrome/Edge is installed on your
  // machine rather than requiring the serverless binary locally too.
  const localChromePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
  ];
  const found = localChromePaths.find((p) => fs.existsSync(p));
  if (!found) {
    throw new Error(
      'No local Chrome install found for local testing. Either install Chrome, ' +
      'or set VERCEL=1 in your env to force the serverless binary path locally.'
    );
  }
  return puppeteer.launch({ executablePath: found, headless: true });
}

async function main() {
  const routes = await getPrerenderRoutes();
  if (!routes.length) {
    console.warn('[prerender] No routes returned — skipping prerender step.');
    return;
  }
  console.log(`[prerender] Prerendering ${routes.length} route(s)...`);

  const server = await preview({
    root: path.resolve(__dirname, '..'),
    preview: { port: 4173, strictPort: false },
  });
  const baseUrl = server.resolvedUrls.local[0].replace(/\/$/, '');

  const browser = await launchBrowser();

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
  console.error('[prerender] Fatal error, continuing without prerendering:', err);
  process.exit(0);
});
