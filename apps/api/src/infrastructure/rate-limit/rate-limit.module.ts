import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { throttlerOptions } from './rate-limit.js';

/** The throttler's options and storage. The guard that uses them is registered in AppModule, ahead of sign-in. */
@Module({
  imports: [ThrottlerModule.forRootAsync({ useFactory: throttlerOptions })],
  exports: [ThrottlerModule],
})
export class RateLimitModule {}
