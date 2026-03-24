import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { AssessmentResult } from '../results/entities/assessment-result.entity';
import { UserStatus } from '../../common/enums/user-status.enum';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(AssessmentResult)
    private resultRepo: Repository<AssessmentResult>,
  ) {}

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
