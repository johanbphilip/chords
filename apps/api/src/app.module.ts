import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AccessModule } from './access/access.module.js';
import { AuthGuard } from './access/session/auth.guard.js';
import { HelloModule } from './hello/hello.module.js';
import { DatabaseModule } from './infrastructure/database/database.module.js';
import { AppThrottlerGuard } from './infrastructure/rate-limit/rate-limit.js';
import { RateLimitModule } from './infrastructure/rate-limit/rate-limit.module.js';
import { SongsModule } from './songs/songs.module.js';

@Module({
  imports: [DatabaseModule, RateLimitModule, AccessModule, SongsModule, HelloModule],
  providers: [
    // Throttle first, so a flood of unauthenticated requests is turned away before any session lookup.
    { provide: APP_GUARD, useClass: AppThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
