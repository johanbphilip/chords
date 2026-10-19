import { betterAuth } from 'better-auth';
import { createAccessControl } from 'better-auth/plugins/access';
import { adminAc, defaultStatements, userAc } from 'better-auth/plugins/admin/access';
import { admin, bearer } from 'better-auth/plugins';
import type { Pool } from 'pg';

export type Role = 'admin' | 'member';

const ac = createAccessControl(defaultStatements);

export function createAuth(pool: Pool) {
  return betterAuth({
    database: pool,
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:4000',
    trustedOrigins: [process.env.WEB_ORIGIN ?? 'http://localhost:3000'],
    // Sign-up is closed: Members are only created through AuthService.register, which checks the approved list.
    emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 8 },
    // The web app and API are on different origins, so sessions travel as bearer tokens.
    plugins: [bearer(), admin({ ac, roles: { admin: adminAc, member: userAc }, defaultRole: 'member' })],
    // AuthService migrates the schema on startup, after this instance is built, so skip the check at construction.
    advanced: { database: { validateSchema: false } },
    rateLimit: { enabled: process.env.RATE_LIMIT_DISABLED !== '1' },
  });
}

export type Auth = ReturnType<typeof createAuth>;
