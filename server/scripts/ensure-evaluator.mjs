/**
 * Create an evaluator row or update password if the email is already registered.
 * Usage: node scripts/ensure-evaluator.mjs <email> <password> [full_name] [institution] [designation]
 * Requires DB env vars (same as the API server).
 */
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { createEvaluator, findByEmail, updatePassword } from '../src/model/evaluatorModel.js';

const rawEmail = process.argv[2];
const password = process.argv[3];
const fullName = process.argv[4] || 'Evaluator User';
const institution = process.argv[5] || 'NAST';
const designation = process.argv[6] || 'Evaluator';

if (!rawEmail || !password) {
  console.error('Usage: node scripts/ensure-evaluator.mjs <email> <password> [full_name] [institution] [designation]');
  process.exit(1);
}

const email = rawEmail.toLowerCase().trim();

try {
  const existing = await findByEmail(email);
  const hashed = await bcrypt.hash(password, 10);
  
  if (existing && existing.length > 0) {
    await updatePassword(existing[0].evaluator_id, hashed);
    console.log(`Evaluator password updated for: ${email} (evaluator_id: ${existing[0].evaluator_id})`);
    process.exit(0);
  }

  await createEvaluator(fullName, email, institution, designation, hashed);
  console.log(`Evaluator created successfully: ${email}`);
  process.exit(0);
} catch (err) {
  const msg = err?.message || String(err);
  console.error('Failed to seed evaluator:', msg);
  process.exit(1);
}
