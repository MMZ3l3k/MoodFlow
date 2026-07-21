import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, Matches } from 'class-validator';
import { IsSecurePassword } from '../../../common/validators/password-policy.decorator';

export class RegisterCompanyDto {
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
  companyName: string;

  @IsNotEmpty()
  @Matches(/^\d{10}$/, { message: 'NIP musi składać się z 10 cyfr' })
  nip: string;

  @IsOptional()
  @IsString()
  description?: string;
}
