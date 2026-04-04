const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { sendOtpEmail } = require('../services/emailService');
const { authenticate } = require('../middleware/auth');

const prisma = new PrismaClient();

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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

    // Reset failed attempts
    await prisma.user.update({ where: { id: user.id }, data: { loginAttempts: 0, lockedUntil: null } });

    // Admin requires 2FA via email OTP
    if (user.role === 'admin') {
      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60000);

      // Invalidate old OTPs
      await prisma.otpCode.updateMany({
        where: { userId: user.id, purpose: '2fa_login', used: false },
        data: { used: true },
      });

      await prisma.otpCode.create({
        data: { userId: user.id, code: otp, purpose: '2fa_login', expiresAt },
      });

      // Send to admin email
      const emailTo = user.email || process.env.EMAIL_USER;
      await sendOtpEmail(emailTo, otp, user.username);

      return res.json({
        requires2FA: true,
        userId: user.id,
        message: `Verification code sent to ${emailTo.replace(/(.{2}).+(@.+)/, '$1***$2')}`,
      });
    }

    // Non-admin: issue tokens immediately
    const { accessToken, refreshToken } = generateTokens(user);
    await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

    await prisma.activityLog.create({
      data: { userId: user.id, username: user.username, action: 'login', entityType: 'auth', details: JSON.stringify({ role: user.role }) }
    });

    res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, username: user.username, email: user.email, role: user.role, avatar: user.avatar },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/verify-2fa
router.post('/verify-2fa', async (req, res) => {
  try {
    const { userId, code } = req.body;
    if (!userId || !code) return res.status(400).json({ error: 'User ID and code required' });

    const otp = await prisma.otpCode.findFirst({
      where: { userId: parseInt(userId), code, purpose: '2fa_login', used: false },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) return res.status(401).json({ error: 'Invalid verification code' });
    if (new Date() > new Date(otp.expiresAt)) {
      return res.status(401).json({ error: 'Verification code has expired. Please login again.' });
    }

    // Mark OTP as used
    await prisma.otpCode.update({ where: { id: otp.id }, data: { used: true } });

    const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
    if (!user) return res.status(401).json({ error: 'User not found' });

    const { accessToken, refreshToken } = generateTokens(user);
    await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date(), loginAttempts: 0 } });

    await prisma.activityLog.create({
      data: { userId: user.id, username: user.username, action: 'login_2fa', entityType: 'auth', details: JSON.stringify({ role: user.role }) }
    });

    res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, username: user.username, email: user.email, role: user.role, avatar: user.avatar },
    });
  } catch (err) {
    console.error('2FA verify error:', err);
    res.status(500).json({ error: '2FA verification failed' });
  }
});

// POST /api/auth/resend-otp
router.post('/resend-otp', async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60000);

    await prisma.otpCode.updateMany({
      where: { userId: user.id, purpose: '2fa_login', used: false },
      data: { used: true },
    });

    await prisma.otpCode.create({ data: { userId: user.id, code: otp, purpose: '2fa_login', expiresAt } });

    const emailTo = user.email || process.env.EMAIL_USER;
    await sendOtpEmail(emailTo, otp, user.username);

    res.json({ message: 'New verification code sent' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to resend code' });
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
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { id: true, username: true, email: true, role: true, avatar: true, phone: true, createdAt: true, lastLogin: true } });
  res.json(user);
});

module.exports = router;
