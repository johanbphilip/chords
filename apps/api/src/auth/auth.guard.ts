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
import type { Role } from './auth.js';
import { AuthService, type Member } from './auth.service.js';

const PUBLIC = 'public';
const ROLE = 'role';

/** Opts a route out of the global sign-in requirement. */
export const Public = () => SetMetadata(PUBLIC, true);
/** Restricts a route to one role. */
export const RequireRole = (role: Role) => SetMetadata(ROLE, role);

export type AuthedRequest = Request & { member: Member };

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
    const member = await this.auth.memberForHeaders(request.headers);
    if (!member) throw new UnauthorizedException('Sign in required');
    request.member = member;

    const role = this.reflector.getAllAndOverride<Role | undefined>(ROLE, targets);
    if (role && member.role !== role) throw new ForbiddenException('Admins only');
    return true;
  }
}
