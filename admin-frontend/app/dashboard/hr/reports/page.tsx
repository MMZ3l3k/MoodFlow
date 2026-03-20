'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';
import axiosClient from '../../../../lib/axiosClient';
import { getAccessToken } from '../../../../lib/auth';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Summary {
  totalActiveUsers: number;
  totalResultsSubmitted: number;
  avgNormalizedScore: number;
  participationRate: number;
}

interface DeptLoad {
  department: string;
  deptSize: number;
  participants: number;
  wellbeingIndex: number | null;
  load: 'stable' | 'moderate' | 'high' | 'no_data';
  trend: 'improving' | 'worsening' | 'stable' | 'no_data';
  color: string;
}

interface TrendPoint {
  week: string;
  avgScore: number;
  count: number;
  assessmentCode: string;
}

interface RiskItem {
  key: string;
  label: string;
  icon: string;
  assessmentCode: string;
  currentCount: number;
  previousCount: number;
  currentPct: number;
  previousPct: number;
  delta: number;
}

interface RiskReport {
  totalActive: number;
  risks: RiskItem[];
}

interface CriticalChange {
  department: string;
  recentIndex: number;
  prevIndex: number;
  drop: number;
  direction: 'worsening' | 'improving';
  severity: 'critical' | 'warning';
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TABS = [
  { id: 'general', label: 'Raport ogólny' },
  { id: 'departments', label: 'Per dział' },
  { id: 'trends', label: 'Trendy' },
  { id: 'risks', label: 'Ryzyka' },
  { id: 'critical', label: 'Zmiany krytyczne' },
] as const;

type TabId = typeof TABS[number]['id'];

const ZONE_COLORS: Record<string, string> = {
  stable: '#22c55e',
  moderate: '#f59e0b',
  high: '#ef4444',
  no_data: '#94a3b8',
};

const ZONE_LABELS: Record<string, string> = {
  stable: 'Dobry',
  moderate: 'Umiarkowany',
  high: 'Wysoki risk',
  no_data: 'Brak danych',
};

const RISK_COLORS: Record<string, string> = {
  stress: '#f97316',
  depression: '#8b5cf6',
  anxiety: '#3b82f6',
  burnout: '#ef4444',
};

const RISK_BG: Record<string, string> = {
  stress: 'bg-orange-50 border-orange-200',
  depression: 'bg-purple-50 border-purple-200',
  anxiety: 'bg-blue-50 border-blue-200',
  burnout: 'bg-red-50 border-red-200',
};

const RISK_TEXT: Record<string, string> = {
  stress: 'text-orange-700',
  depression: 'text-purple-700',
  anxiety: 'text-blue-700',
  burnout: 'text-red-700',
};

const RISK_ICONS: Record<string, string> = {
  stress: '😰',
  depression: '😔',
  anxiety: '😟',
  burnout: '🔥',
};

const RISK_DETAILS: Record<string, { test: string; threshold: string; what: string; action: string }> = {
  stress: {
    test: 'PSS-10 (Perceived Stress Scale)',
    threshold: 'Wynik ≥ 27 / 40 punktów',
    what: 'Pracownik odczuwa wysoki poziom stresu i poczucia braku kontroli nad codziennymi sytuacjami.',
    action: 'Rozważ rozmowę z działem, wdrożenie warsztatów redukcji stresu lub wsparcie menedżerskie.',
  },
  depression: {
    test: 'PHQ-9 (Patient Health Questionnaire)',
    threshold: 'Wynik ≥ 10 / 27 punktów (poziom umiarkowany lub wyższy)',
    what: 'Pracownik może wykazywać objawy obniżonego nastroju, braku energii lub problemów z koncentracją.',
    action: 'Zalecane ostrożne podejście HR — skierowanie do specjalisty lub programu wsparcia EAP.',
  },
  anxiety: {
    test: 'GAD-7 (Generalized Anxiety Disorder)',
    threshold: 'Wynik ≥ 10 / 21 punktów (poziom umiarkowany lub wyższy)',
    what: 'Pracownik może doświadczać trudności z niepokojem, napięciem i problemami z relaksacją.',
    action: 'Warto monitorować obciążenie zadaniami, terminami i presją w danym zespole.',
  },
  burnout: {
    test: 'MOOD-10 (Mood Assessment)',
    threshold: 'Wynik ≤ 30 / 50 punktów (niski nastrój)',
    what: 'Niski poziom nastroju i energii — możliwy sygnał wczesnego wypalenia zawodowego.',
    action: 'Sprawdź obciążenie pracą i balans praca-życie w danym dziale.',
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-block ml-1 cursor-help">
      <span className="w-4 h-4 rounded-full bg-gray-200 text-gray-500 text-xs font-bold inline-flex items-center justify-center leading-none select-none">?</span>
      <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
        {text}
        <span className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-gray-800" />
      </span>
    </span>
  );
}

function SectionInfo({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-700">
      <span className="mt-0.5 shrink-0">ℹ️</span>
      <span>{children}</span>
    </div>
  );
}

function DeltaBadge({ delta }: { delta: number }) {
  if (delta === 0) return <span className="text-xs text-gray-400">bez zmian</span>;
  const up = delta > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${up ? 'text-red-600' : 'text-emerald-600'}`}>
      {up ? '↑' : '↓'} {up ? '+' : ''}{delta}%
    </span>
  );
}

function WellbeingBar({ index }: { index: number | null }) {
  if (index === null) return <span className="text-gray-400 text-sm">—</span>;
  const color = index >= 65 ? 'bg-emerald-500' : index >= 45 ? 'bg-amber-400' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${index}%` }} />
      </div>
      <span className="text-sm font-semibold text-gray-700 w-8 text-right">{index}</span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function HrReportsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('general');

  // Data states
  const [summary, setSummary] = useState<Summary | null>(null);
  const [deptLoad, setDeptLoad] = useState<DeptLoad[]>([]);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [riskReport, setRiskReport] = useState<RiskReport | null>(null);
  const [criticalChanges, setCriticalChanges] = useState<CriticalChange[]>([]);
  const [trendDays, setTrendDays] = useState<7 | 30 | 90>(30);
  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingTrends, setLoadingTrends] = useState(false);

  const fetchTrends = useCallback(async (days: number) => {
    setLoadingTrends(true);
    try {
      const res = await axiosClient.get<TrendPoint[]>(`/analytics/trends?days=${days}`);
      setTrends(res.data);
    } finally {
      setLoadingTrends(false);
    }
  }, []);

  useEffect(() => {
    if (!getAccessToken()) { router.push('/login'); return; }
    Promise.all([
      axiosClient.get<Summary>('/analytics/summary'),
      axiosClient.get<DeptLoad[]>('/analytics/department-wellbeing-load'),
      axiosClient.get<TrendPoint[]>('/analytics/trends?days=30'),
      axiosClient.get<RiskReport>('/analytics/risk-report'),
      axiosClient.get<CriticalChange[]>('/analytics/critical-changes'),
    ]).then(([sumRes, deptRes, trendRes, riskRes, critRes]) => {
      setSummary(sumRes.data);
      setDeptLoad(deptRes.data);
      setTrends(trendRes.data);
      setRiskReport(riskRes.data);
      setCriticalChanges(critRes.data);
    }).catch(() => {}).finally(() => setLoadingInit(false));
  }, [router]);

  const handlePeriodChange = async (days: 7 | 30 | 90) => {
    setTrendDays(days);
    await fetchTrends(days);
  };

  // ── Derived data ──────────────────────────────────────────────────────────

  // Zone distribution from deptLoad
  const zoneDistribution = Object.entries(
    deptLoad.reduce<Record<string, number>>((acc, d) => {
      acc[d.load] = (acc[d.load] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  // Dept ranking sorted by wellbeing index
  const deptRanking = [...deptLoad]
    .filter((d) => d.wellbeingIndex !== null)
    .sort((a, b) => (b.wellbeingIndex ?? 0) - (a.wellbeingIndex ?? 0));

  const bestDept = deptRanking[0] ?? null;
  const worstDept = deptRanking[deptRanking.length - 1] ?? null;

  // Trend chart: group by week, avg
  const trendChart = Object.values(
    trends.reduce<Record<string, { week: string; avgScore: number; count: number }>>((acc, item) => {
      if (!acc[item.week]) {
        acc[item.week] = { week: item.week, avgScore: item.avgScore, count: item.count };
      } else {
        const total = acc[item.week].avgScore * acc[item.week].count + item.avgScore * item.count;
        const newCount = acc[item.week].count + item.count;
        acc[item.week] = { week: item.week, avgScore: Math.round((total / newCount) * 10) / 10, count: newCount };
      }
      return acc;
    }, {})
  ).sort((a, b) => a.week.localeCompare(b.week));

  const criticalCount = criticalChanges.filter((c) => c.severity === 'critical').length;

  if (loadingInit) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Raporty HR</h2>
          <p className="text-sm text-gray-400 mt-0.5">Dane zagregowane — anonimowe</p>
        </div>
        {criticalCount > 0 && (
          <button
            onClick={() => setActiveTab('critical')}
            className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm font-medium px-4 py-2 rounded-xl hover:bg-red-100 transition"
          >
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            {criticalCount} zmian krytycznych
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.id === 'critical' && criticalCount > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {criticalCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB 1: Raport ogólny ── */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          {/* KPI cards */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              {
                label: 'Indeks dobrostanu',
                value: summary ? `${summary.avgNormalizedScore} / 100` : '—',
                sub: 'Średni wynik organizacji',
                color: 'text-emerald-600',
                tip: 'Ważona średnia ze wszystkich testów (WHO-5, PSS-10, PHQ-9, GAD-7, MOOD-10), przeliczona do skali 0–100. Im wyższa wartość, tym lepszy ogólny dobrostan.',
              },
              {
                label: 'Aktywni pracownicy',
                value: summary?.totalActiveUsers ?? '—',
                sub: 'Użytkownicy ze statusem ACTIVE',
                color: 'text-blue-600',
                tip: 'Liczba pracowników z aktywnym kontem w systemie (status: ACTIVE). Stanowi mianownik dla wszystkich wskaźników procentowych.',
              },
              {
                label: 'Wskaźnik uczestnictwa',
                value: summary ? `${summary.participationRate}%` : '—',
                sub: 'Pracownicy, którzy wypełnili test',
                color: 'text-violet-600',
                tip: 'Odsetek aktywnych pracowników, którzy wypełnili co najmniej jeden test. Niska wartość może oznaczać niskie zaangażowanie lub niewystarczające przydzielenie testów.',
              },
              {
                label: 'Wypełnień łącznie',
                value: summary?.totalResultsSubmitted ?? '—',
                sub: 'Wszystkie złożone ankiety',
                color: 'text-amber-600',
                tip: 'Całkowita liczba złożonych wyników ze wszystkich testów (w tym wielokrotne wypełnienia przez tego samego pracownika).',
              },
            ].map((card) => (
              <div key={card.label} className="bg-white rounded-2xl shadow-sm p-5">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide flex items-center">
                  {card.label}
                  <InfoTooltip text={card.tip} />
                </p>
                <p className={`text-3xl font-bold mt-1 ${card.color}`}>{card.value}</p>
                <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Zone distribution pie */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="text-base font-semibold text-gray-700 mb-1 flex items-center">
                Strefy dobrostanu działów
                <InfoTooltip text="Każdy dział jest klasyfikowany na podstawie swojego indeksu dobrostanu: Dobry (≥65), Umiarkowany (45–64), Wysoki risk (<45). Wykres pokazuje ile działów jest w każdej strefie." />
              </h3>
              <p className="text-xs text-gray-400 mb-1">Ile działów w każdej strefie ryzyka</p>
              <div className="flex gap-3 mb-3 text-xs">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Dobry ≥ 65</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Umiarkowany 45–64</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Wysoki risk &lt; 45</span>
              </div>
              {zoneDistribution.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10">Brak danych</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={zoneDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }: { name?: string; percent?: number }) =>
                        `${ZONE_LABELS[name ?? ''] ?? name} ${Math.round((percent ?? 0) * 100)}%`
                      }
                    >
                      {zoneDistribution.map((entry) => (
                        <Cell key={entry.name} fill={ZONE_COLORS[entry.name] ?? '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                      formatter={(value, name) => [value, ZONE_LABELS[String(name)] ?? String(name)]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Main problems */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="text-base font-semibold text-gray-700 mb-1 flex items-center">
                Główne obszary ryzyka
                <InfoTooltip text="Pokazuje odsetek aktywnych pracowników, którzy w ostatnich 30 dniach uzyskali wynik wskazujący na podwyższone ryzyko w danym obszarze. Szczegóły w zakładce Ryzyka." />
              </h3>
              <p className="text-xs text-gray-400 mb-4">% pracowników z podwyższonym poziomem (ostatnie 30 dni)</p>
              {riskReport ? (
                <div className="space-y-3">
                  {riskReport.risks.map((risk) => (
                    <div key={risk.key} className="flex items-center gap-3">
                      <span className="text-xl">{RISK_ICONS[risk.icon]}</span>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-gray-700">{risk.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-800">{risk.currentPct}%</span>
                            <DeltaBadge delta={risk.delta} />
                          </div>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{
                              width: `${risk.currentPct}%`,
                              backgroundColor: RISK_COLORS[risk.icon],
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-10">Brak danych</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: Per dział ── */}
      {activeTab === 'departments' && (
        <div className="space-y-6">
          <SectionInfo>
            <span>
              <strong>Indeks dobrostanu działu (0–100)</strong> to ważona średnia z pięciu testów (WHO-5 30%, PSS-10 20%, PHQ-9 20%, GAD-7 15%, MOOD-10 15%).
              Obliczany z wyników złożonych w ostatnich 30 dniach. <strong>Trend</strong> porównuje indeks z poprzednimi 14 dniami — zmiana &gt;5 pkt = poprawa/pogorszenie.
            </span>
          </SectionInfo>

          {/* Best / Worst highlights */}
          {deptRanking.length > 0 && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {bestDept && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-xl">🏆</div>
                  <div>
                    <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wide">Najlepszy wellbeing</p>
                    <p className="text-lg font-bold text-emerald-800">{bestDept.department}</p>
                    <p className="text-sm text-emerald-600">Indeks: {bestDept.wellbeingIndex} / 100</p>
                  </div>
                </div>
              )}
              {worstDept && worstDept.department !== bestDept?.department && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-center gap-4">
                  <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-xl">⚠️</div>
                  <div>
                    <p className="text-xs text-red-600 font-semibold uppercase tracking-wide">Wymaga uwagi</p>
                    <p className="text-lg font-bold text-red-800">{worstDept.department}</p>
                    <p className="text-sm text-red-600">Indeks: {worstDept.wellbeingIndex} / 100</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bar chart comparison */}
          {deptRanking.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="text-base font-semibold text-gray-700 mb-4">Porównanie działów — indeks dobrostanu</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={deptRanking} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="department" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                    formatter={(value) => [`${value} / 100`, 'Indeks dobrostanu']}
                  />
                  <Bar dataKey="wellbeingIndex" name="Indeks dobrostanu" radius={[6, 6, 0, 0]}>
                    {deptRanking.map((entry) => (
                      <Cell key={entry.department} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Ranking table */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-700">Ranking działów</h3>
              <p className="text-xs text-gray-400 mt-0.5">Od najlepszego do najgorszego — dane zagregowane, anonimowe</p>
            </div>
            {deptLoad.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">Brak danych</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-6 py-3 text-left w-8">#</th>
                    <th className="px-6 py-3 text-left">Dział</th>
                    <th className="px-6 py-3 text-right">
                      Pracownicy
                      <InfoTooltip text="Łączna liczba aktywnych pracowników przypisanych do działu." />
                    </th>
                    <th className="px-6 py-3 text-right">
                      Uczestnicy
                      <InfoTooltip text="Ilu pracowników z działu wypełniło co najmniej jeden test w ostatnich 30 dniach." />
                    </th>
                    <th className="px-6 py-3 text-right">
                      Indeks
                      <InfoTooltip text="Indeks dobrostanu działu 0–100. Ważona średnia z testów WHO-5, PSS-10, PHQ-9, GAD-7, MOOD-10. Wyższy = lepiej." />
                    </th>
                    <th className="px-6 py-3 text-right">
                      Strefa
                      <InfoTooltip text="Dobry ≥65 | Umiarkowany 45–64 | Wysoki risk <45" />
                    </th>
                    <th className="px-6 py-3 text-right">
                      Trend
                      <InfoTooltip text="Porównanie indeksu z ostatnich 14 dni vs poprzednich 14 dni. Zmiana >5 pkt = poprawa / pogorszenie." />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[...deptLoad]
                    .sort((a, b) => {
                      if (a.wellbeingIndex === null) return 1;
                      if (b.wellbeingIndex === null) return -1;
                      return b.wellbeingIndex - a.wellbeingIndex;
                    })
                    .map((dept, i) => (
                      <tr key={dept.department} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-3 text-gray-400 text-xs font-mono">{i + 1}</td>
                        <td className="px-6 py-3 font-medium text-gray-800">{dept.department}</td>
                        <td className="px-6 py-3 text-right text-gray-600">{dept.deptSize}</td>
                        <td className="px-6 py-3 text-right text-gray-600">{dept.participants}</td>
                        <td className="px-6 py-3 text-right">
                          <WellbeingBar index={dept.wellbeingIndex} />
                        </td>
                        <td className="px-6 py-3 text-right">
                          <span
                            className="inline-block px-2 py-0.5 rounded-full text-xs font-medium text-white"
                            style={{ backgroundColor: ZONE_COLORS[dept.load] }}
                          >
                            {ZONE_LABELS[dept.load]}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right">
                          {dept.trend === 'improving' && <span className="text-emerald-600 text-xs font-medium">↑ Poprawa</span>}
                          {dept.trend === 'worsening' && <span className="text-red-500 text-xs font-medium">↓ Pogorszenie</span>}
                          {dept.trend === 'stable' && <span className="text-gray-400 text-xs">→ Stabilny</span>}
                          {dept.trend === 'no_data' && <span className="text-gray-300 text-xs">—</span>}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: Trendy ── */}
      {activeTab === 'trends' && (
        <div className="space-y-6">
          {/* Period selector */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-600">Okres:</span>
            {([7, 30, 90] as const).map((d) => (
              <button
                key={d}
                onClick={() => handlePeriodChange(d)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  trendDays === d
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-emerald-300'
                }`}
              >
                {d} dni
              </button>
            ))}
          </div>

          {/* Explainer */}
          <SectionInfo>
            <span>
              Wykres pokazuje <strong>średni wynik znormalizowany (0–100)</strong> ze wszystkich wypełnionych testów tygodniowo.
              Wyższy wynik = lepszy dobrostan. Wynik obliczany jest niezależnie od typu testu — każdy wynik jest przeliczany do skali 0–100 przed uśrednieniem.
              Zmiana w czasie pomaga ocenić ogólną kondycję organizacji.
            </span>
          </SectionInfo>

          {/* Trend chart */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-base font-semibold text-gray-700 mb-1">
              Trend średniego wyniku (tygodniowo)
              <InfoTooltip text="Każdy punkt na wykresie to średnia ze wszystkich wyników złożonych w danym tygodniu. Obejmuje wszystkie typy testów (PHQ-9, GAD-7, PSS-10, WHO-5, MOOD-10)." />
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Ostatnie {trendDays} dni — średni wynik ze wszystkich testów
            </p>
            {loadingTrends ? (
              <div className="flex justify-center py-16">
                <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : trendChart.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-16">Brak danych dla wybranego okresu</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trendChart} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                    formatter={(value) => [`${value} / 100`, 'Śr. wynik']}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgScore"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#10b981' }}
                    name="Śr. wynik"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Scale legend */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Jak interpretować oś Y (0–100)?
            </p>
            <div className="grid grid-cols-4 gap-3">
              {[
                { range: '80–100', label: 'Bardzo dobry', color: 'bg-emerald-100 border-emerald-300 text-emerald-700' },
                { range: '60–79', label: 'Dobry', color: 'bg-yellow-100 border-yellow-300 text-yellow-700' },
                { range: '40–59', label: 'Umiarkowany', color: 'bg-orange-100 border-orange-300 text-orange-700' },
                { range: '0–39', label: 'Wymaga uwagi', color: 'bg-red-100 border-red-300 text-red-700' },
              ].map((s) => (
                <div key={s.range} className={`border rounded-xl px-3 py-2.5 text-center ${s.color}`}>
                  <p className="font-bold text-sm">{s.range}</p>
                  <p className="text-xs mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Summary of period */}
          {trendChart.length > 0 && (() => {
            const first = trendChart[0].avgScore;
            const last = trendChart[trendChart.length - 1].avgScore;
            const diff = Math.round((last - first) * 10) / 10;
            const totalSubmissions = trendChart.reduce((s, p) => s + p.count, 0);
            return (
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Wynik na początku okresu', value: `${first} / 100`, color: 'text-gray-700' },
                  { label: 'Wynik na końcu okresu', value: `${last} / 100`, color: 'text-gray-700' },
                  {
                    label: 'Zmiana w okresie',
                    value: `${diff > 0 ? '+' : ''}${diff}`,
                    color: diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-red-500' : 'text-gray-400',
                  },
                ].map((card) => (
                  <div key={card.label} className="bg-white rounded-2xl shadow-sm p-5">
                    <p className="text-xs text-gray-400 font-medium">{card.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── TAB 4: Ryzyka ── */}
      {activeTab === 'risks' && (
        <div className="space-y-6">
          <SectionInfo>
            Raport ryzyk pokazuje <strong>odsetek aktywnych pracowników</strong>, u których wyniki testów wskazują na podwyższone ryzyko w danym obszarze.
            Porównanie z poprzednim 30-dniowym okresem pozwala ocenić, czy sytuacja się poprawia czy pogarsza.
            Dane są w pełni anonimowe i zagregowane — nie identyfikują konkretnych osób.
          </SectionInfo>

          {riskReport ? (
            <>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {riskReport.risks.map((risk) => (
                  <div
                    key={risk.key}
                    className={`rounded-2xl border p-6 ${RISK_BG[risk.icon]}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{RISK_ICONS[risk.icon]}</span>
                        <div>
                          <p className={`font-semibold text-base ${RISK_TEXT[risk.icon]}`}>{risk.label}</p>
                          <p className="text-xs text-gray-500 mt-0.5">Badanie: {risk.assessmentCode}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-4xl font-black ${RISK_TEXT[risk.icon]}`}>{risk.currentPct}%</p>
                        <p className="text-xs text-gray-500 mt-0.5">{risk.currentCount} os. / {riskReport.totalActive}</p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="w-full bg-white/60 rounded-full h-3">
                        <div
                          className="h-3 rounded-full transition-all"
                          style={{
                            width: `${Math.min(risk.currentPct, 100)}%`,
                            backgroundColor: RISK_COLORS[risk.icon],
                          }}
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-gray-500">Poprzedni okres: {risk.previousPct}%</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-500">Zmiana:</span>
                        <DeltaBadge delta={risk.delta} />
                      </div>
                    </div>

                    {/* Detail box */}
                    {RISK_DETAILS[risk.icon] && (
                      <div className="mt-4 pt-4 border-t border-white/50 space-y-1.5">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Szczegóły</p>
                        <div className="grid grid-cols-1 gap-1 text-xs text-gray-600">
                          <p><span className="font-medium">Test:</span> {RISK_DETAILS[risk.icon].test}</p>
                          <p><span className="font-medium">Próg ryzyka:</span> {RISK_DETAILS[risk.icon].threshold}</p>
                          <p><span className="font-medium">Co oznacza:</span> {RISK_DETAILS[risk.icon].what}</p>
                          <p className={`mt-1 font-medium ${RISK_TEXT[risk.icon]}`}>
                            💡 {RISK_DETAILS[risk.icon].action}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Risk summary */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h3 className="text-base font-semibold text-gray-700 mb-4">Porównanie ryzyk — poprzedni vs bieżący okres</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={riskReport.risks.map((r) => ({
                      name: r.label,
                      'Poprzedni okres': r.previousPct,
                      'Bieżący okres': r.currentPct,
                    }))}
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} unit="%" />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                      formatter={(value) => [`${value}%`]}
                    />
                    <Legend />
                    <Bar dataKey="Poprzedni okres" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Bieżący okres" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400 text-center py-16">Brak danych</p>
          )}
        </div>
      )}

      {/* ── TAB 5: Zmiany krytyczne ── */}
      {activeTab === 'critical' && (
        <div className="space-y-6">
          <SectionInfo>
            <span>
              Wykrywanie nagłych zmian opiera się na porównaniu <strong>indeksu dobrostanu działu</strong> z ostatnich 14 dni z poprzednimi 14 dniami.
              Zmiana &gt;8 pkt = <strong className="text-amber-700">Ostrzeżenie</strong>.
              Zmiana &gt;15 pkt = <strong className="text-red-700">Krytyczny</strong>.
              Zmiany pozytywne (wzrost) są również wyświetlane dla pełnego obrazu.
            </span>
          </SectionInfo>

          {criticalChanges.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-12 flex flex-col items-center gap-3">
              <span className="text-4xl">✅</span>
              <p className="text-gray-700 font-semibold">Brak zmian krytycznych</p>
              <p className="text-sm text-gray-400">Wszystkie działy utrzymują stabilny poziom dobrostanu</p>
            </div>
          ) : (
            <div className="space-y-3">
              {criticalChanges.map((change) => (
                <div
                  key={change.department}
                  className={`rounded-2xl border p-5 ${
                    change.direction === 'worsening'
                      ? change.severity === 'critical'
                        ? 'bg-red-50 border-red-300'
                        : 'bg-orange-50 border-orange-200'
                      : 'bg-emerald-50 border-emerald-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {change.direction === 'worsening'
                          ? change.severity === 'critical' ? '🚨' : '⚠️'
                          : '📈'}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-800">{change.department}</p>
                          {change.severity === 'critical' && (
                            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                              KRYTYCZNY
                            </span>
                          )}
                        </div>
                        <p className={`text-sm mt-0.5 ${
                          change.direction === 'worsening' ? 'text-red-700' : 'text-emerald-700'
                        }`}>
                          {change.direction === 'worsening'
                            ? `Dobrostan spadł o ${change.drop} pkt w ciągu 2 tygodni`
                            : `Dobrostan wzrósł o ${change.drop} pkt w ciągu 2 tygodni`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="text-center">
                          <p className="text-xs text-gray-400">Poprzednio</p>
                          <p className="text-lg font-bold text-gray-700">{change.prevIndex}</p>
                        </div>
                        <span className={`text-xl font-bold ${change.direction === 'worsening' ? 'text-red-500' : 'text-emerald-500'}`}>
                          {change.direction === 'worsening' ? '→' : '→'}
                        </span>
                        <div className="text-center">
                          <p className="text-xs text-gray-400">Teraz</p>
                          <p className={`text-lg font-bold ${change.direction === 'worsening' ? 'text-red-600' : 'text-emerald-600'}`}>
                            {change.recentIndex}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Summary stats */}
          {criticalChanges.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              {[
                {
                  label: 'Pogorszeń krytycznych',
                  value: criticalChanges.filter((c) => c.direction === 'worsening' && c.severity === 'critical').length,
                  color: 'text-red-600',
                },
                {
                  label: 'Pogorszeń ostrzegawczych',
                  value: criticalChanges.filter((c) => c.direction === 'worsening' && c.severity === 'warning').length,
                  color: 'text-amber-600',
                },
                {
                  label: 'Popraw w działach',
                  value: criticalChanges.filter((c) => c.direction === 'improving').length,
                  color: 'text-emerald-600',
                },
              ].map((card) => (
                <div key={card.label} className="bg-white rounded-2xl shadow-sm p-5">
                  <p className="text-xs text-gray-400 font-medium">{card.label}</p>
                  <p className={`text-3xl font-bold mt-1 ${card.color}`}>{card.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
