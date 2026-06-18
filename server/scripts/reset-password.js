/**
 * Usage:
 *   node scripts/reset-password.js <email> <new_password>
 *
 * Example:
 *   node scripts/reset-password.js negaromanzir@gmail.com MyNewPass123
 */

require('dotenv').config();
const bcrypt    = require('bcryptjs');
const { getPool, connectDB } = require('../src/config/db');

async function main() {
  const email    = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error('Usage: node scripts/reset-password.js <email> <new_password>');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('Password must be at least 8 characters');
    process.exit(1);
  }

  await connectDB();
  const db   = getPool();
  const hash = await bcrypt.hash(password, 12);

  const [result] = await db.query(
    'UPDATE users SET password_hash = ? WHERE email = ?',
    [hash, email]
  );

  if (result.affectedRows === 0) {
    console.error(`❌  No user found with email: ${email}`);
    process.exit(1);
  }

  console.log(`✅  Password updated for ${email}`);
  console.log(`    New password: ${password}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
