import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { getMigrations } from 'better-auth/db/migration';
import { fromNodeHeaders } from 'better-auth/node';
import type { IncomingHttpHeaders } from 'node:http';
import { Database } from '../database.js';
import { createAuth, type Auth, type Permission, type Role } from './auth.js';

export interface Member {
  email: string;
  role: Role;
}

export const normaliseEmail = (email: string) => email.trim().toLowerCase();
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

function validEmail(value: unknown): string {
  if (typeof value !== 'string' || !EMAIL.test(normaliseEmail(value))) {
    throw new BadRequestException('Enter a valid email address');
  }
  return normaliseEmail(value);
}

@Injectable()
export class AuthService implements OnModuleInit {
  readonly auth: Auth;

  constructor(@Inject(Database) private readonly db: Database) {
    this.auth = createAuth(db.pool);
  }

  async onModuleInit() {
    await this.migrate();
    await this.seedAdmin();
  }

  /** Creates Better Auth's tables and ours. The lock keeps concurrent app starts from racing on CREATE TABLE. */
  private async migrate() {
    const client = await this.db.pool.connect();
    try {
      await client.query('SELECT pg_advisory_lock(7002)');
      const { runMigrations } = await getMigrations(this.auth.options);
      await runMigrations();
      await this.db.query('CREATE TABLE IF NOT EXISTS approved_emails (email text PRIMARY KEY)');
    } finally {
      await client.query('SELECT pg_advisory_unlock(7002)').catch(() => {});
      client.release();
    }
  }

  /** The one Admin that exists from the start. The environment is the source of truth for their password. */
  private async seedAdmin() {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    if (!email) return;
    // Without a password the first visitor to register this email would become the Admin.
    if (!password) throw new Error('ADMIN_PASSWORD is required when ADMIN_EMAIL is set');
    const address = normaliseEmail(email);
    await this.db.query('INSERT INTO approved_emails (email) VALUES ($1) ON CONFLICT DO NOTHING', [address]);

    const context = await this.auth.$context;
    const existing = await context.internalAdapter.findUserByEmail(address);
    if (!existing) {
      await this.auth.api.createUser({ body: { email: address, password, name: address, role: 'admin' } });
      return;
    }
    await context.internalAdapter.updateUser(existing.user.id, { role: 'admin' });
    await context.internalAdapter.updatePassword(existing.user.id, await context.password.hash(password));
  }

  /** An approved email with no account yet chooses a password. They sign in afterwards. */
  async register(email: unknown, password: unknown): Promise<{ member: Member }> {
    const address = validEmail(email);
    if (typeof password !== 'string' || password.length < MIN_PASSWORD) {
      throw new BadRequestException(`Password must be at least ${MIN_PASSWORD} characters`);
    }
    // One answer for "not approved" and "already registered", so this cannot be used to probe the approved list.
    const refused = new ForbiddenException('This email cannot be registered');
    const [approved] = await this.db.query('SELECT 1 FROM approved_emails WHERE email = $1', [address]);
    if (!approved) throw refused;
    try {
      await this.auth.api.createUser({ body: { email: address, password, name: address, role: 'member' } });
    } catch {
      throw refused;
    }
    return { member: { email: address, role: 'member' } };
  }

  async listApproved(): Promise<{ email: string; role: Role; hasPassword: boolean }[]> {
    const rows = await this.db.query<{ email: string; role: Role | null }>(
      `SELECT a.email, u.role FROM approved_emails a LEFT JOIN "user" u ON u.email = a.email ORDER BY a.email`,
    );
    return rows.map((row) => ({ email: row.email, role: row.role ?? 'member', hasPassword: row.role !== null }));
  }

  async approve(email: unknown) {
    const address = validEmail(email);
    await this.db.query('INSERT INTO approved_emails (email) VALUES ($1) ON CONFLICT DO NOTHING', [address]);
    return { email: address };
  }

  /** Removing an email deletes the account and, through the foreign keys, its sessions. */
  async remove(email: string) {
    const address = normaliseEmail(email);
    const [user] = await this.db.query<{ role: Role }>('SELECT role FROM "user" WHERE email = $1', [address]);
    if (user?.role === 'admin') throw new ConflictException('The Admin cannot be removed');
    await this.db.query('DELETE FROM "user" WHERE email = $1', [address]);
    await this.db.query('DELETE FROM approved_emails WHERE email = $1', [address]);
  }

  async can(role: Role, permissions: Permission): Promise<boolean> {
    const { success } = await this.auth.api.userHasPermission({ body: { role, permissions } });
    return success;
  }

  async memberForHeaders(headers: IncomingHttpHeaders): Promise<Member | undefined> {
    const session = await this.auth.api.getSession({ headers: fromNodeHeaders(headers) });
    if (!session) return undefined;
    return { email: session.user.email, role: session.user.role as Role };
  }
}
