import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class Database implements OnModuleInit, OnModuleDestroy {
  private readonly pool = new Pool({ connectionString: process.env.DATABASE_URL });

  async onModuleInit() {
    // Skeleton-only schema setup; replace with a migration tool when real tables arrive.
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS greeting (
        id integer PRIMARY KEY,
        message text NOT NULL
      )`);
    await this.pool.query(
      `INSERT INTO greeting (id, message) VALUES (1, 'Hello from Postgres') ON CONFLICT DO NOTHING`,
    );
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  async greeting(): Promise<string> {
    const { rows } = await this.pool.query<{ message: string }>(
      'SELECT message FROM greeting WHERE id = 1',
    );
    return rows[0].message;
  }
}
