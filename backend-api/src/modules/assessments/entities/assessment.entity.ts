import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, OneToMany,
} from 'typeorm';
import { Question } from './question.entity';
import { AnswerOption } from './answer-option.entity';

@Entity('assessments')
export class Assessment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  code: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  timeframe: string;

  @Column()
  questionCount: number;

  @Column({ default: true })
  isAnonymousForHR: boolean;

  @Column({ default: true })
  requiresAllAnswers: boolean;

  @Column({ default: '1.0' })
  version: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Question, (q) => q.assessment, { cascade: true })
  questions: Question[];

  @OneToMany(() => AnswerOption, (a) => a.assessment, { cascade: true })
  answerOptions: AnswerOption[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
