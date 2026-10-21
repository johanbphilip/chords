import { normaliseEmail, type Role } from '@chords/shared';
import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { Database } from '../../infrastructure/database/database.js';

/** The allowlist: only an approved email can join, and removing one ends that person's access at once. */
@Injectable()
export class ApprovedEmailsService {
  constructor(@Inject(Database) private readonly db: Database) {}

  async isApproved(email: string): Promise<boolean> {
    const rows = await this.db.query('SELECT 1 FROM approved_emails WHERE email = $1', [email]);
    return rows.length > 0;
  }

  async isRegistered(email: string): Promise<boolean> {
    const rows = await this.db.query('SELECT 1 FROM "user" WHERE email = $1', [email]);
    return rows.length > 0;
  }

  async list(): Promise<{ email: string; role: Role; name: string | null; status: 'invited' | 'active' | 'revoked' }[]> {
    const rows = await this.db.query<{ email: string; role: Role | null; name: string | null; banned: boolean | null }>(
      `SELECT a.email, u.role, u.name, u.banned FROM approved_emails a LEFT JOIN "user" u ON u.email = a.email ORDER BY a.email`,
    );
    return rows.map((row) => ({
      email: row.email,
      role: row.role ?? 'member',
      name: row.name,
      status: row.role === null ? 'invited' : row.banned ? 'revoked' : 'active',
    }));
  }

  /** Adds an already-normalised address. Approving one that is already approved changes nothing. */
  async add(address: string) {
    await this.db.query('INSERT INTO approved_emails (email) VALUES ($1) ON CONFLICT DO NOTHING', [address]);
  }

  /** Removes an approved email that never joined. Someone who has joined is revoked instead, to keep their name. */
  async remove(email: string) {
    const address = normaliseEmail(email);
    if (await this.isRegistered(address)) {
      throw new ConflictException('That person has joined, so revoke their access instead of removing them');
    }
    await this.db.query('DELETE FROM approved_emails WHERE email = $1', [address]);
  }
}
