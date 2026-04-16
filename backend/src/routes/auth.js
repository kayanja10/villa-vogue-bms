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

// ─── POST /api/auth/login ────────────────────────────────────────────────────
// Flow:
//   1. Validate credentials
//   2. If 2FA disabled → issue tokens immediately
//   3. If 2FA enabled  → return { twoFaRequired: true, tempToken } 
//      (client must call /api/auth/2fa/verify with the TOTP code + tempToken)
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

    // Reset failed attempts
    await prisma.user.update({ where: { id: user.id }, data: { loginAttempts: 0, lockedUntil: null, lastLogin: new Date() } });

    // ── 2FA CHECK ──
    if (user.twoFaEnabled && user.twoFaSecret) {
      // Issue a short-lived temp token so the client can complete the 2FA step
      const tempToken = jwt.sign(
        { userId: user.id, purpose: '2fa' },
        process.env.JWT_SECRET,
        { expiresIn: '5m' }
      );
      return res.json({ twoFaRequired: true, tempToken });
    }

    // ── NO 2FA — issue full session ──
    const { accessToken, refreshToken } = generateTokens(user);
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const { createSession, TIMEOUTS, WARNINGS } = require('./sessions');
    const sessionId = createSession({ userId: user.id, username: user.username, role: user.role, ip, userAgent });

    await prisma.sessionAudit.create({
      data: { sessionId, userId: user.id, username: user.username, role: user.role, loginTime: new Date(), reason: 'login', ip, userAgent }
    }).catch(() => {});

    await prisma.activityLog.create({
      data: { userId: user.id, username: user.username, action: 'login', entityType: 'auth', details: JSON.stringify({ role: user.role, ip }) }
    }).catch(() => {});

    res.json({
      accessToken, refreshToken, sessionId,
      timeoutMs: TIMEOUTS[user.role] || TIMEOUTS.staff,
      warningMs: WARNINGS[user.role] || WARNINGS.staff,
      user: { id: user.id, username: user.username, email: user.email, role: user.role, avatar: user.avatar },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

// ─── POST /api/auth/2fa/verify ───────────────────────────────────────────────
// Called after login when twoFaRequired === true.
// Body: { tempToken, code }
router.post('/2fa/verify', async (req, res) => {
  try {
    const { tempToken, code } = req.body;
    if (!tempToken || !code) return res.status(400).json({ error: 'tempToken and code required' });

    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: '2FA session expired. Please log in again.' });
    }

    if (decoded.purpose !== '2fa') return res.status(401).json({ error: 'Invalid token' });

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user || !user.isActive || !user.twoFaSecret) {
      return res.status(401).json({ error: 'Invalid 2FA session' });
    }

    const speakeasy = require('speakeasy');
    const verified = speakeasy.totp.verify({
      secret: user.twoFaSecret,
      encoding: 'base32',
      token: code.replace(/\s/g, ''),
      window: 1, // allow 1 step drift (30s either side)
    });

    if (!verified) return res.status(401).json({ error: 'Invalid 2FA code. Try again.' });

    // Code valid — issue full session
    const { accessToken, refreshToken } = generateTokens(user);
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const { createSession, TIMEOUTS, WARNINGS } = require('./sessions');
    const sessionId = createSession({ userId: user.id, username: user.username, role: user.role, ip, userAgent });

    await prisma.sessionAudit.create({
      data: { sessionId, userId: user.id, username: user.username, role: user.role, loginTime: new Date(), reason: 'login', ip, userAgent }
    }).catch(() => {});

    await prisma.activityLog.create({
      data: { userId: user.id, username: user.username, action: 'login_2fa', entityType: 'auth', details: JSON.stringify({ role: user.role, ip }) }
    }).catch(() => {});

    res.json({
      accessToken, refreshToken, sessionId,
      timeoutMs: TIMEOUTS[user.role] || TIMEOUTS.staff,
      warningMs: WARNINGS[user.role] || WARNINGS.staff,
      user: { id: user.id, username: user.username, email: user.email, role: user.role, avatar: user.avatar },
    });
  } catch (err) {
    console.error('2FA verify error:', err);
    res.status(500).json({ error: '2FA verification failed: ' + err.message });
  }
});

