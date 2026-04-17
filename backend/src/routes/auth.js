require('dotenv').config();
const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { sendOtpEmail } = require('../services/emailService');

// FIX: require sessions at module level — NEVER inside a request handler
// (dynamic require inside handlers causes failures on Render after cold-starts)
const { createSession, TIMEOUTS, WARNINGS } = require('./sessions');

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateTokens(user) {
  const payload     = { userId: user.id, role: user.role, username: user.username };
  const accessToken  = jwt.sign(payload, process.env.JWT_SECRET,         { expiresIn: process.env.JWT_EXPIRES_IN         || '15m' });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET,  { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'  });
  return { accessToken, refreshToken };
}

// ─── OTP stored in the OtpCode table (survives Render restarts) ───────────────
// Schema: OtpCode { id, userId, code, purpose, expiresAt, used, createdAt }
// This replaces the old in-memory Map that was wiped on every cold start.

async function saveOtp(userId, code, expiresAt) {
  // Delete any existing unused OTP for this user first (keep table clean)
  await prisma.otpCode.deleteMany({ where: { userId, purpose: 'login', used: false } });
  await prisma.otpCode.create({
    data: { userId, code, purpose: 'login', expiresAt, used: false },
  });
}

async function getOtp(userId) {
  // Get the most recent unused OTP for this user
  return prisma.otpCode.findFirst({
    where: { userId, purpose: 'login', used: false },
    orderBy: { createdAt: 'desc' },
  });
}

async function markOtpUsed(id) {
  await prisma.otpCode.update({ where: { id }, data: { used: true } });
}

async function clearOtps(userId) {
  await prisma.otpCode.deleteMany({ where: { userId, purpose: 'login' } });
}

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'Username and password required' });

    const user = await prisma.user.findFirst({
      where: { OR: [{ username }, { email: username }] },
    });
    if (!user || !user.isActive)
      return res.status(401).json({ error: 'Invalid credentials' });

    // Lockout check
    if (user.lockedUntil && new Date() < new Date(user.lockedUntil)) {
      const mins = Math.ceil((new Date(user.lockedUntil) - new Date()) / 60000);
      return res.status(423).json({ error: `Account locked. Try again in ${mins} minute(s).` });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      const attempts    = user.loginAttempts + 1;
      const lockedUntil = attempts >= 5 ? new Date(Date.now() + 30 * 60000) : null;
      await prisma.user.update({
        where: { id: user.id },
        data:  { loginAttempts: attempts, lockedUntil },
      });
      return res.status(401).json({
        error: `Invalid credentials. ${Math.max(0, 5 - attempts)} attempt(s) remaining.`,
      });
    }

    // Reset failed attempts on successful password check
    await prisma.user.update({
      where: { id: user.id },
      data:  { loginAttempts: 0, lockedUntil: null, lastLogin: new Date() },
    });

    // ── Admin → 2FA via email OTP ────────────────────────────────────────────
    if (user.role === 'admin') {
      const code      = generateOtp();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

      // FIX: save to DB — survives Render cold starts / restarts
      await saveOtp(user.id, code, expiresAt);

      try {
        await sendOtpEmail('kayanjawilfred@gmail.com', code, user.username);
      } catch (emailErr) {
        console.error('OTP email failed:', emailErr);
        await clearOtps(user.id);
        return res.status(500).json({ error: 'Failed to send verification code. Please try again.' });
      }

      const tempToken = jwt.sign(
        { userId: user.id, purpose: '2fa' },
        process.env.JWT_SECRET,
        { expiresIn: '10m' }
      );

      return res.json({ twoFaRequired: true, tempToken });
    }

    // ── Non-admin → full session immediately ─────────────────────────────────
    const { accessToken, refreshToken } = generateTokens(user);
    const ip        = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const sessionId = createSession({ userId: user.id, username: user.username, role: user.role, ip, userAgent });

    // FIX: Promise.allSettled so a DB write failure never blocks the login response
    await Promise.allSettled([
      prisma.sessionAudit.create({
        data: { sessionId, userId: user.id, username: user.username, role: user.role, loginTime: new Date(), reason: 'login', ip, userAgent },
      }),
      prisma.activityLog.create({
        data: { userId: user.id, username: user.username, action: 'login', entityType: 'auth', details: JSON.stringify({ role: user.role, ip }) },
      }),
    ]);

    return res.json({
      accessToken, refreshToken, sessionId,
      timeoutMs: TIMEOUTS[user.role] ?? TIMEOUTS.staff,
      warningMs: WARNINGS[user.role] ?? WARNINGS.staff,
      user: { id: user.id, username: user.username, email: user.email, role: user.role, avatar: user.avatar },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

// ─── POST /api/auth/2fa/verify ────────────────────────────────────────────────
router.post('/2fa/verify', async (req, res) => {
  try {
    const { tempToken, code } = req.body;
    if (!tempToken || !code)
      return res.status(400).json({ error: 'tempToken and code required' });

    // Verify the short-lived temp token
    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: '2FA session expired. Please log in again.' });
    }
    if (decoded.purpose !== '2fa')
      return res.status(401).json({ error: 'Invalid token purpose.' });

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user || !user.isActive)
      return res.status(401).json({ error: 'Invalid 2FA session.' });

    // FIX: read OTP from DB — not in-memory map
    const otpEntry = await getOtp(user.id);
    if (!otpEntry)
      return res.status(401).json({ error: 'No verification code found. Please log in again.' });

    if (new Date() > new Date(otpEntry.expiresAt)) {
      await clearOtps(user.id);
      return res.status(401).json({ error: 'Verification code expired. Please log in again.' });
    }

    if (code.trim() !== otpEntry.code)
      return res.status(401).json({ error: 'Invalid verification code. Please try again.' });

    // Valid — mark used and issue full session
    await markOtpUsed(otpEntry.id);

    const { accessToken, refreshToken } = generateTokens(user);
    const ip        = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const sessionId = createSession({ userId: user.id, username: user.username, role: user.role, ip, userAgent });

    // FIX: Promise.allSettled — DB audit failures must never block the response
    await Promise.allSettled([
      prisma.sessionAudit.create({
        data: { sessionId, userId: user.id, username: user.username, role: user.role, loginTime: new Date(), reason: 'login', ip, userAgent },
      }),
      prisma.activityLog.create({
        data: { userId: user.id, username: user.username, action: 'login_2fa', entityType: 'auth', details: JSON.stringify({ role: user.role, ip }) },
      }),
    ]);

    return res.json({
      accessToken, refreshToken, sessionId,
      timeoutMs: TIMEOUTS[user.role] ?? TIMEOUTS.staff,
      warningMs: WARNINGS[user.role] ?? WARNINGS.staff,
      user: { id: user.id, username: user.username, email: user.email, role: user.role, avatar: user.avatar },
    });
  } catch (err) {
    console.error('2FA verify error:', err);
    res.status(500).json({ error: '2FA verification failed: ' + err.message });
  }
});

