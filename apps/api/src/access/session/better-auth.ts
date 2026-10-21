import { PASSWORD_MIN_LENGTH, type Role } from '@chords/shared';
import { betterAuth } from 'better-auth';
import { createAccessControl } from 'better-auth/plugins/access';
import { adminAc, defaultStatements, userAc } from 'better-auth/plugins/admin/access';
import { admin, bearer } from 'better-auth/plugins';
import type { Pool } from 'pg';
import { rateLimits } from '../../infrastructure/rate-limit/rate-limit.js';

/** What a role may do. Add a resource here (e.g. deleting Songs) and grant it to `admin` below. */
const statements = { ...defaultStatements, approvedEmail: ['manage'] } as const;
const ac = createAccessControl(statements);

export type Permission = { [Resource in keyof typeof statements]?: (typeof statements)[Resource][number][] };

export interface AuthHooks {
  sendResetPassword: (email: string, token: string) => Promise<void>;
}

export const RESET_TOKEN_SECONDS = 60 * 60;

export function createAuth(pool: Pool, hooks: AuthHooks) {
  return betterAuth({
    database: pool,
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:4000',
    trustedOrigins: [process.env.WEB_ORIGIN ?? 'http://localhost:3000'],
    // Sign-up is closed: Members are only created from an invite link (InvitesService.accept).
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: PASSWORD_MIN_LENGTH,
      resetPasswordTokenExpiresIn: RESET_TOKEN_SECONDS,
      // A reset or change of password ends the sessions that were open before it.
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: ({ user, token }) => hooks.sendResetPassword(user.email, token),
    },
    // The web app and API are on different origins, so sessions travel as bearer tokens.
    plugins: [bearer(), admin({ ac, roles: {
          admin: ac.newRole({ ...adminAc.statements, approvedEmail: ['manage'] }),
          member: ac.newRole({ ...userAc.statements }),
        }, defaultRole: 'member' })],
    // The schema comes from migrations (pnpm migrate), not from Better Auth, so skip its own check.
    advanced: { database: { validateSchema: false } },
    // Signed in for 30 days, renewed (at most once a day) whenever the session is used.
    session: { expiresIn: 30 * 24 * 60 * 60, updateAge: 24 * 60 * 60 },
    // Better Auth's admin routes would bypass our rules (the approved list, "revoke, never delete", the last-Admin
    // check). We use its ban, role and password fields through our own endpoints instead, so none are exposed.
    disabledPaths: [
      '/admin/create-user',
      '/admin/impersonate-user',
      '/admin/stop-impersonating',
      '/admin/remove-user',
      '/admin/ban-user',
      '/admin/unban-user',
      '/admin/set-role',
      '/admin/set-user-password',
      '/admin/update-user',
      '/admin/list-users',
      '/admin/get-user',
      '/admin/list-user-sessions',
      '/admin/revoke-user-session',
      '/admin/revoke-user-sessions',
    ],
    rateLimit: {
      enabled: !rateLimits().disabled,
      customRules: { '/request-password-reset': { window: 60, max: 3 } },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;

export const webLink = (path: string) => `${process.env.WEB_ORIGIN ?? 'http://localhost:3000'}${path}`;
