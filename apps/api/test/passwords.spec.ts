import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ADMIN, approve, bearer, createApp, emailsTo, joinAs, lastTokenOf, signIn, uniqueEmail } from './helpers.js';

describe('passwords', () => {
  let app: INestApplication;
  let admin: string;
  const http = () => request(app.getHttpServer());
  const trySignIn = (email: string, password: string) => http().post('/api/auth/sign-in/email').send({ email, password });

  beforeAll(async () => {
    app = await createApp();
    admin = await signIn(app, ADMIN.email, ADMIN.password);
  });
  afterAll(async () => {
    await app.close();
  });

  describe('changing your own', () => {
    it('needs the current password, then signs in with the new one', async () => {
      const member = await joinAs(app, admin);
      await http()
        .post('/api/auth/change-password')
        .set(bearer(member.token))
        .send({ currentPassword: member.password, newPassword: 'a brand new one', revokeOtherSessions: true })
        .expect(200);
      await trySignIn(member.email, member.password).expect(401);
      await trySignIn(member.email, 'a brand new one').expect(200);
    });

    it('refuses a wrong current password', async () => {
      const member = await joinAs(app, admin);
      await http()
        .post('/api/auth/change-password')
        .set(bearer(member.token))
        .send({ currentPassword: 'not it at all', newPassword: 'a brand new one' })
        .expect(400);
      await trySignIn(member.email, member.password).expect(200);
    });

    it('ends their other sessions', async () => {
      const member = await joinAs(app, admin);
      const other = await signIn(app, member.email, member.password);
      await http()
        .post('/api/auth/change-password')
        .set(bearer(member.token))
        .send({ currentPassword: member.password, newPassword: 'a brand new one', revokeOtherSessions: true })
        .expect(200);
      await http().get('/auth/me').set(bearer(other)).expect(401);
    });
  });

  describe('resetting a forgotten one by email', () => {
    const requestReset = (email: string) => http().post('/api/auth/request-password-reset').send({ email });
    const reset = (token: string, newPassword = 'reset to this') =>
      http().post('/api/auth/reset-password').send({ token, newPassword });

    it('emails a link that sets a new password, once', async () => {
      const member = await joinAs(app, admin);
      await requestReset(member.email).expect(200);
      const [message] = emailsTo(member.email).slice(-1);
      expect(message!.text).toContain('/reset-password/');
      const token = lastTokenOf(message!);
      await reset(token).expect(200);
      await trySignIn(member.email, 'reset to this').expect(200);
      await trySignIn(member.email, member.password).expect(401);
      await reset(token, 'and another one').expect(400);
    });

    it('ends the sessions that were open before the reset', async () => {
      const member = await joinAs(app, admin);
      await requestReset(member.email).expect(200);
      await reset(lastTokenOf(emailsTo(member.email).slice(-1)[0]!)).expect(200);
      await http().get('/auth/me').set(bearer(member.token)).expect(401);
    });

    it('gives the same answer, and sends nothing, for an email that is not registered', async () => {
      const known = await joinAs(app, admin);
      const unknown = uniqueEmail('nobody');
      const [a, b] = [await requestReset(known.email), await requestReset(unknown)];
      expect(a.status).toBe(b.status);
      expect(a.body).toEqual(b.body);
      expect(emailsTo(unknown)).toEqual([]);
    });

    it('refuses a made-up token', async () => {
      await reset('not-a-real-token').expect(400);
    });
  });

  describe('a reset link from an Admin', () => {
    const resetLink = (token: string, email: string) =>
      http().post(`/admin/approved-emails/${encodeURIComponent(email)}/reset-link`).set(bearer(token));

    it('works like the emailed one, and is shown to the Admin to copy', async () => {
      const member = await joinAs(app, admin);
      const res = await resetLink(admin, member.email).expect(201);
      expect(res.body.resetUrl).toMatch(/^http:\/\/localhost:3000\/reset-password\/[\w-]{10,}$/);
      const token = res.body.resetUrl.split('/').pop();
      await http().post('/api/auth/reset-password').send({ token, newPassword: 'chosen by admin link' }).expect(200);
      await signIn(app, member.email, 'chosen by admin link');
    });

    it('is for Admins only', async () => {
      const member = await joinAs(app, admin);
      const other = await joinAs(app, admin);
      await resetLink(member.token, other.email).expect(403);
    });

    it('needs someone who has joined', async () => {
      const email = uniqueEmail();
      await approve(app, admin, email);
      await resetLink(admin, email).expect(404);
    });
  });

  describe('invite emails', () => {
    it('are sent when an Admin approves an email, with the same link the Admin sees', async () => {
      const email = uniqueEmail();
      const res = await http().post('/admin/approved-emails').set(bearer(admin)).send({ email }).expect(201);
      const [message] = emailsTo(email).slice(-1);
      expect(message!.text).toContain(res.body.inviteUrl);
    });
  });
});
