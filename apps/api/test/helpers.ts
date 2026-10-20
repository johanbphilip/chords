import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

export const ADMIN = { email: 'admin@example.com', password: 'Password123' };

export async function createApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}

let counter = 0;
export const uniqueEmail = (name = 'member') => `${name}-${Date.now()}-${counter++}@example.com`;

export async function signIn(app: INestApplication, email: string, password: string): Promise<string> {
  const res = await request(app.getHttpServer()).post('/api/auth/sign-in/email').send({ email, password }).expect(200);
  return res.headers['set-auth-token'] as string;
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

export const inviteToken = (inviteUrl: string) => inviteUrl.split('/').pop()!;

/** Approves `email` as the Admin and returns the one-time token from its invite link. */
export async function approve(app: INestApplication, adminToken: string, email: string): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/admin/approved-emails')
    .set(bearer(adminToken))
    .send({ email })
    .expect(201);
  return inviteToken(res.body.inviteUrl);
}

/** Approves a new Member, accepts their invite, and returns their email, password and session token. */
export async function joinAs(
  app: INestApplication,
  adminToken: string,
  options: { email?: string; name?: string; password?: string } = {},
) {
  const email = options.email ?? uniqueEmail();
  const password = options.password ?? 'correct horse';
  const token = await approve(app, adminToken, email);
  await request(app.getHttpServer())
    .post('/auth/accept-invite')
    .send({ token, name: options.name ?? 'Test Member', password })
    .expect(201);
  return { email, password, token: await signIn(app, email, password) };
}
