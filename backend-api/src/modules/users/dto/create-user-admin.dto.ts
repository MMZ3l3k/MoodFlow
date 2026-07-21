import { IsEmail, IsNotEmpty, MinLength, IsOptional, IsString, IsEnum } from 'class-validator';
import { IsSecurePassword } from '../../../common/validators/password-policy.decorator';
import { Role } from '../../../common/enums/role.enum';

export class CreateUserAdminDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(8)
  @IsSecurePassword()
  password: string;

  @IsNotEmpty()
  firstName: string;

  @IsNotEmpty()
  lastName: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
