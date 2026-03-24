import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.HR)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('overview')
  getOverview(@Request() req: any) {
    return this.adminService.getOverview(req.user.organizationId);
  }

  @Get('activity-today')
  getActivityToday(@Request() req: any) {
    return this.adminService.getActivityToday(req.user.organizationId);
  }
}
