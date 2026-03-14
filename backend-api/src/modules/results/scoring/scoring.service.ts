import { Injectable, BadRequestException } from '@nestjs/common';
import { Assessment } from '../../assessments/entities/assessment.entity';
import { AnswerDto } from '../../responses/dto/submit-responses.dto';

export interface ScoringResult {
  rawScore: number;
  normalizedScore: number;
  severity: string;
  riskFlags: Record<string, boolean>;
}

@Injectable()
export class ScoringService {
  compute(assessment: Assessment, answers: AnswerDto[]): ScoringResult {
    const questions = assessment.questions.sort((a, b) => a.order - b.order);

    if (assessment.requiresAllAnswers && answers.length !== questions.length) {
      throw new BadRequestException(
        `Test ${assessment.code} wymaga ${questions.length} odpowiedzi, podano ${answers.length}`,
      );
    }

    const answerMap = new Map(answers.map((a) => [a.questionId, a.value]));

    switch (assessment.code) {
      case 'PHQ9': return this.scorePHQ9(questions, answerMap);
      case 'GAD7': return this.scoreGAD7(questions, answerMap);
      case 'PSS10': return this.scorePSS10(questions, answerMap);
      case 'WHO5': return this.scoreWHO5(questions, answerMap);
      case 'MOOD10': return this.scoreMOOD10(questions, answerMap);
      case 'DAILY_MOOD': return this.scoreDailyMood(questions, answerMap);
      default: return this.scoreGeneric(questions, answerMap);
    }
  }

  private sumAnswers(questions: any[], answerMap: Map<number, number>): number {
    return questions.reduce((sum, q) => sum + (answerMap.get(q.id) ?? 0), 0);
  }

  private scorePHQ9(questions: any[], answerMap: Map<number, number>): ScoringResult {
    const rawScore = this.sumAnswers(questions, answerMap);
    const q9 = questions.find((q) => q.order === 9);
    const selfHarmRiskFlag = q9 ? (answerMap.get(q9.id) ?? 0) > 0 : false;

    let severity = 'minimal';
    if (rawScore >= 20) severity = 'severe';
    else if (rawScore >= 15) severity = 'moderately_severe';
    else if (rawScore >= 10) severity = 'moderate';
    else if (rawScore >= 5) severity = 'mild';

    return { rawScore, normalizedScore: rawScore, severity, riskFlags: { selfHarmRiskFlag } };
  }

  private scoreGAD7(questions: any[], answerMap: Map<number, number>): ScoringResult {
    const rawScore = this.sumAnswers(questions, answerMap);
    const needsFurtherEvaluation = rawScore >= 10;

    let severity = 'minimal';
    if (rawScore >= 15) severity = 'severe';
    else if (rawScore >= 10) severity = 'moderate';
    else if (rawScore >= 5) severity = 'mild';

    return { rawScore, normalizedScore: rawScore, severity, riskFlags: { needsFurtherEvaluation } };
  }

  private scorePSS10(questions: any[], answerMap: Map<number, number>): ScoringResult {
    const rawScore = questions.reduce((sum, q) => {
      const val = answerMap.get(q.id) ?? 0;
      return sum + (q.reverseScored ? 4 - val : val);
    }, 0);

    let severity = 'low';
    if (rawScore >= 27) severity = 'high';
    else if (rawScore >= 14) severity = 'moderate';

    return { rawScore, normalizedScore: rawScore, severity, riskFlags: {} };
  }

  private scoreWHO5(questions: any[], answerMap: Map<number, number>): ScoringResult {
    const rawScore = this.sumAnswers(questions, answerMap);
    const normalizedScore = rawScore * 4;
    const poorWellbeingFlag = rawScore < 13;

    const severity = normalizedScore < 50 ? 'low_wellbeing' : 'adequate_wellbeing';

    return { rawScore, normalizedScore, severity, riskFlags: { poorWellbeingFlag } };
  }

  private scoreMOOD10(questions: any[], answerMap: Map<number, number>): ScoringResult {
    const rawScore = questions.reduce((sum, q) => {
      const val = answerMap.get(q.id) ?? 1;
      return sum + (q.reverseScored ? 6 - val : val);
    }, 0);

    let severity = 'good';
    if (rawScore <= 20) severity = 'very_low';
    else if (rawScore <= 30) severity = 'low';
    else if (rawScore <= 40) severity = 'moderate';

    return { rawScore, normalizedScore: Math.round((rawScore / 50) * 100), severity, riskFlags: {} };
  }

  private scoreDailyMood(questions: any[], answerMap: Map<number, number>): ScoringResult {
    const q = questions[0];
    const rawScore = q ? (answerMap.get(q.id) ?? 3) : 3;

    const severityMap: Record<number, string> = {
      1: 'very_bad', 2: 'bad', 3: 'neutral', 4: 'good', 5: 'very_good',
    };

    return {
      rawScore,
      normalizedScore: Math.round(((rawScore - 1) / 4) * 100),
      severity: severityMap[rawScore] ?? 'neutral',
      riskFlags: {},
    };
  }

  private scoreGeneric(questions: any[], answerMap: Map<number, number>): ScoringResult {
    const rawScore = this.sumAnswers(questions, answerMap);
    return { rawScore, normalizedScore: rawScore, severity: 'unknown', riskFlags: {} };
  }
}