// ─── POST /api/auth/2fa/setup ────────────────────────────────────────────────
// Generates a new TOTP secret + QR code for the logged-in user.
// The secret is NOT saved yet — user must confirm with /2fa/enable.
router.post('/2fa/setup', authenticate, async (req, res) => {
  try {
    const speakeasy = require('speakeasy');
    const QRCode = require('qrcode');

    const secret = speakeasy.generateSecret({
      name: `Villa Vogue BMS (${req.user.username})`,
      issuer: 'Villa Vogue BMS',
      length: 20,
    });

    const qrDataUrl = await QRCode.toDataURL(secret.otpauth_url);

    // Store the temp secret in the user row (twoFaSecret) but keep twoFaEnabled=false
    // until they confirm with a valid code via /2fa/enable
    await prisma.user.update({
      where: { id: req.user.id },
      data: { twoFaSecret: secret.base32 },
    });

    res.json({
      secret: secret.base32,   // show to user as manual entry fallback
      qrCode: qrDataUrl,        // base64 PNG to render as <img src=...>
      message: 'Scan the QR code with Google Authenticator or Authy, then call /2fa/enable with a valid code to activate.',
    });
  } catch (err) {
    console.error('2FA setup error:', err);
    res.status(500).json({ error: '2FA setup failed: ' + err.message });
  }
});

// ─── POST /api/auth/2fa/enable ───────────────────────────────────────────────
// Confirms setup by verifying the first TOTP code, then enables 2FA.
// Body: { code }
router.post('/2fa/enable', authenticate, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'TOTP code required' });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user.twoFaSecret) {
      return res.status(400).json({ error: 'Run /2fa/setup first to generate a secret.' });
    }

    const speakeasy = require('speakeasy');
    const verified = speakeasy.totp.verify({
      secret: user.twoFaSecret,
      encoding: 'base32',
      token: code.replace(/\s/g, ''),
      window: 1,
    });

    if (!verified) return res.status(400).json({ error: 'Invalid code. Make sure your authenticator app is synced.' });

    await prisma.user.update({ where: { id: req.user.id }, data: { twoFaEnabled: true } });

    await prisma.activityLog.create({
      data: { userId: user.id, username: user.username, action: '2fa_enabled', entityType: 'auth', details: '{}' }
    }).catch(() => {});

    res.json({ message: '2FA enabled successfully. You will be asked for a code on every login.' });
  } catch (err) {
    console.error('2FA enable error:', err);
    res.status(500).json({ error: '2FA enable failed: ' + err.message });
  }
});

// ─── POST /api/auth/2fa/disable ──────────────────────────────────────────────
// Disables 2FA. Requires the user's current TOTP code as confirmation.
// Body: { code }
router.post('/2fa/disable', authenticate, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'TOTP code required to disable 2FA' });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user.twoFaEnabled) return res.status(400).json({ error: '2FA is not enabled' });

    const speakeasy = require('speakeasy');
    const verified = speakeasy.totp.verify({
      secret: user.twoFaSecret,
      encoding: 'base32',
      token: code.replace(/\s/g, ''),
      window: 1,
    });

    if (!verified) return res.status(400).json({ error: 'Invalid code. 2FA not disabled.' });

    await prisma.user.update({ where: { id: req.user.id }, data: { twoFaEnabled: false, twoFaSecret: null } });

    await prisma.activityLog.create({
      data: { userId: user.id, username: user.username, action: '2fa_disabled', entityType: 'auth', details: '{}' }
    }).catch(() => {});

    res.json({ message: '2FA disabled successfully.' });
  } catch (err) {
    console.error('2FA disable error:', err);
    res.status(500).json({ error: '2FA disable failed: ' + err.message });
  }
});

// ─── GET /api/auth/2fa/status ─────────────────────────────────────────────────
router.get('/2fa/status', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { twoFaEnabled: true } });
    res.json({ twoFaEnabled: user.twoFaEnabled });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────
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

// ─── POST /api/auth/change-password ──────────────────────────────────────────
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

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, username: true, email: true, role: true, avatar: true, phone: true, createdAt: true, lastLogin: true, twoFaEnabled: true }
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

module.exports = router;
