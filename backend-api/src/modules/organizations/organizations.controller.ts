import {
  Controller, Get, Post, Body, Param,
  UseGuards, ParseIntPipe, Request, HttpCode, HttpStatus,
} from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { RejectOrganizationDto } from './dto/reject-organization.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller('organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationsController {
  constructor(private organizationsService: OrganizationsService) {}

  // Super Admin — lista wszystkich firm
  @Get()
  @Roles(Role.SUPER_ADMIN)
  findAll() {
    return this.organizationsService.findAll();
  }

  // Super Admin — firmy oczekujące na zatwierdzenie
  @Get('pending')
  @Roles(Role.SUPER_ADMIN)
  findPending() {
    return this.organizationsService.findPending();
  }

  // Admin / HR firmy — dane swojej organizacji
  @Get('my')
  @Roles(Role.ADMIN, Role.HR)
  findMy(@Request() req: any) {
    return this.organizationsService.findById(req.user.organizationId);
  }

  // Super Admin — podgląd konkretnej firmy
  @Get(':id')
  @Roles(Role.SUPER_ADMIN)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.organizationsService.findById(id);
  }

  // Super Admin — tworzy firmę ręcznie (panel admina platformy)
  @Post()
  @Roles(Role.SUPER_ADMIN)
  create(@Body() dto: CreateOrganizationDto) {
    return this.organizationsService.create(dto);
  }

  // Super Admin — zatwierdza firmę
  @Post(':id/approve')
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  approve(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.organizationsService.approve(id, req.user.id);
  }

  // Super Admin — odrzuca firmę
  @Post(':id/reject')
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  reject(@Param('id', ParseIntPipe) id: number, @Request() req: any, @Body() dto: RejectOrganizationDto) {
    return this.organizationsService.reject(id, req.user.id, dto.reason);
  }

  // Super Admin — blokuje firmę (PU-22; opcjonalne uzasadnienie trafia do dziennika audytu)
  @Post(':id/block')
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  block(@Param('id', ParseIntPipe) id: number, @Request() req: any, @Body() dto: RejectOrganizationDto) {
    return this.organizationsService.block(id, req.user.id, dto?.reason);
  }

  // Super Admin — odblokowuje firmę (PU-22, ścieżka 2a: status wraca do active)
  @Post(':id/unblock')
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  unblock(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.organizationsService.unblock(id, req.user.id);
  }
}
