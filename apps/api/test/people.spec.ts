import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ADMIN, approve, bearer, createApp, joinAs, signIn, uniqueEmail } from './helpers.js';

describe('revocation and roles', () => {
  let app: INestApplication;
  let admin: string;
  const http = () => request(app.getHttpServer());
  const enc = encodeURIComponent;
  const revoke = (token: string, email: string) => http().post(`/admin/members/${enc(email)}/revoke`).set(bearer(token));
  const restore = (token: string, email: string) => http().post(`/admin/members/${enc(email)}/restore`).set(bearer(token));
  const setRole = (token: string, email: string, role: string) =>
    http().put(`/admin/members/${enc(email)}/role`).set(bearer(token)).send({ role });
  const people = async () =>
    (await http().get('/admin/approved-emails').set(bearer(admin)).expect(200)).body as {
      email: string;
      role: string;
      name: string | null;
      status: string;
    }[];
  const sameAdminCount = async () => (await people()).filter((p) => p.role === 'admin' && p.status === 'active').length;

  beforeAll(async () => {
    app = await createApp();
    admin = await signIn(app, ADMIN.email, ADMIN.password);
  });
  afterAll(async () => {
    await app.close();
  });

  // These two run first: no other Admin exists yet, so the seeded Admin is the only one.
  it('refuses to demote the only Admin', async () => {
    expect(await sameAdminCount()).toBe(1);
    await setRole(admin, ADMIN.email, 'member').expect(409);
  });

  it('refuses to revoke the only Admin', async () => {
    await revoke(admin, ADMIN.email).expect(409);
    await http().get('/auth/me').set(bearer(admin)).expect(200);
  });

  describe('revoking', () => {
    it('stops sign-in and ends open sessions at once', async () => {
      const member = await joinAs(app, admin);
      const second = await signIn(app, member.email, member.password);
      await revoke(admin, member.email).expect(201);
      await http().get('/auth/me').set(bearer(member.token)).expect(401);
      await http().get('/auth/me').set(bearer(second)).expect(401);
      await http().post('/api/auth/sign-in/email').send({ email: member.email, password: member.password }).expect(403);
    });

    it('keeps their name in the list of people and marks them revoked', async () => {
      const member = await joinAs(app, admin, { name: 'Leaving Lee' });
      await revoke(admin, member.email).expect(201);
      const row = (await people()).find((p) => p.email === member.email);
      expect(row).toMatchObject({ name: 'Leaving Lee', status: 'revoked' });
      const names = (await http().get('/members').set(bearer(admin)).expect(200)).body;
      expect(names).toContainEqual({ id: expect.any(String), name: 'Leaving Lee', revoked: true });
    });

    it('can be undone, and they sign in again with the same password', async () => {
      const member = await joinAs(app, admin);
      await revoke(admin, member.email).expect(201);
      await restore(admin, member.email).expect(201);
      await signIn(app, member.email, member.password);
      expect((await people()).find((p) => p.email === member.email)?.status).toBe('active');
    });

    it('is refused for someone who never joined, or is unknown', async () => {
      const email = uniqueEmail();
      await approve(app, admin, email);
      await revoke(admin, email).expect(404);
      await revoke(admin, uniqueEmail()).expect(404);
    });
  });

  describe('removing an approved email', () => {
    it('is refused for someone who has joined: revoke them instead', async () => {
      const member = await joinAs(app, admin);
      await http().delete(`/admin/approved-emails/${enc(member.email)}`).set(bearer(admin)).expect(409);
      await http().get('/auth/me').set(bearer(member.token)).expect(200);
    });

    it('still works for someone who never joined', async () => {
      const email = uniqueEmail();
      await approve(app, admin, email);
      await http().delete(`/admin/approved-emails/${enc(email)}`).set(bearer(admin)).expect(200);
      expect((await people()).some((p) => p.email === email)).toBe(false);
    });
  });

  describe('roles', () => {
    it('lets an Admin promote a Member, who can then do Admin things, and demote them again', async () => {
      const member = await joinAs(app, admin);
      await http().get('/admin/approved-emails').set(bearer(member.token)).expect(403);
      await setRole(admin, member.email, 'admin').expect(200);
      await http().get('/admin/approved-emails').set(bearer(member.token)).expect(200);
      await setRole(admin, member.email, 'member').expect(200);
      await http().get('/admin/approved-emails').set(bearer(member.token)).expect(403);
    });

    it('lets an Admin step down while another Admin remains', async () => {
      const other = await joinAs(app, admin);
      await setRole(admin, other.email, 'admin').expect(200);
      try {
        // The other Admin demotes the seeded one and restores them, so the suite's Admin is untouched at the end.
        await setRole(other.token, ADMIN.email, 'member').expect(200);
        await setRole(other.token, ADMIN.email, 'admin').expect(200);
      } finally {
        await setRole(admin, other.email, 'member');
      }
    });

    it('refuses roles that do not exist', async () => {
      const member = await joinAs(app, admin);
      await setRole(admin, member.email, 'owner').expect(400);
    });

    it('is Admin-only, for every action', async () => {
      const member = await joinAs(app, admin);
      const other = await joinAs(app, admin);
      await revoke(member.token, other.email).expect(403);
      await restore(member.token, other.email).expect(403);
      await setRole(member.token, other.email, 'admin').expect(403);
      await setRole(member.token, member.email, 'admin').expect(403);
      await http().post(`/admin/members/${enc(other.email)}/revoke`).expect(401);
    });
  });

  describe('who can see whom', () => {
    it('shows Members each other\'s display names but never email addresses', async () => {
      const member = await joinAs(app, admin, { name: 'Visible Vee' });
      const viewer = await joinAs(app, admin);
      const res = await http().get('/members').set(bearer(viewer.token)).expect(200);
      expect(res.body).toContainEqual({ id: expect.any(String), name: 'Visible Vee', revoked: false });
      expect(JSON.stringify(res.body)).not.toContain(member.email);
      expect(JSON.stringify(res.body)).not.toContain('@');
    });

    it('keeps the list with emails for Admins', async () => {
      const viewer = await joinAs(app, admin);
      await http().get('/admin/approved-emails').set(bearer(viewer.token)).expect(403);
    });

    it('shows nothing to signed-out visitors', async () => {
      await http().get('/members').expect(401);
    });
  });
});
