import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { fromNodeHeaders } from 'better-auth/node';
import type { IncomingHttpHeaders } from 'node:http';
import { randomBytes } from 'node:crypto';
import { Database } from '../database.js';
import { EmailService } from '../email.service.js';
import { createAuth, RESET_TOKEN_SECONDS, webLink, type Auth, type Permission, type Role } from './auth.js';

export interface Member {
  email: string;
  role: Role;
  name: string;
}

export const normaliseEmail = (email: string) => email.trim().toLowerCase();
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD = 8;
const ADMIN_SEED_LOCK = 7002;

export function validName(value: unknown): string {
  const name = typeof value === 'string' ? value.trim() : '';
  if (name === '' || name.length > 100) throw new BadRequestException('Enter a display name (up to 100 characters)');
  return name;
}

export function validEmail(value: unknown): string {
  if (typeof value !== 'string' || !EMAIL.test(normaliseEmail(value))) {
    throw new BadRequestException('Enter a valid email address');
  }
  return normaliseEmail(value);
}

@Injectable()
export class AuthService implements OnModuleInit {
  readonly auth: Auth;

  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(EmailService) email: EmailService,
  ) {
    this.auth = createAuth(db.pool, {
      sendResetPassword: (to, token) =>
        email.send({
          to,
          subject: 'Reset your Chords password',
          text: `Use this link to choose a new password. It works once and expires in an hour.\n\n${webLink(`/reset-password/${token}`)}`,
        }),
    });
  }

  async onModuleInit() {
    await this.db.withLock(ADMIN_SEED_LOCK, () => this.seedAdmin());
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

  /** A reset link for someone who has joined, for an Admin to copy to them. Better Auth spends it like an emailed one. */
  async resetLinkFor(email: string): Promise<{ email: string; resetUrl: string }> {
    const address = normaliseEmail(email);
    const context = await this.auth.$context;
    const found = await context.internalAdapter.findUserByEmail(address);
    if (!found) throw new NotFoundException('That person has not joined yet');
    const token = randomBytes(18).toString('base64url');
    await context.internalAdapter.createVerificationValue({
      identifier: `reset-password:${token}`,
      value: found.user.id,
      expiresAt: new Date(Date.now() + RESET_TOKEN_SECONDS * 1000),
    });
    return { email: address, resetUrl: webLink(`/reset-password/${token}`) };
  }

  async isApproved(email: string): Promise<boolean> {
    const rows = await this.db.query('SELECT 1 FROM approved_emails WHERE email = $1', [email]);
    return rows.length > 0;
  }

  async isRegistered(email: string): Promise<boolean> {
    const rows = await this.db.query('SELECT 1 FROM "user" WHERE email = $1', [email]);
    return rows.length > 0;
  }

  /** Creates the account for an approved email. Throws if it is not approved or already exists. */
  async createMember(email: string, name: string, password: string): Promise<Member> {
    if (!(await this.isApproved(email))) throw new ForbiddenException('This email has not been approved');
    await this.auth.api.createUser({ body: { email, password, name, role: 'member' } });
    return { email, role: 'member', name };
  }

  async renameMember(headers: IncomingHttpHeaders, name: unknown) {
    await this.auth.api.updateUser({ headers: fromNodeHeaders(headers), body: { name: validName(name) } });
  }

  async listApproved(): Promise<{ email: string; role: Role; name: string | null; status: 'invited' | 'active' }[]> {
    const rows = await this.db.query<{ email: string; role: Role | null; name: string | null }>(
      `SELECT a.email, u.role, u.name FROM approved_emails a LEFT JOIN "user" u ON u.email = a.email ORDER BY a.email`,
    );
    return rows.map((row) => ({
      email: row.email,
      role: row.role ?? 'member',
      name: row.name,
      status: row.role === null ? 'invited' : 'active',
    }));
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
    return { email: session.user.email, role: session.user.role as Role, name: session.user.name };
  }
}
