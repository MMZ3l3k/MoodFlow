import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssessmentResult } from '../results/entities/assessment-result.entity';
import { User } from '../users/entities/user.entity';
import { AssessmentAssignment } from '../assessments/entities/assessment-assignment.entity';
import { UserStatus } from '../../common/enums/user-status.enum';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(AssessmentResult)
    private resultRepo: Repository<AssessmentResult>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(AssessmentAssignment)
    private assignmentRepo: Repository<AssessmentAssignment>,
  ) {}

  async getSummary() {
    const totalActive = await this.userRepo.count({ where: { status: UserStatus.ACTIVE } });
    const totalResults = await this.resultRepo.count();

    const avgData = await this.resultRepo
      .createQueryBuilder('r')
      .select('AVG(r.normalizedScore)', 'avg')
      .getRawOne();

    const avgNormalizedScore = avgData?.avg ? Math.round(Number(avgData.avg) * 10) / 10 : 0;

    const participantsData = await this.resultRepo
      .createQueryBuilder('r')
      .select('COUNT(DISTINCT r.userId)', 'count')
      .getRawOne();

    const participantsCount = Number(participantsData?.count ?? 0);
    const participationRate = totalActive > 0
      ? Math.round((participantsCount / totalActive) * 100)
      : 0;

    return {
      totalActiveUsers: totalActive,
      totalResultsSubmitted: totalResults,
      avgNormalizedScore,
      participationRate,
    };
  }

  async getTrends(assessmentCode?: string) {
    const qb = this.resultRepo
      .createQueryBuilder('r')
      .leftJoin('r.assessment', 'a')
      .select([
        `TO_CHAR(DATE_TRUNC('week', r."submittedAt"), 'YYYY-MM-DD') AS week`,
        'ROUND(AVG(r.normalizedScore)::numeric, 1) AS "avgScore"',
        'COUNT(r.id) AS count',
        'a.code AS "assessmentCode"',
        'a.name AS "assessmentName"',
      ])
      .groupBy(`DATE_TRUNC('week', r."submittedAt"), a.code, a.name`)
      .orderBy(`DATE_TRUNC('week', r."submittedAt")`, 'ASC');

    if (assessmentCode) {
      qb.where('a.code = :code', { code: assessmentCode });
    }

    const raw = await qb.getRawMany();
    return raw.map((row) => ({
      week: row.week,
      avgScore: Number(row.avgScore),
      count: Number(row.count),
      assessmentCode: row.assessmentCode,
      assessmentName: row.assessmentName,
    }));
  }

  async getSeverityDistribution(assessmentCode?: string) {
    const qb = this.resultRepo
      .createQueryBuilder('r')
      .leftJoin('r.assessment', 'a')
      .select([
        'r.severity AS severity',
        'a.code AS "assessmentCode"',
        'a.name AS "assessmentName"',
        'COUNT(r.id) AS count',
      ])
      .where('r.severity IS NOT NULL')
      .groupBy('r.severity, a.code, a.name')
      .orderBy('count', 'DESC');

    if (assessmentCode) {
      qb.andWhere('a.code = :code', { code: assessmentCode });
    }

    const raw = await qb.getRawMany();
    return raw.map((row) => ({
      severity: row.severity,
      assessmentCode: row.assessmentCode,
      assessmentName: row.assessmentName,
      count: Number(row.count),
    }));
  }

  async getParticipation() {
    const totalActive = await this.userRepo.count({ where: { status: UserStatus.ACTIVE } });

    const raw = await this.resultRepo
      .createQueryBuilder('r')
      .leftJoin('r.assessment', 'a')
      .select([
        'a.code AS "assessmentCode"',
        'a.name AS "assessmentName"',
        'COUNT(DISTINCT r.userId) AS participants',
        'COUNT(r.id) AS submissions',
      ])
      .groupBy('a.code, a.name')
      .orderBy('participants', 'DESC')
      .getRawMany();

    return raw.map((row) => ({
      assessmentCode: row.assessmentCode,
      assessmentName: row.assessmentName,
      participants: Number(row.participants),
      submissions: Number(row.submissions),
      participationRate: totalActive > 0
        ? Math.round((Number(row.participants) / totalActive) * 100)
        : 0,
      totalActive,
    }));
  }

  async getDepartmentStats() {
    const raw = await this.userRepo
      .createQueryBuilder('u')
      .leftJoin('assessment_results', 'r', 'r."userId" = u.id')
      .select([
        `COALESCE(u.department, 'Brak działu') AS department`,
        'COUNT(DISTINCT u.id) AS "activeUsers"',
        'COUNT(DISTINCT r."userId") AS "participantCount"',
        'COUNT(r.id) AS submissions',
        'ROUND(AVG(r."normalizedScore")::numeric, 1) AS "avgScore"',
      ])
      .where('u.status = :status', { status: UserStatus.ACTIVE })
      .groupBy('u.department')
      .orderBy('department', 'ASC')
      .getRawMany();

    return raw.map((row) => {
      const activeUsers = Number(row.activeUsers);
      const participantCount = Number(row.participantCount);
      return {
        department: row.department,
        activeUsers,
        participantCount,
        submissions: Number(row.submissions),
        avgScore: row.avgScore ? Number(row.avgScore) : null,
        participationRate: activeUsers > 0
          ? Math.round((participantCount / activeUsers) * 100)
          : 0,
      };
    });
  }

  async getAvailableAssessments() {
    const raw = await this.resultRepo
      .createQueryBuilder('r')
      .leftJoin('r.assessment', 'a')
      .select(['a.code AS code', 'a.name AS name'])
      .groupBy('a.code, a.name')
      .orderBy('a.code', 'ASC')
      .getRawMany();

    return raw.map((row) => ({ code: row.code, name: row.name }));
  }

  async getHrDashboard() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfLastWeek = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const startOfThisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Active employees
    const activeEmployees = await this.userRepo.count({ where: { status: UserStatus.ACTIVE } });

    // New this month
    const newThisMonth = await this.userRepo
      .createQueryBuilder('u')
      .where('u.status = :status', { status: UserStatus.ACTIVE })
      .andWhere('u."createdAt" >= :start', { start: startOfMonth })
      .getCount();

    // Assignments created today
    const assignedToday = await this.assignmentRepo
      .createQueryBuilder('a')
      .where('a."createdAt" >= :start', { start: startOfToday })
      .getCount();

    // Completion % for today's assignments
    const completedToday = await this.resultRepo
      .createQueryBuilder('r')
      .where('r."submittedAt" >= :start', { start: startOfToday })
      .getCount();

    const completionRate = assignedToday > 0
      ? Math.round((completedToday / assignedToday) * 100)
      : 0;

    // Avg stress score this week
    const thisWeekAvg = await this.resultRepo
      .createQueryBuilder('r')
      .select('AVG(r."normalizedScore")', 'avg')
      .where('r."submittedAt" >= :start', { start: startOfThisWeek })
      .getRawOne();

    // Avg stress score previous week
    const lastWeekAvg = await this.resultRepo
      .createQueryBuilder('r')
      .select('AVG(r."normalizedScore")', 'avg')
      .where('r."submittedAt" >= :start AND r."submittedAt" < :end', {
        start: startOfLastWeek,
        end: startOfThisWeek,
      })
      .getRawOne();

    const avgStressThisWeek = thisWeekAvg?.avg ? Math.round(Number(thisWeekAvg.avg) * 10) / 10 : null;
    const avgStressLastWeek = lastWeekAvg?.avg ? Math.round(Number(lastWeekAvg.avg) * 10) / 10 : null;
    const stressDelta = avgStressThisWeek !== null && avgStressLastWeek !== null
      ? Math.round((avgStressThisWeek - avgStressLastWeek) * 10) / 10
      : null;

    // Hourly activity today
    const hourlyRaw = await this.resultRepo
      .createQueryBuilder('r')
      .select(`EXTRACT(HOUR FROM r."submittedAt")::int`, 'hour')
      .addSelect('COUNT(r.id)', 'count')
      .where('r."submittedAt" >= :start', { start: startOfToday })
      .groupBy(`EXTRACT(HOUR FROM r."submittedAt")`)
      .orderBy(`EXTRACT(HOUR FROM r."submittedAt")`, 'ASC')
      .getRawMany();

    const hourMap = new Map<number, number>(hourlyRaw.map((r) => [Number(r.hour), Number(r.count)]));
    const activityToday = Array.from({ length: 24 }, (_, h) => ({
      hour: `${h.toString().padStart(2, '0')}:00`,
      count: hourMap.get(h) ?? 0,
    }));

    return {
      activeEmployees,
      newThisMonth,
      assignedToday,
      completedToday,
      completionRate,
      avgStressThisWeek,
      avgStressLastWeek,
      stressDelta,
      activityToday,
    };
  }
}
