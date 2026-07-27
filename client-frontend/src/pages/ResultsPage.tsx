import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import type { AssessmentResult } from '../types/assessment.types';
import SeverityBadge from '../components/SeverityBadge';

const MAX_RAW: Record<string, number> = {
  PHQ9: 27, GAD7: 21, PSS10: 40, WHO5: 25, MOOD10: 50, DAILY_MOOD: 5,
};

const TEST_COLORS: Record<string, string> = {
  PHQ9: '#ef4444',
  GAD7: '#f97316',
  PSS10: '#eab308',
  WHO5: '#22c55e',
  MOOD10: '#3b82f6',
  DAILY_MOOD: '#a855f7',
};
const FALLBACK_COLORS = ['#64748b', '#0ea5e9', '#ec4899', '#14b8a6'];

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

function TestCard({ code, name, result, color }: {
  code: string; name: string; result: AssessmentResult; color: string;
}) {
  const max = MAX_RAW[code] ?? 100;
  const norm = toNorm(result);

  return (
    <div className="client-card overflow-hidden relative p-4 sm:p-5">
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ background: color, borderTopLeftRadius: 18, borderBottomLeftRadius: 18 }}
      />
      <div className="pl-3 sm:pl-4">
        <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-raisin truncate">{name}</p>
            <p className="text-xs text-raisin/45 mt-0.5">
              {new Date(result.submittedAt).toLocaleDateString('pl-PL', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xl font-bold text-raisin">
              {result.rawScore}
              <span className="text-sm font-normal text-raisin/40">/{max}</span>
            </span>
            <SeverityBadge severity={result.severity} />
          </div>
        </div>
        <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(46,33,28,0.07)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${norm}%`, background: color }}
          />
        </div>
      </div>
    </div>
  );
}

function TestHistoryAccordion({ code, name, results, color }: {
  code: string; name: string; results: AssessmentResult[]; color: string;
}) {
  const [open, setOpen] = useState(false);
  const max = MAX_RAW[code] ?? 100;

  return (
    <div className="client-card overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 sm:px-5 py-3.5 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
            <div className="w-2 h-2 rounded-full" style={{ background: color }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-raisin">{name}</p>
            <p className="text-[11px] text-raisin/45 mt-0.5">{results.length} {results.length === 1 ? 'wynik' : 'wyników'}</p>
          </div>
        </div>
        <svg
          className="w-4 h-4 text-raisin/45 transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : undefined }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid rgba(46,33,28,0.06)' }}>
          {results.map((r, i) => {
            const norm = toNorm(r);
            return (
              <div
                key={r.id}
                className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3"
                style={{ borderTop: i > 0 ? '1px solid rgba(46,33,28,0.04)' : undefined }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-raisin/55 font-medium">
                    {new Date(r.submittedAt).toLocaleDateString('pl-PL', {
                      day: 'numeric', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                  <div className="mt-1.5 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(46,33,28,0.07)' }}>
                    <div className="h-full rounded-full" style={{ width: `${norm}%`, background: color }} />
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

interface ChartSeries {
  code: string;
  name: string;
  color: string;
  points: { date: string; norm: number }[];
}

const CW = 600, CH = 220;
const CP = { top: 16, right: 12, bottom: 32, left: 32 };

function MultiLineChart({ series }: { series: ChartSeries[] }) {
  const allPoints = series.flatMap((s) => s.points);
  if (allPoints.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-sm text-raisin/40">
        <div className="text-3xl mb-2">📊</div>
        Brak danych z ostatnich 30 dni
      </div>
    );
  }

  const chartW = CW - CP.left - CP.right;
  const chartH = CH - CP.top - CP.bottom;

  const allDates = allPoints.map((p) => new Date(p.date).getTime());
  const minDate = Math.min(...allDates);
  const maxDate = Math.max(...allDates);
  const dateRange = maxDate - minDate || 1;

  const toX = (date: string) => CP.left + ((new Date(date).getTime() - minDate) / dateRange) * chartW;
  const toY = (v: number) => CP.top + chartH - (Math.min(100, Math.max(0, v)) / 100) * chartH;

  const yTicks = [0, 25, 50, 75, 100];
  const uniqueDates = Array.from(new Set(allPoints.map((p) => p.date))).sort();
  const step = Math.max(1, Math.floor(uniqueDates.length / 4));
  const xLabels = uniqueDates.filter((_, i) => i === 0 || i === uniqueDates.length - 1 || i % step === 0);

  return (
    <div>
      <svg viewBox={`0 0 ${CW} ${CH}`} width="100%" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.code} id={`g_${s.code}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.18" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0.01" />
            </linearGradient>
          ))}
        </defs>

        {yTicks.map((v) => {
          const y = toY(v);
          return (
            <g key={v}>
              <line x1={CP.left} y1={y} x2={CP.left + chartW} y2={y}
                stroke="rgba(46,33,28,0.08)" strokeWidth="0.8"
                strokeDasharray={v > 0 ? '3 3' : undefined} />
              <text x={CP.left - 6} y={y + 3} textAnchor="end"
                fontSize="9" fill="rgba(46,33,28,0.4)" fontFamily="sans-serif">{v}</text>
            </g>
          );
        })}

        {xLabels.map((d) => (
          <text key={d} x={toX(d)} y={CH - 8}
            textAnchor="middle" fontSize="9" fill="rgba(46,33,28,0.4)" fontFamily="sans-serif">
            {new Date(d).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
          </text>
        ))}

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
              <path d={pathD} fill="none" stroke={s.color} strokeWidth="2.4"
                strokeLinecap="round" strokeLinejoin="round" />
              {s.points.map((p) => (
                <circle key={p.date} cx={toX(p.date)} cy={toY(p.norm)} r="3" fill={s.color} />
              ))}
            </g>
          );
        })}
      </svg>

      <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 px-1">
        {series.map((s) => (
          <div key={s.code} className="flex items-center gap-2">
            <div className="w-6 h-1 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="text-xs text-raisin/65 font-medium">{s.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ResultsPage() {
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosClient
      .get<AssessmentResult[]>('/results')
      .then((r) => setResults(r.data))
      .finally(() => setLoading(false));
  }, []);

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
    latest: rs[0],
    history30: rs.filter((r) => isWithin30Days(r.submittedAt)),
  }));

  const totalFilled = results.length;
  const typesCount = testEntries.length;
  const streak = (() => {
    if (results.length === 0) return 0;
    const days = Array.from(new Set(results.map((r) => new Date(r.submittedAt).toDateString())))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    let s = 0;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (const d of days) {
      const dd = new Date(d); dd.setHours(0, 0, 0, 0);
      if (Math.round((today.getTime() - dd.getTime()) / 86400000) === s) s++;
      else break;
    }
    return s;
  })();

  const chartSeries: ChartSeries[] = testEntries
    .filter((t) => t.history30.length > 0)
    .map((t) => ({
      code: t.code,
      name: t.name,
      color: t.color,
      points: [...t.history30].reverse().map((r) => ({ date: r.submittedAt.slice(0, 10), norm: toNorm(r) })),
    }));

  const has30dHistory = testEntries.some((t) => t.history30.length > 0);

  return (
    <div className="space-y-6 sm:space-y-7 animate-slide-up">

      <div className="client-page-header">
        <h1>Wyniki</h1>
        <p>Twoje wyniki testów i postępy w czasie</p>
      </div>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="client-card p-4">
              <div className="shimmer-bg h-4 rounded-lg w-1/2 mb-2.5" />
              <div className="shimmer-bg h-3 rounded-lg w-3/4 mb-2" />
              <div className="shimmer-bg h-2 rounded-full w-full mt-3" />
            </div>
          ))}
        </div>
      )}

      {!loading && results.length === 0 && (
        <div className="client-card p-8 text-center">
          <div
            className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
            style={{ background: 'rgba(192,98,38,0.10)' }}
          >
            <svg className="w-7 h-7" style={{ color: '#C06226' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-raisin font-semibold text-sm">Brak wyników</p>
          <p className="text-raisin/45 text-xs mt-1">Nie wypełniono jeszcze żadnego testu</p>
          {/* PU-4, ścieżka 2a: pusty stan proponuje przejście do widoku „Testy" */}
          <Link to="/app/tests" className="btn-client-primary inline-flex mt-4 text-sm">
            Przejdź do testów
          </Link>
        </div>
      )}

      {!loading && results.length > 0 && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="stat-card">
              <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, rgba(192,98,38,0.14) 0%, rgba(152,70,25,0.08) 100%)' }}>
                <svg className="w-5 h-5" style={{ color: '#C06226' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="stat-card-label">Wypełnione</p>
                <p className="stat-card-value">{totalFilled}</p>
                <p className="stat-card-sub"><span className="stat-card-dot" style={{ background: '#C06226' }} />łącznie testów</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, rgba(234,180,100,0.20) 0%, rgba(192,144,32,0.10) 100%)' }}>
                <svg className="w-5 h-5" style={{ color: '#C09020' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.24 17 6.957 18.879 10.5 21 13.7 21 17a9 9 0 11-18 0c0-2.42.8-4.5 2-6.5" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="stat-card-label">Seria</p>
                <p className="stat-card-value">{streak}</p>
                <p className="stat-card-sub"><span className="stat-card-dot" style={{ background: '#C09020' }} />{streak === 1 ? 'dzień z rzędu' : 'dni z rzędu'}</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, rgba(156,184,183,0.22) 0%, rgba(122,158,157,0.10) 100%)' }}>
                <svg className="w-5 h-5" style={{ color: '#5A8A89' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="stat-card-label">Typy testów</p>
                <p className="stat-card-value">{typesCount}</p>
                <p className="stat-card-sub"><span className="stat-card-dot" style={{ background: '#5A8A89' }} />różnych testów</p>
              </div>
            </div>
          </div>

          {/* Latest results */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title">Ostatni wynik</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {testEntries.map((t) => (
                <TestCard key={t.code} code={t.code} name={t.name} result={t.latest} color={t.color} />
              ))}
            </div>
          </section>

          {/* History */}
          {has30dHistory && (
            <section>
              <h2 className="section-title mb-3">Historia · ostatnie 30 dni</h2>
              <div className="space-y-2.5">
                {testEntries.filter((t) => t.history30.length > 0).map((t) => (
                  <TestHistoryAccordion key={t.code} code={t.code} name={t.name} results={t.history30} color={t.color} />
                ))}
              </div>
            </section>
          )}

          {/* Chart */}
          {chartSeries.length > 0 && (
            <section>
              <h2 className="section-title mb-3">Wyniki w czasie · 30 dni</h2>
              <div className="client-card p-4 sm:p-5">
                <MultiLineChart series={chartSeries} />
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
