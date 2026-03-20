import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrganizationStatus } from '../../../common/enums/organization-status.enum';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true, type: 'varchar' })
  nip: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: OrganizationStatus,
    default: OrganizationStatus.PENDING,
  })
  status: OrganizationStatus;

  @Column({ unique: true, nullable: true, type: 'varchar' })
  inviteCode: string | null;

  @Column({ nullable: true, type: 'int' })
  adminUserId: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
