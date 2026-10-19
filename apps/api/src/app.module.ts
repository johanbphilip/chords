import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AdminController } from './auth/admin.controller.js';
import { AuthController } from './auth/auth.controller.js';
import { AuthGuard } from './auth/auth.guard.js';
import { AuthService } from './auth/auth.service.js';
import { Database } from './database.js';
import { HelloController } from './hello.controller.js';

@Module({
  controllers: [HelloController, AuthController, AdminController],
  providers: [Database, AuthService, { provide: APP_GUARD, useClass: AuthGuard }],
})
export class AppModule {}
