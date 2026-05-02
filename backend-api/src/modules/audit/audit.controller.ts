import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { AuditService } from './audit.service';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async list(@Req() req: any, @Query('limit') limit?: string) {
    const parsedLimit = Math.min(Number(limit) || 100, 500);
    if (req.user.role === Role.SUPER_ADMIN) {
      return this.auditService.list(undefined, parsedLimit);
    }
    return this.auditService.list(req.user.organizationId, parsedLimit);
  }
}
