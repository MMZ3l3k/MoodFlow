import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser = require('cookie-parser');
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { seedAssessments } from './seed/assessments.seed';
import { seedUsers } from './seed/users.seed';

const REQUIRED_ENV = [
  'DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME',
  'JWT_SECRET', 'JWT_REFRESH_SECRET',
];

function validateEnv() {
  const missing = REQUIRED_ENV.filter((k) => !process.env[k] || process.env[k]?.trim() === '');
  if (missing.length > 0) {
    throw new Error(`Brak wymaganych zmiennych środowiskowych: ${missing.join(', ')}`);
  }
  const weak = ['change_me', 'secret', 'password', 'moodflow_secret'];
  for (const key of ['JWT_SECRET', 'JWT_REFRESH_SECRET'] as const) {
    const v = process.env[key]!;
    if (v.length < 32 || weak.some((w) => v.toLowerCase().includes(w))) {
      throw new Error(`${key} jest słaby. Wymagane min. 32 znaki i brak typowych słów (${weak.join(', ')}).`);
    }
  }
  if (process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_SECRET i JWT_REFRESH_SECRET nie mogą być identyczne.');
  }
}

async function bootstrap() {
  validateEnv();
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const corsOrigin = process.env.CORS_ORIGIN;
  if (!corsOrigin) {
    throw new Error('CORS_ORIGIN nie jest ustawiony.');
  }
  app.enableCors({
    origin: corsOrigin.split(',').map((s) => s.trim()).filter(Boolean),
    credentials: true,
  });

  const port = Number(process.env.PORT ?? 4000);
  // Listen na 0.0.0.0 (nie tylko localhost) — wymagane dla Railway/kontenerów
  await app.listen(port, '0.0.0.0');
  logger.log(`Backend API działa na porcie ${port}`);

  const dataSource = app.get(DataSource);
  await seedUsers(dataSource);
  await seedAssessments(dataSource);
}
bootstrap();
