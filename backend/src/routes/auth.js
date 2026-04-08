require('dotenv').config();
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const prisma = new PrismaClient();

function generateTokens(user) {
  const payload = { userId: user.id, role: user.role, username: user.username };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '15m' });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });
  return { accessToken, refreshToken };
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const user = await prisma.user.findFirst({ where: { OR: [{ username }, { email: username }] } });
    if (!user || !user.isActive) return res.status(401).json({ error: 'Invalid credentials' });

    // Check lockout
    if (user.lockedUntil && new Date() < new Date(user.lockedUntil)) {
      const mins = Math.ceil((new Date(user.lockedUntil) - new Date()) / 60000);
      return res.status(423).json({ error: `Account locked. Try again in ${mins} minute(s).` });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      const attempts = user.loginAttempts + 1;
      const lockedUntil = attempts >= 5 ? new Date(Date.now() + 30 * 60000) : null;
      await prisma.user.update({ where: { id: user.id }, data: { loginAttempts: attempts, lockedUntil } });
      return res.status(401).json({ error: `Invalid credentials. ${5 - attempts} attempt(s) remaining.` });
    }

    await prisma.user.update({ where: { id: user.id }, data: { loginAttempts: 0, lockedUntil: null, lastLogin: new Date() } });

    const { accessToken, refreshToken } = generateTokens(user);

    // Create session
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const { createSession, TIMEOUTS, WARNINGS } = require('./sessions');
    const sessionId = createSession({ userId: user.id, username: user.username, role: user.role, ip, userAgent });

    // Log login audit
    await prisma.sessionAudit.create({
      data: { sessionId, userId: user.id, username: user.username, role: user.role, loginTime: new Date(), reason: 'login', ip, userAgent }
    }).catch(() => {});

    await prisma.activityLog.create({
      data: { userId: user.id, username: user.username, action: 'login', entityType: 'auth', details: JSON.stringify({ role: user.role, ip }) }
    }).catch(() => {});

    res.json({
      accessToken, refreshToken,
      sessionId,
      timeoutMs: TIMEOUTS[user.role] || TIMEOUTS.staff,
      warningMs: WARNINGS[user.role] || WARNINGS.staff,
      user: { id: user.id, username: user.username, email: user.email, role: user.role, avatar: user.avatar },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' });
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user || !user.isActive) return res.status(401).json({ error: 'Invalid user' });
    const tokens = generateTokens(user);
    res.json(tokens);
  } catch (err) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(400).json({ error: 'Current password incorrect' });
    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.user.id }, data: { password: hashed } });
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, username: true, email: true, role: true, avatar: true, phone: true, createdAt: true, lastLogin: true }
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

module.exports = router;
