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
    const res = await request(app.getHttpServer()).post('/auth/sign-in').send(ADMIN).expect(201);
    expect(res.body.user).toEqual({ email: ADMIN.email, role: 'admin' });
    const me = await request(app.getHttpServer()).get('/auth/me').set(bearer(res.body.token)).expect(200);
    expect(me.body).toEqual({ email: ADMIN.email, role: 'admin' });
  });

  it('refuses a wrong password and an unknown email alike', async () => {
    const wrong = await request(app.getHttpServer()).post('/auth/sign-in').send({ email: ADMIN.email, password: 'nope-nope' });
    const unknown = await request(app.getHttpServer()).post('/auth/sign-in').send({ email: 'ghost@example.com', password: 'nope-nope' });
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
    await request(app.getHttpServer()).post('/auth/sign-out').set(bearer(token)).expect(201);
    await request(app.getHttpServer()).get('/auth/me').set(bearer(token)).expect(401);
  });
});
