import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runner } from 'node-pg-migrate';

export const MIGRATIONS_TABLE = 'pgmigrations';

/** Applies any pending migrations from apps/api/migrations. Safe to run repeatedly and from several processes. */
export async function migrate(databaseUrl: string) {
  return runner({
    databaseUrl,
    dir: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'migrations'),
    migrationsTable: MIGRATIONS_TABLE,
    direction: 'up',
    log: () => {},
  });
}
