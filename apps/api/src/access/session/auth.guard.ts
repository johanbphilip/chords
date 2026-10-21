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
import { AuthService, type Member } from './auth.service.js';
import type { Permission } from './better-auth.js';

const PUBLIC = 'public';
const PERMISSION = 'permission';

/** Opts a route out of the global sign-in requirement. */
export const Public = () => SetMetadata(PUBLIC, true);
/** Restricts a route to Members whose role Better Auth says holds this permission. */
export const RequirePermission = (permission: Permission) => SetMetadata(PERMISSION, permission);

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

    const permission = this.reflector.getAllAndOverride<Permission | undefined>(PERMISSION, targets);
    if (permission && !(await this.auth.can(member.role, permission))) throw new ForbiddenException('Admins only');
    return true;
  }
}
