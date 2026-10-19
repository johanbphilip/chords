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
