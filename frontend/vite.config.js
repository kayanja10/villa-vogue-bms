import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
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
            // Cache API calls for products, categories, customers
            urlPattern: /^https:\/\/villa-vogue-bms\.onrender\.com\/api\/(products|categories|customers|settings)/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 }, // 24 hours
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Cache dashboard analytics
            urlPattern: /^https:\/\/villa-vogue-bms\.onrender\.com\/api\/analytics/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'analytics-cache',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 30 }, // 30 mins
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Cache static assets
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|ico|woff|woff2)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 }, // 30 days
            },
          },
        ],
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
});
