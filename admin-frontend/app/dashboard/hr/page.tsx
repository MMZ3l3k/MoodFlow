'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, ReferenceLine,
} from 'recharts';
import axiosClient from '../../../lib/axiosClient';
import { getAccessToken } from '../../../lib/auth';

// ── Typy ─────────────────────────────────────────────────────────────────────

interface HrDashboard {
  activeEmployees: number;
  newThisMonth: number;
  assignedToday: number;
  completedToday: number;
  completionRate: number;
  avgStressThisWeek: number | null;
  avgStressLastWeek: number | null;
  stressDelta: number | null;
  activityToday: { hour: string; count: number }[];
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

interface OrgHistoryPoint {
  week: string;
  index: number;
  color: string;
  userCount: number;
}

// ── Helpers / config ──────────────────────────────────────────────────────────

const LOAD_CONFIG = {
  stable:   { label: 'Stabilny',            emoji: '🟢', bg: 'bg-emerald-50',  border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700' },
  moderate: { label: 'Umiarkowane obciążenie', emoji: '🟡', bg: 'bg-amber-50',   border: 'border-amber-200',   badge: 'bg-amber-100 text-amber-700' },
  high:     { label: 'Wysokie obciążenie',   emoji: '🔴', bg: 'bg-red-50',     border: 'border-red-200',     badge: 'bg-red-100 text-red-700' },
  no_data:  { label: 'Brak danych',          emoji: '⚪', bg: 'bg-gray-50',    border: 'border-gray-200',    badge: 'bg-gray-100 text-gray-500' },
};

const TREND_CONFIG = {
  improving: { label: 'Poprawa',    icon: '↑', color: 'text-emerald-600' },
  worsening: { label: 'Pogorszenie', icon: '↓', color: 'text-red-500' },
  stable:    { label: 'Stabilny',   icon: '→', color: 'text-gray-500' },
  no_data:   { label: 'Brak danych', icon: '–', color: 'text-gray-400' },
};

// ── Drobne komponenty ─────────────────────────────────────────────────────────

function KpiCard({ label, value, unit, sub, accent }: {
  label: string; value: string | number; unit?: string; sub?: string; accent: string;
}) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm p-5 border-l-4 ${accent}`}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-800">
        {value}
        {unit && <span className="text-lg font-medium text-gray-400 ml-1">{unit}</span>}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="text-xs text-gray-400">brak danych</span>;
  if (delta === 0) return <span className="text-xs text-gray-500">bez zmian</span>;
  const positive = delta > 0;
  return (
    <span className={`text-xs font-medium ${positive ? 'text-red-500' : 'text-emerald-500'}`}>
      {positive ? '▲' : '▼'} {Math.abs(delta)} vs poprzedni tydzień
    </span>
  );
}

// ── Karta działu ──────────────────────────────────────────────────────────────

function DeptCard({ dept }: { dept: DeptLoad }) {
  const lc = LOAD_CONFIG[dept.load];
  const tc = TREND_CONFIG[dept.trend];
  const participation = dept.deptSize > 0
    ? Math.round((dept.participants / dept.deptSize) * 100)
    : 0;

  return (
    <div className={`rounded-2xl border p-5 ${lc.bg} ${lc.border} flex flex-col gap-3`}>
      {/* Nagłówek */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 truncate">{dept.department}</p>
          <p className="text-xs text-gray-500 mt-0.5">{dept.deptSize} pracowników</p>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${lc.badge}`}>
          {lc.emoji} {lc.label}
        </span>
      </div>

      {/* Indeks + pasek */}
      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-2xl font-bold" style={{ color: dept.color ?? '#94a3b8' }}>
            {dept.wellbeingIndex ?? '—'}
            {dept.wellbeingIndex !== null && (
              <span className="text-sm font-normal text-gray-400 ml-1">/100</span>
            )}
          </span>
          <span className={`text-xs font-medium flex items-center gap-0.5 ${tc.color}`}>
            <span className="text-base leading-none">{tc.icon}</span>
            {tc.label}
          </span>
        </div>
        <div className="h-2 rounded-full bg-white/70 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${dept.wellbeingIndex ?? 0}%`,
              background: dept.color ?? '#94a3b8',
            }}
          />
        </div>
      </div>

      {/* Uczestnictwo */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Uczestnictwo (30 dni)</span>
        <span className="font-semibold text-gray-700">{dept.participants} os. ({participation}%)</span>
      </div>
    </div>
  );
}

