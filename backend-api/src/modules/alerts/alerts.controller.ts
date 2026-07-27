import { Body, Controller, Get, Param, ParseIntPipe, Patch, Query, Request, UseGuards } from '@nestjs/common';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { AlertsService } from './alerts.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

export class UpdateAlertDto {
  @IsOptional()
  @IsIn(['HANDLED'])
  status?: 'HANDLED';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

@Controller('alerts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.HR, Role.ADMIN)
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Get()
  list(@Request() req: any, @Query('includeClosed') includeClosed?: string) {
    return this.alerts.listForOrganization(req.user.organizationId, includeClosed === 'true');
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
    @Body() dto: UpdateAlertDto,
  ) {
    return this.alerts.update(id, req.user.organizationId, req.user.id, dto);
  }
}
