import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.HR, Role.ADMIN)
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('summary')
  getSummary(@Request() req: any) {
    return this.analyticsService.getSummary(req.user.organizationId);
  }

  @Get('trends')
  getTrends(
    @Request() req: any,
    @Query('assessmentCode') assessmentCode?: string,
    @Query('days') days?: string,
  ) {
    return this.analyticsService.getTrends(req.user.organizationId, assessmentCode, days ? Number(days) : undefined);
  }

  @Get('severity-distribution')
  getSeverityDistribution(@Request() req: any, @Query('assessmentCode') assessmentCode?: string) {
    return this.analyticsService.getSeverityDistribution(req.user.organizationId, assessmentCode);
  }

  @Get('participation')
  getParticipation(@Request() req: any) {
    return this.analyticsService.getParticipation(req.user.organizationId);
  }

  @Get('departments')
  getDepartmentStats(@Request() req: any) {
    return this.analyticsService.getDepartmentStats(req.user.organizationId);
  }

  @Get('assessments')
  getAvailableAssessments(@Request() req: any) {
    return this.analyticsService.getAvailableAssessments(req.user.organizationId);
  }

  @Get('hr-dashboard')
  getHrDashboard(@Request() req: any) {
    return this.analyticsService.getHrDashboard(req.user.organizationId);
  }

  @Get('department-wellbeing-load')
  getDepartmentWellbeingLoad(@Request() req: any) {
    return this.analyticsService.getDepartmentWellbeingLoad(req.user.organizationId);
  }

  @Get('org-wellbeing-history')
  getOrgWellbeingHistory(@Request() req: any) {
    return this.analyticsService.getOrgWellbeingHistory(req.user.organizationId);
  }

  @Get('risk-report')
  getRiskReport(@Request() req: any) {
    return this.analyticsService.getRiskReport(req.user.organizationId);
  }

  @Get('critical-changes')
  getCriticalChanges(@Request() req: any) {
    return this.analyticsService.getCriticalChanges(req.user.organizationId);
  }
}
