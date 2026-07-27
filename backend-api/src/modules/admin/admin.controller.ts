import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
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

  // PU-23: globalne metryki platformy — wyłącznie właściciel platformy
  // (dekorator na metodzie nadpisuje klasowe ADMIN/HR — RolesGuard używa getAllAndOverride)
  @Get('platform-stats')
  @Roles(Role.SUPER_ADMIN)
  getPlatformStats(@Query('from') from?: string, @Query('to') to?: string) {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    return this.adminService.getPlatformStats(
      fromDate && !Number.isNaN(fromDate.getTime()) ? fromDate : undefined,
      toDate && !Number.isNaN(toDate.getTime()) ? toDate : undefined,
    );
  }

  // PU-23: dzienna aktywność platformy do wykresu na pulpicie właściciela
  @Get('platform-activity')
  @Roles(Role.SUPER_ADMIN)
  getPlatformActivity(@Query('days') days?: string) {
    return this.adminService.getPlatformActivityTimeline(days ? Number(days) : undefined);
  }

  @Get('overview')
  getOverview(@Request() req: any) {
    return this.adminService.getOverview(req.user.organizationId);
  }

  @Get('activity-today')
  getActivityToday(@Request() req: any) {
    return this.adminService.getActivityToday(req.user.organizationId);
  }
}
