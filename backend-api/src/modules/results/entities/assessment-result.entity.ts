import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn, Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Assessment } from '../../assessments/entities/assessment.entity';

@Entity('assessment_results')
@Unique(['userId', 'assignmentId'])
export class AssessmentResult {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'int', nullable: true })
  assignmentId: number | null;

  @Column()
  assessmentId: number;

  @ManyToOne(() => Assessment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assessmentId' })
  assessment: Assessment;

  @Column()
  rawScore: number;

  @Column({ nullable: true })
  normalizedScore: number;

  @Column({ nullable: true })
  severity: string;

  @Column({ type: 'json', nullable: true })
  riskFlags: Record<string, boolean>;

  @Column({ type: 'json' })
  answersSnapshot: { questionId: number; value: number; theme: string }[];

  @CreateDateColumn()
  submittedAt: Date;
}
