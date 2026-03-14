import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssessmentsController } from './assessments.controller';
import { AssessmentsService } from './assessments.service';
import { Assessment } from './entities/assessment.entity';
import { Question } from './entities/question.entity';
import { AnswerOption } from './entities/answer-option.entity';
import { AssessmentAssignment } from './entities/assessment-assignment.entity';
import { AssessmentResult } from '../results/entities/assessment-result.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Assessment, Question, AnswerOption, AssessmentAssignment, AssessmentResult])],
  controllers: [AssessmentsController],
  providers: [AssessmentsService],
  exports: [AssessmentsService],
})
export class AssessmentsModule {}
