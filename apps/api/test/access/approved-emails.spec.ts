import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ADMIN, approve, bearer, createApp, joinAs, signIn, uniqueEmail } from '../helpers.js';

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

  it('lets an approved email join through its invite and sign in as a Member', async () => {
    const member = await joinAs(app, admin, { name: 'Maria' });
    const me = await http().get('/auth/me').set(bearer(member.token)).expect(200);
    expect(me.body).toEqual({ email: member.email, role: 'member', name: 'Maria' });
  });

  it('treats email case and surrounding spaces as the same address', async () => {
    const email = uniqueEmail('Mixed');
    const token = await approve(app, admin, `  ${email.toUpperCase()} `);
    const accepted = await http()
      .post('/auth/accept-invite')
      .send({ token, name: 'Mixed', password: 'correct horse' })
      .expect(201);
    expect(accepted.body.member.email).toBe(email.toLowerCase());
  });

  it('refuses an unapproved email: there is no way to sign in or register', async () => {
    const email = uniqueEmail('stranger');
    await http()
      .post('/api/auth/sign-in/email')
      .send({ email, password: 'correct horse' })
      .expect(401);
    await http().post('/auth/register').send({ email, password: 'correct horse' }).expect(404);
  });

  it('lists approved emails, with who has joined', async () => {
    const waiting = uniqueEmail();
    await approve(app, admin, waiting);
    await approve(app, admin, waiting);
    const joined = await joinAs(app, admin, { name: 'Joined' });
    const list = await http().get('/admin/approved-emails').set(bearer(admin)).expect(200);
    const row = (email: string) => list.body.filter((p: { email: string }) => p.email === email);
    expect(row(waiting)).toEqual([
      { email: waiting, role: 'member', name: null, status: 'invited' },
    ]);
    expect(row(joined.email)).toEqual([
      { email: joined.email, role: 'member', name: 'Joined', status: 'active' },
    ]);
  });

  it('rejects something that is not an email address', async () => {
    await http()
      .post('/admin/approved-emails')
      .set(bearer(admin))
      .send({ email: 'not-an-email' })
      .expect(400);
  });

  it('removing an email that never joined voids its invite', async () => {
    const email = uniqueEmail();
    const token = await approve(app, admin, email);
    await http()
      .delete(`/admin/approved-emails/${encodeURIComponent(email)}`)
      .set(bearer(admin))
      .expect(200);
    await http()
      .post('/auth/accept-invite')
      .send({ token, name: 'Late', password: 'correct horse' })
      .expect(400);
  });

  it('will not remove the Admin', async () => {
    await http()
      .delete(`/admin/approved-emails/${encodeURIComponent(ADMIN.email)}`)
      .set(bearer(admin))
      .expect(409);
  });

  it('refuses a Member who tries an Admin action', async () => {
    const member = await joinAs(app, admin);
    await http().get('/admin/approved-emails').set(bearer(member.token)).expect(403);
    await http()
      .post('/admin/approved-emails')
      .set(bearer(member.token))
      .send({ email: uniqueEmail() })
      .expect(403);
    await http()
      .delete(`/admin/approved-emails/${encodeURIComponent(member.email)}`)
      .set(bearer(member.token))
      .expect(403);
  });

  it('refuses a signed-out visitor any Admin action', async () => {
    await http().get('/admin/approved-emails').expect(401);
    await http().post('/admin/approved-emails').send({ email: uniqueEmail() }).expect(401);
  });
});
