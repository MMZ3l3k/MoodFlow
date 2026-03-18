import { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';
import type { AssessmentResult } from '../types/assessment.types';
import SeverityBadge from '../components/SeverityBadge';

// ── Stałe ────────────────────────────────────────────────────────────────────

const MAX_RAW: Record<string, number> = {
  PHQ9: 27, GAD7: 21, PSS10: 40, WHO5: 25, MOOD10: 50, DAILY_MOOD: 5,
};

// Kolor linii per test na wykresie
const TEST_COLORS: Record<string, string> = {
  PHQ9:       '#ef4444',
  GAD7:       '#f97316',
  PSS10:      '#eab308',
  WHO5:       '#22c55e',
  MOOD10:     '#3b82f6',
  DAILY_MOOD: '#a855f7',
};
const FALLBACK_COLORS = ['#64748b', '#0ea5e9', '#ec4899', '#14b8a6'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getColor(code: string, idx: number) {
  return TEST_COLORS[code] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
}

function toNorm(r: AssessmentResult): number {
  if (r.normalizedScore != null && r.normalizedScore > 0) return Math.min(100, r.normalizedScore);
  const max = MAX_RAW[r.assessment?.code] ?? 100;
  return Math.min(100, Math.round((r.rawScore / max) * 100));
}

function isWithin30Days(dateStr: string) {
  const d = new Date(dateStr);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  return d >= cutoff;
}

// ── Komponent: karta ostatniego wyniku dla jednego testu ──────────────────────

function TestCard({ code, name, result, color }: {
  code: string; name: string; result: AssessmentResult; color: string;
}) {
  const max = MAX_RAW[code] ?? 100;
  const norm = toNorm(result);

  return (
    <div
      className="rounded-2xl p-4 overflow-hidden relative"
      style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(221,211,186,0.5)' }}
    >
      {/* Kolorowa belka po lewej */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
        style={{ background: color }}
      />
      <div className="pl-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-raisin truncate">{name}</p>
            <p className="text-xs text-raisin/40 mt-0.5">
              {new Date(result.submittedAt).toLocaleDateString('pl-PL', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-lg font-bold text-raisin">
              {result.rawScore}
              <span className="text-sm font-normal text-raisin/40">/{max}</span>
            </span>
            <SeverityBadge severity={result.severity} />
          </div>
        </div>
        {/* Pasek wizualny */}
        <div
          className="mt-3 h-1.5 rounded-full overflow-hidden"
          style={{ background: 'rgba(0,0,0,0.07)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${norm}%`, background: color }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Komponent: historia jednego testu (akordeon) ──────────────────────────────

function TestHistoryAccordion({ code, name, results, color }: {
  code: string; name: string; results: AssessmentResult[]; color: string;
}) {
  const [open, setOpen] = useState(false);
  const max = MAX_RAW[code] ?? 100;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(221,211,186,0.4)' }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
          <span className="text-sm font-semibold text-raisin">{name}</span>
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ background: `${color}18`, color }}
          >
            {results.length}×
          </span>
        </div>
        <svg
          className="w-4 h-4 text-raisin/40 transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : undefined }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
          {results.map((r, i) => {
            const norm = toNorm(r);
            return (
              <div
                key={r.id}
                className="px-4 py-3 flex items-center justify-between gap-3"
                style={{
                  borderTop: i > 0 ? '1px solid rgba(0,0,0,0.04)' : undefined,
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-raisin/50">
                    {new Date(r.submittedAt).toLocaleDateString('pl-PL', {
                      day: 'numeric', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                  <div className="mt-1.5 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.07)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${norm}%`, background: color }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-bold text-raisin">
                    {r.rawScore}
                    <span className="text-xs font-normal text-raisin/40">/{max}</span>
                  </span>
                  <SeverityBadge severity={r.severity} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Komponent: wieloliniowy wykres SVG ────────────────────────────────────────

interface ChartSeries {
  code: string;
  name: string;
  color: string;
  points: { date: string; norm: number }[];
}

const CW = 320, CH = 110;
const CP = { top: 10, right: 12, bottom: 26, left: 28 };

function MultiLineChart({ series }: { series: ChartSeries[] }) {
  const allPoints = series.flatMap((s) => s.points);
  if (allPoints.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-xs text-raisin/40">
        Brak danych z ostatnich 30 dni
      </div>
    );
  }

  const chartW = CW - CP.left - CP.right;
  const chartH = CH - CP.top - CP.bottom;

  // Zakres dat
  const allDates = allPoints.map((p) => new Date(p.date).getTime());
  const minDate = Math.min(...allDates);
  const maxDate = Math.max(...allDates);
  const dateRange = maxDate - minDate || 1;

  const toX = (date: string) =>
    CP.left + ((new Date(date).getTime() - minDate) / dateRange) * chartW;
  const toY = (v: number) =>
    CP.top + chartH - (Math.min(100, Math.max(0, v)) / 100) * chartH;

  // Etykiety osi Y
  const yTicks = [0, 25, 50, 75, 100];

  // Etykiety osi X — do 4 dat
  const uniqueDates = Array.from(new Set(allPoints.map((p) => p.date))).sort();
  const step = Math.max(1, Math.floor(uniqueDates.length / 3));
  const xLabels = uniqueDates.filter((_, i) => i === 0 || i === uniqueDates.length - 1 || i % step === 0);

  return (
    <div>
      <svg viewBox={`0 0 ${CW} ${CH}`} width="100%" style={{ overflow: 'visible' }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.code} id={`g_${s.code}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.12" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0.01" />
            </linearGradient>
          ))}
        </defs>

        {/* Siatka Y */}
        {yTicks.map((v) => {
          const y = toY(v);
          return (
            <g key={v}>
              <line
                x1={CP.left} y1={y} x2={CP.left + chartW} y2={y}
                stroke="rgba(0,0,0,0.07)" strokeWidth="0.8"
                strokeDasharray={v > 0 ? '3 3' : undefined}
              />
              <text x={CP.left - 4} y={y + 3.5} textAnchor="end"
                fontSize="7" fill="rgba(0,0,0,0.3)" fontFamily="sans-serif">{v}</text>
            </g>
          );
        })}

        {/* Etykiety osi X */}
        {xLabels.map((d) => (
          <text key={d} x={toX(d)} y={CH - 4}
            textAnchor="middle" fontSize="7" fill="rgba(0,0,0,0.35)" fontFamily="sans-serif">
            {new Date(d).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
          </text>
        ))}

        {/* Linie i punkty per seria */}
        {series.map((s) => {
          if (s.points.length === 0) return null;

          const pathD = s.points.map((p, i) => {
            const x = toX(p.date);
            const y = toY(p.norm);
            if (i === 0) return `M${x},${y}`;
            const prev = s.points[i - 1];
            const cx = (toX(prev.date) + x) / 2;
            return `C${cx},${toY(prev.norm)} ${cx},${y} ${x},${y}`;
          }).join(' ');

          const areaD = s.points.length > 1
            ? `${pathD} L${toX(s.points[s.points.length - 1].date)},${CP.top + chartH} L${toX(s.points[0].date)},${CP.top + chartH} Z`
            : '';

          return (
            <g key={s.code}>
              {areaD && <path d={areaD} fill={`url(#g_${s.code})`} />}
              <path d={pathD} fill="none" stroke={s.color} strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" />
              {s.points.map((p) => (
                <circle key={p.date} cx={toX(p.date)} cy={toY(p.norm)} r="2.5"
                  fill={s.color} />
              ))}
            </g>
          );
        })}
      </svg>

      {/* Legenda */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 px-1">
        {series.map((s) => (
          <div key={s.code} className="flex items-center gap-1.5">
            <div className="w-5 h-0.5 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="text-xs text-raisin/55">{s.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Główna strona ─────────────────────────────────────────────────────────────

export default function ResultsPage() {
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosClient
      .get<AssessmentResult[]>('/results')
      .then((r) => setResults(r.data))
      .finally(() => setLoading(false));
  }, []);

  // Grupuj po kodzie testu (posortowane malejąco po dacie)
  const byCode = new Map<string, { name: string; results: AssessmentResult[] }>();
  for (const r of results) {
    const code = r.assessment?.code ?? String(r.assessmentId);
    const name = r.assessment?.name ?? 'Test';
    if (!byCode.has(code)) byCode.set(code, { name, results: [] });
    byCode.get(code)!.results.push(r);
  }

  const testEntries = Array.from(byCode.entries()).map(([code, { name, results: rs }], idx) => ({
    code,
    name,
    color: getColor(code, idx),
    latest: rs[0],                              // DESC — pierwszy = najnowszy
    history30: rs.filter((r) => isWithin30Days(r.submittedAt)),
  }));

  // Statystyki
  const totalFilled = results.length;
  const typesCount = testEntries.length;
  const streak = (() => {
    if (results.length === 0) return 0;
    const days = Array.from(
      new Set(results.map((r) => new Date(r.submittedAt).toDateString()))
    ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    let s = 0;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (const d of days) {
      const dd = new Date(d); dd.setHours(0, 0, 0, 0);
      if (Math.round((today.getTime() - dd.getTime()) / 86400000) === s) s++;
      else break;
    }
    return s;
  })();

  // Dane dla wykresu — wyniki z 30 dni, znormalizowane
  const chartSeries: ChartSeries[] = testEntries
    .filter((t) => t.history30.length > 0)
    .map((t) => ({
      code: t.code,
      name: t.name,
      color: t.color,
      points: [...t.history30]
        .reverse()
        .map((r) => ({ date: r.submittedAt.slice(0, 10), norm: toNorm(r) })),
    }));

  // Czy jest jakakolwiek historia 30 dni
  const has30dHistory = testEntries.some((t) => t.history30.length > 0);

  return (
    <div className="space-y-5 animate-slide-up">

      <div>
        <h1 className="text-2xl font-bold text-raisin">Wyniki</h1>
        <p className="text-raisin/50 text-sm mt-0.5">Twoje wyniki i postępy</p>
      </div>

      {/* Skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(221,211,186,0.4)' }}>
              <div className="shimmer-bg h-4 rounded-lg w-1/2 mb-2.5" />
              <div className="shimmer-bg h-3 rounded-lg w-3/4 mb-1.5" />
              <div className="shimmer-bg h-2 rounded-full w-full mt-3" />
            </div>
          ))}
        </div>
      )}

      {/* Brak wyników */}
      {!loading && results.length === 0 && (
        <div
          className="rounded-2xl p-8 text-center"
          style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(221,211,186,0.5)' }}
        >
          <p className="text-4xl mb-3">📊</p>
          <p className="text-raisin/70 text-sm font-medium">Brak wyników</p>
          <p className="text-raisin/40 text-xs mt-1">Wypełnij pierwszy test, aby zobaczyć wyniki</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <>
          {/* ── Statystyki ── */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: totalFilled, label: 'testów' },
              { value: streak, label: 'dni z rzędu' },
              { value: typesCount, label: 'typów testów' },
            ].map(({ value, label }) => (
              <div
                key={label}
                className="rounded-2xl p-3 text-center"
                style={{ background: 'rgba(255,255,255,0.88)', border: '1px solid rgba(221,211,186,0.45)' }}
              >
                <p className="text-xl font-bold text-raisin">{value}</p>
                <p className="text-xs text-raisin/45 mt-0.5 leading-tight">{label}</p>
              </div>
            ))}
          </div>

          {/* ── Karty testów (ostatni wynik) ── */}
          <section>
            <h2 className="text-sm font-semibold text-raisin/60 uppercase tracking-wider mb-3">
              Ostatni wynik
            </h2>
            <div className="space-y-2.5">
              {testEntries.map((t) => (
                <TestCard
                  key={t.code}
                  code={t.code}
                  name={t.name}
                  result={t.latest}
                  color={t.color}
                />
              ))}
            </div>
          </section>

          {/* ── Historia (30 dni, akordeony) ── */}
          {has30dHistory && (
            <section>
              <h2 className="text-sm font-semibold text-raisin/60 uppercase tracking-wider mb-3">
                Historia — ostatnie 30 dni
              </h2>
              <div className="space-y-2">
                {testEntries
                  .filter((t) => t.history30.length > 0)
                  .map((t) => (
                    <TestHistoryAccordion
                      key={t.code}
                      code={t.code}
                      name={t.name}
                      results={t.history30}
                      color={t.color}
                    />
                  ))}
              </div>
            </section>
          )}

          {/* ── Wykres liniowy ── */}
          {chartSeries.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-raisin/60 uppercase tracking-wider mb-3">
                Wyniki w czasie (30 dni)
              </h2>
              <div
                className="rounded-2xl p-4"
                style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(221,211,186,0.5)' }}
              >
                <MultiLineChart series={chartSeries} />
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
