import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ADMIN, bearer, createApp, signIn, uniqueEmail } from './helpers.js';

describe('approved emails and roles', () => {
  let app: INestApplication;
  let admin: string;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createApp();
    admin = await signIn(app, ADMIN.email, ADMIN.password);
  });
  afterAll(async () => {
    await app.close();
  });

  const approve = (email: string) => http().post('/admin/approved-emails').set(bearer(admin)).send({ email });

  it('lets an approved email set a password and sign in as a Member', async () => {
    const email = uniqueEmail();
    await approve(email).expect(201);
    const registered = await http().post('/auth/register').send({ email, password: 'correct horse' }).expect(201);
    expect(registered.body.user).toEqual({ email, role: 'member' });
    const token = await signIn(app, email, 'correct horse');
    await http().get('/auth/me').set(bearer(token)).expect(200);
  });

  it('treats email case and surrounding spaces as the same address', async () => {
    const email = uniqueEmail('Mixed');
    await approve(`  ${email.toUpperCase()} `).expect(201);
    await http().post('/auth/register').send({ email, password: 'correct horse' }).expect(201);
  });

  it('refuses an unapproved email, for registration and sign-in', async () => {
    const email = uniqueEmail('stranger');
    await http().post('/auth/register').send({ email, password: 'correct horse' }).expect(403);
    await http().post('/auth/sign-in').send({ email, password: 'correct horse' }).expect(401);
  });

  it('refuses a short password', async () => {
    const email = uniqueEmail();
    await approve(email).expect(201);
    await http().post('/auth/register').send({ email, password: 'short' }).expect(400);
  });

  it('refuses to register an email that already has a password', async () => {
    const email = uniqueEmail();
    await approve(email).expect(201);
    await http().post('/auth/register').send({ email, password: 'correct horse' }).expect(201);
    await http().post('/auth/register').send({ email, password: 'another one!' }).expect(409);
    await signIn(app, email, 'correct horse');
  });

  it('lists approved emails and approving twice does nothing new', async () => {
    const email = uniqueEmail();
    await approve(email).expect(201);
    await approve(email).expect(201);
    const list = await http().get('/admin/approved-emails').set(bearer(admin)).expect(200);
    expect(list.body.filter((m: { email: string }) => m.email === email)).toEqual([{ email, role: 'member', hasPassword: false }]);
  });

  it('rejects something that is not an email address', async () => {
    await approve('not-an-email').expect(400);
  });

  it('stops a removed email signing in, even mid-session', async () => {
    const email = uniqueEmail();
    await approve(email).expect(201);
    await http().post('/auth/register').send({ email, password: 'correct horse' }).expect(201);
    const token = await signIn(app, email, 'correct horse');
    await http().delete(`/admin/approved-emails/${encodeURIComponent(email)}`).set(bearer(admin)).expect(200);
    await http().get('/auth/me').set(bearer(token)).expect(401);
    await http().post('/auth/sign-in').send({ email, password: 'correct horse' }).expect(401);
    await http().post('/auth/register').send({ email, password: 'correct horse' }).expect(403);
  });

  it('will not remove the Admin', async () => {
    await http().delete(`/admin/approved-emails/${encodeURIComponent(ADMIN.email)}`).set(bearer(admin)).expect(409);
  });

  it('refuses a Member who tries an Admin action', async () => {
    const email = uniqueEmail();
    await approve(email).expect(201);
    await http().post('/auth/register').send({ email, password: 'correct horse' }).expect(201);
    const member = await signIn(app, email, 'correct horse');
    await http().get('/admin/approved-emails').set(bearer(member)).expect(403);
    await http().post('/admin/approved-emails').set(bearer(member)).send({ email: uniqueEmail() }).expect(403);
    await http().delete(`/admin/approved-emails/${encodeURIComponent(email)}`).set(bearer(member)).expect(403);
  });

  it('refuses a signed-out visitor any Admin action', async () => {
    await http().get('/admin/approved-emails').expect(401);
    await http().post('/admin/approved-emails').send({ email: uniqueEmail() }).expect(401);
  });
});
