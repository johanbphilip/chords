import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { toNodeHandler } from 'better-auth/node';
import type { NextFunction, Request, Response } from 'express';
import { AuthService } from './auth.service.js';

/** Hands every /api/auth request to Better Auth. Its routes are public; it enforces its own rules. */
@Injectable()
export class BetterAuthMiddleware implements NestMiddleware {
  private readonly handler: ReturnType<typeof toNodeHandler>;

  constructor(@Inject(AuthService) auth: AuthService) {
    this.handler = toNodeHandler(auth.auth);
  }

  use(req: Request, res: Response, _next: NextFunction) {
    // Better Auth rate limits by X-Forwarded-For, which any client can forge. Replace it with the address Express
    // resolves (the socket, or the proxy chain if `trust proxy` is set), the same one the throttler uses.
    req.headers['x-forwarded-for'] = req.ip;
    return this.handler(req, res);
  }
}
