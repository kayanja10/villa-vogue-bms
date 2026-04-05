const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('VillaVogue@2024!', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: { password: hash, twoFactorEnabled: false },
    create: { username: 'admin', email: 'kayanjawilfred@gmail.com', password: hash, role: 'ADMIN', twoFactorEnabled: false }
  });
  console.log('✅ Admin updated — 2FA disabled');
  await prisma.$disconnect();
}

main();