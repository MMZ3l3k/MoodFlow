import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User } from './modules/users/entities/user.entity';
import { Organization } from './modules/organizations/entities/organization.entity';
import { Department } from './modules/departments/entities/department.entity';
import { Assessment } from './modules/assessments/entities/assessment.entity';
import { Question } from './modules/assessments/entities/question.entity';
import { AnswerOption } from './modules/assessments/entities/answer-option.entity';
import { AssessmentResult } from './modules/results/entities/assessment-result.entity';
import { UserResponse } from './modules/responses/entities/user-response.entity';
import { AssessmentAssignment } from './modules/assessments/entities/assessment-assignment.entity';
import { AuditLog } from './modules/audit/entities/audit-log.entity';
import { Notification } from './modules/notifications/entities/notification.entity';

// Konfiguracja DataSource używana wyłącznie przez CLI TypeORM
// (npm run typeorm:generate / typeorm:run / typeorm:revert).
// Aplikacja NestJS używa własnej konfiguracji w app.module.ts.
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [
    User, Organization, Department, Assessment, Question, AnswerOption,
    AssessmentResult, UserResponse, AssessmentAssignment, AuditLog, Notification,
  ],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
  logging: false,
});
