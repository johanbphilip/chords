import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AdminController } from './auth/admin.controller.js';
import { AuthController } from './auth/auth.controller.js';
import { AuthGuard } from './auth/auth.guard.js';
import { BetterAuthMiddleware } from './auth/better-auth.middleware.js';
import { AuthService } from './auth/auth.service.js';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { Database } from './database.js';
import { HelloController } from './hello.controller.js';
import { throttlerOptions } from './rate-limit.js';

@Module({
  imports: [ThrottlerModule.forRootAsync({ useFactory: throttlerOptions })],
  controllers: [HelloController, AuthController, AdminController],
  providers: [
    Database,
    AuthService,
    // Throttle first, so a flood of unauthenticated requests is turned away before any session lookup.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(BetterAuthMiddleware).forRoutes('/api/auth/*splat');
  }
}
