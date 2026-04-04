// customers.js route
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireAdmin, requireManagerOrAdmin } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

router.get('/', authenticate, async (req, res) => {
  try {
    const { search, tier, page = 1, limit = 20 } = req.query;
    const where = { isActive: true };
    if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }, { email: { contains: search, mode: 'insensitive' } }];
    if (tier) where.tier = tier;
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({ where, orderBy: { totalSpent: 'desc' }, skip: (parseInt(page)-1)*parseInt(limit), take: parseInt(limit) }),
      prisma.customer.count({ where }),
    ]);
    res.json({ customers, total });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/birthdays-today', authenticate, async (req, res) => {
  try {
    const today = new Date();
    const mmdd = `${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    const allCustomers = await prisma.customer.findMany({ where: { isActive: true, birthday: { not: null } } });
    const customers = allCustomers.filter(c => c.birthday && c.birthday.includes(mmdd));
    res.json(customers);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const c = await prisma.customer.findUnique({ where: { id: parseInt(req.params.id) }, include: { orders: { orderBy: { createdAt: 'desc' }, take: 20 }, debts: true } });
    if (!c) return res.status(404).json({ error: 'Customer not found' });
    res.json(c);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { name, email, phone, address, notes, birthday, password } = req.body;
    const data = { name, email, phone, address, notes, birthday };
    if (password) data.password = await bcrypt.hash(password, 10);
    const customer = await prisma.customer.create({ data });
    res.status(201).json(customer);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, email, phone, address, notes, birthday, loyaltyPoints, tier } = req.body;
    const customer = await prisma.customer.update({ where: { id: parseInt(req.params.id) }, data: { name, email, phone, address, notes, birthday, loyaltyPoints: loyaltyPoints !== undefined ? parseInt(loyaltyPoints) : undefined, tier } });
    res.json(customer);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await prisma.customer.update({ where: { id: parseInt(req.params.id) }, data: { isActive: false } });
    res.json({ message: 'Customer deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Customer portal login
router.post('/portal/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const customer = await prisma.customer.findFirst({ where: { email, isActive: true } });
    if (!customer || !customer.password) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, customer.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ customerId: customer.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, customer: { id: customer.id, name: customer.name, email: customer.email, loyaltyPoints: customer.loyaltyPoints, tier: customer.tier } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/portal/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const exists = await prisma.customer.findFirst({ where: { email } });
    if (exists) return res.status(400).json({ error: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 10);
    const customer = await prisma.customer.create({ data: { name, email, phone, password: hashed } });
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ customerId: customer.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, customer: { id: customer.id, name: customer.name, email: customer.email } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
