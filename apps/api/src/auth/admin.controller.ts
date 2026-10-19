import { Body, Controller, Delete, Get, Inject, Param, Post } from '@nestjs/common';
import { RequireRole } from './auth.guard.js';
import { AuthService } from './auth.service.js';

@RequireRole('admin')
@Controller('admin/approved-emails')
export class AdminController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Get()
  list() {
    return this.auth.listApproved();
  }

  @Post()
  approve(@Body() body: { email?: unknown }) {
    return this.auth.approve(body.email);
  }

  @Delete(':email')
  async remove(@Param('email') email: string) {
    await this.auth.remove(email);
    return {};
  }
}
