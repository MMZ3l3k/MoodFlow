import { BadRequestException } from '@nestjs/common';
import { ScoringService } from './scoring.service';
import { Assessment } from '../../assessments/entities/assessment.entity';
import { AnswerDto } from '../../responses/dto/submit-responses.dto';

interface QuestionDef {
  order: number;
  reverseScored?: boolean;
}

// id = order + 100, żeby testy wykryły pomylenie id pytania z jego kolejnością
function makeAssessment(
  code: string,
  questionDefs: QuestionDef[],
  overrides: Partial<Assessment> = {},
): Assessment {
  return {
    id: 1,
    code,
    name: code,
    questionCount: questionDefs.length,
    requiresAllAnswers: true,
    questions: questionDefs.map((q) => ({
      id: q.order + 100,
      order: q.order,
      reverseScored: q.reverseScored ?? false,
    })),
    ...overrides,
  } as Assessment;
}

function answersByOrder(values: number[]): AnswerDto[] {
  return values.map((value, i) => ({ questionId: i + 1 + 100, value }));
}

describe('ScoringService', () => {
  let service: ScoringService;

  beforeEach(() => {
    service = new ScoringService();
  });

  describe('walidacja kompletności odpowiedzi', () => {
    it('odrzuca niekompletny zestaw odpowiedzi, gdy test wymaga wszystkich', () => {
      const assessment = makeAssessment('PHQ9', range(1, 9));
      expect(() => service.compute(assessment, answersByOrder([1, 1, 1]))).toThrow(
        BadRequestException,
      );
    });

    it('odrzuca nadmiarowe odpowiedzi, gdy test wymaga dokładnej liczby', () => {
      const assessment = makeAssessment('GAD7', range(1, 7));
      expect(() =>
        service.compute(assessment, answersByOrder([1, 1, 1, 1, 1, 1, 1, 1])),
      ).toThrow(BadRequestException);
    });

    it('dopuszcza brakujące odpowiedzi (liczone jako 0), gdy requiresAllAnswers=false', () => {
      const assessment = makeAssessment('PHQ9', range(1, 9), {
        requiresAllAnswers: false,
      });
      const result = service.compute(assessment, [
        { questionId: 101, value: 2 },
        { questionId: 102, value: 3 },
      ]);
      expect(result.rawScore).toBe(5);
      expect(result.severity).toBe('mild');
    });
  });

  describe('PHQ-9 (depresja, 9 pytań, skala 0-3, wynik 0-27)', () => {
    const assessment = () => makeAssessment('PHQ9', range(1, 9));

    it.each([
      [[0, 0, 0, 0, 0, 0, 0, 0, 0], 0, 'minimal'],
      [[1, 1, 1, 1, 0, 0, 0, 0, 0], 4, 'minimal'],
      [[1, 1, 1, 1, 1, 0, 0, 0, 0], 5, 'mild'],
      [[1, 1, 1, 1, 1, 1, 1, 1, 1], 9, 'mild'],
      [[2, 2, 2, 1, 1, 1, 1, 0, 0], 10, 'moderate'],
      [[2, 2, 2, 2, 2, 2, 2, 0, 0], 14, 'moderate'],
      [[2, 2, 2, 2, 2, 2, 1, 1, 1], 15, 'moderately_severe'],
      [[3, 3, 3, 3, 3, 2, 1, 1, 0], 19, 'moderately_severe'],
      [[3, 3, 3, 3, 3, 3, 2, 0, 0], 20, 'severe'],
      [[3, 3, 3, 3, 3, 3, 3, 3, 3], 27, 'severe'],
    ])('wynik %j → suma %i, poziom "%s"', (values, expectedScore, expectedSeverity) => {
      const result = service.compute(assessment(), answersByOrder(values as number[]));
      expect(result.rawScore).toBe(expectedScore);
      expect(result.normalizedScore).toBe(expectedScore);
      expect(result.severity).toBe(expectedSeverity);
    });

    it('ustawia flagę ryzyka samookaleczenia przy jakiejkolwiek odpowiedzi > 0 na pytanie 9', () => {
      const values = [0, 0, 0, 0, 0, 0, 0, 0, 1];
      const result = service.compute(assessment(), answersByOrder(values));
      expect(result.severity).toBe('minimal');
      expect(result.riskFlags.selfHarmRiskFlag).toBe(true);
    });

    it('nie ustawia flagi ryzyka, gdy pytanie 9 ma odpowiedź 0', () => {
      const values = [3, 3, 3, 3, 3, 3, 3, 3, 0];
      const result = service.compute(assessment(), answersByOrder(values));
      expect(result.riskFlags.selfHarmRiskFlag).toBe(false);
    });

    it('poprawnie identyfikuje pytanie 9 nawet przy nieuporządkowanej liście pytań', () => {
      const shuffled = makeAssessment('PHQ9', [9, 3, 7, 1, 5, 2, 8, 4, 6].map((order) => ({ order })));
      const answers: AnswerDto[] = range(1, 9).map((q) => ({
        questionId: q.order + 100,
        value: q.order === 9 ? 2 : 0,
      }));
      const result = service.compute(shuffled, answers);
      expect(result.rawScore).toBe(2);
      expect(result.riskFlags.selfHarmRiskFlag).toBe(true);
    });
  });

  describe('GAD-7 (lęk, 7 pytań, skala 0-3, wynik 0-21)', () => {
    const assessment = () => makeAssessment('GAD7', range(1, 7));

    it.each([
      [[0, 0, 0, 0, 0, 0, 0], 0, 'minimal', false],
      [[1, 1, 1, 1, 0, 0, 0], 4, 'minimal', false],
      [[1, 1, 1, 1, 1, 0, 0], 5, 'mild', false],
      [[2, 2, 2, 1, 1, 1, 0], 9, 'mild', false],
      [[2, 2, 2, 2, 1, 1, 0], 10, 'moderate', true],
      [[2, 2, 2, 2, 2, 2, 2], 14, 'moderate', true],
      [[3, 3, 3, 2, 2, 1, 1], 15, 'severe', true],
      [[3, 3, 3, 3, 3, 3, 3], 21, 'severe', true],
    ])(
      'wynik %j → suma %i, poziom "%s", dalsza diagnostyka: %s',
      (values, expectedScore, expectedSeverity, expectedFlag) => {
        const result = service.compute(assessment(), answersByOrder(values as number[]));
        expect(result.rawScore).toBe(expectedScore);
        expect(result.severity).toBe(expectedSeverity);
        expect(result.riskFlags.needsFurtherEvaluation).toBe(expectedFlag);
      },
    );
  });

  describe('PSS-10 (stres, 10 pytań, skala 0-4, pytania 4/5/7/8 odwrócone, wynik 0-40)', () => {
    const REVERSED = [4, 5, 7, 8];
    const assessment = () =>
      makeAssessment(
        'PSS10',
        range(1, 10).map((q) => ({ order: q.order, reverseScored: REVERSED.includes(q.order) })),
      );

    it('odwraca punktację pytań odwróconych (4 - wartość)', () => {
      // wszystkie odpowiedzi 4: 6 pytań wprost = 24 pkt, 4 odwrócone = 0 pkt
      const result = service.compute(assessment(), answersByOrder(Array(10).fill(4)));
      expect(result.rawScore).toBe(24);
      expect(result.severity).toBe('moderate');
    });

    it('daje maksymalny wynik 40 przy 4 wprost i 0 na pytaniach odwróconych', () => {
      const values = range(1, 10).map((q) => (REVERSED.includes(q.order) ? 0 : 4));
      const result = service.compute(assessment(), answersByOrder(values));
      expect(result.rawScore).toBe(40);
      expect(result.severity).toBe('high');
    });

    it.each([
      [0, 'low'],
      [13, 'low'],
      [14, 'moderate'],
      [26, 'moderate'],
      [27, 'high'],
    ])('suma %i → poziom "%s"', (targetScore, expectedSeverity) => {
      const result = service.compute(assessment(), answersForPssScore(targetScore, REVERSED));
      expect(result.rawScore).toBe(targetScore);
      expect(result.severity).toBe(expectedSeverity);
    });

    // buduje odpowiedzi dające zadaną sumę: rozkłada punkty (0-4 na pytanie)
    // po kolei, przeliczając wartość odpowiedzi dla pytań odwróconych
    function answersForPssScore(target: number, reversed: number[]): AnswerDto[] {
      let remaining = target;
      return range(1, 10).map((q) => {
        const points = Math.min(4, remaining);
        remaining -= points;
        const value = reversed.includes(q.order) ? 4 - points : points;
        return { questionId: q.order + 100, value };
      });
    }
  });

  describe('WHO-5 (dobrostan, 5 pytań, skala 0-5, wynik znormalizowany 0-100)', () => {
    const assessment = () => makeAssessment('WHO5', range(1, 5));

    it('normalizuje wynik surowy mnożąc przez 4', () => {
      const result = service.compute(assessment(), answersByOrder([5, 5, 5, 5, 5]));
      expect(result.rawScore).toBe(25);
      expect(result.normalizedScore).toBe(100);
      expect(result.severity).toBe('adequate_wellbeing');
      expect(result.riskFlags.poorWellbeingFlag).toBe(false);
    });

    it('wynik surowy 12 (48 pkt) → niski dobrostan z flagą', () => {
      const result = service.compute(assessment(), answersByOrder([4, 4, 4, 0, 0]));
      expect(result.rawScore).toBe(12);
      expect(result.normalizedScore).toBe(48);
      expect(result.severity).toBe('low_wellbeing');
      expect(result.riskFlags.poorWellbeingFlag).toBe(true);
    });

    it('wynik surowy 13 (52 pkt) → adekwatny dobrostan bez flagi', () => {
      const result = service.compute(assessment(), answersByOrder([5, 4, 4, 0, 0]));
      expect(result.rawScore).toBe(13);
      expect(result.normalizedScore).toBe(52);
      expect(result.severity).toBe('adequate_wellbeing');
      expect(result.riskFlags.poorWellbeingFlag).toBe(false);
    });

    it('wynik zerowy → najniższy możliwy dobrostan', () => {
      const result = service.compute(assessment(), answersByOrder([0, 0, 0, 0, 0]));
      expect(result.rawScore).toBe(0);
      expect(result.normalizedScore).toBe(0);
      expect(result.severity).toBe('low_wellbeing');
      expect(result.riskFlags.poorWellbeingFlag).toBe(true);
    });
  });

  describe('MOOD10 (nastrój, 10 pytań, skala 1-5, część odwrócona, wynik 10-50)', () => {
    const REVERSED = [1, 3, 5, 8];
    const assessment = () =>
      makeAssessment(
        'MOOD10',
        range(1, 10).map((q) => ({ order: q.order, reverseScored: REVERSED.includes(q.order) })),
      );

    it('odwraca punktację pytań odwróconych (6 - wartość)', () => {
      // wszystkie 5: 6 wprost = 30 pkt, 4 odwrócone po 1 pkt = 4 pkt
      const result = service.compute(assessment(), answersByOrder(Array(10).fill(5)));
      expect(result.rawScore).toBe(34);
      expect(result.severity).toBe('moderate');
    });

    it('daje maksymalny wynik 50 i poziom "good" przy optymalnych odpowiedziach', () => {
      const values = range(1, 10).map((q) => (REVERSED.includes(q.order) ? 1 : 5));
      const result = service.compute(assessment(), answersByOrder(values));
      expect(result.rawScore).toBe(50);
      expect(result.normalizedScore).toBe(100);
      expect(result.severity).toBe('good');
    });

    it('daje minimalny wynik 10 i poziom "very_low" przy najgorszych odpowiedziach', () => {
      const values = range(1, 10).map((q) => (REVERSED.includes(q.order) ? 5 : 1));
      const result = service.compute(assessment(), answersByOrder(values));
      expect(result.rawScore).toBe(10);
      expect(result.normalizedScore).toBe(20);
      expect(result.severity).toBe('very_low');
    });

    it.each([
      [20, 'very_low'],
      [21, 'low'],
      [30, 'low'],
      [31, 'moderate'],
      [40, 'moderate'],
      [41, 'good'],
    ])('suma %i → poziom "%s"', (targetScore, expectedSeverity) => {
      const result = service.compute(assessment(), answersForMoodScore(targetScore, REVERSED));
      expect(result.rawScore).toBe(targetScore);
      expect(result.severity).toBe(expectedSeverity);
    });

    // każde pytanie daje minimum 1 pkt (razem 10), nadwyżkę ponad minimum
    // rozkłada po kolei (max +4 na pytanie), przeliczając wartość dla odwróconych
    function answersForMoodScore(target: number, reversed: number[]): AnswerDto[] {
      let remaining = target - 10;
      return range(1, 10).map((q) => {
        const extra = Math.min(4, remaining);
        remaining -= extra;
        const points = 1 + extra;
        const value = reversed.includes(q.order) ? 6 - points : points;
        return { questionId: q.order + 100, value };
      });
    }
  });

  describe('DAILY_MOOD (codzienny nastrój, 1 pytanie, skala 1-5)', () => {
    const assessment = () => makeAssessment('DAILY_MOOD', [{ order: 1 }]);

    it.each([
      [1, 'very_bad', 0],
      [2, 'bad', 25],
      [3, 'neutral', 50],
      [4, 'good', 75],
      [5, 'very_good', 100],
    ])('wartość %i → poziom "%s", wynik znormalizowany %i', (value, expectedSeverity, expectedNormalized) => {
      const result = service.compute(assessment(), [{ questionId: 101, value }]);
      expect(result.rawScore).toBe(value);
      expect(result.severity).toBe(expectedSeverity);
      expect(result.normalizedScore).toBe(expectedNormalized);
    });
  });

  describe('test o nieznanym kodzie (scoring generyczny)', () => {
    it('sumuje odpowiedzi i zwraca poziom "unknown" bez flag ryzyka', () => {
      const assessment = makeAssessment('CUSTOM_XYZ', range(1, 4));
      const result = service.compute(assessment, answersByOrder([1, 2, 3, 4]));
      expect(result.rawScore).toBe(10);
      expect(result.normalizedScore).toBe(10);
      expect(result.severity).toBe('unknown');
      expect(result.riskFlags).toEqual({});
    });
  });
});

function range(from: number, to: number): QuestionDef[] {
  return Array.from({ length: to - from + 1 }, (_, i) => ({ order: from + i }));
}
