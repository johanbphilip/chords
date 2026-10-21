import { Body, Controller, Get, Inject, Patch, Req } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import type { AuthedRequest } from './auth.guard.js';

/** Sign-in, sign-out and sessions are Better Auth's, under /api/auth. These are ours. */
@Controller('auth')
export class SessionController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Get('me')
  me(@Req() request: AuthedRequest) {
    return request.member;
  }

  @Patch('me')
  async rename(@Req() request: AuthedRequest, @Body() body: { name?: unknown }) {
    await this.auth.renameMember(request.headers, body.name);
    return {};
  }
}
