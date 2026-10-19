import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ADMIN, bearer, createApp, signIn, uniqueEmail } from './helpers.js';

const LIMIT_ENV = {
  RATE_LIMIT_DISABLED: undefined,
  RATE_LIMIT_WINDOW_MS: '1000',
  RATE_LIMIT_DEFAULT_MAX: '5',
  RATE_LIMIT_REGISTER_MAX: '2',
};

describe('rate limiting', () => {
  let app: INestApplication;
  const saved: Record<string, string | undefined> = {};
  const http = () => request(app.getHttpServer());

  beforeEach(async () => {
    for (const [key, value] of Object.entries(LIMIT_ENV)) {
      saved[key] = process.env[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    app = await createApp();
  });

  afterEach(async () => {
    await app.close();
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  it('slows registration attempts sooner than ordinary requests', async () => {
    const attempt = () => http().post('/auth/register').send({ email: uniqueEmail('nobody'), password: 'long enough' });
    expect((await attempt()).status).toBe(403);
    expect((await attempt()).status).toBe(403);
    expect((await attempt()).status).toBe(429);
  });

  it('applies a default limit to every other endpoint', async () => {
    const token = await signIn(app, ADMIN.email, ADMIN.password);
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) statuses.push((await http().get('/auth/me').set(bearer(token))).status);
    expect(statuses.slice(0, 4)).toEqual([200, 200, 200, 200]);
    expect(statuses.at(-1)).toBe(429);
  });

  it('limits sign-in attempts, so a password cannot be guessed at speed', async () => {
    const attempt = () => http().post('/api/auth/sign-in/email').send({ email: ADMIN.email, password: 'wrong-guess' });
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) statuses.push((await attempt()).status);
    expect(statuses.every((status) => status === 401 || status === 429)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
  });

  it('cannot be dodged by sending a different X-Forwarded-For with every request', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 8; i++) {
      const res = await http()
        .post('/api/auth/sign-in/email')
        .set('X-Forwarded-For', `203.0.113.${i + 1}`)
        .send({ email: ADMIN.email, password: 'wrong-guess' });
      statuses.push(res.status);
    }
    expect(statuses).toContain(429);
  });

  it('lets a limited caller back in once the window has passed', async () => {
    const attempt = () => http().post('/auth/register').send({ email: uniqueEmail('nobody'), password: 'long enough' });
    await attempt();
    await attempt();
    expect((await attempt()).status).toBe(429);
    await pause(1100);
    expect((await attempt()).status).toBe(403);
  });
});
