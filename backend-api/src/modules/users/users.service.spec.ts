import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { Role } from '../../common/enums/role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../notifications/mail.service';

// Testy serwisu uzytkownikow. Baze i uslugi zewnetrzne podmieniamy na atrapy (mock),
// zeby sprawdzic sama logike bezpieczenstwa bez odpalania calej aplikacji.

describe('UsersService', () => {
  let service: UsersService;
  let repo: any;

  beforeEach(async () => {
    repo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((u) => u),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repo },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: NotificationsService, useValue: { create: jest.fn() } },
        { provide: MailService, useValue: { sendAccountApproved: jest.fn() } },
      ],
    }).compile();
    service = moduleRef.get(UsersService);
  });

  it('admin nie moze zmienic konta z innej firmy (izolacja multi-tenant)', async () => {
    repo.findOne.mockResolvedValue({ id: 1, organizationId: 99, status: UserStatus.ACTIVE });
    await expect(
      service.updateStatus(1, { status: UserStatus.ACTIVE }, 10, 5),
    ).rejects.toThrow(ForbiddenException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('admin firmy nie moze nadac roli SUPER_ADMIN', async () => {
    repo.findOne.mockResolvedValue({ id: 1, organizationId: 10, role: Role.EMPLOYEE });
    await expect(
      service.update(1, { role: Role.SUPER_ADMIN }, 10, 5),
    ).rejects.toThrow(ForbiddenException);
  });

  it('zawieszenie konta podbija tokenVersion (wylogowuje uzytkownika)', async () => {
    repo.findOne.mockResolvedValue({ id: 1, organizationId: 10, tokenVersion: 0, status: UserStatus.ACTIVE });
    const saved = await service.updateStatus(1, { status: UserStatus.SUSPENDED }, 10, 5);
    expect(saved.tokenVersion).toBe(1);
  });
});
