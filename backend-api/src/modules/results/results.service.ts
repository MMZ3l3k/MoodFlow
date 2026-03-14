import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssessmentResult } from './entities/assessment-result.entity';

@Injectable()
export class ResultsService {
  constructor(
    @InjectRepository(AssessmentResult)
    private resultRepo: Repository<AssessmentResult>,
  ) {}

  async findMyResults(userId: number): Promise<AssessmentResult[]> {
    return this.resultRepo.find({
      where: { userId },
      relations: ['assessment'],
      order: { submittedAt: 'DESC' },
    });
  }

  async findMyResultById(userId: number, id: number): Promise<AssessmentResult | null> {
    return this.resultRepo.findOne({
      where: { id, userId },
      relations: ['assessment'],
    });
  }
}
