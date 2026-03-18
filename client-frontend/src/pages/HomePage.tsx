import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../store/store';
import { fetchMe } from '../store/slices/authSlice';
import { useAuth } from '../hooks/useAuth';
import axiosClient from '../api/axiosClient';
import type { AssessmentResult } from '../types/assessment.types';

interface WellbeingHistoryPoint {
  date: string;
  index: number;
  color: string;
}

// ── Wykres liniowy dobrostanu (SVG) ──────────────────────────────────────────
const W = 300;
const H = 90;
const PAD = { top: 8, right: 8, bottom: 24, left: 28 };

function indexColor(v: number) {
  if (v >= 80) return '#22c55e';
  if (v >= 60) return '#eab308';
  if (v >= 40) return '#f97316';
  return '#ef4444';
}

function WellbeingChart({ points }: { points: WellbeingHistoryPoint[] }) {
  if (points.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-xs text-raisin/40">
        Brak danych z ostatnich 30 dni
      </div>
    );
  }

  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  // Mapowanie daty na oś X (równomierne rozłożenie)
  const minDate = new Date(points[0].date).getTime();
  const maxDate = new Date(points[points.length - 1].date).getTime();
  const dateRange = maxDate - minDate || 1;

  const toX = (date: string) => {
    const t = new Date(date).getTime();
    return PAD.left + ((t - minDate) / dateRange) * chartW;
  };
  const toY = (v: number) => PAD.top + chartH - (v / 100) * chartH;

  // Płynna ścieżka (cubic bezier)
  const pathD = points.map((p, i) => {
    const x = toX(p.date);
    const y = toY(p.index);
    if (i === 0) return `M${x},${y}`;
    const prev = points[i - 1];
    const px = toX(prev.date);
    const py = toY(prev.index);
    const cx = (px + x) / 2;
    return `C${cx},${py} ${cx},${y} ${x},${y}`;
  }).join(' ');

  // Obszar pod krzywą (gradient fill)
  const areaD = pathD + ` L${toX(points[points.length - 1].date)},${PAD.top + chartH} L${toX(points[0].date)},${PAD.top + chartH} Z`;

  // Poziome linie referencyjne (40, 60, 80)
  const refLines = [
    { val: 80, color: '#22c55e', label: '80' },
    { val: 60, color: '#eab308', label: '60' },
    { val: 40, color: '#f97316', label: '40' },
  ];

  // Etykiety osi X — max 4 daty
  const step = Math.max(1, Math.floor(points.length / 4));
  const xLabels = points.filter((_, i) => i === 0 || i === points.length - 1 || i % step === 0);

  const lastPoint = points[points.length - 1];
  const lastColor = indexColor(lastPoint.index);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ overflow: 'visible' }}
      aria-label="Wykres dobrostanu"
    >
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lastColor} stopOpacity="0.18" />
          <stop offset="100%" stopColor={lastColor} stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {/* Linie referencyjne */}
      {refLines.map(({ val, color, label }) => {
        const y = toY(val);
        return (
          <g key={val}>
            <line
              x1={PAD.left} y1={y} x2={PAD.left + chartW} y2={y}
              stroke={color} strokeWidth="0.5" strokeDasharray="3 3" opacity="0.45"
            />
            <text x={PAD.left - 4} y={y + 3.5} textAnchor="end"
              fontSize="7" fill={color} opacity="0.7" fontFamily="sans-serif">
              {label}
            </text>
          </g>
        );
      })}

      {/* Obszar pod krzywą */}
      <path d={areaD} fill="url(#areaGrad)" />

      {/* Linia wykresu */}
      <path d={pathD} fill="none" stroke={lastColor} strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" />

      {/* Punkty danych */}
      {points.map((p, i) => {
        const x = toX(p.date);
        const y = toY(p.index);
        const c = indexColor(p.index);
        const isLast = i === points.length - 1;
        return (
          <g key={p.date}>
            <circle cx={x} cy={y} r={isLast ? 4 : 2.5} fill={c} />
            {isLast && <circle cx={x} cy={y} r={7} fill={c} opacity="0.15" />}
          </g>
        );
      })}

      {/* Etykieta ostatniego punktu */}
      <text
        x={toX(lastPoint.date)} y={toY(lastPoint.index) - 9}
        textAnchor="middle" fontSize="9" fontWeight="700"
        fill={lastColor} fontFamily="sans-serif"
      >
        {lastPoint.index}
      </text>

      {/* Etykiety osi X */}
      {xLabels.map((p) => (
        <text key={p.date + '_x'} x={toX(p.date)} y={H - 4}
          textAnchor="middle" fontSize="7" fill="rgba(0,0,0,0.35)" fontFamily="sans-serif">
          {new Date(p.date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
        </text>
      ))}
    </svg>
  );
}

