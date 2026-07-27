import { Injectable, CanActivate, ExecutionContext, Optional } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enums/role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuditService } from '../../modules/audit/audit.service';
import { AuditAction } from '../../modules/audit/entities/audit-log.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Optional() private readonly audit?: AuditService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;

    const req = context.switchToHttp().getRequest();
    const { user } = req;
    const allowed = requiredRoles.includes(user.role);
    if (!allowed && this.audit) {
      // PU-20 2a: odmowa dostępu jest rejestrowana jako incydent bezpieczeństwa
      void this.audit.log({
        action: AuditAction.ACCESS_DENIED,
        actorUserId: user?.id ?? null,
        organizationId: user?.organizationId ?? null,
        metadata: {
          path: req.url,
          method: req.method,
          role: user?.role ?? null,
          requiredRoles,
        },
        ipAddress: req.ip ?? null,
      });
    }
    return allowed;
  }
}
