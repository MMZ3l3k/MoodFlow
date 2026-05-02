import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum AuditAction {
  USER_APPROVED = 'USER_APPROVED',
  USER_REJECTED = 'USER_REJECTED',
  USER_SUSPENDED = 'USER_SUSPENDED',
  USER_REACTIVATED = 'USER_REACTIVATED',
  USER_DELETED = 'USER_DELETED',
  USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
  ORGANIZATION_APPROVED = 'ORGANIZATION_APPROVED',
  ORGANIZATION_REJECTED = 'ORGANIZATION_REJECTED',
  ORGANIZATION_SUSPENDED = 'ORGANIZATION_SUSPENDED',
  ASSIGNMENT_CREATED = 'ASSIGNMENT_CREATED',
  ASSIGNMENT_DELETED = 'ASSIGNMENT_DELETED',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  ACCOUNT_DELETED = 'ACCOUNT_DELETED',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
}

@Entity('audit_logs')
@Index(['actorUserId', 'createdAt'])
@Index(['organizationId', 'createdAt'])
@Index(['entityType', 'entityId'])
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  actorUserId: number | null;

  @Column({ type: 'int', nullable: true })
  organizationId: number | null;

  @Column({ type: 'varchar', length: 64 })
  action: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  entityType: string | null;

  @Column({ type: 'int', nullable: true })
  entityId: number | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ipAddress: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
