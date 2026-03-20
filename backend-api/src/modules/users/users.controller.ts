import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApproveUserDto } from './dto/approve-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateUserAdminDto } from './dto/create-user-admin.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  getProfile(@Request() req: any) {
    return this.usersService.getProfile(req.user);
  }

  @Post('me/change-password')
  @HttpCode(HttpStatus.OK)
  changePasswordPost(@Request() req: any, @Body() body: { currentPassword: string; newPassword: string }) {
    return this.usersService.changePassword(req.user.id, body.currentPassword, body.newPassword);
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.OK)
  changePasswordPatch(@Request() req: any, @Body() body: { currentPassword: string; newPassword: string }) {
    return this.usersService.changePassword(req.user.id, body.currentPassword, body.newPassword);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAccount(@Request() req: any) {
    return this.usersService.deleteAccount(req.user.id);
  }

  // ADMIN widzi tylko swoją org, SUPER_ADMIN widzi wszystkich
  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.HR, Role.SUPER_ADMIN)
  findAll(@Request() req: any) {
    const isSuperAdmin = req.user.role === Role.SUPER_ADMIN;
    return this.usersService.findAll(isSuperAdmin ? undefined : req.user.organizationId);
  }

  // Działy z danej organizacji (string — backward compat)
  @Get('departments')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.HR)
  getDepartments(@Request() req: any) {
    return this.usersService.getDepartments(req.user.organizationId);
  }

  // Admin tworzy użytkownika w swojej organizacji
  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  createByAdmin(@Body() dto: CreateUserAdminDto, @Request() req: any) {
    return this.usersService.createByAdmin(dto, req.user.organizationId);
  }

  @Patch('departments/rename')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  renameDepartment(@Body() body: { oldName: string; newName: string }, @Request() req: any) {
    return this.usersService.renameDepartment(body.oldName, body.newName, req.user.organizationId);
  }

  // ADMIN widzi oczekujących ze swojej org
  @Get('pending')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  findPending(@Request() req: any) {
    const isSuperAdmin = req.user.role === Role.SUPER_ADMIN;
    return this.usersService.findPending(isSuperAdmin ? undefined : req.user.organizationId);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: ApproveUserDto, @Request() req: any) {
    const isSuperAdmin = req.user.role === Role.SUPER_ADMIN;
    return this.usersService.updateStatus(id, dto, isSuperAdmin ? undefined : req.user.organizationId);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto, @Request() req: any) {
    const isSuperAdmin = req.user.role === Role.SUPER_ADMIN;
    return this.usersService.update(id, dto, isSuperAdmin ? undefined : req.user.organizationId);
  }

  @Patch(':id/profile')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.HR)
  updateProfile(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(id, dto);
  }
}
