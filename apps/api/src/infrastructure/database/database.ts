import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Pool, type QueryResultRow } from 'pg';
import { pendingMigrations } from './migrate.js';

@Injectable()
export class Database implements OnModuleInit, OnModuleDestroy {
  readonly pool: Pool;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is required (run `pnpm db` to get one)');
    }
    this.pool = new Pool({ connectionString });
    // An idle client error (e.g. Postgres restarting) must not crash the API.
    this.pool.on('error', (error) => console.error('Postgres pool error', error));
  }

  async onModuleInit() {
    const pending = await pendingMigrations(this.pool);
    if (pending.length > 0) {
      throw new Error(
        `The database is missing migrations: ${pending.join(', ')} (run \`pnpm migrate\`)`,
      );
    }
  }

  /** Runs `work` while holding a Postgres advisory lock, so concurrent API starts do not race on shared set-up. */
  async withLock<T>(key: number, work: () => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('SELECT pg_advisory_lock($1)', [key]);
      return await work();
    } finally {
      await client.query('SELECT pg_advisory_unlock($1)', [key]).catch(() => {});
      client.release();
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  async query<T extends QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
    const { rows } = await this.pool.query<T>(sql, params);
    return rows;
  }

  async greeting(): Promise<string> {
    const { rows } = await this.pool.query<{ message: string }>(
      'SELECT message FROM greeting WHERE id = 1',
    );
    if (!rows[0]) throw new Error('Greeting row is missing');
    return rows[0].message;
  }
}