// ── Wykres trendu organizacji ─────────────────────────────────────────────────

function OrgTrendChart({ data }: { data: OrgHistoryPoint[] }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-12">Brak danych historycznych</p>
    );
  }

  // Niestandardowy tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const val = payload[0].value as number;
    const color = val >= 80 ? '#22c55e' : val >= 60 ? '#eab308' : val >= 40 ? '#f97316' : '#ef4444';
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2 text-xs">
        <p className="text-gray-400 mb-1">{label}</p>
        <p className="font-bold text-lg" style={{ color }}>{val}<span className="text-gray-400 text-xs font-normal ml-1">/ 100</span></p>
        {payload[0].payload.userCount > 0 && (
          <p className="text-gray-400 mt-0.5">{payload[0].payload.userCount} uczestników</p>
        )}
      </div>
    );
  };

  // Dynamiczny kolor punktów
  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    const c = payload.color ?? '#6366f1';
    return <circle cx={cx} cy={cy} r={5} fill={c} stroke="white" strokeWidth={2} />;
  };

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="week"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          tickFormatter={(v) => {
            const d = new Date(v);
            return `${d.getDate()}.${(d.getMonth() + 1).toString().padStart(2, '0')}`;
          }}
        />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#9ca3af' }} />
        {/* Linie referencyjne poziomów */}
        <ReferenceLine y={80} stroke="#22c55e" strokeDasharray="4 3" strokeOpacity={0.5} label={{ value: 'Wysoki', position: 'right', fontSize: 10, fill: '#22c55e' }} />
        <ReferenceLine y={60} stroke="#eab308" strokeDasharray="4 3" strokeOpacity={0.5} label={{ value: 'Umiark.', position: 'right', fontSize: 10, fill: '#eab308' }} />
        <ReferenceLine y={40} stroke="#f97316" strokeDasharray="4 3" strokeOpacity={0.5} label={{ value: 'Obniżony', position: 'right', fontSize: 10, fill: '#f97316' }} />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="index"
          stroke="#6366f1"
          strokeWidth={2.5}
          dot={<CustomDot />}
          activeDot={{ r: 7, stroke: '#6366f1', strokeWidth: 2, fill: 'white' }}
          name="Indeks dobrostanu"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Główna strona ─────────────────────────────────────────────────────────────

