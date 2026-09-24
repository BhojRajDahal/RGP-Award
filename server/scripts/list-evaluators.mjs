/**
 * List all evaluator accounts in the database.
 * Usage: node scripts/list-evaluators.mjs
 */
import 'dotenv/config';
import { connectToDatabase } from '../src/config/db.js';

try {
  const pool = await connectToDatabase();
  const [rows] = await pool.execute(
    'SELECT evaluator_id, full_name, email, institution, designation, password, created_at FROM evaluators'
  );

  console.log(`\nFound ${rows.length} evaluator(s) in database:\n`);
  rows.forEach((r) => {
    const isBcrypt = r.password && (r.password.startsWith('$2a$') || r.password.startsWith('$2b$') || r.password.startsWith('$2y$'));
    console.log(`- ID: ${r.evaluator_id}`);
    console.log(`  Email: "${r.email}"`);
    console.log(`  Name: ${r.full_name}`);
    console.log(`  Password Format: ${isBcrypt ? 'Valid Bcrypt Hash (Length: ' + r.password.length + ')' : 'Plain text or other format'}`);
    console.log(`  Created: ${r.created_at}`);
    console.log('-------------------------------------------');
  });

  process.exit(0);
} catch (err) {
  console.error('Error listing evaluators:', err.message || err);
  process.exit(1);
}
