import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResultsController } from './results.controller';
import { ResultsService } from './results.service';
import { ScoringService } from './scoring/scoring.service';
import { AssessmentResult } from './entities/assessment-result.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AssessmentResult])],
  controllers: [ResultsController],
  providers: [ResultsService, ScoringService],
  exports: [ScoringService],
})
export class ResultsModule {}
