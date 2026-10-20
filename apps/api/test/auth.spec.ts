import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ADMIN, bearer, createApp, signIn } from './helpers.js';

describe('signing in', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await createApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it('signs the seeded Admin in and identifies them', async () => {
    const token = await signIn(app, ADMIN.email, ADMIN.password);
    const me = await request(app.getHttpServer()).get('/auth/me').set(bearer(token)).expect(200);
    expect(me.body).toEqual({ email: ADMIN.email, role: 'admin', name: 'Admin' });
  });

  it('refuses a wrong password and an unknown email alike', async () => {
    const wrong = await request(app.getHttpServer()).post('/api/auth/sign-in/email').send({ email: ADMIN.email, password: 'nope-nope' });
    const unknown = await request(app.getHttpServer()).post('/api/auth/sign-in/email').send({ email: 'ghost@example.com', password: 'nope-nope' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(unknown.body).toEqual(wrong.body);
  });

  it('shows signed-out visitors nothing', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
    await request(app.getHttpServer()).get('/auth/me').set(bearer('made-up-token')).expect(401);
  });

  it('stops a token working after sign-out', async () => {
    const token = await signIn(app, ADMIN.email, ADMIN.password);
    await request(app.getHttpServer()).post('/api/auth/sign-out').set(bearer(token)).expect(200);
    await request(app.getHttpServer()).get('/auth/me').set(bearer(token)).expect(401);
  });
});

describe('sessions', () => {
  it('last 30 days', async () => {
    const app = await createApp();
    try {
      const token = await signIn(app, ADMIN.email, ADMIN.password);
      const res = await request(app.getHttpServer()).get('/api/auth/get-session').set(bearer(token)).expect(200);
      const days = (new Date(res.body.session.expiresAt).getTime() - Date.now()) / 86_400_000;
      expect(days).toBeGreaterThan(29.5);
      expect(days).toBeLessThanOrEqual(30);
    } finally {
      await app.close();
    }
  });
});

describe('the Admin account', () => {
  it('cannot be claimed through Better Auth\'s own sign-up route', async () => {
    const app = await createApp();
    try {
      await request(app.getHttpServer())
        .post('/api/auth/sign-up/email')
        .send({ email: 'sneaky@example.com', password: 'a-long-password', name: 'Sneaky' })
        .expect(400);
      await request(app.getHttpServer()).post('/api/auth/sign-in/email').send({ email: 'sneaky@example.com', password: 'a-long-password' }).expect(401);
    } finally {
      await app.close();
    }
  });

});

describe('Better Auth admin routes', () => {
  it.each([
    'create-user',
    'impersonate-user',
    'remove-user',
    'ban-user',
    'unban-user',
    'set-role',
    'set-user-password',
    'revoke-user-session',
    'revoke-user-sessions',
  ])('cannot be used over HTTP to bypass our own rules: /admin/%s', async (route) => {
    const app = await createApp();
    try {
      const admin = await signIn(app, ADMIN.email, ADMIN.password);
      const res = await request(app.getHttpServer())
        .post(`/api/auth/admin/${route}`)
        .set(bearer(admin))
        .send({ userId: 'anyone', email: 'unapproved@example.com', password: 'a-long-password', name: 'X', role: 'member' });
      expect(res.status).toBe(404);
    } finally {
      await app.close();
    }
  });
});

describe('the Admin account across restarts', () => {
  const keep = { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD };
  afterEach(() => {
    process.env.ADMIN_EMAIL = keep.email;
    process.env.ADMIN_PASSWORD = keep.password;
  });

  const startAs = async (email: string, password?: string) => {
    process.env.ADMIN_EMAIL = email;
    if (password === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = password;
    return createApp();
  };

  it('keeps a changed password: ADMIN_PASSWORD only applies when the Admin is first created', async () => {
    const email = `bootstrap-${Date.now()}@example.com`;
    const first = await startAs(email, 'original-password');
    try {
      const token = await signIn(first, email, 'original-password');
      await request(first.getHttpServer())
        .post('/api/auth/change-password')
        .set(bearer(token))
        .send({ currentPassword: 'original-password', newPassword: 'changed-password' })
        .expect(200);
    } finally {
      await first.close();
    }
    const second = await startAs(email, 'original-password');
    try {
      await signIn(second, email, 'changed-password');
      await request(second.getHttpServer()).post('/api/auth/sign-in/email').send({ email, password: 'original-password' }).expect(401);
    } finally {
      await second.close();
    }
  });

  it('starts without ADMIN_PASSWORD once the Admin exists', async () => {
    const app = await startAs(ADMIN.email);
    await app.close();
  });

  it('refuses to start without ADMIN_PASSWORD while the Admin does not exist yet', async () => {
    await expect(startAs(`never-created-${Date.now()}@example.com`)).rejects.toThrow('ADMIN_PASSWORD');
  });
});
