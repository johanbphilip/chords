import { afterAll, beforeAll, describe, expect, it } from 'vitest';
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
    expect(me.body).toEqual({ email: ADMIN.email, role: 'admin', name: ADMIN.email });
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

  it('refuses to start with an Admin email but no Admin password', async () => {
    const password = process.env.ADMIN_PASSWORD;
    delete process.env.ADMIN_PASSWORD;
    try {
      await expect(createApp()).rejects.toThrow('ADMIN_PASSWORD');
    } finally {
      process.env.ADMIN_PASSWORD = password;
    }
  });
});

describe('Better Auth admin routes', () => {
  it('cannot be used to create an account that skips the approved list, or to impersonate a Member', async () => {
    const app = await createApp();
    try {
      const admin = await signIn(app, ADMIN.email, ADMIN.password);
      const create = await request(app.getHttpServer())
        .post('/api/auth/admin/create-user')
        .set(bearer(admin))
        .send({ email: 'unapproved@example.com', password: 'a-long-password', name: 'X', role: 'member' });
      expect(create.status).toBe(404);
      const impersonate = await request(app.getHttpServer())
        .post('/api/auth/admin/impersonate-user')
        .set(bearer(admin))
        .send({ userId: 'anyone' });
      expect(impersonate.status).toBe(404);
    } finally {
      await app.close();
    }
  });
});
