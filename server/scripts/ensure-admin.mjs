/**
 * Create an admin row or update password if the email is already registered.
 * Usage: node scripts/ensure-admin.mjs <email> <password>
 * Requires DB env vars (same as the API server).
 */
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { registerAdminService } from '../src/services/adminService.js';
import { findByEmail, updatePassword } from '../src/model/adminModel.js';

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error('Usage: node scripts/ensure-admin.mjs <email> <password>');
  process.exit(1);
}

try {
  const existing = await findByEmail(email);
  if (existing && existing.length > 0) {
    const hashed = await bcrypt.hash(password, 10);
    await updatePassword(existing[0].aid, hashed);
    console.log(`Admin password updated for: ${email}`);
    process.exit(0);
  }

  await registerAdminService('Super Admin', email, password, 'Administration');
  console.log('Admin created:', email);
  process.exit(0);
} catch (err) {
  const msg = err?.message || String(err);
  console.error('Failed to seed admin:', msg);
  process.exit(1);
}

