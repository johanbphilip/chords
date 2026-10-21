import { Body, Controller, Inject, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { rateLimits } from '../../infrastructure/rate-limit/rate-limit.js';
import { Public } from '../session/auth.guard.js';
import { InvitesService } from './invites.service.js';

@Controller('auth')
export class InvitesController {
  constructor(@Inject(InvitesService) private readonly invites: InvitesService) {}

  @Public()
  @Throttle({ default: { limit: () => rateLimits().registerMax, ttl: () => rateLimits().windowMs } })
  @Post('accept-invite')
  acceptInvite(@Body() body: { token?: unknown; name?: unknown; password?: unknown }) {
    return this.invites.accept(body.token, body.name, body.password);
  }
}
