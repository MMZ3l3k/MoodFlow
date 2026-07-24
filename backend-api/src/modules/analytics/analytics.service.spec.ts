import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { AssessmentResult } from '../results/entities/assessment-result.entity';
import { User } from '../users/entities/user.entity';
import { AssessmentAssignment } from '../assessments/entities/assessment-assignment.entity';

// Sprawdzamy anonimizacje raportow HR (prog k-anonimowosci = 5 osob).
// Zapytanie do bazy podmieniamy na atrape zwracajaca gotowe wiersze,
// zeby przetestowac samo maskowanie wynikow.

function fakeQueryBuilder(rows: any[]) {
  const qb: any = {};
  ['leftJoin', 'select', 'where', 'andWhere', 'groupBy', 'orderBy'].forEach((m) => {
    qb[m] = () => qb;
  });
  qb.getRawMany = () => Promise.resolve(rows);
  return qb;
}

describe('AnalyticsService (k-anonimowosc)', () => {
  let service: AnalyticsService;
  let userRepo: any;

  beforeEach(async () => {
    userRepo = { createQueryBuilder: jest.fn(), count: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: getRepositoryToken(AssessmentResult), useValue: {} },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(AssessmentAssignment), useValue: {} },
      ],
    }).compile();
    service = moduleRef.get(AnalyticsService);
  });

  it('dzial z 6 osobami pokazuje sredni wynik', async () => {
    userRepo.createQueryBuilder.mockReturnValue(
      fakeQueryBuilder([{ department: 'IT', activeUsers: '8', participantCount: '6', submissions: '20', avgScore: '72.5' }]),
    );
    const [dzial] = await service.getDepartmentStats(10);
    expect(dzial.anonymized).toBe(false);
    expect(dzial.avgScore).toBe(72.5);
  });

  it('dzial z 3 osobami ma ukryty wynik, ale liczebnosc widac', async () => {
    userRepo.createQueryBuilder.mockReturnValue(
      fakeQueryBuilder([{ department: 'Zarzad', activeUsers: '3', participantCount: '3', submissions: '9', avgScore: '65.0' }]),
    );
    const [dzial] = await service.getDepartmentStats(10);
    expect(dzial.anonymized).toBe(true);
    expect(dzial.avgScore).toBeNull();
    expect(dzial.participantCount).toBe(3); // sama liczba osob nie jest ukrywana
  });

  it('granica progu: 5 osob widac, 4 juz nie', async () => {
    userRepo.createQueryBuilder.mockReturnValue(
      fakeQueryBuilder([
        { department: 'A', activeUsers: '5', participantCount: '5', submissions: '5', avgScore: '50.0' },
        { department: 'B', activeUsers: '4', participantCount: '4', submissions: '4', avgScore: '50.0' },
      ]),
    );
    const [a, b] = await service.getDepartmentStats(10);
    expect(a.anonymized).toBe(false);
    expect(b.anonymized).toBe(true);
    expect(b.avgScore).toBeNull();
  });
});
