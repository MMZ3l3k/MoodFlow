import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryFailedError } from 'typeorm';
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
    private dataSource: DataSource,
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

    // 8. Load assessment with questions and answer options for scoring + validation
    const assessment = await this.assessmentRepo.findOne({
      where: { id: dto.assessmentId, isActive: true },
      relations: ['questions', 'answerOptions'],
    });

    if (!assessment) throw new NotFoundException('Test nie został znaleziony');

    // 9. K4: waliduj odpowiedzi zanim policzymy wynik — bez tego scoring przyjmował
    //    dowolne liczby (np. 100 albo wartości ujemne) i obce/zduplikowane questionId.
    this.validateAnswers(assessment, dto.answers);

    const scoring = this.scoringService.compute(assessment, dto.answers);

    const answersSnapshot = dto.answers.map((a) => {
      const q = assessment.questions.find((q) => q.id === a.questionId);
      return { questionId: a.questionId, value: a.value, theme: q?.theme ?? '' };
    });

    // H7: wynik i pojedyncze odpowiedzi zapisujemy w JEDNEJ transakcji — albo oba,
    // albo żadne (brak niespójnego stanu: wynik bez odpowiedzi lub odwrotnie).
    // H8: równoległy drugi submit narusza UNIQUE(userId, assignmentId) — łapiemy
    // kod 23505 i zwracamy 400 zamiast nieobsłużonego 500.
    try {
      return await this.dataSource.transaction(async (manager) => {
        const savedResult = await manager.save(
          this.resultRepo.create({
            userId: user.id,
            assessmentId: dto.assessmentId,
            assignmentId: dto.assignmentId,
            rawScore: scoring.rawScore,
            normalizedScore: scoring.normalizedScore,
            severity: scoring.severity,
            riskFlags: scoring.riskFlags,
            answersSnapshot,
          }),
        );

        const responses = dto.answers.map((a) =>
          this.userResponseRepo.create({
            resultId: savedResult.id,
            questionId: a.questionId,
            selectedValue: a.value,
          }),
        );
        await manager.save(responses);

        return savedResult;
      });
    } catch (e) {
      if (e instanceof QueryFailedError && (e as any).driverError?.code === '23505') {
        throw new BadRequestException('Ten test został już przez Ciebie wypełniony');
      }
      throw e;
    }
  }

  // K4: kontrola integralności przesłanych odpowiedzi względem definicji testu.
  private validateAnswers(assessment: Assessment, answers: { questionId: number; value: number }[]): void {
    const validQuestionIds = new Set(assessment.questions.map((q) => q.id));
    // Skala odpowiedzi zdefiniowana per test (answer_options). Gdy test nie ma
    // zdefiniowanych opcji, pomijamy kontrolę wartości (nie mamy się do czego odnieść).
    const validValues = new Set((assessment.answerOptions ?? []).map((o) => o.value));

    const seen = new Set<number>();
    for (const a of answers) {
      if (!validQuestionIds.has(a.questionId)) {
        throw new BadRequestException('Odpowiedź odnosi się do pytania spoza tego testu');
      }
      if (seen.has(a.questionId)) {
        throw new BadRequestException('Zduplikowana odpowiedź na to samo pytanie');
      }
      seen.add(a.questionId);
      if (validValues.size > 0 && !validValues.has(a.value)) {
        throw new BadRequestException('Nieprawidłowa wartość odpowiedzi dla tego testu');
      }
    }

    if (assessment.requiresAllAnswers && seen.size !== validQuestionIds.size) {
      throw new BadRequestException(
        `Test ${assessment.code} wymaga odpowiedzi na wszystkie ${validQuestionIds.size} pytań`,
      );
    }
  }
}
