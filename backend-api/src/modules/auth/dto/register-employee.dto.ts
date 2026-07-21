import { IsEmail, IsNotEmpty, IsOptional, IsNumber, MinLength } from 'class-validator';
import { IsSecurePassword } from '../../../common/validators/password-policy.decorator';

export class RegisterEmployeeDto {
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

  @IsNotEmpty()
  inviteCode: string;

  @IsOptional()
  @IsNumber()
  departmentId?: number;
}
