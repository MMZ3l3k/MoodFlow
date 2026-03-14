import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Assessment } from './assessment.entity';

@Entity('answer_options')
export class AnswerOption {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  assessmentId: number;

  @ManyToOne(() => Assessment, (a) => a.answerOptions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assessmentId' })
  assessment: Assessment;

  @Column()
  value: number;

  @Column()
  label: string;

  @Column()
  order: number;
}
