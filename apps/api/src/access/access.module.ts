import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { EmailModule } from '../infrastructure/email/email.module.js';
import { ApprovedEmailsController } from './approved-emails/approved-emails.controller.js';
import { ApprovedEmailsService } from './approved-emails/approved-emails.service.js';
import { InvitesController } from './invites/invites.controller.js';
import { InvitesService } from './invites/invites.service.js';
import { AdminMembersController, MembersController } from './members/members.controller.js';
import { MembersService } from './members/members.service.js';
import {
  AccessRequestsController,
  RequestAccessController,
} from './requests/access-requests.controller.js';
import { AccessRequestsService } from './requests/access-requests.service.js';
import { AuthService } from './session/auth.service.js';
import { BetterAuthMiddleware } from './session/better-auth.middleware.js';
import { SessionController } from './session/session.controller.js';

/**
 * Who may use Chords: sign-in and sessions (Better Auth), the approved list, invite links, access requests, and
 * Members' roles and revocation. The sign-in guard itself is registered in AppModule, after the throttler.
 */
@Module({
  imports: [EmailModule],
  controllers: [
    SessionController,
    InvitesController,
    RequestAccessController,
    AccessRequestsController,
    ApprovedEmailsController,
    AdminMembersController,
    MembersController,
  ],
  providers: [
    AuthService,
    ApprovedEmailsService,
    InvitesService,
    AccessRequestsService,
    MembersService,
  ],
  exports: [AuthService],
})
export class AccessModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(BetterAuthMiddleware).forRoutes('/api/auth/*splat');
  }
}
