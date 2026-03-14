import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { AssessmentResult } from '../results/entities/assessment-result.entity';
import { UserStatus } from '../../common/enums/user-status.enum';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(AssessmentResult)
    private resultRepo: Repository<AssessmentResult>,
  ) {}

  async getOverview() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [totalUsers, newThisMonth, pendingCount, testsToday] = await Promise.all([
      this.userRepo.count(),
      this.userRepo.count({ where: { createdAt: MoreThanOrEqual(startOfMonth) } }),
      this.userRepo.count({ where: { status: UserStatus.PENDING } }),
      this.resultRepo.count({ where: { submittedAt: MoreThanOrEqual(startOfDay) } }),
    ]);

    return { totalUsers, newThisMonth, pendingCount, testsToday };
  }

  async getActivityToday() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const results = await this.resultRepo
      .createQueryBuilder('r')
      .select("DATE_PART('hour', r.submittedAt)", 'hour')
      .addSelect('COUNT(*)', 'count')
      .where('r.submittedAt >= :startOfDay', { startOfDay })
      .groupBy("DATE_PART('hour', r.submittedAt)")
      .orderBy('hour', 'ASC')
      .getRawMany();

    // Fill all 24 hours
    const hourMap: Record<number, number> = {};
    results.forEach((r) => { hourMap[Number(r.hour)] = Number(r.count); });

    return Array.from({ length: 24 }, (_, h) => ({
      hour: `${String(h).padStart(2, '0')}:00`,
      count: hourMap[h] ?? 0,
    }));
  }
}
