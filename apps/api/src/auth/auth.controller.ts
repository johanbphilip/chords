import { Body, Controller, Get, Inject, Post, Req, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { Public, type AuthedRequest } from './auth.guard.js';

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Public()
  @Post('sign-in')
  async signIn(@Body() body: { email?: unknown; password?: unknown }) {
    if (typeof body.email !== 'string' || typeof body.password !== 'string') {
      throw new UnauthorizedException('Wrong email or password');
    }
    const result = await this.auth.signIn(body.email, body.password);
    if (!result) throw new UnauthorizedException('Wrong email or password');
    return result;
  }

  @Public()
  @Post('register')
  register(@Body() body: { email?: unknown; password?: unknown }) {
    return this.auth.register(body.email, body.password);
  }

  @Post('sign-out')
  async signOut(@Req() request: AuthedRequest) {
    await this.auth.signOut(request.token);
    return {};
  }

  @Get('me')
  me(@Req() request: AuthedRequest) {
    return request.member;
  }
}
