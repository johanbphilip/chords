import { Throttle } from '@nestjs/throttler';
import { Body, Controller, Get, Inject, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { rateLimits } from '../rate-limit.js';
import { Public, type AuthedRequest } from './auth.guard.js';

/** Sign-in, sign-out and sessions are Better Auth's, under /api/auth. These two are ours. */
@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: () => rateLimits().registerMax, ttl: () => rateLimits().windowMs } })
  @Post('register')
  register(@Body() body: { email?: unknown; password?: unknown }) {
    return this.auth.register(body.email, body.password);
  }

  @Get('me')
  me(@Req() request: AuthedRequest) {
    return request.member;
  }
}
