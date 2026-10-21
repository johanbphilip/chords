import { requestAccessSchema } from '@chords/shared';
import { Body, Controller, Delete, Get, Inject, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { rateLimits } from '../../infrastructure/rate-limit/rate-limit.js';
import { ZodPipe } from '../../infrastructure/validation/zod.pipe.js';
import { Public, RequirePermission } from '../session/auth.guard.js';
import { AccessRequestsService } from './access-requests.service.js';

/** A visitor asks for access from the sign-in page. Always answers the same, whoever they are. */
@Controller('auth')
export class RequestAccessController {
  constructor(@Inject(AccessRequestsService) private readonly requests: AccessRequestsService) {}

  @Public()
  @Throttle({ default: { limit: () => rateLimits().registerMax, ttl: () => rateLimits().windowMs } })
  @Post('request-access')
  requestAccess(@Body(new ZodPipe(requestAccessSchema)) body: { email: string; name: string }) {
    return this.requests.request(body.email, body.name);
  }
}

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
