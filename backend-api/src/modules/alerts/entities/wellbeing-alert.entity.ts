import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum AlertType {
  HIGH_LOAD = 'HIGH_LOAD',
  WORSENING = 'WORSENING',
}

export enum AlertStatus {
  ACTIVE = 'ACTIVE',
  HANDLED = 'HANDLED',
  RESOLVED = 'RESOLVED',
}

@Entity('wellbeing_alerts')
@Index(['organizationId', 'status', 'createdAt'])
export class WellbeingAlert {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  organizationId: number;

  @Column({ type: 'varchar', length: 200 })
  department: string;

  @Column({ type: 'varchar', length: 32 })
  type: AlertType;

  @Column({ type: 'int', nullable: true })
  wellbeingIndex: number | null;

  @Column({ type: 'int', nullable: true })
  previousIndex: number | null;

  @Column({ type: 'int', default: 0 })
  participants: number;

  @Column({ type: 'int', default: 0 })
  deptSize: number;

  @Column({ type: 'varchar', length: 16, default: AlertStatus.ACTIVE })
  status: AlertStatus;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'int', nullable: true })
  handledByUserId: number | null;

  @Column({ type: 'timestamp', nullable: true })
  handledAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
