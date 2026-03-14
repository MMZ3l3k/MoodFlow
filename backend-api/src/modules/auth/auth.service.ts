import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserStatus } from '../../common/enums/user-status.enum';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Użytkownik z tym adresem email już istnieje');

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

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Nieprawidłowy email lub hasło');

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) throw new UnauthorizedException('Nieprawidłowy email lub hasło');

    if (user.status === UserStatus.PENDING) {
      throw new UnauthorizedException('Konto oczekuje na zatwierdzenie przez administratora');
    }
    if (user.status === UserStatus.REJECTED) {
      throw new UnauthorizedException('Konto zostało odrzucone');
    }

    await this.usersService.setOnline(user.id, true);
    return this.generateTokens(user.id, user.email);
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
    return this.generateTokens(userId, email);
  }

  private generateTokens(userId: number, email: string) {
    const payload = { sub: userId, email };

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
