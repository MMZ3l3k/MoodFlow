import { Controller, Get, Query, UseGuards } from '@nestjs/common';
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
  getSummary() {
    return this.analyticsService.getSummary();
  }

  @Get('trends')
  getTrends(@Query('assessmentCode') assessmentCode?: string) {
    return this.analyticsService.getTrends(assessmentCode);
  }

  @Get('severity-distribution')
  getSeverityDistribution(@Query('assessmentCode') assessmentCode?: string) {
    return this.analyticsService.getSeverityDistribution(assessmentCode);
  }

  @Get('participation')
  getParticipation() {
    return this.analyticsService.getParticipation();
  }

  @Get('departments')
  getDepartmentStats() {
    return this.analyticsService.getDepartmentStats();
  }

  @Get('assessments')
  getAvailableAssessments() {
    return this.analyticsService.getAvailableAssessments();
  }

  @Get('hr-dashboard')
  getHrDashboard() {
    return this.analyticsService.getHrDashboard();
  }
}
