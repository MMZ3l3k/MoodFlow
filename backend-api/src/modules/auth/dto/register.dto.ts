import { IsEmail, IsNotEmpty, MinLength, IsOptional, IsNumber, IsString } from 'class-validator';
import { IsSecurePassword } from '../../../common/validators/password-policy.decorator';

export class RegisterDto {
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
  @IsNumber()
  organizationId?: number;
}
