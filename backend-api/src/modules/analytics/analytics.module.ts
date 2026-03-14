import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AssessmentResult } from '../results/entities/assessment-result.entity';
import { User } from '../users/entities/user.entity';
import { AssessmentAssignment } from '../assessments/entities/assessment-assignment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AssessmentResult, User, AssessmentAssignment])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
