import { Body, Controller, Delete, Get, Inject, Param, Post } from '@nestjs/common';
import { RequirePermission } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { InvitesService } from './invites.service.js';

@RequirePermission({ approvedEmail: ['manage'] })
@Controller('admin/approved-emails')
export class AdminController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(InvitesService) private readonly invites: InvitesService,
  ) {}

  @Get()
  list() {
    return this.auth.listApproved();
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
    await this.auth.remove(email);
    await this.invites.voidFor(email);
    return {};
  }
}
