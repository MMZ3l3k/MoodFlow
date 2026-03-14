import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { AssignmentTargetType } from '../entities/assessment-assignment.entity';

export class CreateAssignmentDto {
  @IsInt()
  assessmentId: number;

  @IsEnum(AssignmentTargetType)
  @IsOptional()
  targetType?: AssignmentTargetType;

  @IsInt()
  @IsOptional()
  targetUserId?: number;

  @IsString()
  @IsOptional()
  targetDepartment?: string;
}
