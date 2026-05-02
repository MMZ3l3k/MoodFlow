import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { UsersService } from '../users/users.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { RegisterDto } from './dto/register.dto';
import { RegisterCompanyDto } from './dto/register-company.dto';
import { RegisterEmployeeDto } from './dto/register-employee.dto';
import { LoginDto } from './dto/login.dto';
import { UserStatus } from '../../common/enums/user-status.enum';
import { OrganizationStatus } from '../../common/enums/organization-status.enum';
import { Role } from '../../common/enums/role.enum';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private organizationsService: OrganizationsService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private auditService: AuditService,
  ) {}

  // Stara rejestracja — zachowana dla backward compat
  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Nie można utworzyć konta z tymi danymi. Sprawdź wpisane informacje lub spróbuj się zalogować.');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      department: dto.department,
      organizationId: dto.organizationId,
    });

    return {
      message: 'Rejestracja zakończona sukcesem. Konto czeka na zatwierdzenie przez administratora.',
      userId: user.id,
    };
  }

  // Rejestracja nowej firmy — tworzy organizację PENDING + admina PENDING
  async registerCompany(dto: RegisterCompanyDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Nie można utworzyć konta z tymi danymi. Sprawdź wpisane informacje lub spróbuj się zalogować.');

    const nipTaken = await this.organizationsService.findByNip(dto.nip);
    if (nipTaken) throw new ConflictException('Nie można utworzyć konta z tymi danymi. Sprawdź wpisane informacje lub spróbuj się zalogować.');

    const inviteCode = 'MOOD-' + randomBytes(4).toString('hex').toUpperCase();

    const organization = await this.organizationsService.create({
      name: dto.companyName,
      nip: dto.nip,
      description: dto.description,
      status: OrganizationStatus.PENDING,
      inviteCode,
    });

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: Role.ADMIN,
      status: UserStatus.PENDING,
      organizationId: organization.id,
    });

    // Zapisz powiązanie org ↔ admin
    await this.organizationsService.setAdmin(organization.id, user.id);

    return {
      message: 'Rejestracja firmy zakończona sukcesem. Konto oczekuje na aktywację przez właściciela platformy.',
      organizationId: organization.id,
    };
  }

  // Rejestracja pracownika przez kod zaproszenia
  async registerEmployee(dto: RegisterEmployeeDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Nie można utworzyć konta z tymi danymi. Sprawdź wpisane informacje lub spróbuj się zalogować.');

    const organization = await this.organizationsService.findByInviteCode(dto.inviteCode);
    if (!organization) throw new BadRequestException('Nieprawidłowy kod zaproszenia');
    if (organization.status !== OrganizationStatus.ACTIVE) {
      throw new BadRequestException('Firma nie jest aktywna w systemie');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: Role.EMPLOYEE,
      status: UserStatus.PENDING,
      organizationId: organization.id,
      departmentId: dto.departmentId ?? null,
    });

    return {
      message: 'Rejestracja zakończona sukcesem. Konto oczekuje na zatwierdzenie przez administratora firmy.',
      userId: user.id,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      await this.auditService.log({
        action: AuditAction.LOGIN_FAILED,
        actorUserId: null,
        metadata: { email: dto.email, reason: 'unknown_user' },
      });
      throw new UnauthorizedException('Nieprawidłowy email lub hasło');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      await this.auditService.log({
        action: AuditAction.LOGIN_FAILED,
        actorUserId: user.id,
        organizationId: user.organizationId ?? null,
        metadata: { email: dto.email, reason: 'wrong_password' },
      });
      throw new UnauthorizedException('Nieprawidłowy email lub hasło');
    }

    if (user.status === UserStatus.PENDING) {
      throw new UnauthorizedException('Konto oczekuje na zatwierdzenie przez administratora');
    }
    if (user.status === UserStatus.REJECTED) {
      throw new UnauthorizedException('Konto zostało odrzucone');
    }
    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Konto zostało zawieszone');
    }

    await this.usersService.setOnline(user.id, true);
    await this.auditService.log({
      action: AuditAction.LOGIN_SUCCESS,
      actorUserId: user.id,
      organizationId: user.organizationId ?? null,
      metadata: { email: user.email, role: user.role },
    });
    return this.generateTokens(user.id, user.email, user.role, user.organizationId ?? undefined);
  }

  async logout(authHeader: string): Promise<void> {
    if (!authHeader?.startsWith('Bearer ')) return;
    const token = authHeader.slice(7);
    try {
      const payload = this.jwtService.decode(token) as { sub?: number };
      if (payload?.sub) {
        await this.usersService.setOnline(payload.sub, false);
      }
    } catch {}
  }

  async refresh(userId: number, email: string) {
    const user = await this.usersService.findById(userId);
    return this.generateTokens(userId, email, user?.role, user?.organizationId ?? undefined);
  }

  private generateTokens(userId: number, email: string, role?: string, organizationId?: number) {
    const payload = { sub: userId, email, role, organizationId };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    return { accessToken, refreshToken };
  }
}
