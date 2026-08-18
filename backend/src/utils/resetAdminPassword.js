// backend/src/utils/resetAdminPassword.js
//
// One-off script to reset the admin account's password directly in the
// database, bypassing the normal login flow (for when the password itself
// is lost, not just forgotten-but-recoverable via email). Also clears
// loginAttempts/lockedUntil in case repeated failed login attempts while
// trying to remember the password triggered the 30-minute lockout.
//
// Usage (from the backend/ folder):
//   node src/utils/resetAdminPassword.js "YourNewPassword123!"
//
// IMPORTANT: DATABASE_URL must point at the production (Render) database,
// not a local dev database, or this will reset the wrong admin account.
// Check backend/.env — if it's set to a local Postgres URL, temporarily
// override it for this one run:
//   set DATABASE_URL=your-render-database-url-here
//   node src/utils/resetAdminPassword.js "YourNewPassword123!"

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { prisma } = require('../prisma');

async function main() {
  const newPassword = process.argv[2];
  if (!newPassword) {
    console.error('Usage: node src/utils/resetAdminPassword.js "<newPassword>"');
    process.exit(1);
  }
  if (newPassword.length < 8) {
    console.error('Password should be at least 8 characters.');
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  const updated = await prisma.user.update({
    where: { username: 'admin' },
    data: {
      password: hashedPassword,
      loginAttempts: 0,
      lockedUntil: null,
      isActive: true,
    },
  });

  console.log(`✔ Password reset for username: ${updated.username} (role: ${updated.role})`);
  console.log('You can now log in with the new password.');
}

main()
  .catch((err) => {
    console.error('Failed to reset password:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
