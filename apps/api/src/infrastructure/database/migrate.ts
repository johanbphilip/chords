import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runner } from 'node-pg-migrate';
import type { Pool } from 'pg';

export const MIGRATIONS_TABLE = 'pgmigrations';

const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'migrations');

/** Applies any pending migrations from apps/api/migrations. Safe to run repeatedly and from several processes. */
export async function migrate(databaseUrl: string) {
  return runner({
    databaseUrl,
    dir: MIGRATIONS_DIR,
    migrationsTable: MIGRATIONS_TABLE,
    direction: 'up',
    log: () => {},
  });
}

/** Names of migration files the database has not applied yet (all of them if it has never been migrated). */
export async function pendingMigrations(pool: Pool): Promise<string[]> {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .map((file) => file.replace(/\.sql$/, ''))
    .sort();
  const [{ exists }] = (await pool.query(`SELECT to_regclass('public.${MIGRATIONS_TABLE}') IS NOT NULL AS exists`)).rows;
  if (!exists) return files;
  const { rows } = await pool.query<{ name: string }>(`SELECT name FROM ${MIGRATIONS_TABLE}`);
  const applied = new Set(rows.map((row) => row.name));
  return files.filter((file) => !applied.has(file));
}
