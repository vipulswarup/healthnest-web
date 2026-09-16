import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('Set DIRECT_URL (preferred) or DATABASE_URL before running migrations.');
}

async function migrate() {
  const migrationsDir = join(process.cwd(), 'database', 'migrations');
  const migrationFiles = (await readdir(migrationsDir)).filter((file) => /^\d+_.+\.sql$/.test(file)).sort();
  const pool = new Pool({ connectionString });

  try {
    await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
    const { rows: appliedRows } = await pool.query<{ name: string }>('SELECT name FROM schema_migrations');
    const applied = new Set(appliedRows.map((row) => row.name));

    for (const migrationFile of migrationFiles) {
      if (applied.has(migrationFile)) continue;
      const migration = await readFile(join(migrationsDir, migrationFile), 'utf8');
      await pool.query('BEGIN');
      try {
        await pool.query(migration);
        await pool.query('INSERT INTO schema_migrations (name) VALUES ($1)', [migrationFile]);
        await pool.query('COMMIT');
        console.log(`Applied database/migrations/${migrationFile}`);
      } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
