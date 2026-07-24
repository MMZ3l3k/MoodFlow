import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { Role } from '../../common/enums/role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../notifications/mail.service';

// Testy integracyjne serwisu użytkowników — weryfikują mechanizmy bezpieczeństwa
// (izolacja multi-tenant, blokada eskalacji ról, rewokacja sesji, audyt) w izolacji
// od bazy danych: repozytorium i usługi zależne są zastąpione atrapami (mock).

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    email: 'jan@firma-a.pl',
    firstName: 'Jan',
    lastName: 'Kowalski',
    role: Role.EMPLOYEE,
    status: UserStatus.ACTIVE,
    organizationId: 10,
    tokenVersion: 0,
    ...overrides,
  } as User;
}

describe('UsersService — mechanizmy bezpieczeństwa', () => {
  let service: UsersService;
  let repo: { find: jest.Mock; findOne: jest.Mock; save: jest.Mock; create: jest.Mock };
  let audit: { log: jest.Mock };
  let notifications: { create: jest.Mock };
  let mail: { sendAccountApproved: jest.Mock };

  beforeEach(async () => {
    repo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((u) => Promise.resolve(u)),
      create: jest.fn((d) => d),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    notifications = { create: jest.fn().mockResolvedValue(undefined) };
    mail = { sendAccountApproved: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repo },
        { provide: AuditService, useValue: audit },
        { provide: NotificationsService, useValue: notifications },
        { provide: MailService, useValue: mail },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('izolacja danych między organizacjami (multi-tenant)', () => {
    it('administrator firmy otrzymuje wyłącznie użytkowników swojej organizacji', async () => {
      repo.find.mockResolvedValue([makeUser()]);
      await service.findAll(10);
      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { organizationId: 10 } }),
      );
    });

    it('właściciel platformy (brak organizationId) otrzymuje wszystkich użytkowników', async () => {
      repo.find.mockResolvedValue([]);
      await service.findAll(undefined);
      expect(repo.find).toHaveBeenCalledWith(
        expect.not.objectContaining({ where: expect.anything() }),
      );
    });

    it('zmiana statusu konta z innej organizacji jest odrzucana (403)', async () => {
      repo.findOne.mockResolvedValue(makeUser({ organizationId: 99 }));
      await expect(
        service.updateStatus(1, { status: UserStatus.ACTIVE }, 10, 5),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('modyfikacja konta z innej organizacji jest odrzucana (403)', async () => {
      repo.findOne.mockResolvedValue(makeUser({ organizationId: 99 }));
      await expect(
        service.update(1, { firstName: 'Zmiana' }, 10, 5),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('operacja na nieistniejącym koncie zwraca 404', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(
        service.updateStatus(999, { status: UserStatus.ACTIVE }, 10, 5),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('blokada eskalacji uprawnień (K1)', () => {
    it('administrator firmy nie może nadać roli SUPER_ADMIN', async () => {
      repo.findOne.mockResolvedValue(makeUser({ organizationId: 10, role: Role.EMPLOYEE }));
      await expect(
        service.update(1, { role: Role.SUPER_ADMIN }, 10, 5),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('właściciel platformy (brak organizationId) może nadać dowolną rolę', async () => {
      repo.findOne.mockResolvedValue(makeUser({ role: Role.EMPLOYEE }));
      await expect(
        service.update(1, { role: Role.SUPER_ADMIN }, undefined, 5),
      ).resolves.toBeDefined();
      expect(repo.save).toHaveBeenCalled();
    });

    it('administrator firmy nie może utworzyć konta z rolą SUPER_ADMIN', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(
        service.createByAdmin(
          { email: 'x@firma.pl', password: 'Mocne123', firstName: 'A', lastName: 'B', role: Role.SUPER_ADMIN },
          10,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('natychmiastowa rewokacja sesji (tokenVersion, H10)', () => {
    it('zawieszenie konta podbija tokenVersion (unieważnia aktywne tokeny)', async () => {
      repo.findOne.mockResolvedValue(makeUser({ organizationId: 10, tokenVersion: 3 }));
      const saved = await service.updateStatus(1, { status: UserStatus.SUSPENDED }, 10, 5);
      expect(saved.tokenVersion).toBe(4);
    });

    it('odrzucenie konta podbija tokenVersion', async () => {
      repo.findOne.mockResolvedValue(makeUser({ organizationId: 10, tokenVersion: 0 }));
      const saved = await service.updateStatus(1, { status: UserStatus.REJECTED }, 10, 5);
      expect(saved.tokenVersion).toBe(1);
    });

    it('zwykła aktywacja konta NIE zmienia tokenVersion', async () => {
      repo.findOne.mockResolvedValue(makeUser({ organizationId: 10, status: UserStatus.PENDING, tokenVersion: 2 }));
      const saved = await service.updateStatus(1, { status: UserStatus.ACTIVE }, 10, 5);
      expect(saved.tokenVersion).toBe(2);
    });
  });

  describe('rejestrowanie zdarzeń w dzienniku audytu', () => {
    it('zmiana roli zapisuje wpis USER_ROLE_CHANGED z rolą poprzednią i nową', async () => {
      repo.findOne.mockResolvedValue(makeUser({ organizationId: 10, role: Role.EMPLOYEE }));
      await service.update(1, { role: Role.HR }, 10, 5);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.USER_ROLE_CHANGED,
          metadata: expect.objectContaining({ previousRole: Role.EMPLOYEE, newRole: Role.HR }),
        }),
      );
    });

    it('zatwierdzenie konta zapisuje audyt i wysyła powiadomienie o aktywacji', async () => {
      repo.findOne.mockResolvedValue(makeUser({ organizationId: 10, status: UserStatus.PENDING }));
      await service.updateStatus(1, { status: UserStatus.ACTIVE }, 10, 5);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.USER_APPROVED }),
      );
      expect(notifications.create).toHaveBeenCalled();
      expect(mail.sendAccountApproved).toHaveBeenCalled();
    });
  });
});
