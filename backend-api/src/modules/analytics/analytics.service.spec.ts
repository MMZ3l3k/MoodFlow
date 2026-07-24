import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { AssessmentResult } from '../results/entities/assessment-result.entity';
import { User } from '../users/entities/user.entity';
import { AssessmentAssignment } from '../assessments/entities/assessment-assignment.entity';

// Testy integracyjne anonimizacji raportów HR — weryfikują próg k-anonimowości
// (MIN_GROUP_SIZE = 5) na poziomie serwisu, z zamockowanym Query Builderem.
// Zapytanie SQL zastępujemy atrapą zwracającą zadane wiersze zagregowane,
// aby sprawdzić samą logikę maskowania niezależnie od bazy danych.

function queryBuilderReturning(rows: any[]) {
  const qb: any = {};
  for (const m of ['leftJoin', 'select', 'where', 'andWhere', 'groupBy', 'orderBy']) {
    qb[m] = jest.fn(() => qb);
  }
  qb.getRawMany = jest.fn().mockResolvedValue(rows);
  return qb;
}

describe('AnalyticsService — anonimizacja k-anonimowości', () => {
  let service: AnalyticsService;
  let userRepo: { createQueryBuilder: jest.Mock; count: jest.Mock };

  beforeEach(async () => {
    userRepo = { createQueryBuilder: jest.fn(), count: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: getRepositoryToken(AssessmentResult), useValue: {} },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(AssessmentAssignment), useValue: {} },
      ],
    }).compile();
    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('dział z liczbą uczestników >= 5 ujawnia średni wynik', async () => {
    userRepo.createQueryBuilder.mockReturnValue(
      queryBuilderReturning([
        { department: 'IT', activeUsers: '8', participantCount: '6', submissions: '20', avgScore: '72.5' },
      ]),
    );
    const [dept] = await service.getDepartmentStats(10);
    expect(dept.anonymized).toBe(false);
    expect(dept.avgScore).toBe(72.5);
    expect(dept.participantCount).toBe(6);
  });

  it('dział z liczbą uczestników < 5 maskuje średni wynik (k-anonimowość)', async () => {
    userRepo.createQueryBuilder.mockReturnValue(
      queryBuilderReturning([
        { department: 'Zarząd', activeUsers: '3', participantCount: '3', submissions: '9', avgScore: '65.0' },
      ]),
    );
    const [dept] = await service.getDepartmentStats(10);
    expect(dept.anonymized).toBe(true);
    expect(dept.avgScore).toBeNull();
    // sama liczebność NIE jest maskowana — daje HR kontekst
    expect(dept.participantCount).toBe(3);
    expect(dept.minGroupSize).toBe(5);
  });

  it('próg jest dokładnie na granicy: 5 osób = widoczne, 4 = zamaskowane', async () => {
    userRepo.createQueryBuilder.mockReturnValue(
      queryBuilderReturning([
        { department: 'A', activeUsers: '5', participantCount: '5', submissions: '5', avgScore: '50.0' },
        { department: 'B', activeUsers: '4', participantCount: '4', submissions: '4', avgScore: '50.0' },
      ]),
    );
    const [a, b] = await service.getDepartmentStats(10);
    expect(a.anonymized).toBe(false);
    expect(a.avgScore).toBe(50);
    expect(b.anonymized).toBe(true);
    expect(b.avgScore).toBeNull();
  });
});
