import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { IsSecurePassword } from '../../../common/validators/password-policy.decorator';

export class ChangePasswordDto {
  @IsNotEmpty()
  @IsString()
  currentPassword: string;

  @IsNotEmpty()
  @MinLength(8)
  @IsSecurePassword()
  newPassword: string;
}
