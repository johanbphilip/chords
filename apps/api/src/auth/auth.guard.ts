import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthService, type Member, type Role } from './auth.service.js';

const PUBLIC = 'public';
const ROLE = 'role';

/** Opts a route out of the global sign-in requirement. */
export const Public = () => SetMetadata(PUBLIC, true);
/** Restricts a route to one role. */
export const RequireRole = (role: Role) => SetMetadata(ROLE, role);

export type AuthedRequest = Request & { member: Member; token: string };

export function bearerToken(request: Request): string | undefined {
  const [scheme, token] = (request.headers.authorization ?? '').split(' ');
  return scheme === 'Bearer' && token ? token : undefined;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC, targets)) return true;

    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const token = bearerToken(request);
    const member = token ? await this.auth.memberForToken(token) : undefined;
    if (!token || !member) throw new UnauthorizedException('Sign in required');
    request.member = member;
    request.token = token;

    const role = this.reflector.getAllAndOverride<Role | undefined>(ROLE, targets);
    if (role && member.role !== role) throw new ForbiddenException('Admins only');
    return true;
  }
}
