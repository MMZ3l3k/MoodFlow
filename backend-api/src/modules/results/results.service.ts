import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssessmentResult } from './entities/assessment-result.entity';

// Konfiguracja Indeksu Dobrostanu — wagi i normalizacja dla każdego testu
const WELLBEING_CONFIG: Record<string, {
  weight: number;
  positive: boolean; // true = wyższy wynik = lepiej; false = wyższy wynik = gorzej (odwracamy)
  maxRaw: number;    // maksymalna wartość rawScore dla danego testu
  label: string;
}> = {
  WHO5:   { weight: 0.30, positive: true,  maxRaw: 25,  label: 'Dobrostan ogólny' },
  PSS10:  { weight: 0.20, positive: false, maxRaw: 40,  label: 'Poziom stresu' },
  PHQ9:   { weight: 0.20, positive: false, maxRaw: 27,  label: 'Objawy depresyjne' },
  GAD7:   { weight: 0.15, positive: false, maxRaw: 21,  label: 'Poziom lęku' },
  MOOD10: { weight: 0.15, positive: true,  maxRaw: 50,  label: 'Nastrój ogólny' },
};

export interface WellbeingHistoryPoint {
  date: string;   // 'YYYY-MM-DD'
  index: number;  // 0–100
  color: string;
}

export interface WellbeingIndexResult {
  index: number;            // 0–100
  level: 'high' | 'moderate' | 'low' | 'critical';
  label: string;            // np. "Wysoki poziom dobrostanu"
  description: string;
  color: string;            // hex / tailwind-friendly
  breakdown: {
    code: string;
    label: string;
    contribution: number;   // 0–100 (znormalizowany wkład przed wagą)
    weight: number;
    lastDate: Date;
  }[];
  hasEnoughData: boolean;   // czy obliczono na podstawie ≥1 testu
}

function resolveLevel(index: number): Pick<WellbeingIndexResult, 'level' | 'label' | 'description' | 'color'> {
  if (index >= 80) return {
    level: 'high',
    label: 'Wysoki poziom dobrostanu',
    description: 'Twój dobrostan psychiczny jest na bardzo dobrym poziomie. Wskazuje to na stabilność emocjonalną, dobrą odporność na stres oraz satysfakcjonujące funkcjonowanie na co dzień.',
    color: '#22c55e',
  };
  if (index >= 60) return {
    level: 'moderate',
    label: 'Umiarkowany poziom dobrostanu',
    description: 'Twój dobrostan jest na dobrym, ale nie w pełni optymalnym poziomie. Mogą pojawiać się okresowe napięcia lub obniżenie nastroju.',
    color: '#eab308',
  };
  if (index >= 40) return {
    level: 'low',
    label: 'Obniżony poziom dobrostanu',
    description: 'Twój dobrostan jest obniżony, co może oznaczać zwiększone napięcie, zmęczenie lub pogorszenie samopoczucia.',
    color: '#f97316',
  };
  return {
    level: 'critical',
    label: 'Niski poziom dobrostanu / przeciążenie',
    description: 'Twój wynik wskazuje na wysoki poziom obciążenia psychicznego. Może to oznaczać silny stres, zmęczenie lub wyraźne pogorszenie samopoczucia.',
    color: '#ef4444',
  };
}

@Injectable()
export class ResultsService {
  constructor(
    @InjectRepository(AssessmentResult)
    private resultRepo: Repository<AssessmentResult>,
  ) {}

  async findMyResults(userId: number): Promise<AssessmentResult[]> {
    return this.resultRepo.find({
      where: { userId },
      relations: ['assessment'],
      order: { submittedAt: 'DESC' },
    });
  }

  async findMyResultById(userId: number, id: number): Promise<AssessmentResult | null> {
    return this.resultRepo.findOne({
      where: { id, userId },
      relations: ['assessment'],
    });
  }

