import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { AssessmentResult } from '../../results/entities/assessment-result.entity';
import { Question } from '../../assessments/entities/question.entity';

@Entity('user_responses')
export class UserResponse {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  resultId: number;

  @ManyToOne(() => AssessmentResult, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'resultId' })
  result: AssessmentResult;

  @Column()
  questionId: number;

  @ManyToOne(() => Question, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'questionId' })
  question: Question;

  @Column()
  selectedValue: number;
}