export default function HrDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<HrDashboard | null>(null);
  const [deptLoad, setDeptLoad] = useState<DeptLoad[]>([]);
  const [orgHistory, setOrgHistory] = useState<OrgHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getAccessToken()) { router.push('/login'); return; }

    Promise.allSettled([
      axiosClient.get<HrDashboard>('/analytics/hr-dashboard'),
      axiosClient.get<DeptLoad[]>('/analytics/department-wellbeing-load'),
      axiosClient.get<OrgHistoryPoint[]>('/analytics/org-wellbeing-history'),
    ]).then(([hrRes, deptRes, histRes]) => {
      if (hrRes.status === 'fulfilled') setData(hrRes.value.data);
      if (deptRes.status === 'fulfilled') setDeptLoad(deptRes.value.data);
      if (histRes.status === 'fulfilled') setOrgHistory(histRes.value.data);
    }).catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-7 bg-gray-100 rounded-lg w-48 mb-2 animate-pulse" />
          <div className="h-4 bg-gray-100 rounded w-64 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white rounded-2xl shadow-sm p-5 animate-pulse h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Podsumowanie alertów działów
  const highLoadDepts = deptLoad.filter((d) => d.load === 'high');
  const worseningDepts = deptLoad.filter((d) => d.trend === 'worsening');

  return (
    <div className="space-y-8">

      {/* Nagłówek */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Dashboard HR</h2>
        <p className="text-sm text-gray-400 mt-0.5">Przegląd dobrostanu organizacji — dane zagregowane i anonimowe</p>
      </div>

      {/* Alerty */}
      {(highLoadDepts.length > 0 || worseningDepts.length > 0) && (
        <div className="space-y-2">
          {highLoadDepts.map((d) => (
            <div key={d.department} className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <span className="text-red-500 mt-0.5 shrink-0">⚠️</span>
              <div>
                <p className="text-sm font-semibold text-red-700">
                  Wysokie obciążenie — {d.department}
                </p>
                <p className="text-xs text-red-500 mt-0.5">
                  Indeks dobrostanu: {d.wellbeingIndex ?? '—'}/100 · {d.participants} uczestników z {d.deptSize}
                </p>
              </div>
            </div>
          ))}
          {worseningDepts
            .filter((d) => d.load !== 'high') // nie duplikuj alertów
            .map((d) => (
            <div key={d.department} className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <span className="mt-0.5 shrink-0">📉</span>
              <div>
                <p className="text-sm font-semibold text-amber-700">
                  Pogorszenie trendu — {d.department}
                </p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Indeks: {d.wellbeingIndex ?? '—'}/100 · wynik niższy niż w poprzednich 14 dniach
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Aktywni pracownicy"
          value={data.activeEmployees}
          sub={`+${data.newThisMonth} w tym miesiącu`}
          accent="border-indigo-500"
        />
        <KpiCard
          label="Testy przypisane dziś"
          value={data.assignedToday}
          sub={`${data.completedToday} ukończonych`}
          accent="border-blue-500"
        />
        <KpiCard
          label="Ukończenie testów"
          value={data.completionRate}
          unit="%"
          sub="testy przypisane dziś"
          accent="border-amber-500"
        />
        <div className="bg-white rounded-2xl shadow-sm p-5 border-l-4 border-rose-500">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Śr. wynik dobrostanu (7 dni)
          </p>
          <p className="text-3xl font-bold text-gray-800">
            {data.avgStressThisWeek !== null ? data.avgStressThisWeek : '—'}
            {data.avgStressThisWeek !== null && (
              <span className="text-lg font-medium text-gray-400 ml-1">/ 100</span>
            )}
          </p>
          <div className="mt-1">
            <DeltaBadge delta={data.stressDelta} />
          </div>
        </div>
      </div>

      {/* Trend dobrostanu organizacji */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="mb-5">
          <h3 className="text-base font-semibold text-gray-800">
            Indeks dobrostanu organizacji — ostatnie 12 tygodni
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Ważona średnia testów WHO-5, PSS-10, PHQ-9, GAD-7, MOOD10
          </p>
        </div>
        <OrgTrendChart data={orgHistory} />

        {/* Legenda poziomów */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-100">
          {[
            { color: '#22c55e', range: '80–100', label: 'Wysoki' },
            { color: '#eab308', range: '60–79',  label: 'Umiarkowany' },
            { color: '#f97316', range: '40–59',  label: 'Obniżony' },
            { color: '#ef4444', range: '0–39',   label: 'Niski / przeciążenie' },
          ].map(({ color, range, label }) => (
            <div key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-3 h-3 rounded-full" style={{ background: color }} />
              <span className="font-medium text-gray-600">{label}</span>
              <span className="text-gray-400">({range})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Karty działów */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-gray-800">Stan działów — ostatnie 30 dni</h3>
            <p className="text-xs text-gray-400 mt-0.5">Indeks dobrostanu per dział · dane zagregowane</p>
          </div>
          <div className="flex gap-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">🟢 Stabilny</span>
            <span className="flex items-center gap-1">🟡 Umiarkowany</span>
            <span className="flex items-center gap-1">🔴 Wysokie obciążenie</span>
          </div>
        </div>

        {deptLoad.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400 text-sm">
            Brak danych działów. Pracownicy muszą mieć przypisany dział i wypełnione testy.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {deptLoad.map((dept) => (
              <DeptCard key={dept.department} dept={dept} />
            ))}
          </div>
        )}
      </div>

      {/* Aktywność godzinowa */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-700 mb-4">
          Aktywność — testy wypełnione dziś (godzinowo)
        </h3>
        {data.activityToday.every((h) => h.count === 0) ? (
          <p className="text-sm text-gray-400 text-center py-10">Brak aktywności dziś</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.activityToday} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#9ca3af' }} interval={1} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                formatter={(v) => [v, 'Testy']}
              />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

    </div>
  );
}
