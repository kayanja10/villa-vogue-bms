require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const http         = require('http');
const { Server }   = require('socket.io');
const rateLimit     = require('express-rate-limit');

const app    = express();
const server = http.createServer(app);

// ─── CORS ─────────────────────────────────────────────────────────────────────
// IMPORTANT: this must be registered BEFORE the rate limiters (and before
// helmet). Express middleware runs in registration order — if a rate
// limiter or any other middleware sends a response first (e.g. a 429),
// CORS headers never get attached to that response. The browser then
// reports the failure as a generic "CORS policy" block, even though the
// real cause was a 429/503, which makes the actual problem much harder to
// diagnose from the client side.
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://villa-vogue-bms-b16k.vercel.app',  // old deployment
  'https://villa-vogue-bms-dpth.vercel.app',  // current deployment
  /^https:\/\/villa-vogue-bms.*\.vercel\.app$/, // all future preview deployments
  'https://villavoguefashion.com',            // custom domain (no www)
  'https://www.villavoguefashion.com',        // custom domain (www)
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const allowed = ALLOWED_ORIGINS.some(o =>
      typeof o === 'string' ? o === origin : o.test(origin)
    );
    if (allowed) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Rate limiting ────────────────────────────────────────────────────────────
// Protects against: a single misbehaving browser tab retrying in a loop,
// a customer's phone accidentally double/triple-tapping checkout repeatedly,
// or genuine abuse/scraping. Without this, the database connection pool can
// exhaust under concurrent load, which is the other major cause (alongside
// Render's free-tier sleep cycle) of the site appearing to "crash" under
// many simultaneous users.
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,       // 1 minute
  max: 120,                  // 120 requests/minute per IP — generous for normal browsing
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please slow down and try again shortly.' },
});

// Stricter limit specifically for order creation — prevents accidental
// duplicate orders from double-clicks and blocks any scripted abuse of the
// public (unauthenticated) checkout endpoint.
const orderLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,                   // 10 order attempts/minute per IP is more than enough for a real shopper
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many order attempts — please wait a moment before trying again.' },
});

app.use('/api/', generalLimiter);
app.use('/api/orders', orderLimiter);

// ─── Socket.IO ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: ALLOWED_ORIGINS, credentials: true },
});
global.io = io;
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
  // Lets a client join a per-customer room (e.g. 'customer:42') so the
  // targeted emit in routes/orders.js (io.to(`customer:${id}`).emit(...))
  // can reach that customer's open tab specifically, on top of the public
  // broadcast everyone already receives.
  socket.on('join', (room) => {
    if (typeof room === 'string' && room.length < 100) socket.join(room);
  });
  socket.on('disconnect', () => console.log('Socket disconnected:', socket.id));
});

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health',     (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ─── Route files ──────────────────────────────────────────────────────────────
// sessions.js exports { router, createSession, ... } — extract .router
const sessionsModule = require('./routes/sessions');
// FIX: sessions exports an object; pull out the router property
const sessionsRouter = sessionsModule.router || sessionsModule;

// Expose createSession globally so auth.js can import it
// (auth.js does: const { createSession, TIMEOUTS, WARNINGS } = require('./sessions'))
// This is fine as long as sessions.js is loaded before auth.js — which it is here.

app.use('/api/auth',            require('./routes/auth'));
app.use('/api/products',        require('./routes/products'));
app.use('/api/customers',       require('./routes/customers'));
app.use('/api/orders',          require('./routes/orders'));
app.use('/api/users',           require('./routes/users'));
app.use('/api/payments',        require('./routes/payments'));
app.use('/api/sessions',        sessionsRouter);
app.use('/api/analytics',       require('./routes/analytics'));
app.use('/api/cashbook',        require('./routes/cashbook'));
app.use('/api/notifications',   require('./routes/notifications'));
app.use('/api/ai',              require('./routes/ai'));

// ─── allRoutes bundle ─────────────────────────────────────────────────────────
const {
  categoriesRouter,
  expensesRouter,
  suppliersRouter,
  settingsRouter,
  activityRouter,
  inventoryRouter,
  reportsRouter,
  discountsRouter,
  quotesRouter,
  staffRouter,
  layawaysRouter,
  debtsRouter,
  feedbackRouter,
  cashFloatRouter,
  purchaseOrdersRouter,
  uploadsRouter,
  refundsRouter,
} = require('./routes/allRoutes');

app.use('/api/categories',      categoriesRouter);
app.use('/api/expenses',        expensesRouter);
app.use('/api/suppliers',       suppliersRouter);
app.use('/api/settings',        settingsRouter);
app.use('/api/activity',        activityRouter);
app.use('/api/inventory',       inventoryRouter);
app.use('/api/reports',         reportsRouter);
app.use('/api/discounts',       discountsRouter);
app.use('/api/quotes',          quotesRouter);
app.use('/api/staff',           staffRouter);
app.use('/api/layaways',        layawaysRouter);
app.use('/api/debts',           debtsRouter);
app.use('/api/feedback',        feedbackRouter);
app.use('/api/cash-float',      cashFloatRouter);
app.use('/api/purchase-orders', purchaseOrdersRouter);
app.use('/api/uploads',         uploadsRouter);
app.use('/api/refunds',         refundsRouter);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` }));

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Villa Vogue BMS backend running on port ${PORT}`));

// ─── Crash protection ─────────────────────────────────────────────────────────
// Express's error-handling middleware above only catches errors inside a
// request/response cycle that properly calls next(err). It does NOT catch:
//   1. Unhandled promise rejections (an async function that throws without
//      being caught anywhere in its call chain)
//   2. Synchronous errors thrown outside any request (e.g. in a setInterval
//      callback, a socket.io event handler, or module-load-time code)
// Without these handlers, ANY single uncaught error anywhere in the process
// crashes the entire Node process — Render then restarts the container,
// which drops every open connection (including in-flight requests and
// socket connections) for ALL users, not just the one who triggered it.
// This is the most likely explanation for "ERR_CONNECTION_CLOSED" reports.
process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 UNHANDLED PROMISE REJECTION:', reason);
  // Log but do NOT exit — keep serving other users' requests
});

process.on('uncaughtException', (err) => {
  console.error('🔥 UNCAUGHT EXCEPTION:', err.message);
  console.error(err.stack);
  // Log but do NOT exit — an uncaught exception in one request handler
  // should not take down the server for everyone else. Render's health
  // checks will restart the process anyway if it becomes truly unhealthy.
});

module.exports = { app, server };