import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { seedAssessments } from './seed/assessments.seed';
import { seedUsers } from './seed/users.seed';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 4000);
  console.log(`Backend API działa na porcie ${process.env.PORT ?? 4000}`);

  const dataSource = app.get(DataSource);
  await seedUsers(dataSource);
  await seedAssessments(dataSource);
}
bootstrap();
