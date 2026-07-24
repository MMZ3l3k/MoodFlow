import { BadRequestException } from '@nestjs/common';
import { ScoringService } from './scoring.service';
import { Assessment } from '../../assessments/entities/assessment.entity';
import { AnswerDto } from '../../responses/dto/submit-responses.dto';

// Pomocnicze funkcje do budowania testowego testu i odpowiedzi.
// id pytania robimy inne niz order (order + 100), zeby nie pomylic jednego z drugim.
function makeAssessment(code: string, questions: { order: number; reverseScored?: boolean }[]): Assessment {
  return {
    code,
    requiresAllAnswers: true,
    questions: questions.map((q) => ({ id: q.order + 100, order: q.order, reverseScored: q.reverseScored ?? false })),
  } as Assessment;
}

function answers(values: number[]): AnswerDto[] {
  return values.map((value, i) => ({ questionId: i + 101, value }));
}

// prosty test z N pytaniami 0..3 (PHQ-9, GAD-7)
function simple(code: string, n: number) {
  return makeAssessment(code, Array.from({ length: n }, (_, i) => ({ order: i + 1 })));
}

describe('ScoringService', () => {
  let service: ScoringService;
  beforeEach(() => {
    service = new ScoringService();
  });

  // --- PHQ-9 (depresja) ---

  it('PHQ-9: same zera daje wynik 0 i poziom minimal', () => {
    const r = service.compute(simple('PHQ9', 9), answers([0, 0, 0, 0, 0, 0, 0, 0, 0]));
    expect(r.rawScore).toBe(0);
    expect(r.severity).toBe('minimal');
  });

  it('PHQ-9: wynik 12 to poziom moderate', () => {
    const r = service.compute(simple('PHQ9', 9), answers([2, 2, 2, 2, 1, 1, 1, 1, 0]));
    expect(r.rawScore).toBe(12);
    expect(r.severity).toBe('moderate');
  });

  it('PHQ-9: maksymalny wynik 27 to poziom severe', () => {
    const r = service.compute(simple('PHQ9', 9), answers([3, 3, 3, 3, 3, 3, 3, 3, 3]));
    expect(r.rawScore).toBe(27);
    expect(r.severity).toBe('severe');
  });

  it('PHQ-9: odpowiedz >0 na pytanie 9 ustawia flage ryzyka, nawet przy niskim wyniku', () => {
    const r = service.compute(simple('PHQ9', 9), answers([0, 0, 0, 0, 0, 0, 0, 0, 1]));
    expect(r.severity).toBe('minimal');
    expect(r.riskFlags.selfHarmRiskFlag).toBe(true);
  });

  it('PHQ-9: brak myśli samobojczych (pytanie 9 = 0) nie ustawia flagi', () => {
    const r = service.compute(simple('PHQ9', 9), answers([3, 3, 3, 3, 3, 0, 0, 0, 0]));
    expect(r.riskFlags.selfHarmRiskFlag).toBe(false);
  });

  // --- GAD-7 (lek) ---

  it('GAD-7: wynik 10 to poziom moderate i flaga dalszej oceny', () => {
    const r = service.compute(simple('GAD7', 7), answers([2, 2, 2, 2, 1, 1, 0]));
    expect(r.rawScore).toBe(10);
    expect(r.severity).toBe('moderate');
    expect(r.riskFlags.needsFurtherEvaluation).toBe(true);
  });

  it('GAD-7: niski wynik nie ustawia flagi dalszej oceny', () => {
    const r = service.compute(simple('GAD7', 7), answers([1, 1, 0, 0, 0, 0, 0]));
    expect(r.riskFlags.needsFurtherEvaluation).toBe(false);
  });

  // --- PSS-10 (stres, pytania odwracane) ---

  it('PSS-10: pytania odwracane liczone sa jako 4 - wartosc', () => {
    // pytania 4,5,7,8 sa odwracane; wszystkie odpowiedzi = 4
    const pss = makeAssessment('PSS10', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((o) => ({
      order: o, reverseScored: [4, 5, 7, 8].includes(o),
    })));
    const r = service.compute(pss, answers([4, 4, 4, 4, 4, 4, 4, 4, 4, 4]));
    // 6 pytan wprost * 4 = 24, 4 odwrocone * 0 = 0
    expect(r.rawScore).toBe(24);
    expect(r.severity).toBe('moderate');
  });

  // --- WHO-5 (dobrostan, normalizacja) ---

  it('WHO-5: wynik surowy jest mnozony przez 4 (skala 0-100)', () => {
    const r = service.compute(simple('WHO5', 5), answers([5, 5, 5, 5, 5]));
    expect(r.rawScore).toBe(25);
    expect(r.normalizedScore).toBe(100);
  });

  it('WHO-5: wynik surowy ponizej 13 ustawia flage obnizonego dobrostanu', () => {
    const r = service.compute(simple('WHO5', 5), answers([2, 2, 2, 2, 2]));
    expect(r.rawScore).toBe(10);
    expect(r.riskFlags.poorWellbeingFlag).toBe(true);
  });

  // --- walidacja kompletnosci ---

  it('rzuca blad, gdy brakuje odpowiedzi na wymagane pytania', () => {
    expect(() => service.compute(simple('PHQ9', 9), answers([1, 1, 1]))).toThrow(BadRequestException);
  });
});
