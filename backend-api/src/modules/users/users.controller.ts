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

  // Static /me routes before :id
  @Get('me')
  getProfile(@Request() req: any) {
    return this.usersService.getProfile(req.user);
  }

  // POST for backward compat + PATCH alias (frontend sends PATCH /users/me/password)
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

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.HR)
  findAll() {
    return this.usersService.findAll();
  }

  @Get('departments')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.HR)
  getDepartments() {
    return this.usersService.getDepartments();
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  createByAdmin(@Body() dto: CreateUserAdminDto) {
    return this.usersService.createByAdmin(dto);
  }

  @Patch('departments/rename')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  renameDepartment(@Body() body: { oldName: string; newName: string }) {
    return this.usersService.renameDepartment(body.oldName, body.newName);
  }

  @Get('pending')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  findPending() {
    return this.usersService.findPending();
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: ApproveUserDto) {
    return this.usersService.updateStatus(id, dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Patch(':id/profile')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.HR)
  updateProfile(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(id, dto);
  }
}
