import { IsEmail, IsNotEmpty, IsOptional, IsNumber, MinLength } from 'class-validator';

export class RegisterEmployeeDto {
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
  inviteCode: string;

  @IsOptional()
  @IsNumber()
  departmentId?: number;
}
