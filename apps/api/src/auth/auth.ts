import { betterAuth } from 'better-auth';
import { createAccessControl } from 'better-auth/plugins/access';
import { adminAc, defaultStatements, userAc } from 'better-auth/plugins/admin/access';
import { admin, bearer } from 'better-auth/plugins';
import type { Pool } from 'pg';
import { rateLimits } from '../rate-limit.js';

export type Role = 'admin' | 'member';

/** What a role may do. Add a resource here (e.g. deleting Songs) and grant it to `admin` below. */
const statements = { ...defaultStatements, approvedEmail: ['manage'] } as const;
const ac = createAccessControl(statements);

export type Permission = { [Resource in keyof typeof statements]?: (typeof statements)[Resource][number][] };

export function createAuth(pool: Pool) {
  return betterAuth({
    database: pool,
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:4000',
    trustedOrigins: [process.env.WEB_ORIGIN ?? 'http://localhost:3000'],
    // Sign-up is closed: Members are only created through AuthService.register, which checks the approved list.
    emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 8 },
    // The web app and API are on different origins, so sessions travel as bearer tokens.
    plugins: [bearer(), admin({ ac, roles: {
          admin: ac.newRole({ ...adminAc.statements, approvedEmail: ['manage'] }),
          member: ac.newRole({ ...userAc.statements }),
        }, defaultRole: 'member' })],
    // AuthService migrates the schema on startup, after this instance is built, so skip the check at construction.
    advanced: { database: { validateSchema: false } },
    // These admin routes would skip our approved list or mint sessions for other Members.
    disabledPaths: ['/admin/create-user', '/admin/impersonate-user'],
    rateLimit: { enabled: !rateLimits().disabled },
  });
}

export type Auth = ReturnType<typeof createAuth>;
