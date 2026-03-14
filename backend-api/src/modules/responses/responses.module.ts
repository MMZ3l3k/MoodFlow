import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResponsesController } from './responses.controller';
import { ResponsesService } from './responses.service';
import { UserResponse } from './entities/user-response.entity';
import { AssessmentResult } from '../results/entities/assessment-result.entity';
import { Assessment } from '../assessments/entities/assessment.entity';
import { AssessmentAssignment } from '../assessments/entities/assessment-assignment.entity';
import { ScoringService } from '../results/scoring/scoring.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserResponse, AssessmentResult, Assessment, AssessmentAssignment])],
  controllers: [ResponsesController],
  providers: [ResponsesService, ScoringService],
})
export class ResponsesModule {}
