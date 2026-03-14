import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Assessment } from './assessment.entity';

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  assessmentId: number;

  @ManyToOne(() => Assessment, (a) => a.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assessmentId' })
  assessment: Assessment;

  @Column()
  order: number;

  @Column()
  theme: string;

  @Column({ type: 'text', nullable: true })
  text: string;

  @Column({ default: false })
  reverseScored: boolean;

  @Column({ default: true })
  required: boolean;
}
