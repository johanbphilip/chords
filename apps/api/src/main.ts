import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
    // The browser can only read the session token Better Auth returns on sign-in if it is exposed.
    exposedHeaders: ['set-auth-token'],
  });
  await app.listen(Number(process.env.PORT ?? 4000));
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
