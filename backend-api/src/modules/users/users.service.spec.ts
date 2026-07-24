import { Test } from '@nestjs/testing';
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

// Testy serwisu uzytkownikow. Baze i uslugi zewnetrzne podmieniamy na atrapy (mock),
// zeby sprawdzic sama logike bezpieczenstwa bez odpalania calej aplikacji.

describe('UsersService', () => {
  let service: UsersService;
  let repo: any;
  let audit: any;
  let notifications: any;
  let mail: any;

  beforeEach(async () => {
    repo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn((u) => u),
      create: jest.fn((d) => d),
    };
    audit = { log: jest.fn() };
    notifications = { create: jest.fn() };
    mail = { sendAccountApproved: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repo },
        { provide: AuditService, useValue: audit },
        { provide: NotificationsService, useValue: notifications },
        { provide: MailService, useValue: mail },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  // --- izolacja danych miedzy firmami (multi-tenant) ---

  it('admin firmy dostaje tylko uzytkownikow swojej organizacji', async () => {
    repo.find.mockResolvedValue([]);
    await service.findAll(10);
    expect(repo.find).toHaveBeenCalledWith({
      where: { organizationId: 10 },
      relations: ['organization'],
    });
  });

  it('super-admin (bez organizationId) dostaje wszystkich uzytkownikow', async () => {
    repo.find.mockResolvedValue([]);
    await service.findAll(undefined);
    expect(repo.find).toHaveBeenCalledWith({ relations: ['organization'] });
  });

  it('admin nie moze zmienic statusu konta z innej firmy', async () => {
    repo.findOne.mockResolvedValue({ id: 1, organizationId: 99, status: UserStatus.ACTIVE });
    await expect(
      service.updateStatus(1, { status: UserStatus.ACTIVE }, 10, 5),
    ).rejects.toThrow(ForbiddenException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('admin nie moze edytowac konta z innej firmy', async () => {
    repo.findOne.mockResolvedValue({ id: 1, organizationId: 99, role: Role.EMPLOYEE });
    await expect(
      service.update(1, { firstName: 'Test' }, 10, 5),
    ).rejects.toThrow(ForbiddenException);
  });

  it('operacja na nieistniejacym koncie rzuca 404', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(
      service.updateStatus(999, { status: UserStatus.ACTIVE }, 10, 5),
    ).rejects.toThrow(NotFoundException);
  });

  // --- blokada podnoszenia uprawnien (nikt nie zrobi sobie SUPER_ADMIN) ---

  it('admin firmy nie moze nadac roli SUPER_ADMIN', async () => {
    repo.findOne.mockResolvedValue({ id: 1, organizationId: 10, role: Role.EMPLOYEE });
    await expect(
      service.update(1, { role: Role.SUPER_ADMIN }, 10, 5),
    ).rejects.toThrow(ForbiddenException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('super-admin moze nadac dowolna role', async () => {
    repo.findOne.mockResolvedValue({ id: 1, organizationId: 10, role: Role.EMPLOYEE });
    await service.update(1, { role: Role.SUPER_ADMIN }, undefined, 5);
    expect(repo.save).toHaveBeenCalled();
  });

  it('admin nie moze zalozyc konta z rola SUPER_ADMIN', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(
      service.createByAdmin(
        { email: 'x@firma.pl', password: 'Haslo123', firstName: 'A', lastName: 'B', role: Role.SUPER_ADMIN },
        10,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  // --- wylogowanie po zawieszeniu/odrzuceniu (tokenVersion) ---

  it('zawieszenie konta podbija tokenVersion', async () => {
    repo.findOne.mockResolvedValue({ id: 1, organizationId: 10, tokenVersion: 3, status: UserStatus.ACTIVE });
    const saved = await service.updateStatus(1, { status: UserStatus.SUSPENDED }, 10, 5);
    expect(saved.tokenVersion).toBe(4);
  });

  it('odrzucenie konta podbija tokenVersion', async () => {
    repo.findOne.mockResolvedValue({ id: 1, organizationId: 10, tokenVersion: 0, status: UserStatus.PENDING });
    const saved = await service.updateStatus(1, { status: UserStatus.REJECTED }, 10, 5);
    expect(saved.tokenVersion).toBe(1);
  });

  it('zwykla aktywacja konta nie rusza tokenVersion', async () => {
    repo.findOne.mockResolvedValue({ id: 1, organizationId: 10, tokenVersion: 2, status: UserStatus.PENDING });
    const saved = await service.updateStatus(1, { status: UserStatus.ACTIVE }, 10, 5);
    expect(saved.tokenVersion).toBe(2);
  });

  // --- audit log ---

  it('zmiana roli zapisuje wpis do audit logu', async () => {
    repo.findOne.mockResolvedValue({ id: 1, organizationId: 10, role: Role.EMPLOYEE });
    await service.update(1, { role: Role.HR }, 10, 5);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: AuditAction.USER_ROLE_CHANGED }),
    );
  });

  it('zatwierdzenie konta wysyla powiadomienie i maila', async () => {
    repo.findOne.mockResolvedValue({ id: 1, organizationId: 10, status: UserStatus.PENDING, email: 'a@b.pl', firstName: 'Jan' });
    await service.updateStatus(1, { status: UserStatus.ACTIVE }, 10, 5);
    expect(notifications.create).toHaveBeenCalled();
    expect(mail.sendAccountApproved).toHaveBeenCalled();
  });
});
