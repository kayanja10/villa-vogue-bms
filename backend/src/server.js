require('dotenv').config();
const express     = require('express');
const http        = require('http');
const { Server }  = require('socket.io');
const cors        = require('cors');
const helmet      = require('helmet');
const compression = require('compression');
const morgan      = require('morgan');
const rateLimit   = require('express-rate-limit');

const app    = express();
const server = http.createServer(app);

// ─── ALLOWED ORIGINS ──────────────────────────────────────────────────────────
// Covers localhost dev, all Vercel deployments (incl. dots/uppercase in subdomain),
// Netlify, and Render. filter(Boolean) drops undefined FRONTEND_URL safely.
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'https://villa-vogue-bms-pjmp.vercel.app',
  /^https:\/\/[\w.-]+\.vercel\.app$/,
  /^https:\/\/[\w.-]+\.netlify\.app$/,
  /^https:\/\/[\w.-]+\.onrender\.com$/,
].filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin) return true; // server-to-server / curl
  return ALLOWED_ORIGINS.some((o) =>
    typeof o === 'string' ? o === origin : o.test(origin)
  );
}

const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) return callback(null, true);
    console.warn('[CORS] Blocked:', origin);
    callback(new Error(`CORS: origin not allowed — ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

// ─── CRITICAL: handle OPTIONS preflight BEFORE everything else ────────────────
// Without this, browsers block cross-origin POST/PUT/DELETE before they even fire.
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

// ─── Socket.io ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) return callback(null, true);
      callback(new Error('Socket CORS blocked'));
    },
    methods:     ['GET', 'POST'],
    credentials: true,
  },
});
app.set('io', io);
global.io = io;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Diagnostics (safe to leave in — low overhead) ───────────────────────────
app.use((req, _res, next) => {
  if (req.method === 'OPTIONS' || req.path.startsWith('/api/auth')) {
    console.log(`[${req.method}] ${req.path} | origin: ${req.headers.origin || 'none'}`);
  }
  next();
});

// ─── Rate limiting ────────────────────────────────────────────────────────────
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));
// Auth: 50 attempts per 15 min — handles 2FA (login + verify = 2 requests per attempt)
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 50 }), require('./routes/auth'));

// ─── Core routes ──────────────────────────────────────────────────────────────
app.use('/api/users',         require('./routes/users'));
app.use('/api/products',      require('./routes/products'));
app.use('/api/customers',     require('./routes/customers'));
app.use('/api/orders',        require('./routes/orders'));
app.use('/api/payments',      require('./routes/payments'));
app.use('/api/analytics',     require('./routes/analytics'));
app.use('/api/ai',            require('./routes/ai'));
app.use('/api/cashbook',      require('./routes/cashbook'));
app.use('/api/notifications', require('./routes/notifications'));

// Sessions
const { router: sessionsRouter } = require('./routes/sessions');
app.use('/api/sessions', sessionsRouter);

// Combined routes
const {
  categoriesRouter, expensesRouter, suppliersRouter, settingsRouter,
  activityRouter, inventoryRouter, reportsRouter, discountsRouter,
  quotesRouter, staffRouter, layawaysRouter, debtsRouter, feedbackRouter,
  cashFloatRouter, purchaseOrdersRouter, uploadsRouter,
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

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', version: '2.2.1', timestamp: new Date().toISOString() })
);

// ─── Socket.io events ─────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  socket.on('join:session', (sessionId) => socket.join(`session:${sessionId}`));
  socket.on('join:room',    (room)      => socket.join(room));
  socket.on('disconnect',   () => {});
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Server error' : err.message,
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`🚀 Villa Vogue BMS v2.2.1 → http://localhost:${PORT}`)
);

module.exports = { app, io };
