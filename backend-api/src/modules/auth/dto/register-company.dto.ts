import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, Matches } from 'class-validator';

export class RegisterCompanyDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(8)
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
