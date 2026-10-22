import { afterEach, beforeAll, afterAll, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  ADMIN,
  approve,
  bearer,
  createApp,
  inviteToken,
  joinAs,
  signIn,
  uniqueEmail,
} from '../helpers.js';

describe('invite links', () => {
  let app: INestApplication;
  let admin: string;
  const http = () => request(app.getHttpServer());
  const accept = (token: string, body: Record<string, unknown> = {}) =>
    http()
      .post('/auth/accept-invite')
      .send({ token, name: 'Maria', password: 'correct horse', ...body });

  beforeAll(async () => {
    app = await createApp();
    admin = await signIn(app, ADMIN.email, ADMIN.password);
  });
  afterAll(async () => {
    await app.close();
  });
  afterEach(() => {
    delete process.env.INVITE_TTL_SECONDS;
  });

  it('gives the Admin a link to copy when they approve an email', async () => {
    const res = await http()
      .post('/admin/approved-emails')
      .set(bearer(admin))
      .send({ email: uniqueEmail() })
      .expect(201);
    expect(res.body.inviteUrl).toMatch(/^http:\/\/localhost:3000\/invite\/[\w-]{20,}$/);
  });

  it('creates a Member, with their display name, and lets them sign in', async () => {
    const email = uniqueEmail();
    const res = await accept(await approve(app, admin, email), { name: 'Maria Lopez' }).expect(201);
    expect(res.body.member).toEqual({ email, role: 'member', name: 'Maria Lopez' });
    await signIn(app, email, 'correct horse');
  });

  it('works only once', async () => {
    const token = await approve(app, admin, uniqueEmail());
    await accept(token).expect(201);
    await accept(token).expect(400);
  });

  it('expires', async () => {
    process.env.INVITE_TTL_SECONDS = '1';
    const token = await approve(app, admin, uniqueEmail());
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await accept(token).expect(400);
  });

  it('is voided when the Admin issues a fresh link', async () => {
    const email = uniqueEmail();
    const first = await approve(app, admin, email);
    const again = await http()
      .post(`/admin/approved-emails/${encodeURIComponent(email)}/invite`)
      .set(bearer(admin))
      .expect(201);
    await accept(first).expect(400);
    await accept(inviteToken(again.body.inviteUrl)).expect(201);
  });

  it('gives a used, expired and made-up link the same answer', async () => {
    const used = await approve(app, admin, uniqueEmail());
    await accept(used).expect(201);
    const [again, madeUp] = await Promise.all([
      accept(used),
      accept('not-a-real-token-at-all-0123456789'),
    ]);
    expect(again.status).toBe(400);
    expect(again.body).toEqual(madeUp.body);
  });

  it('needs a display name and a password of 8 or more characters', async () => {
    const token = await approve(app, admin, uniqueEmail());
    await accept(token, { name: '   ' }).expect(400);
    await accept(token, { password: 'short' }).expect(400);
    await accept(token).expect(201);
  });

  it('cannot issue a fresh link to someone who has already joined', async () => {
    const member = await joinAs(app, admin);
    await http()
      .post(`/admin/approved-emails/${encodeURIComponent(member.email)}/invite`)
      .set(bearer(admin))
      .expect(409);
  });

  it('cannot issue a link to an email that was never approved', async () => {
    await http()
      .post(`/admin/approved-emails/${encodeURIComponent(uniqueEmail())}/invite`)
      .set(bearer(admin))
      .expect(404);
  });

  it('is for Admins only', async () => {
    const member = await joinAs(app, admin);
    const email = uniqueEmail();
    await approve(app, admin, email);
    await http()
      .post(`/admin/approved-emails/${encodeURIComponent(email)}/invite`)
      .set(bearer(member.token))
      .expect(403);
  });
});

describe('profile', () => {
  let app: INestApplication;
  let admin: string;
  beforeAll(async () => {
    app = await createApp();
    admin = await signIn(app, ADMIN.email, ADMIN.password);
  });
  afterAll(async () => {
    await app.close();
  });

  it('lets a Member change their display name', async () => {
    const member = await joinAs(app, admin, { name: 'Old Name' });
    await request(app.getHttpServer())
      .patch('/auth/me')
      .set(bearer(member.token))
      .send({ name: 'New Name' })
      .expect(200);
    const me = await request(app.getHttpServer())
      .get('/auth/me')
      .set(bearer(member.token))
      .expect(200);
    expect(me.body.name).toBe('New Name');
  });

  it('refuses an empty display name', async () => {
    const member = await joinAs(app, admin);
    await request(app.getHttpServer())
      .patch('/auth/me')
      .set(bearer(member.token))
      .send({ name: '  ' })
      .expect(400);
  });

  it('is not available to a signed-out visitor', async () => {
    await request(app.getHttpServer()).patch('/auth/me').send({ name: 'X' }).expect(401);
  });
});
