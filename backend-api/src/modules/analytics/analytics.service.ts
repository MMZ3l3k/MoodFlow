import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssessmentResult } from '../results/entities/assessment-result.entity';
import { User } from '../users/entities/user.entity';
import { AssessmentAssignment } from '../assessments/entities/assessment-assignment.entity';
import { UserStatus } from '../../common/enums/user-status.enum';

// Konfiguracja indeksu dobrostanu — taka sama jak w ResultsService
const WB_CONFIG: Record<string, { weight: number; positive: boolean; maxRaw: number }> = {
  WHO5:   { weight: 0.30, positive: true,  maxRaw: 25 },
  PSS10:  { weight: 0.20, positive: false, maxRaw: 40 },
  PHQ9:   { weight: 0.20, positive: false, maxRaw: 27 },
  GAD7:   { weight: 0.15, positive: false, maxRaw: 21 },
  MOOD10: { weight: 0.15, positive: true,  maxRaw: 50 },
};

function calcWellbeingIndex(avgByCode: Map<string, number>): number | null {
  let weightedSum = 0;
  let totalWeight = 0;
  for (const [code, cfg] of Object.entries(WB_CONFIG)) {
    const avg = avgByCode.get(code);
    if (avg == null) continue;
    const norm = Math.min(100, Math.max(0, Math.round((avg / cfg.maxRaw) * 100)));
    const contribution = cfg.positive ? norm : 100 - norm;
    weightedSum += contribution * cfg.weight;
    totalWeight += cfg.weight;
  }
  return totalWeight === 0 ? null : Math.round(weightedSum / totalWeight);
}

function loadLevel(index: number | null): 'stable' | 'moderate' | 'high' | 'no_data' {
  if (index === null) return 'no_data';
  if (index >= 65) return 'stable';
  if (index >= 45) return 'moderate';
  return 'high';
}

