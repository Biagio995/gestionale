import { existsSync, readdirSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { pathToFileURL } from 'url';
import { fileURLToPath } from 'url';
import { pool } from './pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function resolveMigrationsDir(): string {
  const candidates = [
    join(process.cwd(), 'migrations'),
    join(__dirname, '../../migrations'),
  ];
  for (const dir of candidates) {
    if (existsSync(dir)) {
      return dir;
    }
  }
  throw new Error(`Migrations directory not found. Tried: ${candidates.join(', ')}`);
}

export async function runMigrations(options?: { closePool?: boolean }): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  const appliedResult = await pool.query<{ name: string }>(
    'SELECT name FROM schema_migrations',
  );
  const applied = new Set(appliedResult.rows.map((r) => r.name));

  const migrationsDir = resolveMigrationsDir();
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`Skipping ${file} (already applied)`);
      continue;
    }

    const sql = readFileSync(join(migrationsDir, file), 'utf-8');
    console.log(`Running ${file}...`);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  console.log('All migrations completed successfully');

  if (options?.closePool ?? false) {
    await pool.end();
  }
}

const isCli =
  process.argv[1] !== undefined &&
  pathToFileURL(process.argv[1]).href === import.meta.url;

if (isCli) {
  runMigrations({ closePool: true }).catch((err: unknown) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}
