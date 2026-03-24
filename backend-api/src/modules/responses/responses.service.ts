import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserResponse } from './entities/user-response.entity';
import { AssessmentResult } from '../results/entities/assessment-result.entity';
import { Assessment } from '../assessments/entities/assessment.entity';
import { AssessmentAssignment, AssignmentTargetType } from '../assessments/entities/assessment-assignment.entity';
import { ScoringService } from '../results/scoring/scoring.service';
import { SubmitResponsesDto } from './dto/submit-responses.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ResponsesService {
  constructor(
    @InjectRepository(UserResponse)
    private userResponseRepo: Repository<UserResponse>,
    @InjectRepository(AssessmentResult)
    private resultRepo: Repository<AssessmentResult>,
    @InjectRepository(Assessment)
    private assessmentRepo: Repository<Assessment>,
    @InjectRepository(AssessmentAssignment)
    private assignmentRepo: Repository<AssessmentAssignment>,
    private scoringService: ScoringService,
  ) {}

  async submit(user: User, dto: SubmitResponsesDto): Promise<AssessmentResult> {
    const now = new Date();

    // 1. Find and validate the assignment
    const assignment = await this.assignmentRepo.findOne({
      where: { id: dto.assignmentId },
    });

    if (!assignment) throw new NotFoundException('Przypisanie testu nie zostało znalezione');

    // 2. Check assignment matches the requested assessment
    if (assignment.assessmentId !== dto.assessmentId) {
      throw new BadRequestException('Przypisanie nie pasuje do wybranego testu');
    }

    // 3. Check time window: test must have already started
    if (now < new Date(assignment.availableFrom)) {
      throw new ForbiddenException('Ten test nie jest jeszcze dostępny');
    }

    // 4. Check time window: test must not be expired
    if (now > new Date(assignment.availableTo)) {
      throw new ForbiddenException('Czas na wykonanie tego testu minął');
    }

    // 5. Check organization isolation: assignment must belong to user's organization
    if (assignment.organizationId && user.organizationId && assignment.organizationId !== user.organizationId) {
      throw new ForbiddenException('Nie masz dostępu do tego testu');
    }

    // 6. Check user eligibility for this assignment
    const isEligible =
      assignment.targetType === AssignmentTargetType.ALL ||
      (assignment.targetType === AssignmentTargetType.USER && assignment.targetUserId === user.id) ||
      (assignment.targetType === AssignmentTargetType.DEPARTMENT && assignment.targetDepartment === user.department);

    if (!isEligible) throw new ForbiddenException('Nie masz dostępu do tego testu');

    // 7. Prevent duplicate submission for the same assignment
    const existing = await this.resultRepo.findOne({
      where: { userId: user.id, assignmentId: dto.assignmentId },
    });

    if (existing) throw new BadRequestException('Ten test został już przez Ciebie wypełniony');

    // 8. Load assessment with questions for scoring
    const assessment = await this.assessmentRepo.findOne({
      where: { id: dto.assessmentId, isActive: true },
      relations: ['questions'],
    });

    if (!assessment) throw new NotFoundException('Test nie został znaleziony');

    const scoring = this.scoringService.compute(assessment, dto.answers);

    const answersSnapshot = dto.answers.map((a) => {
      const q = assessment.questions.find((q) => q.id === a.questionId);
      return { questionId: a.questionId, value: a.value, theme: q?.theme ?? '' };
    });

    const result = this.resultRepo.create({
      userId: user.id,
      assessmentId: dto.assessmentId,
      assignmentId: dto.assignmentId,
      rawScore: scoring.rawScore,
      normalizedScore: scoring.normalizedScore,
      severity: scoring.severity,
      riskFlags: scoring.riskFlags,
      answersSnapshot,
    });

    const savedResult = await this.resultRepo.save(result);

    const responses = dto.answers.map((a) =>
      this.userResponseRepo.create({
        resultId: savedResult.id,
        questionId: a.questionId,
        selectedValue: a.value,
      }),
    );
    await this.userResponseRepo.save(responses);

    return savedResult;
  }
}
