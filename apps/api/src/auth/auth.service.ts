import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { Database } from '../database.js';
import { hashPassword, verifyPassword } from './passwords.js';

export type Role = 'admin' | 'member';
export interface Member {
  email: string;
  role: Role;
}

const SESSION_DAYS = 30;
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

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
  constructor(@Inject(Database) private readonly db: Database) {}

  /** The one Admin that exists from the start. Their password can be set here or on first registration. */
  async onModuleInit() {
    const email = process.env.ADMIN_EMAIL;
    if (!email) return;
    const hash = process.env.ADMIN_PASSWORD ? await hashPassword(process.env.ADMIN_PASSWORD) : null;
    await this.db.query(
      `INSERT INTO members (email, role, password_hash) VALUES ($1, 'admin', $2)
       ON CONFLICT (email) DO UPDATE SET password_hash = COALESCE(members.password_hash, EXCLUDED.password_hash)`,
      [normaliseEmail(email), hash],
    );
  }

  /** Returns undefined for an unknown email or wrong password, so callers cannot tell which. */
  async signIn(email: string, password: string): Promise<{ token: string; user: Member } | undefined> {
    const [row] = await this.db.query<{ email: string; role: Role; password_hash: string | null }>(
      'SELECT email, role, password_hash FROM members WHERE email = $1',
      [normaliseEmail(email)],
    );
    // Verify against a throwaway hash for unknown emails so timing does not reveal them.
    const ok = await verifyPassword(password, row?.password_hash ?? (await DUMMY_HASH));
    if (!row?.password_hash || !ok) return undefined;
    return { token: await this.startSession(row.email), user: { email: row.email, role: row.role } };
  }

  /** An approved email with no password yet chooses one, which also signs them in. */
  async register(email: unknown, password: unknown): Promise<{ token: string; user: Member }> {
    const address = validEmail(email);
    if (typeof password !== 'string' || password.length < MIN_PASSWORD) {
      throw new BadRequestException(`Password must be at least ${MIN_PASSWORD} characters`);
    }
    const [row] = await this.db.query<{ role: Role }>(
      `UPDATE members SET password_hash = $2 WHERE email = $1 AND password_hash IS NULL RETURNING role`,
      [address, await hashPassword(password)],
    );
    if (!row) {
      const [existing] = await this.db.query('SELECT 1 FROM members WHERE email = $1', [address]);
      if (existing) throw new ConflictException('This email already has a password; sign in instead');
      throw new ForbiddenException('This email has not been approved');
    }
    return { token: await this.startSession(address), user: { email: address, role: row.role } };
  }

  async listApproved(): Promise<{ email: string; role: Role; hasPassword: boolean }[]> {
    const rows = await this.db.query<{ email: string; role: Role; has_password: boolean }>(
      'SELECT email, role, password_hash IS NOT NULL AS has_password FROM members ORDER BY email',
    );
    return rows.map((row) => ({ email: row.email, role: row.role, hasPassword: row.has_password }));
  }

  async approve(email: unknown) {
    const address = validEmail(email);
    await this.db.query(`INSERT INTO members (email, role) VALUES ($1, 'member') ON CONFLICT DO NOTHING`, [address]);
    return { email: address };
  }

  async remove(email: string) {
    const rows = await this.db.query<{ role: Role }>('SELECT role FROM members WHERE email = $1', [normaliseEmail(email)]);
    if (rows[0]?.role === 'admin') throw new ConflictException('The Admin cannot be removed');
    await this.db.query('DELETE FROM members WHERE email = $1', [normaliseEmail(email)]);
  }

  async memberForToken(token: string): Promise<Member | undefined> {
    const [row] = await this.db.query<Member>(
      `SELECT m.email, m.role FROM sessions s JOIN members m ON m.email = s.email
       WHERE s.token_hash = $1 AND s.expires_at > now()`,
      [sha256(token)],
    );
    return row;
  }

  async signOut(token: string) {
    await this.db.query('DELETE FROM sessions WHERE token_hash = $1', [sha256(token)]);
  }

  private async startSession(email: string): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    await this.db.query(
      `INSERT INTO sessions (token_hash, email, expires_at) VALUES ($1, $2, now() + make_interval(days => $3))`,
      [sha256(token), email, SESSION_DAYS],
    );
    return token;
  }
}

const DUMMY_HASH = hashPassword('not-a-real-password');
