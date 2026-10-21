import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { Database } from '../../infrastructure/database/database.js';
import { EmailService } from '../../infrastructure/email/email.service.js';
import { ApprovedEmailsService } from '../approved-emails/approved-emails.service.js';
import { MIN_PASSWORD, normaliseEmail, validName } from '../people.js';
import { AuthService, type Member } from '../session/auth.service.js';
import { webLink } from '../session/better-auth.js';

const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60;
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const lifetime = (seconds: number) =>
  seconds >= 86_400 ? `${Math.round(seconds / 86_400)} days` : `${Math.max(1, Math.round(seconds / 60))} minutes`;
const ttlSeconds = () => Number(process.env.INVITE_TTL_SECONDS ?? DEFAULT_TTL_SECONDS);

@Injectable()
export class InvitesService {
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(ApprovedEmailsService) private readonly approved: ApprovedEmailsService,
    @Inject(EmailService) private readonly email: EmailService,
  ) {}

  /** Approves an email and, unless they have already joined, gives the Admin a link to send them. */
  async approveAndInvite(email: unknown): Promise<{ email: string; inviteUrl: string | null }> {
    const { email: address } = await this.approved.approve(email);
    if (await this.approved.isRegistered(address)) return { email: address, inviteUrl: null };
    return { email: address, inviteUrl: await this.issueAndEmail(address) };
  }

  /** A fresh link for an approved email that has not joined yet. Any earlier link stops working. */
  async reissue(email: string): Promise<{ email: string; inviteUrl: string }> {
    const address = normaliseEmail(email);
    if (!(await this.approved.isApproved(address))) throw new NotFoundException('That email has not been approved');
    if (await this.approved.isRegistered(address)) throw new ConflictException('That person has already joined');
    return { email: address, inviteUrl: await this.issueAndEmail(address) };
  }

  async voidFor(email: string) {
    await this.db.query('DELETE FROM invites WHERE email = $1', [normaliseEmail(email)]);
  }

  /** Spends the link: the person chooses their display name and password and becomes a Member. */
  async accept(token: unknown, name: unknown, password: unknown): Promise<{ member: Member }> {
    const displayName = validName(name);
    if (typeof password !== 'string' || password.length < MIN_PASSWORD) {
      throw new BadRequestException(`Password must be at least ${MIN_PASSWORD} characters`);
    }
    // One answer for used, expired and made-up links.
    const refused = new BadRequestException('This invite link is invalid or has expired');
    if (typeof token !== 'string') throw refused;
    const [claimed] = await this.db.query<{ email: string }>(
      `UPDATE invites SET used_at = now()
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now() RETURNING email`,
      [sha256(token)],
    );
    if (!claimed) throw refused;
    try {
      return { member: await this.createMember(claimed.email, displayName, password) };
    } catch (error) {
      // Give the link back so the person can retry, but keep the cause: it may be an outage, not a bad link.
      console.error('Could not create the account for an invite', error);
      await this.db.query('UPDATE invites SET used_at = NULL WHERE token_hash = $1', [sha256(token)]);
      throw refused;
    }
  }

  /** Creates the account for an approved email. Throws if it is not approved or already exists. */
  private async createMember(email: string, name: string, password: string): Promise<Member> {
    if (!(await this.approved.isApproved(email))) throw new ForbiddenException('This email has not been approved');
    await this.auth.auth.api.createUser({ body: { email, password, name, role: 'member' } });
    return { email, role: 'member', name };
  }

  private async issueAndEmail(email: string): Promise<string> {
    const inviteUrl = await this.issue(email);
    await this.email.send({
      to: email,
      subject: 'You are invited to Chords',
      text: `Open this link to choose your name and password. It works once and expires in ${lifetime(ttlSeconds())}.\n\n${inviteUrl}`,
    });
    return inviteUrl;
  }

  private async issue(email: string): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    await this.db.query('DELETE FROM invites WHERE email = $1', [email]);
    await this.db.query(
      `INSERT INTO invites (token_hash, email, expires_at) VALUES ($1, $2, now() + make_interval(secs => $3))`,
      [sha256(token), email, ttlSeconds()],
    );
    return webLink(`/invite/${token}`);
  }
}
