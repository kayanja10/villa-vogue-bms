// ─── Fix Admin Script ─────────────────────────────────────────────────────────
// Run with: node fixadmin.js
// FIX 1: role changed from 'ADMIN' to 'admin' — matches auth.js check
// FIX 2: twoFaEnabled (not twoFactorEnabled) — matches Prisma schema field

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('VillaVogue@2024!', 10);

  const result = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      password: hash,
      role: 'admin',          // FIX: lowercase — must match auth.js role check
      twoFaEnabled: false,    // FIX: correct field name from schema
      isActive: true,
      loginAttempts: 0,
      lockedUntil: null,
    },
    create: {
      username: 'admin',
      email: 'kayanjawilfred@gmail.com',
      password: hash,
      role: 'admin',          // FIX: lowercase
      twoFaEnabled: false,    // FIX: correct field name
      isActive: true,
    },
  });

  console.log('✅ Admin fixed successfully:');
  console.log('   Username :', result.username);
  console.log('   Email    :', result.email);
  console.log('   Role     :', result.role);
  console.log('   Active   :', result.isActive);
  console.log('');
  console.log('🔑 Login with:');
  console.log('   Username : admin');
  console.log('   Password : VillaVogue@2024!');
  console.log('   (OTP will be sent to kayanjawilfred@gmail.com)');

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('❌ Fix failed:', err.message);
  prisma.$disconnect();
  process.exit(1);
});
