import { IsNumber, IsArray, ValidateNested, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class AnswerDto {
  @IsInt()
  questionId: number;

  @IsNumber()
  value: number;
}

export class SubmitResponsesDto {
  @IsInt()
  assessmentId: number;

  @IsInt()
  assignmentId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];
}