// ─── POST /api/auth/2fa/resend ────────────────────────────────────────────────
router.post('/2fa/resend', async (req, res) => {
  try {
    const { tempToken } = req.body;
    if (!tempToken) return res.status(400).json({ error: 'tempToken required' });

    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: '2FA session expired. Please log in again.' });
    }
    if (decoded.purpose !== '2fa')
      return res.status(401).json({ error: 'Invalid token.' });

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user || !user.isActive || user.role !== 'admin')
      return res.status(401).json({ error: 'Invalid session.' });

    const code      = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await saveOtp(user.id, code, expiresAt); // FIX: DB-backed

    try {
      await sendOtpEmail('kayanjawilfred@gmail.com', code, user.username);
    } catch (emailErr) {
      console.error('OTP resend email failed:', emailErr);
      await clearOtps(user.id);
      return res.status(500).json({ error: 'Failed to resend verification code. Please try again.' });
    }

    res.json({ message: 'A new verification code has been sent to your email.' });
  } catch (err) {
    console.error('2FA resend error:', err);
    res.status(500).json({ error: 'Resend failed: ' + err.message });
  }
});

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' });
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user    = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user || !user.isActive) return res.status(401).json({ error: 'Invalid user' });
    res.json(generateTokens(user));
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// ─── POST /api/auth/change-password ──────────────────────────────────────────
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user  = await prisma.user.findUnique({ where: { id: req.user.id } });
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(400).json({ error: 'Current password incorrect' });
    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.user.id }, data: { password: hashed } });
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: req.user.id },
      select: { id: true, username: true, email: true, role: true, avatar: true, phone: true, createdAt: true, lastLogin: true, twoFaEnabled: true },
    });
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

module.exports = router;
