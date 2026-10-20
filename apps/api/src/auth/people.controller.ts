import { Body, Controller, Get, HttpCode, Inject, Param, Post, Put } from '@nestjs/common';
import { RequirePermission } from './auth.guard.js';
import { PeopleService } from './people.service.js';

@RequirePermission({ approvedEmail: ['manage'] })
@Controller('admin/members')
export class AdminMembersController {
  constructor(@Inject(PeopleService) private readonly people: PeopleService) {}

  @Post(':email/revoke')
  async revoke(@Param('email') email: string) {
    await this.people.revoke(email);
    return {};
  }

  @Post(':email/restore')
  async restore(@Param('email') email: string) {
    await this.people.restore(email);
    return {};
  }

  @Put(':email/role')
  @HttpCode(200)
  async setRole(@Param('email') email: string, @Body() body: { role?: unknown }) {
    await this.people.setRole(email, body.role);
    return {};
  }
}

/** What any signed-in Member may see of the others: display names, never emails. */
@Controller('members')
export class MembersController {
  constructor(@Inject(PeopleService) private readonly people: PeopleService) {}

  @Get()
  names() {
    return this.people.names();
  }
}
