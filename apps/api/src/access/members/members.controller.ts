import { Body, Controller, Get, HttpCode, Inject, Param, Post, Put } from '@nestjs/common';
import { RequirePermission } from '../session/auth.guard.js';
import { MembersService } from './members.service.js';

@RequirePermission({ approvedEmail: ['manage'] })
@Controller('admin/members')
export class AdminMembersController {
  constructor(@Inject(MembersService) private readonly members: MembersService) {}

  @Post(':email/revoke')
  async revoke(@Param('email') email: string) {
    await this.members.revoke(email);
    return {};
  }

  @Post(':email/restore')
  async restore(@Param('email') email: string) {
    await this.members.restore(email);
    return {};
  }

  @Put(':email/role')
  @HttpCode(200)
  async setRole(@Param('email') email: string, @Body() body: { role?: unknown }) {
    await this.members.setRole(email, body.role);
    return {};
  }
}

/** What any signed-in Member may see of the others: display names, never emails. */
@Controller('members')
export class MembersController {
  constructor(@Inject(MembersService) private readonly members: MembersService) {}

  @Get()
  names() {
    return this.members.names();
  }
}
