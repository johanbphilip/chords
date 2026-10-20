import { Controller, Delete, Get, Inject, Param, Post } from '@nestjs/common';
import { AccessRequestsService } from './access-requests.service.js';
import { RequirePermission } from './auth.guard.js';

@RequirePermission({ approvedEmail: ['manage'] })
@Controller('admin/access-requests')
export class AccessRequestsController {
  constructor(@Inject(AccessRequestsService) private readonly requests: AccessRequestsService) {}

  @Get()
  list() {
    return this.requests.list();
  }

  @Post(':email/approve')
  approve(@Param('email') email: string) {
    return this.requests.approve(email);
  }

  @Delete(':email')
  async decline(@Param('email') email: string) {
    await this.requests.decline(email);
    return {};
  }
}
