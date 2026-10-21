import { Body, Controller, Delete, Get, Inject, Param, Post } from '@nestjs/common';
import { InvitesService } from '../invites/invites.service.js';
import { RequirePermission } from '../session/auth.guard.js';
import { AuthService } from '../session/auth.service.js';
import { ApprovedEmailsService } from './approved-emails.service.js';

@RequirePermission({ approvedEmail: ['manage'] })
@Controller('admin/approved-emails')
export class ApprovedEmailsController {
  constructor(
    @Inject(ApprovedEmailsService) private readonly approved: ApprovedEmailsService,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(InvitesService) private readonly invites: InvitesService,
  ) {}

  @Get()
  list() {
    return this.approved.list();
  }

  @Post()
  approve(@Body() body: { email?: unknown }) {
    return this.invites.approveAndInvite(body.email);
  }

  @Post(':email/invite')
  reissue(@Param('email') email: string) {
    return this.invites.reissue(email);
  }

  @Post(':email/reset-link')
  resetLink(@Param('email') email: string) {
    return this.auth.resetLinkFor(email);
  }

  @Delete(':email')
  async remove(@Param('email') email: string) {
    await this.approved.remove(email);
    await this.invites.voidFor(email);
    return {};
  }
}
