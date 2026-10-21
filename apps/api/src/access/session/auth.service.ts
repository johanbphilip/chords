import { Inject, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { fromNodeHeaders } from 'better-auth/node';
import type { IncomingHttpHeaders } from 'node:http';
import { randomBytes } from 'node:crypto';
import { Database } from '../../infrastructure/database/database.js';
import { EmailService } from '../../infrastructure/email/email.service.js';
import { ApprovedEmailsService } from '../approved-emails/approved-emails.service.js';
import { normaliseEmail, validName } from '../people.js';
import { createAuth, RESET_TOKEN_SECONDS, webLink, type Auth, type Permission, type Role } from './better-auth.js';

export interface Member {
  email: string;
  role: Role;
  name: string;
}

const ADMIN_SEED_LOCK = 7002;

/** Better Auth wired to our database and email, plus what sits on top of it: the first Admin, sessions and reset links. */
@Injectable()
export class AuthService implements OnModuleInit {
  readonly auth: Auth;

  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(ApprovedEmailsService) private readonly approved: ApprovedEmailsService,
    @Inject(EmailService) email: EmailService,
  ) {
    this.auth = createAuth(db.pool, {
      // Not awaited: sending takes time only for registered emails, and that difference would reveal who is registered.
      sendResetPassword: async (to, token) => {
        void email.send({
          to,
          subject: 'Reset your Chords password',
          text: `Use this link to choose a new password. It works once and expires in an hour.\n\n${webLink(`/reset-password/${token}`)}`,
        });
      },
    });
  }

  async onModuleInit() {
    await this.db.withLock(ADMIN_SEED_LOCK, () => this.seedAdmin());
  }

  /**
   * The one Admin that exists from the start. ADMIN_PASSWORD is only used to create the account: after that the
   * Admin owns their password, so a change or reset is never overwritten by a restart.
   */
  private async seedAdmin() {
    const email = process.env.ADMIN_EMAIL;
    if (!email) return;
    const address = normaliseEmail(email);
    await this.approved.add(address);

    const context = await this.auth.$context;
    const existing = await context.internalAdapter.findUserByEmail(address);
    if (existing) {
      await context.internalAdapter.updateUser(existing.user.id, { role: 'admin' });
      return;
    }
    const password = process.env.ADMIN_PASSWORD;
    // Without a password the first visitor to open an invite for this email would not be the Admin we expect.
    if (!password) throw new Error('ADMIN_PASSWORD is required to create the Admin account');
    await this.auth.api.createUser({
      body: { email: address, password, name: process.env.ADMIN_NAME ?? 'Admin', role: 'admin' },
    });
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

  async renameMember(headers: IncomingHttpHeaders, name: unknown) {
    await this.auth.api.updateUser({ headers: fromNodeHeaders(headers), body: { name: validName(name) } });
  }

  async can(role: Role, permissions: Permission): Promise<boolean> {
    const { success } = await this.auth.api.userHasPermission({ body: { role, permissions } });
    return success;
  }

  async memberForHeaders(headers: IncomingHttpHeaders): Promise<Member | undefined> {
    const session = await this.auth.api.getSession({ headers: fromNodeHeaders(headers) });
    if (!session || session.user.banned) return undefined;
    // Approval is checked on every request, so taking someone off the list ends their access immediately.
    if (!(await this.approved.isApproved(session.user.email))) return undefined;
    return { email: session.user.email, role: session.user.role as Role, name: session.user.name };
  }
}
