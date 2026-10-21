import { Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { getOptionsToken, getStorageToken, ThrottlerGuard, ThrottlerStorage } from '@nestjs/throttler';
import type { ThrottlerModuleOptions } from '@nestjs/throttler';

const number = (name: string, fallback: number) => Number(process.env[name] ?? fallback);

/** Read when the app starts, so tests (and hosts) can set limits through the environment. */
export function rateLimits() {
  return {
    disabled: process.env.RATE_LIMIT_DISABLED === '1',
    windowMs: number('RATE_LIMIT_WINDOW_MS', 60_000),
    defaultMax: number('RATE_LIMIT_DEFAULT_MAX', 120),
    registerMax: number('RATE_LIMIT_REGISTER_MAX', 5),
  };
}

/** One shared window per client for the whole Nest API; stricter routes override the limit with @Throttle. */
export function throttlerOptions(): ThrottlerModuleOptions {
  const { disabled, windowMs, defaultMax } = rateLimits();
  return { throttlers: [{ name: 'default', ttl: windowMs, limit: defaultMax }], skipIf: () => disabled };
}

/**
 * `@nestjs/throttler` is CommonJS and resolves a different `Reflector` class than the ESM build this app imports,
 * so Nest cannot inject its own. Injecting the app's `Reflector` explicitly avoids that (as AuthGuard does).
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  constructor(
    @Inject(getOptionsToken()) options: ThrottlerModuleOptions,
    @Inject(getStorageToken()) storageService: ThrottlerStorage,
    @Inject(Reflector) reflector: Reflector,
  ) {
    super(options, storageService, reflector);
  }
}