  async getWellbeingIndex(userId: number): Promise<WellbeingIndexResult> {
    // Pobierz wszystkie wyniki użytkownika z danymi testu
    const allResults = await this.resultRepo.find({
      where: { userId },
      relations: ['assessment'],
      order: { submittedAt: 'DESC' },
    });

    // Dla każdego testu bierzemy NAJNOWSZY wynik
    const latestByCode = new Map<string, AssessmentResult>();
    for (const r of allResults) {
      const code = r.assessment?.code;
      if (code && WELLBEING_CONFIG[code] && !latestByCode.has(code)) {
        latestByCode.set(code, r);
      }
    }

    const breakdown: WellbeingIndexResult['breakdown'] = [];
    let weightedSum = 0;
    let totalWeight = 0;

    for (const [code, cfg] of Object.entries(WELLBEING_CONFIG)) {
      const result = latestByCode.get(code);
      if (!result) continue;

      // Normalizacja rawScore do 0–100
      const normalized = Math.min(100, Math.max(0, Math.round((result.rawScore / cfg.maxRaw) * 100)));

      // Dla wskaźników negatywnych odwracamy skalę (wyższy wynik = gorzej → 100 - val)
      const contribution = cfg.positive ? normalized : 100 - normalized;

      weightedSum += contribution * cfg.weight;
      totalWeight += cfg.weight;

      breakdown.push({
        code,
        label: cfg.label,
        contribution,
        weight: cfg.weight,
        lastDate: result.submittedAt,
      });
    }

    if (totalWeight === 0) {
      // Brak danych — zwróć placeholder
      return {
        index: 0,
        ...resolveLevel(0),
        breakdown: [],
        hasEnoughData: false,
      };
    }

    // Skalujemy do pełnej skali 0–100 w przypadku braku niektórych testów
    const index = Math.round(weightedSum / totalWeight);

    return {
      index,
      ...resolveLevel(index),
      breakdown,
      hasEnoughData: true,
    };
  }

  /**
   * Zwraca historię indeksu dobrostanu z ostatnich 30 dni.
   * Dla każdego dnia, w którym wypełniono przynajmniej jeden relevantny test,
   * obliczamy indeks używając najnowszych wyników każdego testu dostępnych
   * do końca tego dnia włącznie.
   */
  async getWellbeingHistory(userId: number): Promise<WellbeingHistoryPoint[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // Wszystkie wyniki użytkownika (bez ograniczenia czasowego — potrzebujemy
    // historycznych danych sprzed 30 dni jako baseline dla pierwszych punktów)
    const allResults = await this.resultRepo.find({
      where: { userId },
      relations: ['assessment'],
      order: { submittedAt: 'ASC' },
    });

    const relevantResults = allResults.filter(
      (r) => r.assessment?.code && WELLBEING_CONFIG[r.assessment.code],
    );

    if (relevantResults.length === 0) return [];

    // Znajdź unikalne dni w ostatnich 30 dniach z przynajmniej 1 wynikiem
    const uniqueDays = Array.from(
      new Set(
        relevantResults
          .filter((r) => new Date(r.submittedAt) >= thirtyDaysAgo)
          .map((r) => new Date(r.submittedAt).toISOString().slice(0, 10)),
      ),
    ).sort();

    if (uniqueDays.length === 0) return [];

    const points: WellbeingHistoryPoint[] = [];

    for (const day of uniqueDays) {
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);

      // Dla każdego testu: najnowszy wynik dostępny do końca tego dnia
      const latestByCode = new Map<string, AssessmentResult>();
      for (const r of relevantResults) {
        if (new Date(r.submittedAt) > dayEnd) continue;
        const code = r.assessment!.code;
        const existing = latestByCode.get(code);
        if (!existing || new Date(r.submittedAt) > new Date(existing.submittedAt)) {
          latestByCode.set(code, r);
        }
      }

      let weightedSum = 0;
      let totalWeight = 0;

      for (const [code, cfg] of Object.entries(WELLBEING_CONFIG)) {
        const result = latestByCode.get(code);
        if (!result) continue;
        const normalized = Math.min(100, Math.max(0, Math.round((result.rawScore / cfg.maxRaw) * 100)));
        const contribution = cfg.positive ? normalized : 100 - normalized;
        weightedSum += contribution * cfg.weight;
        totalWeight += cfg.weight;
      }

      if (totalWeight === 0) continue;

      const index = Math.round(weightedSum / totalWeight);
      points.push({ date: day, index, color: resolveLevel(index).color });
    }

    return points;
  }
}
