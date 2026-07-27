import { Equals, IsEmail, IsNotEmpty, IsOptional, IsNumber, MinLength } from 'class-validator';
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

  /** PU-2, krok 3: rejestracja wymaga akceptacji regulaminu serwisu. */
  @Equals(true, { message: 'Wymagana jest akceptacja regulaminu' })
  acceptedTerms: boolean;

  /** PU-2, krok 3: rejestracja wymaga zgody na przetwarzanie danych (RODO). */
  @Equals(true, { message: 'Wymagana jest zgoda na przetwarzanie danych osobowych' })
  acceptedPrivacy: boolean;
}
