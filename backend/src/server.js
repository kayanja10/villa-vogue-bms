require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000', methods: ['GET', 'POST'], credentials: true },
});
app.set('io', io);
global.io = io;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(cors({ origin: [process.env.FRONTEND_URL || 'http://localhost:3000', 'http://localhost:3001', /\.vercel\.app$/, /\.netlify\.app$/, /\.render\.com$/], credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api/', rateLimit({ windowMs: 15*60*1000, max: 500 }));

// Auth
app.use('/api/auth', rateLimit({ windowMs: 15*60*1000, max: 10 }), require('./routes/auth'));

// Core routes
app.use('/api/users', require('./routes/users'));
app.use('/api/products', require('./routes/products'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/analytics', require('./routes/analytics'));

// New routes
app.use('/api/ai', require('./routes/ai'));
app.use('/api/cashbook', require('./routes/cashbook'));
app.use('/api/notifications', require('./routes/notifications'));

// Combined routes
const {
  categoriesRouter, expensesRouter, suppliersRouter, settingsRouter,
  activityRouter, inventoryRouter, reportsRouter, discountsRouter,
  quotesRouter, staffRouter, layawaysRouter, debtsRouter, feedbackRouter,
  cashFloatRouter, purchaseOrdersRouter, uploadsRouter,
} = require('./routes/allRoutes');

app.use('/api/categories', categoriesRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/suppliers', suppliersRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/activity', activityRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/discounts', discountsRouter);
app.use('/api/quotes', quotesRouter);
app.use('/api/staff', staffRouter);
app.use('/api/layaways', layawaysRouter);
app.use('/api/debts', debtsRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/cash-float', cashFloatRouter);
app.use('/api/purchase-orders', purchaseOrdersRouter);
app.use('/api/uploads', uploadsRouter);

app.get('/api/health', (req, res) => res.json({ status: 'ok', version: '2.1.0', timestamp: new Date().toISOString() }));

require('./sockets/socketHandler')(io);

app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Server error' : err.message });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Villa Vogue BMS v2.1 → http://localhost:${PORT}`));
module.exports = { app, io };
