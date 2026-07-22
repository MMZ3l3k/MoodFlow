import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectOrganizationDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
