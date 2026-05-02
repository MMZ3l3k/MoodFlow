import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction } from './entities/audit-log.entity';

export interface AuditEvent {
  action: AuditAction | string;
  actorUserId?: number | null;
  organizationId?: number | null;
  entityType?: string;
  entityId?: number;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async log(event: AuditEvent): Promise<void> {
    try {
      await this.auditRepo.save(
        this.auditRepo.create({
          action: event.action,
          actorUserId: event.actorUserId ?? null,
          organizationId: event.organizationId ?? null,
          entityType: event.entityType ?? null,
          entityId: event.entityId ?? null,
          metadata: event.metadata ?? null,
          ipAddress: event.ipAddress ?? null,
        }),
      );
    } catch (err) {
      this.logger.error(`Nie udało się zapisać audit log dla ${event.action}: ${(err as Error).message}`);
    }
  }

  async list(organizationId?: number, limit = 100) {
    const qb = this.auditRepo
      .createQueryBuilder('a')
      .orderBy('a.createdAt', 'DESC')
      .limit(limit);
    if (organizationId != null) {
      qb.where('a.organizationId = :organizationId', { organizationId });
    }
    return qb.getMany();
  }
}
