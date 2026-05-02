import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { UsersService } from '../../users/users.service';

const refreshCookieExtractor = (req: Request): string | null => {
  return req?.cookies?.mf_refresh ?? null;
};

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      // Refresh: cookie httpOnly, fallback do body (kompatybilność z PWA/legacy klientami)
      jwtFromRequest: ExtractJwt.fromExtractors([
        refreshCookieExtractor,
        ExtractJwt.fromBodyField('refreshToken'),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET') as string,
      passReqToCallback: false,
    });
  }

  async validate(payload: { sub: number; email: string }) {
    const user = await this.usersService.findById(payload.sub);
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
