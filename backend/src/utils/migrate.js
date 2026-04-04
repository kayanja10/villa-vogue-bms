// Migration helper - run new tables on existing Neon DB
// Usage: node src/utils/migrate.js
const { execSync } = require('child_process');
require('dotenv').config();

console.log('🔄 Running Prisma migration...');
try {
  execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
  console.log('✅ Schema synced to database');
  execSync('node src/utils/seed.js', { stdio: 'inherit' });
  console.log('✅ Seed complete');
} catch (err) {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
}
