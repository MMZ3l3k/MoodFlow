import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { AssessmentResult } from '../results/entities/assessment-result.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { UserStatus } from '../../common/enums/user-status.enum';
import { OrganizationStatus } from '../../common/enums/organization-status.enum';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(AssessmentResult)
    private resultRepo: Repository<AssessmentResult>,
    @InjectRepository(Organization)
    private organizationRepo: Repository<Organization>,
  ) {}

  // PU-23: globalne metryki platformy dla właściciela (SUPER_ADMIN),
  // z opcjonalnym filtrem przedziału czasowego dla metryk wolumetrycznych.
  async getPlatformStats(from?: Date, to?: Date) {
    const testsQb = this.resultRepo.createQueryBuilder('r');
    if (from) testsQb.andWhere('r."submittedAt" >= :from', { from });
    if (to) testsQb.andWhere('r."submittedAt" <= :to', { to });

    // PU-23: średni czas od przypisania testu do jego wypełnienia (w godzinach)
    const avgQb = this.resultRepo
      .createQueryBuilder('r')
      .innerJoin('assessment_assignments', 'aa', 'aa.id = r."assignmentId"')
      .select('AVG(EXTRACT(EPOCH FROM (r."submittedAt" - aa."availableFrom")) / 3600)', 'avgHours');
    if (from) avgQb.andWhere('r."submittedAt" >= :from', { from });
    if (to) avgQb.andWhere('r."submittedAt" <= :to', { to });

    const [
      totalOrganizations,
      activeOrganizations,
      pendingOrganizations,
      activeEmployees,
      totalActiveUsers,
      completedTests,
      avgRow,
    ] = await Promise.all([
      this.organizationRepo.count(),
      this.organizationRepo.count({ where: { status: OrganizationStatus.ACTIVE } }),
      this.organizationRepo.count({ where: { status: OrganizationStatus.PENDING } }),
      this.userRepo.count({ where: { status: UserStatus.ACTIVE, role: Role.EMPLOYEE } }),
      this.userRepo.count({ where: { status: UserStatus.ACTIVE } }),
      testsQb.getCount(),
      avgQb.getRawOne(),
    ]);

    const avgHours = avgRow?.avgHours !== null && avgRow?.avgHours !== undefined
      ? Math.round(Number(avgRow.avgHours) * 10) / 10
      : null;

    return {
      organizations: {
        total: totalOrganizations,
        active: activeOrganizations,
        pending: pendingOrganizations,
      },
      activeEmployees,
      totalActiveUsers,
      completedTests,
      avgCompletionTimeHours: avgHours,
    };
  }

  // PU-23: dzienna liczba wypełnionych testów w całej platformie (wykres na pulpicie)
  async getPlatformActivityTimeline(days = 30) {
    const span = Math.min(Math.max(days, 7), 180);
    const start = new Date();
    start.setDate(start.getDate() - span);

    const rows = await this.resultRepo
      .createQueryBuilder('r')
      .select(`TO_CHAR(DATE_TRUNC('day', r."submittedAt"), 'YYYY-MM-DD')`, 'day')
      .addSelect('COUNT(*)', 'count')
      .where('r."submittedAt" >= :start', { start })
      .groupBy(`DATE_TRUNC('day', r."submittedAt")`)
      .orderBy(`DATE_TRUNC('day', r."submittedAt")`, 'ASC')
      .getRawMany();

    const byDay = new Map(rows.map((r) => [r.day, Number(r.count)]));
    const out: { day: string; count: number }[] = [];
    for (let i = span; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      out.push({ day: key, count: byDay.get(key) ?? 0 });
    }
    return out;
  }

  async getOverview(organizationId: number) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [totalUsers, newThisMonth, pendingCount, testsToday] = await Promise.all([
      this.userRepo.count({ where: { organizationId } }),
      this.userRepo.count({ where: { organizationId, createdAt: MoreThanOrEqual(startOfMonth) } }),
      this.userRepo.count({ where: { organizationId, status: UserStatus.PENDING } }),
      this.resultRepo
        .createQueryBuilder('r')
        .innerJoin('users', 'u', 'u.id = r.userId AND u."organizationId" = :organizationId', { organizationId })
        .where('r.submittedAt >= :startOfDay', { startOfDay })
        .getCount(),
    ]);

    return { totalUsers, newThisMonth, pendingCount, testsToday };
  }

  async getActivityToday(organizationId: number) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const results = await this.resultRepo
      .createQueryBuilder('r')
      .innerJoin('users', 'u', 'u.id = r.userId AND u."organizationId" = :organizationId', { organizationId })
      .select("DATE_PART('hour', r.submittedAt)", 'hour')
      .addSelect('COUNT(*)', 'count')
      .where('r.submittedAt >= :startOfDay', { startOfDay })
      .groupBy("DATE_PART('hour', r.submittedAt)")
      .orderBy('hour', 'ASC')
      .getRawMany();

    const hourMap: Record<number, number> = {};
    results.forEach((r) => { hourMap[Number(r.hour)] = Number(r.count); });

    return Array.from({ length: 24 }, (_, h) => ({
      hour: `${String(h).padStart(2, '0')}:00`,
      count: hourMap[h] ?? 0,
    }));
  }
}
