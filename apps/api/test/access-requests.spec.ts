import { afterEach, afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ADMIN, bearer, createApp, emailsTo, inviteToken, joinAs, signIn, uniqueEmail } from './helpers.js';

describe('access requests', () => {
  let app: INestApplication;
  let admin: string;
  const http = () => request(app.getHttpServer());
  const ask = (email: string, name = 'Maria Lopez') => http().post('/auth/request-access').send({ email, name });
  const pending = async () => (await http().get('/admin/access-requests').set(bearer(admin)).expect(200)).body as {
    email: string;
    name: string;
  }[];

  beforeAll(async () => {
    app = await createApp();
    admin = await signIn(app, ADMIN.email, ADMIN.password);
  });
  afterAll(async () => {
    await app.close();
  });
  afterEach(() => {
    delete process.env.ACCESS_REQUEST_CAP;
  });

  it('puts the person on the Admin\'s pending list and tells them it was received', async () => {
    const email = uniqueEmail('hopeful');
    const res = await ask(email).expect(201);
    expect(res.body).toEqual({ received: true });
    expect((await pending()).filter((r) => r.email === email)).toEqual([{ email, name: 'Maria Lopez', requestedAt: expect.any(String) }]);
  });

  it('does not make a second entry when the same email asks again', async () => {
    const email = uniqueEmail('hopeful');
    await ask(email).expect(201);
    await ask(email, 'Maria again').expect(201);
    expect((await pending()).filter((r) => r.email === email)).toHaveLength(1);
  });

  it('gives the same answer for someone already approved or already a Member, and adds nothing', async () => {
    const member = await joinAs(app, admin);
    const fresh = await ask(uniqueEmail('hopeful'));
    const known = await ask(member.email);
    expect(known.status).toBe(fresh.status);
    expect(known.body).toEqual(fresh.body);
    expect((await pending()).filter((r) => r.email === member.email)).toEqual([]);
  });

  it('needs a name and an email address', async () => {
    await ask('not-an-email').expect(400);
    await ask(uniqueEmail('hopeful'), '   ').expect(400);
  });

  it('lets the Admin approve a request, which gives an invite link and emails the requester', async () => {
    const email = uniqueEmail('hopeful');
    await ask(email, 'Joy').expect(201);
    expect(emailsTo(email)).toEqual([]);
    const res = await http().post(`/admin/access-requests/${encodeURIComponent(email)}/approve`).set(bearer(admin)).expect(201);
    expect(res.body.email).toBe(email);
    expect(emailsTo(email)).toHaveLength(1);
    expect((await pending()).filter((r) => r.email === email)).toEqual([]);
    await http()
      .post('/auth/accept-invite')
      .send({ token: inviteToken(res.body.inviteUrl), name: 'Joy', password: 'correct horse' })
      .expect(201);
    await signIn(app, email, 'correct horse');
  });

  it('lets the Admin decline, which removes the request and sends nothing', async () => {
    const email = uniqueEmail('hopeful');
    await ask(email).expect(201);
    await http().delete(`/admin/access-requests/${encodeURIComponent(email)}`).set(bearer(admin)).expect(200);
    expect((await pending()).filter((r) => r.email === email)).toEqual([]);
    expect(emailsTo(email)).toEqual([]);
  });

  it('leaves a pending or declined person unable to sign in', async () => {
    const email = uniqueEmail('hopeful');
    await ask(email).expect(201);
    await http().post('/api/auth/sign-in/email').send({ email, password: 'correct horse' }).expect(401);
  });

  it('is for Admins only', async () => {
    const member = await joinAs(app, admin);
    const email = uniqueEmail('hopeful');
    await ask(email).expect(201);
    await http().get('/admin/access-requests').set(bearer(member.token)).expect(403);
    await http().post(`/admin/access-requests/${encodeURIComponent(email)}/approve`).set(bearer(member.token)).expect(403);
    await http().delete(`/admin/access-requests/${encodeURIComponent(email)}`).set(bearer(member.token)).expect(403);
    await http().get('/admin/access-requests').expect(401);
  });

  it('stops growing at a cap, so the form cannot be used to fill the list', async () => {
    const before = (await pending()).length;
    process.env.ACCESS_REQUEST_CAP = String(before + 1);
    const [first, second] = [uniqueEmail('capped'), uniqueEmail('capped')];
    expect((await ask(first)).status).toBe(201);
    expect((await ask(second)).status).toBe(201);
    const emails = (await pending()).map((r) => r.email);
    expect(emails).toContain(first);
    expect(emails).not.toContain(second);
  });

  it('cannot approve a request that does not exist', async () => {
    await http().post(`/admin/access-requests/${encodeURIComponent(uniqueEmail())}/approve`).set(bearer(admin)).expect(404);
  });
});
