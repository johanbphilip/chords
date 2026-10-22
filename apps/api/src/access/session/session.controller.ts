import { renameSchema } from '@chords/shared';
import { Body, Controller, Get, Inject, Patch, Req } from '@nestjs/common';
import { ZodPipe } from '../../infrastructure/validation/zod.pipe.js';
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
  async rename(
    @Req() request: AuthedRequest,
    @Body(new ZodPipe(renameSchema)) body: { name: string },
  ) {
    await this.auth.renameMember(request.headers, body.name);
    return {};
  }
}