interface WellbeingBreakdownItem {
  code: string;
  label: string;
  contribution: number;
  weight: number;
  lastDate: string;
}

interface WellbeingIndex {
  index: number;
  level: 'high' | 'moderate' | 'low' | 'critical';
  label: string;
  description: string;
  color: string;
  breakdown: WellbeingBreakdownItem[];
  hasEnoughData: boolean;
}

const LEVEL_EMOJI: Record<string, string> = {
  high: '🟢',
  moderate: '🟡',
  low: '🟠',
  critical: '🔴',
};

function WellbeingIndexCard({ data }: { data: WellbeingIndex | null }) {
  const [expanded, setExpanded] = useState(false);

  if (!data) {
    return (
      <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(221,211,186,0.5)' }}>
        <div className="shimmer-bg h-4 rounded-lg w-1/2 mb-2" />
        <div className="shimmer-bg h-3 rounded-lg w-full mb-1" />
        <div className="shimmer-bg h-3 rounded-lg w-3/4" />
      </div>
    );
  }

  if (!data.hasEnoughData) {
    return (
      <div
        className="rounded-2xl p-4"
        style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(221,211,186,0.5)' }}
      >
        <p className="text-sm font-semibold text-raisin mb-1">Indeks dobrostanu</p>
        <p className="text-xs text-raisin/50">
          Wypełnij przynajmniej jeden test (WHO-5, PHQ-9, GAD-7, PSS-10 lub MOOD10), aby zobaczyć swój indeks.
        </p>
      </div>
    );
  }

  const arcDeg = Math.round((data.index / 100) * 180);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.92)', border: `1px solid ${data.color}30` }}
    >
      {/* Główna sekcja */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="text-xs font-semibold text-raisin/50 uppercase tracking-wider mb-1">
              Indeks dobrostanu
            </p>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-4xl font-bold" style={{ color: data.color }}>{data.index}</span>
              <span className="text-lg text-raisin/40 font-medium">/100</span>
            </div>
            <p className="text-sm font-semibold text-raisin">
              {LEVEL_EMOJI[data.level]} {data.label}
            </p>
          </div>

          {/* Półkołowy wskaźnik */}
          <div className="relative shrink-0" style={{ width: 72, height: 40 }}>
            <svg viewBox="0 0 72 40" width="72" height="40">
              {/* Tło łuku */}
              <path
                d="M6,36 A30,30 0 0,1 66,36"
                fill="none"
                stroke="rgba(0,0,0,0.07)"
                strokeWidth="7"
                strokeLinecap="round"
              />
              {/* Aktywny łuk */}
              <path
                d="M6,36 A30,30 0 0,1 66,36"
                fill="none"
                stroke={data.color}
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={`${(arcDeg / 180) * 94.25} 94.25`}
              />
            </svg>
            <div
              className="absolute bottom-0 left-0 right-0 text-center text-xs font-bold"
              style={{ color: data.color }}
            >
              {data.index}
            </div>
          </div>
        </div>

        <p className="text-xs text-raisin/55 mt-2.5 leading-relaxed">{data.description}</p>
      </div>

      {/* Rozkład per test */}
      {data.breakdown.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          <button
            onClick={() => setExpanded((e) => !e)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-raisin/50 hover:text-raisin/70 transition-colors"
          >
            <span>Szczegóły (na podstawie {data.breakdown.length} {data.breakdown.length === 1 ? 'testu' : 'testów'})</span>
            <svg
              className="w-4 h-4 transition-transform duration-200"
              style={{ transform: expanded ? 'rotate(180deg)' : 'none' }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expanded && (
            <div className="px-4 pb-4 space-y-2.5">
              {data.breakdown.map((item) => (
                <div key={item.code}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-raisin/70 font-medium">{item.label}</span>
                    <span className="text-xs font-bold text-raisin">{item.contribution}<span className="text-raisin/40">/100</span></span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.07)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${item.contribution}%`,
                        background: item.contribution >= 80 ? '#22c55e'
                          : item.contribution >= 60 ? '#eab308'
                          : item.contribution >= 40 ? '#f97316'
                          : '#ef4444',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface AssignedAssessment {
  id: number;
  assessmentId: number;
  assessmentName: string;
  assessmentCode: string;
  assessmentDescription: string;
  availableFrom: string;
  availableTo: string;
  completedAt: string | null;
}

function getHoursRemaining(availableTo: string): number {
  const diff = new Date(availableTo).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60)));
}

function DeadlineBadge({ hoursLeft }: { hoursLeft: number }) {
  if (hoursLeft === 0) {
    return (
      <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold"
        style={{ background: 'rgba(152,70,25,0.12)', color: '#984619' }}>
        Wygasło
      </span>
    );
  }
  if (hoursLeft <= 3) {
    return (
      <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold"
        style={{ background: 'rgba(192,98,38,0.12)', color: '#C06226' }}>
        Zostało {hoursLeft}h
      </span>
    );
  }
  return (
    <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold"
      style={{ background: 'rgba(156,184,183,0.2)', color: '#5A8A89' }}>
      Zostało {hoursLeft}h
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(221,211,186,0.5)' }}>
      <div className="shimmer-bg h-4 rounded-lg w-2/3 mb-2.5" />
      <div className="shimmer-bg h-3 rounded-lg w-full mb-1.5" />
      <div className="shimmer-bg h-3 rounded-lg w-1/2" />
    </div>
  );
}

export default function HomePage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [assigned, setAssigned] = useState<AssignedAssessment[]>([]);
  const [wellbeingIndex, setWellbeingIndex] = useState<WellbeingIndex | null>(null);
  const [wellbeingHistory, setWellbeingHistory] = useState<WellbeingHistoryPoint[]>([]);
  const [wellbeingLoading, setWellbeingLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) dispatch(fetchMe());
  }, [dispatch, user]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [assignedRes, resultsRes, wellbeingRes, historyRes] = await Promise.allSettled([
          axiosClient.get<AssignedAssessment[]>('/assessments/assigned'),
          axiosClient.get<AssessmentResult[]>('/results'),
          axiosClient.get<WellbeingIndex>('/results/wellbeing-index'),
          axiosClient.get<WellbeingHistoryPoint[]>('/results/wellbeing-history'),
        ]);
        if (assignedRes.status === 'fulfilled') setAssigned(assignedRes.value.data);
        if (resultsRes.status === 'fulfilled') {
          setStreak(calculateStreak(resultsRes.value.data));
        }
        if (wellbeingRes.status === 'fulfilled') setWellbeingIndex(wellbeingRes.value.data);
        if (historyRes.status === 'fulfilled') setWellbeingHistory(historyRes.value.data);
      } finally {
        setLoading(false);
        setWellbeingLoading(false);
      }
    };
    fetchData();
  }, []);

  function calculateStreak(results: AssessmentResult[]): number {
    if (results.length === 0) return 0;
    const uniqueDays = Array.from(
      new Set(results.map((r) => new Date(r.submittedAt).toDateString()))
    ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    let s = 0;
    const current = new Date();
    current.setHours(0, 0, 0, 0);

    for (const day of uniqueDays) {
      const d = new Date(day);
      d.setHours(0, 0, 0, 0);
      const diff = Math.round((current.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      if (diff === s) s++;
      else break;
    }
    return s;
  }

  const activePending = assigned.filter(
    (a) => !a.completedAt && getHoursRemaining(a.availableTo) > 0
  );

  const greetingHour = new Date().getHours();
  const greeting =
    greetingHour < 12 ? 'Dzień dobry' : greetingHour < 18 ? 'Witaj' : 'Dobry wieczór';

  return (
    <div className="space-y-6 animate-slide-up">

      {/* ── Greeting ──────────────────────────── */}
      <div className="pt-1">
        <h1 className="text-2xl font-bold text-raisin">
          {greeting}{user ? `, ${user.firstName}` : ''}!
        </h1>
        <p className="text-raisin/50 text-sm mt-0.5">
          {new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* ── Stats row ─────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">

        {/* Streak card */}
        <div
          className="rounded-2xl p-4 flex items-center gap-3"
          style={{
            background: 'linear-gradient(135deg, rgba(192,98,38,0.08) 0%, rgba(152,70,25,0.05) 100%)',
            border: '1px solid rgba(192,98,38,0.15)',
          }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
            style={{ background: 'rgba(192,98,38,0.12)' }}
          >
            🔥
          </div>
          <div>
            <p className="text-2xl font-bold text-raisin">{streak}</p>
            <p className="text-xs text-raisin/50 leading-tight">dni z rzędu</p>
          </div>
        </div>

        {/* Pending tests card */}
        <div
          className="rounded-2xl p-4 flex items-center gap-3"
          style={{
            background: 'linear-gradient(135deg, rgba(156,184,183,0.12) 0%, rgba(122,158,157,0.06) 100%)',
            border: '1px solid rgba(156,184,183,0.25)',
          }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
            style={{ background: 'rgba(156,184,183,0.15)' }}
          >
            📋
          </div>
          <div>
            <p className="text-2xl font-bold text-raisin">{loading ? '…' : activePending.length}</p>
            <p className="text-xs text-raisin/50 leading-tight">testów do zrobienia</p>
          </div>
        </div>
      </div>

      {/* ── Wellbeing Index ───────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-raisin/60 uppercase tracking-wider mb-3">
          Mój dobrostan
        </h2>
        {wellbeingLoading ? (
          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(221,211,186,0.5)' }}>
            <div className="shimmer-bg h-4 rounded-lg w-1/2 mb-2" />
            <div className="shimmer-bg h-3 rounded-lg w-full mb-1" />
            <div className="shimmer-bg h-3 rounded-lg w-3/4" />
          </div>
        ) : (
          <WellbeingIndexCard data={wellbeingIndex} />
        )}
      </section>

      {/* ── Active tests ──────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-raisin/60 uppercase tracking-wider mb-3">
          Testy do wykonania
        </h2>

        {loading && (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {!loading && activePending.length === 0 && (
          <div
            className="rounded-2xl p-6 text-center"
            style={{
              background: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(221,211,186,0.5)',
            }}
          >
            <div className="text-4xl mb-3">✅</div>
            <p className="text-raisin/70 text-sm font-medium">Brak testów do wykonania</p>
            <p className="text-raisin/40 text-xs mt-1">Wszystko na bieżąco!</p>
          </div>
        )}

        <div className="space-y-3">
          {activePending.map((item, i) => {
            const hoursLeft = getHoursRemaining(item.availableTo);
            return (
              <button
                key={item.id}
                onClick={() => navigate(`/app/take/${item.assessmentId}?assignmentId=${item.id}`)}
                className="w-full text-left rounded-2xl p-4 group ripple transition-all duration-200 hover:shadow-warm-md active:scale-[0.99]"
                style={{
                  background: 'rgba(255,255,255,0.9)',
                  border: '1px solid rgba(221,211,186,0.6)',
                  animationDelay: `${i * 60}ms`,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <h3 className="font-semibold text-raisin group-hover:text-ruddy transition-colors truncate">
                        {item.assessmentName}
                      </h3>
                      <DeadlineBadge hoursLeft={hoursLeft} />
                    </div>
                    <p className="text-xs text-raisin/50 line-clamp-1">{item.assessmentDescription}</p>
                    <p className="text-xs text-raisin/35 mt-1.5 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Do: {new Date(item.availableTo).toLocaleDateString('pl-PL', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-all duration-200 group-hover:scale-110"
                    style={{ background: 'rgba(192,98,38,0.1)', color: '#C06226' }}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Wellbeing history chart ────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-raisin/60 uppercase tracking-wider">
            Dobrostan — ostatnie 30 dni
          </h2>
          <button
            onClick={() => navigate('/app/results')}
            className="text-xs font-semibold transition-colors flex items-center gap-1"
            style={{ color: '#C06226' }}
          >
            Historia
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div
          className="rounded-2xl p-4"
          style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(221,211,186,0.5)' }}
        >
          {wellbeingLoading ? (
            <div className="space-y-2">
              <div className="shimmer-bg h-3 rounded w-1/3 mb-3" />
              <div className="shimmer-bg h-20 rounded-xl" />
            </div>
          ) : (
            <WellbeingChart points={wellbeingHistory} />
          )}
        </div>
      </section>
    </div>
  );
}
