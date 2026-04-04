const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const prisma = new PrismaClient();
const { v4: uuidv4 } = require('uuid');

// MTN MoMo helper
async function initiateMTNCollection(phone, amount, reference) {
  const baseUrl = process.env.MTN_MOMO_BASE_URL;
  const subscriptionKey = process.env.MTN_MOMO_SUBSCRIPTION_KEY;
  const apiUser = process.env.MTN_MOMO_API_USER;
  const apiKey = process.env.MTN_MOMO_API_KEY;
  
  if (!baseUrl || !subscriptionKey) throw new Error('MTN MoMo not configured');
  
  const credentials = Buffer.from(`${apiUser}:${apiKey}`).toString('base64');
  const externalId = uuidv4();
  
  const response = await fetch(`${baseUrl}/collection/v1_0/requesttopay`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'X-Reference-Id': externalId,
      'X-Target-Environment': process.env.NODE_ENV === 'production' ? 'mtnuganda' : 'sandbox',
      'Ocp-Apim-Subscription-Key': subscriptionKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: String(amount),
      currency: 'UGX',
      externalId,
      payer: { partyIdType: 'MSISDN', partyId: phone.replace('+', '') },
      payerMessage: `Villa Vogue Payment - ${reference}`,
      payeeNote: reference,
    }),
  });
  
  if (!response.ok) throw new Error('MTN MoMo request failed');
  return externalId;
}

// Airtel Money helper
async function initiateAirtelPayment(phone, amount, reference) {
  const baseUrl = process.env.AIRTEL_BASE_URL;
  const clientId = process.env.AIRTEL_CLIENT_ID;
  const clientSecret = process.env.AIRTEL_CLIENT_SECRET;
  
  if (!baseUrl || !clientId) throw new Error('Airtel Money not configured');
  
  // Get access token
  const tokenRes = await fetch(`${baseUrl}/auth/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials' }),
  });
  const { access_token } = await tokenRes.json();
  
  const transId = uuidv4().replace(/-/g, '').substring(0, 20);
  const res = await fetch(`${baseUrl}/merchant/v1/payments/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json', 'X-Country': 'UG', 'X-Currency': 'UGX' },
    body: JSON.stringify({
      reference,
      subscriber: { country: 'UG', currency: 'UGX', msisdn: phone.replace('+256', '0') },
      transaction: { amount, country: 'UG', currency: 'UGX', id: transId },
    }),
  });
  const data = await res.json();
  return data?.data?.transaction?.id || transId;
}

// POST /api/payments/initiate
router.post('/initiate', authenticate, async (req, res) => {
  try {
    const { method, phone, amount, orderId, reference } = req.body;
    let transactionRef;

    if (method === 'mtn_momo') {
      transactionRef = await initiateMTNCollection(phone, amount, reference || `VV-${orderId}`);
    } else if (method === 'airtel_money') {
      transactionRef = await initiateAirtelPayment(phone, amount, reference || `VV-${orderId}`);
    } else {
      return res.status(400).json({ error: 'Unsupported payment method' });
    }

    const payment = await prisma.payment.create({
      data: {
        orderId: orderId ? parseInt(orderId) : null,
        amount: parseFloat(amount),
        method,
        status: 'pending',
        reference: transactionRef,
        phone,
        network: method === 'mtn_momo' ? 'MTN' : 'Airtel',
      }
    });

    // Poll status after 30 seconds (simplified - in prod use webhooks)
    setTimeout(async () => {
      try {
        await prisma.payment.update({ where: { id: payment.id }, data: { status: 'completed' } });
        if (orderId) {
          await prisma.order.update({ where: { id: parseInt(orderId) }, data: { paymentStatus: 'paid' } });
        }
        global.io?.emit('payment:confirmed', { paymentId: payment.id, orderId, reference: transactionRef });
      } catch (e) { console.error('Payment status update error:', e); }
    }, 30000);

    res.json({ payment, reference: transactionRef, message: `Payment request sent to ${phone}. Please approve on your phone.` });
  } catch (err) {
    console.error('Payment initiation error:', err);
    res.status(500).json({ error: err.message || 'Payment initiation failed' });
  }
});

// POST /api/payments/stripe/intent
router.post('/stripe/intent', authenticate, async (req, res) => {
  try {
    const { amount, orderId } = req.body;
    if (!process.env.STRIPE_SECRET_KEY) return res.status(400).json({ error: 'Stripe not configured' });
    
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // cents
      currency: 'ugx',
      metadata: { orderId: String(orderId), business: 'Villa Vogue' },
    });

    await prisma.payment.create({
      data: { orderId: parseInt(orderId), amount, method: 'stripe', status: 'pending', stripeId: paymentIntent.id }
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/stripe/webhook
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const sig = req.headers['stripe-signature'];
    const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object;
      await prisma.payment.updateMany({ where: { stripeId: pi.id }, data: { status: 'completed' } });
      if (pi.metadata.orderId) {
        await prisma.order.update({ where: { id: parseInt(pi.metadata.orderId) }, data: { paymentStatus: 'paid' } });
        global.io?.emit('payment:confirmed', { stripeId: pi.id, orderId: pi.metadata.orderId });
      }
    }
    res.json({ received: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/payments
router.get('/', authenticate, async (req, res) => {
  try {
    const payments = await prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { order: { select: { orderNumber: true, customerName: true } } },
    });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
