// ─── Shared Prisma Client (singleton) ────────────────────────────────────────
// CRITICAL: every route file must import { prisma } from here instead of
// creating its own `new PrismaClient()`. Each PrismaClient instance opens
// its own connection pool (defaulting to num_cpus * 2 + 1 connections). With
// 15+ route files each creating a separate instance, the backend can open
// far more simultaneous database connections than the database allows,
// especially under concurrent customer load — this is one of the most
// likely causes of the site appearing to "crash" when many people use it
// at once. A single shared instance keeps connection usage predictable and
// bounded regardless of how many route files exist.
//
// Usage in any route file:
//   const { prisma } = require('./prisma'); // adjust path depth as needed
//
const { PrismaClient } = require('@prisma/client');

// Reuse the client across hot-reloads in development; in production this
// simply creates it once at server startup.
const globalForPrisma = global;

const prisma = globalForPrisma.__vvPrisma || new PrismaClient({
  // Cap the connection pool explicitly rather than relying on the default,
  // which scales with CPU count and can be too high on small hosting tiers
  // like Render's free/starter plans where the database itself has a low
  // max connection limit (commonly 20-97 depending on plan).
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

if (!globalForPrisma.__vvPrisma) {
  globalForPrisma.__vvPrisma = prisma;
}

// Graceful shutdown — release connections cleanly when the process exits
// instead of leaving them dangling, which can also exhaust the pool over
// many deploy cycles.
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = { prisma };
