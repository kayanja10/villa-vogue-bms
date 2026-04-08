const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireAdmin } = require('../middleware/auth');
const prisma = new PrismaClient();

// In-memory session store (fast, no DB overhead)
// Structure: { tokenId: { userId, username, role, loginTime, lastActivity, ip, userAgent } }
const activeSessions = new Map();

// Helper to generate unique session ID
function genSessionId() {
  return require('crypto').randomBytes(32).toString('hex');
}

// Register a new session (called from auth/login)
function createSession({ userId, username, role, ip, userAgent }) {
  const sessionId = genSessionId();
  activeSessions.set(sessionId, {
    sessionId, userId, username, role,
    loginTime: new Date(),
    lastActivity: new Date(),
    ip: ip || 'unknown',
    userAgent: userAgent || 'unknown',
    status: 'active',
  });
  return sessionId;
}

// Update last activity for a session
function touchSession(sessionId) {
  const session = activeSessions.get(sessionId);
  if (session) {
    session.lastActivity = new Date();
    session.status = 'active';
  }
}

// Invalidate a session
function destroySession(sessionId) {
  activeSessions.delete(sessionId);
}

// Check if session is valid
function isSessionValid(sessionId) {
  return activeSessions.has(sessionId);
}

// Get all active sessions
function getAllSessions() {
  return Array.from(activeSessions.values());
}

// Timeout rules per role (ms)
const TIMEOUTS = {
  admin: 15 * 60 * 1000,    // 15 minutes
  manager: 30 * 60 * 1000,  // 30 minutes
  staff: 60 * 60 * 1000,    // 1 hour
};

// Warning times (ms before timeout)
const WARNINGS = {
  admin: 2 * 60 * 1000,     // warn 2 min before
  manager: 5 * 60 * 1000,   // warn 5 min before
  staff: 10 * 60 * 1000,    // warn 10 min before
};

// Clean up expired sessions every minute
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of activeSessions.entries()) {
    const timeout = TIMEOUTS[session.role] || TIMEOUTS.staff;
    const idle = now - new Date(session.lastActivity).getTime();
    if (idle > timeout) {
      // Log the auto-logout
      prisma.sessionAudit.create({
        data: {
          userId: session.userId,
          username: session.username,
          role: session.role,
          loginTime: session.loginTime,
          logoutTime: new Date(),
          reason: 'timeout',
          ip: session.ip,
          sessionId: id,
        }
      }).catch(() => {});
      activeSessions.delete(id);
      // Notify via socket
      global.io?.to(`session:${id}`).emit('session:expired', { reason: 'timeout' });
    } else {
      // Update status
      const warnTime = WARNINGS[session.role] || WARNINGS.staff;
      session.status = idle > (timeout - warnTime) ? 'warning' : 'active';
      session.idleMs = idle;
      session.remainingMs = timeout - idle;
    }
  }
}, 30000); // check every 30 seconds

// ─── ROUTES ───────────────────────────────────────────────────

// POST /api/sessions/start — called after successful login
router.post('/start', authenticate, async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const sessionId = createSession({
      userId: req.user.id,
      username: req.user.username,
      role: req.user.role,
      ip, userAgent,
    });

    // Log login to audit
    await prisma.sessionAudit.create({
      data: {
        userId: req.user.id,
        username: req.user.username,
        role: req.user.role,
        loginTime: new Date(),
        reason: 'login',
        ip,
        sessionId,
      }
    }).catch(() => {});

    res.json({
      sessionId,
      timeoutMs: TIMEOUTS[req.user.role] || TIMEOUTS.staff,
      warningMs: WARNINGS[req.user.role] || WARNINGS.staff,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sessions/heartbeat — frontend pings this on activity
router.post('/heartbeat', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (sessionId && activeSessions.has(sessionId)) {
      touchSession(sessionId);
      const session = activeSessions.get(sessionId);
      const timeout = TIMEOUTS[req.user.role] || TIMEOUTS.staff;
      const idle = Date.now() - new Date(session.lastActivity).getTime();
      res.json({
        valid: true,
        remainingMs: timeout - idle,
        warningMs: WARNINGS[req.user.role] || WARNINGS.staff,
      });
    } else {
      res.json({ valid: false });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sessions/end — user manually logs out
router.post('/end', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (sessionId) {
      const session = activeSessions.get(sessionId);
      if (session) {
        await prisma.sessionAudit.create({
          data: {
            userId: req.user.id,
            username: req.user.username,
            role: req.user.role,
            loginTime: session.loginTime,
            logoutTime: new Date(),
            reason: 'manual',
            ip: session.ip,
            sessionId,
          }
        }).catch(() => {});
        destroySession(sessionId);
      }
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sessions — admin: get all active sessions
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const sessions = getAllSessions().map(s => ({
      ...s,
      durationMs: Date.now() - new Date(s.loginTime).getTime(),
      timeoutMs: TIMEOUTS[s.role] || TIMEOUTS.staff,
    }));
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sessions/:sessionId/force-logout — admin: kick a user
router.post('/:sessionId/force-logout', authenticate, requireAdmin, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = activeSessions.get(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    // Log forced logout
    await prisma.sessionAudit.create({
      data: {
        userId: session.userId,
        username: session.username,
        role: session.role,
        loginTime: session.loginTime,
        logoutTime: new Date(),
        reason: 'force_logout',
        ip: session.ip,
        sessionId,
        forcedBy: req.user.username,
      }
    }).catch(() => {});

    // Notify user via socket immediately
    global.io?.to(`session:${sessionId}`).emit('session:expired', {
      reason: 'force_logout',
      message: `You have been signed out by Admin (${req.user.username})`,
    });

    destroySession(sessionId);

    // Log admin action
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        username: req.user.username,
        action: 'force_logout',
        entityType: 'session',
        entityId: String(session.userId),
        details: JSON.stringify({ targetUser: session.username, role: session.role }),
      }
    }).catch(() => {});

    res.json({ ok: true, message: `${session.username} has been signed out` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sessions/audit — session audit log
router.get('/audit', authenticate, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const [logs, total] = await Promise.all([
      prisma.sessionAudit.findMany({
        orderBy: { loginTime: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.sessionAudit.count(),
    ]);
    res.json({ logs, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sessions/config — get timeout config per role
router.get('/config', authenticate, requireAdmin, (req, res) => {
  res.json({ timeouts: TIMEOUTS, warnings: WARNINGS });
});

module.exports = { router, createSession, touchSession, destroySession, isSessionValid, getAllSessions, TIMEOUTS, WARNINGS };
