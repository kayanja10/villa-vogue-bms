const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
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

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
};

const requireManagerOrAdmin = (req, res, next) => {
  if (!['admin', 'manager'].includes(req.user.role)) return res.status(403).json({ error: 'Manager or admin access required' });
  next();
};

const logActivity = (action, entityType) => async (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = async (data) => {
    if (res.statusCode < 400 && req.user) {
      try {
        await prisma.activityLog.create({
          data: {
            userId: req.user.id,
            username: req.user.username,
            action,
            entityType,
            entityId: String(data?.id || req.params?.id || ''),
            details: JSON.stringify({ method: req.method, path: req.path }),
          }
        });
      } catch (e) { /* silent fail */ }
    }
    return originalJson(data);
  };
  next();
};

module.exports = { authenticate, requireAdmin, requireManagerOrAdmin, logActivity };
