import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Assessment } from './entities/assessment.entity';
import { AssessmentAssignment, AssignmentTargetType } from './entities/assessment-assignment.entity';
import { AssessmentResult } from '../results/entities/assessment-result.entity';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { User } from '../users/entities/user.entity';
import { UserStatus } from '../../common/enums/user-status.enum';
import { MailService } from '../notifications/mail.service';

@Injectable()
export class AssessmentsService {
  constructor(
    @InjectRepository(Assessment)
    private assessmentRepo: Repository<Assessment>,
    @InjectRepository(AssessmentAssignment)
    private assignmentRepo: Repository<AssessmentAssignment>,
    @InjectRepository(AssessmentResult)
    private resultRepo: Repository<AssessmentResult>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private readonly mailService: MailService,
  ) {}

  findAll(): Promise<Assessment[]> {
    return this.assessmentRepo.find({
      where: { isActive: true },
      relations: ['questions', 'answerOptions'],
      order: { id: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Assessment> {
    const a = await this.assessmentRepo.findOne({
      where: { id, isActive: true },
      relations: ['questions', 'answerOptions'],
    });
    if (!a) throw new NotFoundException('Test nie znaleziony');
    return a;
  }

  // Returns assignments visible to the given user (ALL + USER-specific + DEPARTMENT-specific)
  async findAssignedForUser(user: User) {
    // Only return assignments that have already started (availableFrom <= now)
    const now = new Date();
    const orgId = user.organizationId ?? null;

    // Fetch assignments for ALL users in this org
    const allAssignments = await this.assignmentRepo.find({
      where: { targetType: AssignmentTargetType.ALL, availableFrom: LessThanOrEqual(now), organizationId: orgId },
      relations: ['assessment'],
    });

    // Fetch assignments targeting this user directly
    const userAssignments = await this.assignmentRepo.find({
      where: { targetType: AssignmentTargetType.USER, targetUserId: user.id, availableFrom: LessThanOrEqual(now) },
      relations: ['assessment'],
    });

    // Fetch assignments targeting user's department (if set)
    let deptAssignments: AssessmentAssignment[] = [];
    if (user.department) {
      deptAssignments = await this.assignmentRepo.find({
        where: { targetType: AssignmentTargetType.DEPARTMENT, targetDepartment: user.department, availableFrom: LessThanOrEqual(now), organizationId: orgId },
        relations: ['assessment'],
      });
    }

    const combined = [...allAssignments, ...userAssignments, ...deptAssignments];

    // Deduplicate by id
    const seen = new Set<number>();
    const unique = combined.filter((a) => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });

    // Fetch user's completed results indexed by assignmentId
    const results = await this.resultRepo.find({ where: { userId: user.id } });
    const completedByAssignmentId = new Map<number, Date>(
      results.map((r) => [r.assignmentId, r.submittedAt] as [number, Date]),
    );

    return unique.map((assignment) => {
      return {
        id: assignment.id,
        assessmentId: assignment.assessmentId,
        assessmentName: assignment.assessment?.name ?? '',
        assessmentCode: assignment.assessment?.code ?? '',
        assessmentDescription: assignment.assessment?.description ?? '',
        questionCount: assignment.assessment?.questionCount ?? 0,
        availableFrom: assignment.availableFrom,
        availableTo: assignment.availableTo,
        completedAt: completedByAssignmentId.get(assignment.id) ?? null,
      };
    }).sort((a, b) => new Date(a.availableTo).getTime() - new Date(b.availableTo).getTime());
  }

  async createAssignment(dto: CreateAssignmentDto, assignedByUserId: number, organizationId: number): Promise<AssessmentAssignment> {
    const assessment = await this.assessmentRepo.findOne({ where: { id: dto.assessmentId } });
    if (!assessment) throw new NotFoundException('Test nie znaleziony');

    const assignment = this.assignmentRepo.create({
      assessmentId: dto.assessmentId,
      targetType: dto.targetType ?? AssignmentTargetType.ALL,
      targetUserId: dto.targetUserId ?? null,
      targetDepartment: dto.targetDepartment ?? null,
      availableFrom: new Date(),
      availableTo: new Date(Date.now() + (dto.durationHours ?? 24) * 60 * 60 * 1000),
      assignedByUserId,
      organizationId,
    });
    const saved = await this.assignmentRepo.save(assignment);

    // Wyślij powiadomienia e-mail asynchronicznie (nie blokuje odpowiedzi API)
    this.sendAssignmentEmails(saved, assessment.name).catch(() => {
      // błędy logowane wewnątrz mailService
    });

    return saved;
  }

  private async sendAssignmentEmails(assignment: AssessmentAssignment, assessmentName: string): Promise<void> {
    const targetUsers = await this.resolveTargetUsers(assignment);

    await Promise.all(
      targetUsers.map((user) =>
        this.mailService.sendAssignmentNotification({
          toEmail: user.email,
          toName: `${user.firstName} ${user.lastName}`,
          assessmentName,
          availableTo: assignment.availableTo,
        }),
      ),
    );
  }

  private async resolveTargetUsers(assignment: AssessmentAssignment): Promise<User[]> {
    const orgFilter = assignment.organizationId ? { organizationId: assignment.organizationId } : {};
    switch (assignment.targetType) {
      case AssignmentTargetType.USER: {
        if (!assignment.targetUserId) return [];
        const user = await this.userRepo.findOne({ where: { id: assignment.targetUserId } });
        return user ? [user] : [];
      }
      case AssignmentTargetType.DEPARTMENT: {
        if (!assignment.targetDepartment) return [];
        return this.userRepo.find({
          where: { department: assignment.targetDepartment, status: UserStatus.ACTIVE, ...orgFilter },
        });
      }
      case AssignmentTargetType.ALL:
      default: {
        return this.userRepo.find({ where: { status: UserStatus.ACTIVE, ...orgFilter } });
      }
    }
  }

  async findAllAssignments(organizationId: number): Promise<AssessmentAssignment[]> {
    return this.assignmentRepo.find({
      where: { organizationId },
      relations: ['assessment', 'assignedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async deleteAssignment(id: number, organizationId: number): Promise<void> {
    const assignment = await this.assignmentRepo.findOne({ where: { id } });
    if (!assignment) throw new NotFoundException('Przypisanie nie znalezione');
    if (assignment.organizationId !== organizationId) {
      throw new ForbiddenException('Brak dostępu do tego przypisania');
    }
    await this.assignmentRepo.delete(id);
  }
}
