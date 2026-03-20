import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { OrganizationStatus } from '../../../common/enums/organization-status.enum';

export class CreateOrganizationDto {
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  nip?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  status?: OrganizationStatus;

  @IsOptional()
  @IsString()
  inviteCode?: string;
}
