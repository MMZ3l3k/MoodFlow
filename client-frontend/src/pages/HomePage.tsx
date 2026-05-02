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

const W = 600;
const H = 180;
const PAD = { top: 16, right: 12, bottom: 28, left: 32 };

function indexColor(v: number) {
  if (v >= 80) return '#22c55e';
  if (v >= 60) return '#eab308';
  if (v >= 40) return '#f97316';
  return '#ef4444';
}

function WellbeingChart({ points }: { points: WellbeingHistoryPoint[] }) {
  if (points.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-sm text-raisin/40">
        <div className="text-3xl mb-2">📊</div>
        Brak danych z ostatnich 30 dni
      </div>
    );
  }

  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const minDate = new Date(points[0].date).getTime();
  const maxDate = new Date(points[points.length - 1].date).getTime();
  const dateRange = maxDate - minDate || 1;

  const toX = (date: string) => {
    const t = new Date(date).getTime();
    return PAD.left + ((t - minDate) / dateRange) * chartW;
  };
  const toY = (v: number) => PAD.top + chartH - (v / 100) * chartH;

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

  const areaD = pathD + ` L${toX(points[points.length - 1].date)},${PAD.top + chartH} L${toX(points[0].date)},${PAD.top + chartH} Z`;

  const refLines = [
    { val: 80, color: '#22c55e', label: '80' },
    { val: 60, color: '#eab308', label: '60' },
    { val: 40, color: '#f97316', label: '40' },
  ];

  const step = Math.max(1, Math.floor(points.length / 4));
  const xLabels = points.filter((_, i) => i === 0 || i === points.length - 1 || i % step === 0);

  const lastPoint = points[points.length - 1];
  const lastColor = indexColor(lastPoint.index);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="none" style={{ overflow: 'visible' }} aria-label="Wykres dobrostanu">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lastColor} stopOpacity="0.22" />
          <stop offset="100%" stopColor={lastColor} stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {refLines.map(({ val, color, label }) => {
        const y = toY(val);
        return (
          <g key={val}>
            <line x1={PAD.left} y1={y} x2={PAD.left + chartW} y2={y}
              stroke={color} strokeWidth="0.6" strokeDasharray="3 3" opacity="0.4" />
            <text x={PAD.left - 6} y={y + 3} textAnchor="end"
              fontSize="9" fill={color} opacity="0.7" fontFamily="sans-serif">{label}</text>
          </g>
        );
      })}

      <path d={areaD} fill="url(#areaGrad)" />
      <path d={pathD} fill="none" stroke={lastColor} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />

      {points.map((p, i) => {
        const x = toX(p.date);
        const y = toY(p.index);
        const c = indexColor(p.index);
        const isLast = i === points.length - 1;
        return (
          <g key={p.date}>
            <circle cx={x} cy={y} r={isLast ? 5 : 3} fill={c} />
            {isLast && <circle cx={x} cy={y} r={9} fill={c} opacity="0.18" />}
          </g>
        );
      })}

      <text x={toX(lastPoint.date)} y={toY(lastPoint.index) - 12}
        textAnchor="middle" fontSize="11" fontWeight="700" fill={lastColor} fontFamily="sans-serif">
        {lastPoint.index}
      </text>

      {xLabels.map((p) => (
        <text key={p.date + '_x'} x={toX(p.date)} y={H - 6}
          textAnchor="middle" fontSize="9" fill="rgba(46,33,28,0.4)" fontFamily="sans-serif">
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

function WellbeingHero({ data }: { data: WellbeingIndex | null }) {
  const [expanded, setExpanded] = useState(false);

  if (!data) {
    return (
      <div className="client-card p-5">
        <div className="shimmer-bg h-4 rounded-lg w-1/2 mb-2" />
        <div className="shimmer-bg h-8 rounded-lg w-2/3 mb-2" />
        <div className="shimmer-bg h-3 rounded-lg w-full" />
      </div>
    );
  }

  if (!data.hasEnoughData) {
    return (
      <div className="client-card p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(192,98,38,0.10)' }}
          >
            <svg className="w-6 h-6" style={{ color: '#C06226' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="stat-card-label">Indeks dobrostanu</p>
            <p className="text-base font-semibold text-raisin mt-1">Wypełnij pierwszy test</p>
            <p className="text-xs text-raisin/50 mt-1.5 leading-relaxed">
              Aby obliczyć Twój indeks, potrzebujemy wyniku jednego z testów: WHO-5, PHQ-9, GAD-7, PSS-10 lub MOOD10.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const arcDeg = Math.round((data.index / 100) * 180);

  return (
    <div className="client-card overflow-hidden">
      <div className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
          <div className="flex-1 min-w-0 w-full">
            <p className="stat-card-label">Indeks dobrostanu</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-5xl sm:text-6xl font-bold tracking-tight" style={{ color: data.color }}>
                {data.index}
              </span>
              <span className="text-xl text-raisin/35 font-medium">/100</span>
            </div>
            <div
              className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: `${data.color}18`, color: data.color }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: data.color }} />
              {data.label}
            </div>
            <p className="text-sm text-raisin/55 mt-3 leading-relaxed">{data.description}</p>
          </div>

          <div className="relative shrink-0 mx-auto sm:mx-0" style={{ width: 140, height: 80 }}>
            <svg viewBox="0 0 140 80" width="140" height="80">
              <path d="M10,72 A60,60 0 0,1 130,72" fill="none"
                stroke="rgba(46,33,28,0.07)" strokeWidth="12" strokeLinecap="round" />
              <path d="M10,72 A60,60 0 0,1 130,72" fill="none"
                stroke={data.color} strokeWidth="12" strokeLinecap="round"
                strokeDasharray={`${(arcDeg / 180) * 188.5} 188.5`} />
            </svg>
            <div
              className="absolute left-0 right-0 text-center font-bold"
              style={{ color: data.color, bottom: 4, fontSize: 18 }}
            >
              {data.index}
            </div>
          </div>
        </div>
      </div>

      {data.breakdown.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(46,33,28,0.06)' }}>
          <button
            onClick={() => setExpanded((e) => !e)}
            className="w-full flex items-center justify-between px-5 sm:px-6 py-3 text-xs font-semibold text-raisin/50 hover:text-raisin/75 transition-colors"
          >
            <span>Szczegóły · {data.breakdown.length} {data.breakdown.length === 1 ? 'test' : 'testy'}</span>
            <svg className="w-4 h-4 transition-transform duration-200"
              style={{ transform: expanded ? 'rotate(180deg)' : 'none' }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expanded && (
            <div className="px-5 sm:px-6 pb-5 space-y-3">
              {data.breakdown.map((item) => (
                <div key={item.code}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-raisin/70 font-medium">{item.label}</span>
                    <span className="text-xs font-bold text-raisin">
                      {item.contribution}<span className="text-raisin/40">/100</span>
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(46,33,28,0.07)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${item.contribution}%`,
                        background: indexColor(item.contribution),
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
      <span className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold whitespace-nowrap"
        style={{ background: 'rgba(152,70,25,0.12)', color: '#984619' }}>
        Wygasło
      </span>
    );
  }
  if (hoursLeft <= 3) {
    return (
      <span className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold whitespace-nowrap"
        style={{ background: 'rgba(192,98,38,0.12)', color: '#C06226' }}>
        Zostało {hoursLeft}h
      </span>
    );
  }
  return (
    <span className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold whitespace-nowrap"
      style={{ background: 'rgba(122,158,157,0.18)', color: '#5A8A89' }}>
      Zostało {hoursLeft}h
    </span>
  );
}

function StatCard({
  label, value, sub, icon, gradient, dotColor,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  gradient: string;
  dotColor: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-card-icon" style={{ background: gradient }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="stat-card-label">{label}</p>
        <p className="stat-card-value">{value}</p>
        {sub && (
          <p className="stat-card-sub">
            <span className="stat-card-dot" style={{ background: dotColor }} />
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="client-card p-4">
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
  const [completedTotal, setCompletedTotal] = useState(0);
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
          setCompletedTotal(resultsRes.value.data.length);
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
    <div className="space-y-6 sm:space-y-7 animate-slide-up">

      {/* ── Header ─────────────────────────────── */}
      <div className="client-page-header">
        <h1>
          {greeting}{user ? `, ${user.firstName}` : ''}
        </h1>
        <p className="first-letter:uppercase">
          {new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* ── Stats grid ─────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          label="Seria dni"
          value={streak}
          sub={streak === 1 ? 'dzień z rzędu' : 'dni z rzędu'}
          gradient="linear-gradient(135deg, rgba(192,98,38,0.14) 0%, rgba(152,70,25,0.08) 100%)"
          dotColor="#C06226"
          icon={
            <svg className="w-5 h-5" style={{ color: '#C06226' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.24 17 6.957 18.879 10.5 21 13.7 21 17a9 9 0 11-18 0c0-2.42.8-4.5 2-6.5" />
            </svg>
          }
        />
        <StatCard
          label="Do wykonania"
          value={loading ? '…' : activePending.length}
          sub="aktywnych testów"
          gradient="linear-gradient(135deg, rgba(156,184,183,0.22) 0%, rgba(122,158,157,0.10) 100%)"
          dotColor="#7A9E9D"
          icon={
            <svg className="w-5 h-5" style={{ color: '#5A8A89' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          }
        />
        <StatCard
          label="Wszystkie testy"
          value={loading ? '…' : completedTotal}
          sub="ukończonych łącznie"
          gradient="linear-gradient(135deg, rgba(234,180,100,0.20) 0%, rgba(192,144,32,0.10) 100%)"
          dotColor="#C09020"
          icon={
            <svg className="w-5 h-5" style={{ color: '#C09020' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          }
        />
      </div>

      {/* ── Wellbeing hero ─────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title">Mój dobrostan</h2>
          <button onClick={() => navigate('/app/results')} className="section-link">
            Wyniki
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        {wellbeingLoading ? (
          <div className="client-card p-5">
            <div className="shimmer-bg h-4 rounded-lg w-1/2 mb-3" />
            <div className="shimmer-bg h-10 rounded-lg w-2/3 mb-3" />
            <div className="shimmer-bg h-3 rounded-lg w-full" />
          </div>
        ) : (
          <WellbeingHero data={wellbeingIndex} />
        )}
      </section>

      {/* ── Active tests ───────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title">Testy do wykonania</h2>
          <button onClick={() => navigate('/app/tests')} className="section-link">
            Wszystkie
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {loading && (
          <div className="space-y-3">
            <SkeletonRow />
            <SkeletonRow />
          </div>
        )}

        {!loading && activePending.length === 0 && (
          <div className="client-card p-6 text-center">
            <div
              className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center"
              style={{ background: 'rgba(34,197,94,0.10)' }}
            >
              <svg className="w-6 h-6" style={{ color: '#16a34a' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-raisin font-semibold text-sm">Wszystko na bieżąco</p>
            <p className="text-raisin/45 text-xs mt-1">Brak testów do wykonania</p>
          </div>
        )}

        <div className="space-y-3">
          {activePending.map((item, i) => {
            const hoursLeft = getHoursRemaining(item.availableTo);
            return (
              <button
                key={item.id}
                onClick={() => navigate(`/app/take/${item.assessmentId}?assignmentId=${item.id}`)}
                className="w-full text-left client-card client-card-hover p-4 group ripple"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <h3 className="font-semibold text-raisin truncate group-hover:text-ruddy transition-colors">
                        {item.assessmentName}
                      </h3>
                      <DeadlineBadge hoursLeft={hoursLeft} />
                    </div>
                    <p className="text-xs text-raisin/55 line-clamp-1">{item.assessmentDescription}</p>
                    <p className="text-[11px] text-raisin/40 mt-1.5 flex items-center gap-1.5">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Do: {new Date(item.availableTo).toLocaleDateString('pl-PL', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 group-hover:scale-110"
                    style={{ background: 'rgba(192,98,38,0.10)', color: '#C06226' }}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Wellbeing chart ────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title">Dobrostan · ostatnie 30 dni</h2>
          <button onClick={() => navigate('/app/results')} className="section-link">
            Historia
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="client-card p-4 sm:p-5">
          {wellbeingLoading ? (
            <div className="space-y-2">
              <div className="shimmer-bg h-3 rounded w-1/3 mb-3" />
              <div className="shimmer-bg h-32 rounded-xl" />
            </div>
          ) : (
            <WellbeingChart points={wellbeingHistory} />
          )}
        </div>
      </section>
    </div>
  );
}
