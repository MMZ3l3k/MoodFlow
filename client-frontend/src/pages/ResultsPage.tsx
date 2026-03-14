import { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';
import type { AssessmentResult } from '../types/assessment.types';
import SeverityBadge from '../components/SeverityBadge';

interface Stats {
  total: number;
  averageScore: number;
  byAssessment: Record<string, { name: string; count: number; avg: number; last: number }>;
}

function computeStats(results: AssessmentResult[]): Stats {
  if (results.length === 0) {
    return { total: 0, averageScore: 0, byAssessment: {} };
  }
  const scores = results.map((r) => r.rawScore);
  const byAssessment: Stats['byAssessment'] = {};

  for (const r of results) {
    const key = r.assessment?.code ?? String(r.assessmentId);
    const name = r.assessment?.name ?? 'Test';
    if (!byAssessment[key]) {
      byAssessment[key] = { name, count: 0, avg: 0, last: 0 };
    }
    byAssessment[key].count++;
    byAssessment[key].last = r.rawScore;
  }

  for (const key of Object.keys(byAssessment)) {
    const items = results.filter(
      (r) => (r.assessment?.code ?? String(r.assessmentId)) === key
    );
    byAssessment[key].avg = Math.round(
      items.reduce((s, r) => s + r.rawScore, 0) / items.length
    );
  }

  return {
    total: results.length,
    averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    byAssessment,
  };
}

const severityColor: Record<string, string> = {
  none: 'bg-green-400',
  minimal: 'bg-green-400',
  mild: 'bg-yellow-400',
  moderate: 'bg-orange-400',
  severe: 'bg-red-400',
  'moderate-severe': 'bg-red-400',
  low: 'bg-green-400',
  medium: 'bg-yellow-400',
  high: 'bg-red-400',
};

export default function ResultsPage() {
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>('all');

  useEffect(() => {
    axiosClient
      .get<AssessmentResult[]>('/results')
      .then((r) => setResults(r.data))
      .finally(() => setLoading(false));
  }, []);

  const stats = computeStats(results);
  const assessmentKeys = Object.keys(stats.byAssessment);

  const filtered =
    selected === 'all'
      ? results
      : results.filter(
          (r) => (r.assessment?.code ?? String(r.assessmentId)) === selected
        );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Wyniki</h1>
        <p className="text-gray-500 text-sm mt-0.5">Twoje wyniki i statystyki</p>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm p-4 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      )}

      {!loading && results.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <p className="text-3xl mb-2">📊</p>
          <p className="text-gray-500 text-sm">Nie wypełniłeś(aś) jeszcze żadnego testu</p>
          <p className="text-gray-400 text-xs mt-1">Wyniki pojawią się tutaj po wykonaniu pierwszego testu</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <>
          {/* Stats overview */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white rounded-2xl shadow-sm p-3 text-center">
              <p className="text-xl font-bold text-gray-800">{stats.total}</p>
              <p className="text-xs text-gray-500 mt-0.5">testów</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-3 text-center">
              <p className="text-xl font-bold text-gray-800">{stats.averageScore}</p>
              <p className="text-xs text-gray-500 mt-0.5">śr. wynik</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-3 text-center">
              <p className="text-xl font-bold text-gray-800">{assessmentKeys.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">typów testów</p>
            </div>
          </div>

          {/* Per-assessment summaries */}
          {assessmentKeys.length > 1 && (
            <section>
              <h2 className="text-base font-semibold text-gray-700 mb-3">Podsumowanie per test</h2>
              <div className="space-y-2">
                {assessmentKeys.map((key) => {
                  const s = stats.byAssessment[key];
                  return (
                    <div key={key} className="bg-white rounded-2xl shadow-sm p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{s.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{s.count}× wypełniony</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-800">śr. {s.avg}</p>
                          <p className="text-xs text-gray-400">ostatni: {s.last}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Filter by assessment */}
          {assessmentKeys.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              <button
                onClick={() => setSelected('all')}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-sm font-medium transition ${
                  selected === 'all'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-gray-500 border border-gray-200'
                }`}
              >
                Wszystkie
              </button>
              {assessmentKeys.map((key) => (
                <button
                  key={key}
                  onClick={() => setSelected(key)}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-sm font-medium transition ${
                    selected === key
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-gray-500 border border-gray-200'
                  }`}
                >
                  {stats.byAssessment[key].name}
                </button>
              ))}
            </div>
          )}

          {/* Results list */}
          <section>
            <h2 className="text-base font-semibold text-gray-700 mb-3">Historia wyników</h2>
            <div className="space-y-3">
              {filtered.map((result) => (
                <div key={result.id} className="bg-white rounded-2xl shadow-sm p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{result.assessment?.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(result.submittedAt).toLocaleDateString('pl-PL', {
                          day: 'numeric', month: 'long', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-2xl font-bold text-gray-800">{result.rawScore}</span>
                      <SeverityBadge severity={result.severity} />
                    </div>
                  </div>

                  {/* Score bar */}
                  <div className="mt-3">
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          severityColor[result.severity] ?? 'bg-blue-400'
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            result.normalizedScore != null
                              ? result.normalizedScore
                              : (result.rawScore / 27) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
