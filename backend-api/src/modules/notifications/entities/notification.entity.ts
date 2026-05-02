import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum NotificationType {
  ASSIGNMENT_NEW = 'ASSIGNMENT_NEW',
  ASSESSMENT_COMPLETED = 'ASSESSMENT_COMPLETED',
  USER_PENDING_APPROVAL = 'USER_PENDING_APPROVAL',
  USER_APPROVED = 'USER_APPROVED',
  USER_REJECTED = 'USER_REJECTED',
  ORGANIZATION_PENDING = 'ORGANIZATION_PENDING',
  ORGANIZATION_APPROVED = 'ORGANIZATION_APPROVED',
  ORGANIZATION_REJECTED = 'ORGANIZATION_REJECTED',
  RISK_ALERT = 'RISK_ALERT',
}

@Entity('notifications')
@Index(['userId', 'read', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  userId: number;

  @Column({ type: 'varchar', length: 64 })
  type: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  link: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ type: 'boolean', default: false })
  read: boolean;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
