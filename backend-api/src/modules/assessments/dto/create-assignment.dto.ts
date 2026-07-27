import { ArrayMaxSize, IsArray, IsDateString, IsEnum, IsInt, IsOptional, IsString, Min, Max } from 'class-validator';
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

  /** PU-17: przypisanie do jednego lub wielu działów naraz. */
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  @IsOptional()
  targetDepartments?: string[];

  /** PU-16, krok 4: opcjonalne zaplanowanie startu testu w przyszłości (ISO 8601). */
  @IsDateString()
  @IsOptional()
  availableFrom?: string;

  @IsInt()
  @Min(1)
  @Max(168)
  @IsOptional()
  durationHours?: number;
}
