import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { pool } from './pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function seedDemo(): Promise<void> {
  const sql = readFileSync(
    join(__dirname, '../../migrations/017_demo_fiscal_seed.sql'),
    'utf-8',
  );
  console.log('Seeding demo fiscal data for demo@example.com...');
  await pool.query(sql);
  console.log('Demo fiscal seed completed.');
  await pool.end();
}

seedDemo().catch((err: unknown) => {
  console.error('Demo seed failed:', err);
  process.exit(1);
});
