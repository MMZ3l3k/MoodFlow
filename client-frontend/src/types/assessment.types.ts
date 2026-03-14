export interface AnswerOption {
  id: number;
  value: number;
  label: string;
  order: number;
}

export interface Question {
  id: number;
  order: number;
  theme: string;
  text: string;
  reverseScored: boolean;
  required: boolean;
}

export interface Assessment {
  id: number;
  code: string;
  name: string;
  description: string;
  timeframe: string;
  questionCount: number;
  questions: Question[];
  answerOptions: AnswerOption[];
}

export interface AssessmentResult {
  id: number;
  assessmentId: number;
  rawScore: number;
  normalizedScore: number;
  severity: string;
  riskFlags: Record<string, boolean>;
  answersSnapshot: { questionId: number; value: number; theme: string }[];
  submittedAt: string;
  assessment: { id: number; code: string; name: string; timeframe: string };
}
