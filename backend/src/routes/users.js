// ============ USERS ROUTE ============
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireAdmin } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

// GET /api/users
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, email: true, phone: true, role: true, avatar: true, isActive: true, createdAt: true, lastLogin: true, loginAttempts: true, lockedUntil: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/users
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { username, email, phone, password, role } = req.body;
    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { username, email, phone, password: hashed, role: role || 'staff' },
      select: { id: true, username: true, email: true, phone: true, role: true, isActive: true, createdAt: true },
    });
    res.status(201).json(user);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Username or email already exists' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { username, email, phone, role, isActive } = req.body;
    const user = await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data: { username, email, phone, role, isActive },
      select: { id: true, username: true, email: true, phone: true, role: true, isActive: true },
    });
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/users/:id/reset-password
router.post('/:id/reset-password', authenticate, requireAdmin, async (req, res) => {
  try {
    const { newPassword } = req.body;
    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: parseInt(req.params.id) }, data: { password: hashed, loginAttempts: 0, lockedUntil: null } });
    res.json({ message: 'Password reset successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/users/:id/unlock
router.post('/:id/unlock', authenticate, requireAdmin, async (req, res) => {
  try {
    await prisma.user.update({ where: { id: parseInt(req.params.id) }, data: { loginAttempts: 0, lockedUntil: null } });
    res.json({ message: 'User unlocked' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/users/:id
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
    await prisma.user.update({ where: { id: parseInt(req.params.id) }, data: { isActive: false } });
    res.json({ message: 'User deactivated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
