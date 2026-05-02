import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationStatus } from '../../common/enums/organization-status.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import { User } from '../users/entities/user.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private organizationsRepository: Repository<Organization>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private auditService: AuditService,
  ) {}

  async create(dto: CreateOrganizationDto): Promise<Organization> {
    const org = this.organizationsRepository.create(dto);
    return this.organizationsRepository.save(org);
  }

  async setAdmin(organizationId: number, adminUserId: number): Promise<void> {
    await this.organizationsRepository.update(organizationId, { adminUserId });
  }

  async findAll(): Promise<Organization[]> {
    return this.organizationsRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findById(id: number): Promise<Organization> {
    const org = await this.organizationsRepository.findOne({ where: { id } });
    if (!org) throw new NotFoundException('Organizacja nie znaleziona');
    return org;
  }

  async findByNip(nip: string): Promise<Organization | null> {
    return this.organizationsRepository.findOne({ where: { nip } });
  }

  async findByInviteCode(inviteCode: string): Promise<Organization | null> {
    return this.organizationsRepository.findOne({ where: { inviteCode } });
  }

  async findPending(): Promise<Organization[]> {
    return this.organizationsRepository.find({
      where: { status: OrganizationStatus.PENDING },
      order: { createdAt: 'ASC' },
    });
  }

  // Właściciel platformy zatwierdza firmę — aktywuje org i jej admina
  async approve(id: number, actorUserId?: number): Promise<Organization> {
    const org = await this.findById(id);
    org.status = OrganizationStatus.ACTIVE;
    await this.organizationsRepository.save(org);

    if (org.adminUserId) {
      await this.usersRepository.update(org.adminUserId, { status: UserStatus.ACTIVE });
    }

    await this.auditService.log({
      action: AuditAction.ORGANIZATION_APPROVED,
      actorUserId: actorUserId ?? null,
      organizationId: org.id,
      entityType: 'organization',
      entityId: org.id,
      metadata: { name: org.name, nip: org.nip },
    });

    return org;
  }

  // Właściciel platformy odrzuca firmę
  async reject(id: number, actorUserId?: number): Promise<Organization> {
    const org = await this.findById(id);
    org.status = OrganizationStatus.REJECTED;
    await this.organizationsRepository.save(org);

    if (org.adminUserId) {
      await this.usersRepository.update(org.adminUserId, { status: UserStatus.REJECTED });
    }

    await this.auditService.log({
      action: AuditAction.ORGANIZATION_REJECTED,
      actorUserId: actorUserId ?? null,
      organizationId: org.id,
      entityType: 'organization',
      entityId: org.id,
      metadata: { name: org.name },
    });

    return org;
  }

  // Właściciel platformy blokuje firmę
  async block(id: number, actorUserId?: number): Promise<Organization> {
    const org = await this.findById(id);
    org.status = OrganizationStatus.BLOCKED;
    await this.organizationsRepository.save(org);

    await this.auditService.log({
      action: AuditAction.ORGANIZATION_SUSPENDED,
      actorUserId: actorUserId ?? null,
      organizationId: org.id,
      entityType: 'organization',
      entityId: org.id,
      metadata: { name: org.name },
    });

    return org;
  }
}
