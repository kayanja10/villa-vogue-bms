import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';
import prerender from 'vite-plugin-prerender';
import { getPrerenderRoutes } from './scr/get-prerender-routes.js';

const Renderer = prerender.PuppeteerRenderer;

// Vite supports an async config factory, which lets us fetch the real
// product list from the API at build time before deciding which routes
// to prerender.
export default defineConfig(async () => {
  // Real public routes, based on App.jsx:
  //   '/'                    -> CustomerPortalWrapper (storefront home)
  //   '/track'                -> TrackOrder (public, no login)
  //   '/store/product/:id'    -> ProductPage (one per real product)
  // NOT prerendered (stay client-rendered + noindex-by-default):
  //   '/store/*'   -> alias for '/', already self-canonicalizes to '/'
  //   '/login'     -> staff login, no indexable content
  //   '/dashboard/*' -> entire BMS, staff-only
  const routesToPrerender = await getPrerenderRoutes();

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'logo.png'],
        manifest: {
          name: 'Villa Vogue BMS',
          short_name: 'VillaVogue',
          description: 'Villa Vogue Fashions Business Management System',
          theme_color: '#C9A96E',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            { src: '/logo.png', sizes: '192x192', type: 'image/png' },
            { src: '/logo.png', sizes: '512x512', type: 'image/png' },
            { src: '/logo.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/villa-vogue-bms\.onrender\.com\/api\/(products|categories|customers|settings)/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'api-cache',
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /^https:\/\/villa-vogue-bms\.onrender\.com\/api\/analytics/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'analytics-cache',
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|ico|woff|woff2)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'static-assets',
                expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
      }),
      // ---------------------------------------------------------------
      // PRERENDER: runs after `vite build`. A headless browser visits
      // each route below in the built app, waits for data to load, and
      // saves the fully-rendered HTML into dist/ — so Googlebot (and
      // anyone else) sees real content immediately, not an empty shell.
      // ---------------------------------------------------------------
      prerender({
        staticDir: path.join(__dirname, 'dist'),
        routes: routesToPrerender,
        renderer: new Renderer({
          // Wait for the page itself to signal readiness (set via
          // document.body.setAttribute('data-prerender-ready', 'true')
          // in App.jsx / ProductPage.jsx) instead of guessing a fixed delay.
          // Falls back to a hard cap so one stuck page can't hang the build.
          renderAfterElementExists: '[data-prerender-ready]',
          maxConcurrentRoutes: 4,
          timeout: 15000, // hard cap so one stuck page can't hang the whole build
          headless: true,
        }),
        postProcess(renderedRoute) {
          // These routes are ones we explicitly WANT indexed, so make sure
          // no default noindex tag survives into the prerendered output.
          renderedRoute.html = renderedRoute.html.replace(
            /<meta[^>]*name="robots"[^>]*content="noindex[^>]*>/gi,
            '<meta name="robots" content="index, follow">'
          );
          return renderedRoute;
        },
      }),
    ],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    server: {
      port: 3000,
      proxy: {
        '/api': { target: 'http://localhost:5000', changeOrigin: true },
        '/socket.io': { target: 'http://localhost:5000', ws: true },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            charts: ['recharts'],
            ui: ['lucide-react', 'framer-motion'],
          },
        },
      },
    },
  };
});
