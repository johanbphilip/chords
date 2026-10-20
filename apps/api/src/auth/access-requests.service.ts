import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Database } from '../database.js';
import { AuthService, normaliseEmail, validEmail, validName } from './auth.service.js';
import { InvitesService } from './invites.service.js';

const DEFAULT_CAP = 200;
const cap = () => Number(process.env.ACCESS_REQUEST_CAP ?? DEFAULT_CAP);

@Injectable()
export class AccessRequestsService {
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(InvitesService) private readonly invites: InvitesService,
  ) {}

  /**
   * Always answers the same, so the form cannot be used to find out who is approved or already a Member.
   * Requests from people who already have access, and any beyond the cap, are quietly ignored.
   */
  async request(email: unknown, name: unknown): Promise<{ received: true }> {
    const address = validEmail(email);
    const displayName = validName(name);
    const known = (await this.auth.isApproved(address)) || (await this.auth.isRegistered(address));
    if (!known) {
      await this.db.query(
        `INSERT INTO access_requests (email, name)
         SELECT $1, $2 WHERE (SELECT count(*) FROM access_requests) < $3
         ON CONFLICT (email) DO NOTHING`,
        [address, displayName, cap()],
      );
    }
    return { received: true };
  }

  async list(): Promise<{ email: string; name: string; requestedAt: string }[]> {
    const rows = await this.db.query<{ email: string; name: string; requested_at: Date }>(
      'SELECT email, name, requested_at FROM access_requests ORDER BY requested_at',
    );
    return rows.map((row) => ({ email: row.email, name: row.name, requestedAt: row.requested_at.toISOString() }));
  }

  /** Approving is the same as the Admin approving that email by hand: it gives an invite link. */
  async approve(email: string) {
    const address = normaliseEmail(email);
    const removed = await this.db.query('DELETE FROM access_requests WHERE email = $1 RETURNING email', [address]);
    if (removed.length === 0) throw new NotFoundException('There is no request from that email');
    return this.invites.approveAndInvite(address);
  }

  async decline(email: string) {
    await this.db.query('DELETE FROM access_requests WHERE email = $1', [normaliseEmail(email)]);
  }
}
