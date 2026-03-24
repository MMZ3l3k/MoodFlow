import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Assessment } from './assessment.entity';
import { User } from '../../users/entities/user.entity';

export enum AssignmentTargetType {
  ALL = 'ALL',
  USER = 'USER',
  DEPARTMENT = 'DEPARTMENT',
}

@Entity('assessment_assignments')
export class AssessmentAssignment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  assessmentId: number;

  @ManyToOne(() => Assessment, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'assessmentId' })
  assessment: Assessment;

  @Column({ type: 'enum', enum: AssignmentTargetType, default: AssignmentTargetType.ALL })
  targetType: AssignmentTargetType;

  @Column({ nullable: true })
  targetUserId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'targetUserId' })
  targetUser: User;

  @Column({ nullable: true, type: 'varchar' })
  targetDepartment: string | null;

  @Column({ type: 'timestamp' })
  availableFrom: Date;

  @Column({ type: 'timestamp' })
  availableTo: Date;

  @Column()
  assignedByUserId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assignedByUserId' })
  assignedBy: User;

  @Column({ nullable: true, type: 'int' })
  organizationId: number | null;

  @CreateDateColumn()
  createdAt: Date;
}
