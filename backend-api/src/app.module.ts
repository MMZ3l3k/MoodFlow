import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailerModule } from '@nestjs-modules/mailer';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { AssessmentsModule } from './modules/assessments/assessments.module';
import { ResponsesModule } from './modules/responses/responses.module';
import { ResultsModule } from './modules/results/results.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AdminModule } from './modules/admin/admin.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { Department } from './modules/departments/entities/department.entity';
import { User } from './modules/users/entities/user.entity';
import { Organization } from './modules/organizations/entities/organization.entity';
import { Assessment } from './modules/assessments/entities/assessment.entity';
import { Question } from './modules/assessments/entities/question.entity';
import { AnswerOption } from './modules/assessments/entities/answer-option.entity';
import { AssessmentResult } from './modules/results/entities/assessment-result.entity';
import { UserResponse } from './modules/responses/entities/user-response.entity';
import { AssessmentAssignment } from './modules/assessments/entities/assessment-assignment.entity';
import { AuditLog } from './modules/audit/entities/audit-log.entity';
import { AuditModule } from './modules/audit/audit.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 15 * 60 * 1000, limit: 10 }]),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.get<string>('MAIL_HOST', 'smtp.gmail.com'),
          port: config.get<number>('MAIL_PORT', 587),
          secure: false,
          auth: {
            user: config.get<string>('MAIL_USER'),
            pass: config.get<string>('MAIL_PASS'),
          },
        },
        defaults: {
          from: config.get<string>('MAIL_FROM', '"MoodFlow" <noreply@moodflow.pl>'),
        },
      }),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        entities: [User, Organization, Department, Assessment, Question, AnswerOption, AssessmentResult, UserResponse, AssessmentAssignment, AuditLog],
        synchronize: config.get<string>('NODE_ENV') !== 'production',
        migrations: ['dist/migrations/*.js'],
        migrationsRun: config.get<string>('NODE_ENV') === 'production',
      }),
    }),
    AuthModule,
    UsersModule,
    OrganizationsModule,
    AssessmentsModule,
    ResponsesModule,
    ResultsModule,
    AnalyticsModule,
    AdminModule,
    NotificationsModule,
    DepartmentsModule,
    AuditModule,
    HealthModule,
  ],
})
export class AppModule {}
