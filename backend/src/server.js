require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const http       = require('http');
const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');

// ─── Routes ───────────────────────────────────────────────────────────────────
const authRoutes     = require('./routes/auth');
const productRoutes  = require('./routes/products');
const customerRoutes = require('./routes/customers');
const orderRoutes    = require('./routes/orders');
const userRoutes     = require('./routes/users');
const sessionRoutes  = require('./routes/sessions');
const {
  categoriesRouter, expensesRouter, suppliersRouter, settingsRouter,
  activityRouter, inventoryRouter, reportsRouter, discountsRouter,
  quotesRouter, staffRouter, layawaysRouter, debtsRouter, feedbackRouter,
  cashFloatRouter, purchaseOrdersRouter, uploadsRouter,
} = require('./routes/allRoutes');

const prisma = new PrismaClient();
const app    = express();
const server = http.createServer(app);

// ─── CORS ─────────────────────────────────────────────────────────────────────
// FIX: explicitly allow all Villa Vogue frontend origins
// Add any new Vercel preview URLs here if needed
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://villa-vogue-bms-b16k.vercel.app',
  // catches any *.vercel.app preview deployments for this project
  /^https:\/\/villa-vogue-bms.*\.vercel\.app$/,
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server / curl (no origin)
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

// ─── Socket.IO ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    credentials: true,
  },
});
global.io = io;
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
  socket.on('disconnect', () => console.log('Socket disconnected:', socket.id));
});

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Health check (no auth — Render & UptimeRobot use this) ──────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',           authRoutes);
app.use('/api/products',       productRoutes);
app.use('/api/customers',      customerRoutes);
app.use('/api/orders',         orderRoutes);
app.use('/api/users',          userRoutes);
app.use('/api/sessions',       sessionRoutes);
app.use('/api/categories',     categoriesRouter);
app.use('/api/expenses',       expensesRouter);
app.use('/api/suppliers',      suppliersRouter);
app.use('/api/settings',       settingsRouter);
app.use('/api/activity',       activityRouter);
app.use('/api/inventory',      inventoryRouter);
app.use('/api/reports',        reportsRouter);
app.use('/api/discounts',      discountsRouter);
app.use('/api/quotes',         quotesRouter);
app.use('/api/staff',          staffRouter);
app.use('/api/layaways',       layawaysRouter);
app.use('/api/debts',          debtsRouter);
app.use('/api/feedback',       feedbackRouter);
app.use('/api/cash-float',     cashFloatRouter);
app.use('/api/purchase-orders',purchaseOrdersRouter);
app.use('/api/uploads',        uploadsRouter);

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

module.exports = { app, server };
