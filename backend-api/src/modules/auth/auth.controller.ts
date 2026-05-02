import { Controller, Post, Body, UseGuards, Request, Res, HttpCode, HttpStatus, Headers } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { RegisterCompanyDto } from './dto/register-company.dto';
import { RegisterEmployeeDto } from './dto/register-employee.dto';
import { LoginDto } from './dto/login.dto';

const isProd = process.env.NODE_ENV === 'production';

const ACCESS_COOKIE = 'mf_access';
const REFRESH_COOKIE = 'mf_refresh';

const ACCESS_MAX_AGE = 15 * 60 * 1000;          // 15 min
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 dni

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  const baseOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: (isProd ? 'strict' : 'lax') as 'strict' | 'lax',
    path: '/',
  };
  res.cookie(ACCESS_COOKIE, accessToken, { ...baseOptions, maxAge: ACCESS_MAX_AGE });
  res.cookie(REFRESH_COOKIE, refreshToken, { ...baseOptions, maxAge: REFRESH_MAX_AGE });
}

function clearAuthCookies(res: Response) {
  const baseOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: (isProd ? 'strict' : 'lax') as 'strict' | 'lax',
    path: '/',
  };
  res.clearCookie(ACCESS_COOKIE, baseOptions);
  res.clearCookie(REFRESH_COOKIE, baseOptions);
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 15 * 60 * 1000, limit: 5 } })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('register-company')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60 * 60 * 1000, limit: 5 } })
  registerCompany(@Body() dto: RegisterCompanyDto) {
    return this.authService.registerCompany(dto);
  }

  @Post('register-employee')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 15 * 60 * 1000, limit: 5 } })
  registerEmployee(@Body() dto: RegisterEmployeeDto) {
    return this.authService.registerEmployee(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 15 * 60 * 1000, limit: 10 } })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.login(dto);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return tokens;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt-refresh'))
  async refresh(@Request() req: any, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.refresh(req.user.id, req.user.email);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return tokens;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Headers('authorization') authHeader: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(authHeader);
    clearAuthCookies(res);
    return { message: 'Wylogowano' };
  }
}
