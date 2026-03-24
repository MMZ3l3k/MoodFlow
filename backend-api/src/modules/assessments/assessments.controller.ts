import {
  Controller, Get, Post, Delete, Param, Body,
  UseGuards, Request, ParseIntPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { AssessmentsService } from './assessments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CreateAssignmentDto } from './dto/create-assignment.dto';

@Controller('assessments')
@UseGuards(JwtAuthGuard)
export class AssessmentsController {
  constructor(private assessmentsService: AssessmentsService) {}

  @Get()
  findAll() {
    return this.assessmentsService.findAll();
  }

  // Static routes before :id
  @Get('assigned')
  getAssigned(@Request() req: any) {
    return this.assessmentsService.findAssignedForUser(req.user);
  }

  @Get('assignments')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.HR)
  getAllAssignments(@Request() req: any) {
    return this.assessmentsService.findAllAssignments(req.user.organizationId);
  }

  @Post('assignments')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.HR)
  createAssignment(@Body() dto: CreateAssignmentDto, @Request() req: any) {
    return this.assessmentsService.createAssignment(dto, req.user.id, req.user.organizationId);
  }

  @Delete('assignments/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.HR)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAssignment(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.assessmentsService.deleteAssignment(id, req.user.organizationId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.assessmentsService.findOne(id);
  }
}
