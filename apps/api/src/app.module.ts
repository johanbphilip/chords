import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AccessRequestsController } from './auth/access-requests.controller.js';
import { AccessRequestsService } from './auth/access-requests.service.js';
import { AdminController } from './auth/admin.controller.js';
import { AdminMembersController, MembersController } from './auth/members.controller.js';
import { MembersService } from './auth/members.service.js';
import { AuthController } from './auth/auth.controller.js';
import { AuthGuard } from './auth/auth.guard.js';
import { BetterAuthMiddleware } from './auth/better-auth.middleware.js';
import { AuthService } from './auth/auth.service.js';
import { InvitesService } from './auth/invites.service.js';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { Database } from './database.js';
import { EmailService } from './email.service.js';
import { HelloController } from './hello.controller.js';
import { throttlerOptions } from './rate-limit.js';

@Module({
  imports: [ThrottlerModule.forRootAsync({ useFactory: throttlerOptions })],
  controllers: [HelloController, AuthController, AdminController, AccessRequestsController, AdminMembersController, MembersController],
  providers: [
    Database,
    EmailService,
    AuthService,
    InvitesService,
    AccessRequestsService,
    MembersService,
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
