import { Throttle } from '@nestjs/throttler';
import { Body, Controller, Get, Inject, Patch, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { InvitesService } from './invites.service.js';
import { rateLimits } from '../rate-limit.js';
import { Public, type AuthedRequest } from './auth.guard.js';

/** Sign-in, sign-out and sessions are Better Auth's, under /api/auth. These are ours. */
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(InvitesService) private readonly invites: InvitesService,
  ) {}

  @Public()
  @Throttle({ default: { limit: () => rateLimits().registerMax, ttl: () => rateLimits().windowMs } })
  @Post('accept-invite')
  acceptInvite(@Body() body: { token?: unknown; name?: unknown; password?: unknown }) {
    return this.invites.accept(body.token, body.name, body.password);
  }

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