function wbColor(index: number | null): string {
  if (index === null) return '#94a3b8';
  if (index >= 80) return '#22c55e';
  if (index >= 60) return '#eab308';
  if (index >= 40) return '#f97316';
  return '#ef4444';
}

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

  /**
   * Indeks dobrostanu per dział — ostatnie 30 dni.
   * Zwraca poziom obciążenia (stable / moderate / high) i trend vs poprzednie 14 dni.
   */
  async getDepartmentWellbeingLoad() {
    const now = new Date();
    const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const d14 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const d28 = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

    // Wyniki ostatnich 30 dni z działem użytkownika i kodem testu
    const raw30 = await this.resultRepo
      .createQueryBuilder('r')
      .leftJoin('r.assessment', 'a')
      .leftJoin('r.user', 'u')
      .select([
        `COALESCE(u.department, 'Brak działu') AS department`,
        'a.code AS code',
        'AVG(r."rawScore") AS "avgRaw"',
        'COUNT(DISTINCT r."userId") AS participants',
      ])
      .where('r."submittedAt" >= :d30', { d30 })
      .andWhere('u.status = :status', { status: UserStatus.ACTIVE })
      .andWhere('a.code IN (:...codes)', { codes: Object.keys(WB_CONFIG) })
      .groupBy('u.department, a.code')
      .getRawMany();

    // Wyniki z poprzednich 14 dni (14–28 dni temu)
    const rawPrev = await this.resultRepo
      .createQueryBuilder('r')
      .leftJoin('r.assessment', 'a')
      .leftJoin('r.user', 'u')
      .select([
        `COALESCE(u.department, 'Brak działu') AS department`,
        'a.code AS code',
        'AVG(r."rawScore") AS "avgRaw"',
      ])
      .where('r."submittedAt" >= :d28 AND r."submittedAt" < :d14', { d28, d14 })
      .andWhere('u.status = :status', { status: UserStatus.ACTIVE })
      .andWhere('a.code IN (:...codes)', { codes: Object.keys(WB_CONFIG) })
      .groupBy('u.department, a.code')
      .getRawMany();

    // Liczba aktywnych użytkowników per dział
    const sizeRaw = await this.userRepo
      .createQueryBuilder('u')
      .select([
        `COALESCE(u.department, 'Brak działu') AS department`,
        'COUNT(u.id) AS "deptSize"',
      ])
      .where('u.status = :status', { status: UserStatus.ACTIVE })
      .groupBy('u.department')
      .getRawMany();
    const sizeMap = new Map<string, number>(
      sizeRaw.map((r) => [r.department, Number(r.deptSize)]),
    );

    // Zbuduj mapy: department → code → avgRaw
    type DeptMap = Map<string, Map<string, number>>;
    const buildMap = (rows: any[]): DeptMap => {
      const m: DeptMap = new Map();
      for (const row of rows) {
        if (!m.has(row.department)) m.set(row.department, new Map());
        m.get(row.department)!.set(row.code, Number(row.avgRaw));
      }
      return m;
    };

    const map30 = buildMap(raw30);
    const mapPrev = buildMap(rawPrev);

    // Zlicz uczestników per dział (ostatnie 30 dni)
    const participantsMap = new Map<string, number>();
    for (const row of raw30) {
      const cur = participantsMap.get(row.department) ?? 0;
      participantsMap.set(row.department, Math.max(cur, Number(row.participants)));
    }

    const departments = Array.from(new Set([
      ...map30.keys(),
      ...sizeMap.keys(),
    ])).sort();

    return departments.map((dept) => {
      const cur = map30.get(dept) ?? new Map();
      const prev = mapPrev.get(dept) ?? new Map();
      const index = calcWellbeingIndex(cur);
      const indexPrev = calcWellbeingIndex(prev);
      const trend: 'improving' | 'worsening' | 'stable' | 'no_data' =
        index === null || indexPrev === null ? 'no_data'
        : index - indexPrev > 5 ? 'improving'
        : index - indexPrev < -5 ? 'worsening'
        : 'stable';

      return {
        department: dept,
        deptSize: sizeMap.get(dept) ?? 0,
        participants: participantsMap.get(dept) ?? 0,
        wellbeingIndex: index,
        load: loadLevel(index),
        trend,
        color: wbColor(index),
      };
    });
  }

  /**
   * Tygodniowy indeks dobrostanu organizacji — ostatnie 12 tygodni.
   */
  async getOrgWellbeingHistory() {
    const twelveWeeks = new Date();
    twelveWeeks.setDate(twelveWeeks.getDate() - 84);

    const raw = await this.resultRepo
      .createQueryBuilder('r')
      .leftJoin('r.assessment', 'a')
      .select([
        `TO_CHAR(DATE_TRUNC('week', r."submittedAt"), 'YYYY-MM-DD') AS week`,
        'a.code AS code',
        'AVG(r."rawScore") AS "avgRaw"',
        'COUNT(DISTINCT r."userId") AS "userCount"',
      ])
      .where('r."submittedAt" >= :start', { start: twelveWeeks })
      .andWhere('a.code IN (:...codes)', { codes: Object.keys(WB_CONFIG) })
      .groupBy(`DATE_TRUNC('week', r."submittedAt"), a.code`)
      .orderBy(`DATE_TRUNC('week', r."submittedAt")`, 'ASC')
      .getRawMany();

    // Grupuj per tydzień → code → avgRaw
    const weekMap = new Map<string, Map<string, number>>();
    const userCounts = new Map<string, number>();
    for (const row of raw) {
      if (!weekMap.has(row.week)) weekMap.set(row.week, new Map());
      weekMap.get(row.week)!.set(row.code, Number(row.avgRaw));
      userCounts.set(row.week, Math.max(userCounts.get(row.week) ?? 0, Number(row.userCount)));
    }

    return Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, byCode]) => {
        const index = calcWellbeingIndex(byCode);
        return {
          week,
          index,
          color: wbColor(index),
          userCount: userCounts.get(week) ?? 0,
        };
      })
      .filter((p) => p.index !== null);
  }
}
