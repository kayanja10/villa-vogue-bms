const jwt = require('jsonwebtoken');
const { prisma } = require('../prisma');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Select only the fields actually needed here, not the full user row
    // (password hash, etc.) — this runs on EVERY protected request across
    // the whole app, so trimming the query reduces database load under
    // concurrent traffic without losing the security benefit of confirming
    // the user still exists and hasn't been deactivated mid-session.
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, username: true, role: true, email: true, isActive: true },
    });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid or inactive user' });
    }
    req.user = { id: user.id, username: user.username, role: user.role, email: user.email };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expired' });
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// ── Customer portal authentication ──────────────────────────────────────────
// Separate from `authenticate` above on purpose: portal tokens are signed
// with { customerId } (see routes/customers.js portal/login + portal/register),
// not { userId } like staff tokens, and they map to the `customer` table, not
// `user`. Previously there was NO middleware at all for this — a logged-in
// customer had no way to authenticate for their own orders or a refreshed
// loyalty balance, which is why the account drawer always showed zeros.
const authenticateCustomer = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.customerId) {
      // A staff token (signed with userId) was sent here by mistake, or vice versa
      return res.status(401).json({ error: 'Invalid token for this endpoint' });
    }
    const customer = await prisma.customer.findUnique({
      where: { id: decoded.customerId },
      select: { id: true, name: true, email: true, phone: true, loyaltyPoints: true, tier: true, createdAt: true, isActive: true },
    });
    if (!customer || !customer.isActive) {
      return res.status(401).json({ error: 'Invalid or inactive customer account' });
    }
    req.customer = customer;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expired' });
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const requireAdmin = (req, res, next) => {
  // Defensive guard: if a route ever forgets to chain `authenticate` before
  // this middleware, req.user would be undefined and req.user.role would
  // throw an uncaught TypeError, 500-ing the request with a confusing error
  // instead of a clear "unauthenticated" message. This can never crash now,
  // even if a future route is wired up incorrectly.
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
};

const requireManagerOrAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (!['admin', 'manager'].includes(req.user.role)) return res.status(403).json({ error: 'Manager or admin access required' });
  next();
};

const logActivity = (action, entityType) => (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (data) => {
    // Send the actual response immediately — don't make the customer/staff
    // member wait for the activity log write to finish. The previous version
    // made res.json itself async, which delayed every response on this
    // middleware until the database write completed, and any synchronous
    // error before reaching the try/catch could have left the response
    // unsent entirely. Logging now happens fully in the background.
    if (res.statusCode < 400 && req.user) {
      prisma.activityLog.create({
        data: {
          userId: req.user.id,
          username: req.user.username,
          action,
          entityType,
          entityId: String(data?.id || req.params?.id || ''),
          details: JSON.stringify({ method: req.method, path: req.path }),
        }
      }).catch(() => { /* silent fail — logging should never break the request */ });
    }
    return originalJson(data);
  };
  next();
};

module.exports = { authenticate, authenticateCustomer, requireAdmin, requireManagerOrAdmin, logActivity };
