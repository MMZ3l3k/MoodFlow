import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { UsersService } from '../../users/users.service';
import { UserStatus } from '../../../common/enums/user-status.enum';

const cookieExtractor = (req: Request): string | null => {
  return req?.cookies?.mf_access ?? null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      // Najpierw spróbuj odczytać z httpOnly cookie, w razie braku z Authorization header
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') as string,
    });
  }

  async validate(payload: { sub: number; email: string; role?: string; organizationId?: number; tokenVersion?: number }) {
    const user = await this.usersService.findById(payload.sub);
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Konto nieaktywne lub nie istnieje');
    }
    // H10: tokeny wydane przed podbiciem tokenVersion (zmiana hasła, zawieszenie)
    // są odrzucane natychmiast. Starsze tokeny bez pola traktujemy jako wersję 0.
    if ((payload.tokenVersion ?? 0) !== user.tokenVersion) {
      throw new UnauthorizedException('Sesja została unieważniona — zaloguj się ponownie');
    }
    return user;
  }
}
