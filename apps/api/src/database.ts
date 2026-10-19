import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Pool, type QueryResultRow } from 'pg';

@Injectable()
export class Database implements OnModuleInit, OnModuleDestroy {
  private readonly pool: Pool;

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
    // Skeleton-only schema setup; replace with a migration tool when real tables are many.
    // The advisory lock keeps concurrent app starts (e.g. parallel test files) from racing on CREATE TABLE.
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(7001)');
      await client.query(`
        CREATE TABLE IF NOT EXISTS greeting (
          id integer PRIMARY KEY,
          message text NOT NULL
        )`);
      await client.query(
        `INSERT INTO greeting (id, message) VALUES (1, 'Hello from Postgres') ON CONFLICT DO NOTHING`,
      );
      await client.query(`
        CREATE TABLE IF NOT EXISTS members (
          email text PRIMARY KEY,
          role text NOT NULL CHECK (role IN ('admin', 'member')),
          password_hash text,
          created_at timestamptz NOT NULL DEFAULT now()
        )`);
      await client.query(`
        CREATE TABLE IF NOT EXISTS sessions (
          token_hash text PRIMARY KEY,
          email text NOT NULL REFERENCES members (email) ON DELETE CASCADE ON UPDATE CASCADE,
          expires_at timestamptz NOT NULL
        )`);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
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
