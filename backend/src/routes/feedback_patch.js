// ════════════════════════════════════════════════════════════════
// FILE: routes/feedback.js  (BACKEND)
// INSTRUCTION: Find the line that says `router.use(authenticate)`
// and paste the 3 routes ABOVE it. Nothing else changes.
// ════════════════════════════════════════════════════════════════

// ── PASTE THESE 3 ROUTES ABOVE router.use(authenticate) ─────────

// GET /api/feedback/public-stats  (no auth)
router.get('/public-stats', async (req, res) => {
  try {
    const allFeedback = await prisma.feedback.findMany({
      where: { isVisible: true },
      select: { rating: true }
    });
    const total = allFeedback.length;
    const average = total > 0 ? allFeedback.reduce((s, f) => s + f.rating, 0) / total : 0;
    const breakdown = [5,4,3,2,1].map(r => ({
      rating: r,
      count: allFeedback.filter(f => f.rating === r).length
    }));
    res.json({ total, average: parseFloat(average.toFixed(1)), breakdown });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/feedback/public  (no auth)
router.get('/public', async (req, res) => {
  try {
    const feedbackList = await prisma.feedback.findMany({
      where: { isVisible: true },
      orderBy: { createdAt: 'desc' },
      take: 12,
      select: { id: true, customerName: true, rating: true, message: true, createdAt: true }
    });
    res.json({ feedback: feedbackList, total: feedbackList.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/feedback/public  (no auth — customer portal submissions)
router.post('/public', async (req, res) => {
  try {
    const { name, rating, message } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Message required' });
    const fb = await prisma.feedback.create({
      data: {
        customerName: name || 'Anonymous',
        rating: parseInt(rating) || 5,
        message: message.trim(),
        source: 'portal',
        isVisible: true,
      }
    });
    res.status(201).json(fb);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── YOUR EXISTING LINE STAYS HERE ────────────────────────────────
// router.use(authenticate);   <── keep this and everything below unchanged
