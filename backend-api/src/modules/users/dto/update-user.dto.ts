import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Role } from '../../../common/enums/role.enum';
import { UserStatus } from '../../../common/enums/user-status.enum';

// UWAGA (K1): świadomie NIE ma tu pola `organizationId` — pozwalało ono
// przenieść użytkownika do innej organizacji (obejście izolacji multi-tenant).
// Nadanie roli SUPER_ADMIN jest dodatkowo blokowane w UsersService.update().
export class UpdateUserDto {
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  department?: string | null;
}
