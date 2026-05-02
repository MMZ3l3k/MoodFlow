'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import axiosClient from '../../../lib/axiosClient';
import { getAccessToken } from '../../../lib/auth';

interface Summary {
  totalActiveUsers: number;
  totalResultsSubmitted: number;
  avgNormalizedScore: number;
  participationRate: number;
}

interface TrendPoint {
  week: string;
  avgScore: number;
  count: number;
  assessmentCode: string;
  assessmentName: string;
}

interface SeverityItem {
  severity: string;
  assessmentCode: string;
  assessmentName: string;
  count: number;
}

interface ParticipationItem {
  assessmentCode: string;
  assessmentName: string;
  participants: number;
  submissions: number;
  participationRate: number;
  totalActive: number;
}

interface AssessmentOption {
  code: string;
  name: string;
}

interface DepartmentStat {
  department: string;
  activeUsers: number;
  participantCount: number;
  submissions: number;
  avgScore: number | null;
  participationRate: number;
  anonymized?: boolean;
  minGroupSize?: number;
}

const SEVERITY_COLORS: Record<string, string> = {
  minimal: '#22c55e',
  mild: '#84cc16',
  moderate: '#f59e0b',
  'moderately-severe': '#f97316',
  severe: '#ef4444',
  high: '#ef4444',
  very_high: '#dc2626',
  low: '#22c55e',
  very_low: '#16a34a',
  average: '#3b82f6',
  normal: '#3b82f6',
  none: '#94a3b8',
  'low-distress': '#22c55e',
  'moderate-distress': '#f59e0b',
  'high-distress': '#ef4444',
};

const SEVERITY_LABELS: Record<string, string> = {
  minimal: 'Minimalne',
  mild: 'Łagodne',
  moderate: 'Umiarkowane',
  'moderately-severe': 'Umiark. ciężkie',
  severe: 'Ciężkie',
  high: 'Wysokie',
  very_high: 'Bardzo wysokie',
  low: 'Niskie',
  very_low: 'Bardzo niskie',
  average: 'Przeciętne',
  normal: 'Normalne',
  none: 'Brak',
  'low-distress': 'Niski stres',
  'moderate-distress': 'Umiark. stres',
  'high-distress': 'Wysoki stres',
};

const SEVERITY_ORDER = [
  'very_low', 'low', 'minimal', 'mild', 'normal', 'average',
  'moderate', 'moderately-severe', 'high', 'very_high', 'severe',
  'low-distress', 'moderate-distress', 'high-distress', 'none',
];

function severityLabel(code: string): string {
  return SEVERITY_LABELS[code] ?? code.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
function severityColor(code: string): string {
  return SEVERITY_COLORS[code] ?? '#94a3b8';
}

function KpiCard({ label, value, unit, color }: { label: string; value: string | number; unit?: string; color: string }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm p-6 border-l-4 ${color}`}>
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-800">
        {value}
        {unit && <span className="text-lg font-medium text-gray-400 ml-1">{unit}</span>}
      </p>
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [severity, setSeverity] = useState<SeverityItem[]>([]);
  const [participation, setParticipation] = useState<ParticipationItem[]>([]);
  const [assessments, setAssessments] = useState<AssessmentOption[]>([]);
  const [selectedCode, setSelectedCode] = useState<string>('');
  const [departmentStats, setDepartmentStats] = useState<DepartmentStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchFiltered = useCallback(async (code: string) => {
    const params = code ? `?assessmentCode=${code}` : '';
    const [trendsRes, severityRes] = await Promise.all([
      axiosClient.get<TrendPoint[]>(`/analytics/trends${params}`),
      axiosClient.get<SeverityItem[]>(`/analytics/severity-distribution${params}`),
    ]);
    setTrends(trendsRes.data);
    setSeverity(severityRes.data);
  }, []);

  useEffect(() => {
    if (!getAccessToken()) { router.push('/login'); return; }

    const fetchAll = async () => {
      try {
        const [summaryRes, participationRes, assessmentsRes, deptRes] = await Promise.all([
          axiosClient.get<Summary>('/analytics/summary'),
          axiosClient.get<ParticipationItem[]>('/analytics/participation'),
          axiosClient.get<AssessmentOption[]>('/analytics/assessments'),
          axiosClient.get<DepartmentStat[]>('/analytics/departments'),
        ]);
        setSummary(summaryRes.data);
        setParticipation(participationRes.data);
        setAssessments(assessmentsRes.data);
        setDepartmentStats(deptRes.data);
        await fetchFiltered('');
      } catch {
        setError('Błąd ładowania danych analitycznych');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [router, fetchFiltered]);

  const handleCodeChange = async (code: string) => {
    setSelectedCode(code);
    await fetchFiltered(code);
  };

  // Group severity for pie chart
  const pieData = Object.entries(
    severity.reduce<Record<string, number>>((acc, item) => {
      acc[item.severity] = (acc[item.severity] ?? 0) + item.count;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  // Group trends by week for line chart (avg across assessments if no filter)
  const trendsByWeek = Object.values(
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-sm">Ładowanie danych...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Analityka dobrostanu</h2>
        <p className="text-sm text-gray-400 mt-1">Zagregowane dane anonimowe — widok HR/Admin</p>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Aktywni użytkownicy" value={summary.totalActiveUsers} color="border-indigo-500" />
          <KpiCard label="Wypełnione testy" value={summary.totalResultsSubmitted} color="border-emerald-500" />
          <KpiCard label="Śr. wynik znormalizowany" value={summary.avgNormalizedScore} unit="/ 100" color="border-amber-500" />
          <KpiCard label="Wskaźnik uczestnictwa" value={summary.participationRate} unit="%" color="border-rose-500" />
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-600">Filtruj po teście:</label>
        <select
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          value={selectedCode}
          onChange={(e) => handleCodeChange(e.target.value)}
        >
          <option value="">Wszystkie testy</option>
          {assessments.map((a) => (
            <option key={a.code} value={a.code}>{a.name} ({a.code})</option>
          ))}
        </select>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Trend chart */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-base font-semibold text-gray-700 mb-4">Trend średniego wyniku (tygodniowo)</h3>
          {trendsByWeek.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">Brak danych dla wybranego filtru</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trendsByWeek} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                  formatter={(value) => [`${value} / 100`, 'Śr. wynik']}
                />
                <Line type="monotone" dataKey="avgScore" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Śr. wynik" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Severity distribution donut */}
        <div className="admin-card p-6">
          <div className="mb-4">
            <h3 className="text-base font-semibold" style={{ color: '#2E211C' }}>Rozkład nasilenia objawów</h3>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(46,33,28,0.45)' }}>
              Udział poziomów nasilenia w zebranych wynikach
            </p>
          </div>
          {pieData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="text-3xl mb-2">📊</div>
              <p className="text-sm" style={{ color: 'rgba(46,33,28,0.45)' }}>Brak danych dla wybranego filtru</p>
            </div>
          ) : (() => {
            const sorted = [...pieData].sort((a, b) => {
              const ai = SEVERITY_ORDER.indexOf(a.name);
              const bi = SEVERITY_ORDER.indexOf(b.name);
              return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
            });
            const total = sorted.reduce((sum, d) => sum + (d.value as number), 0);
            return (
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="relative shrink-0" style={{ width: 200, height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sorted}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                      >
                        {sorted.map((entry) => (
                          <Cell key={entry.name} fill={severityColor(entry.name)} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: 12,
                          border: '1px solid rgba(221,211,186,0.8)',
                          background: 'rgba(255,255,255,0.95)',
                          fontSize: 12,
                          color: '#2E211C',
                          boxShadow: '0 4px 16px rgba(46,33,28,0.08)',
                        }}
                        formatter={(value, name) => [value, severityLabel(String(name))]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                  >
                    <span className="text-2xl font-bold" style={{ color: '#2E211C' }}>{total}</span>
                    <span className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: 'rgba(46,33,28,0.45)' }}>
                      wyników
                    </span>
                  </div>
                </div>

                <ul className="flex-1 w-full space-y-2.5">
                  {sorted.map((entry) => {
                    const pct = total > 0 ? Math.round(((entry.value as number) / total) * 100) : 0;
                    const color = severityColor(entry.name);
                    return (
                      <li key={entry.name} className="flex items-center gap-3">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: color, boxShadow: `0 0 0 3px ${color}22` }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2 mb-1">
                            <span className="text-sm font-semibold truncate" style={{ color: '#2E211C' }}>
                              {severityLabel(entry.name)}
                            </span>
                            <span className="text-[11px] tabular-nums" style={{ color: 'rgba(46,33,28,0.55)' }}>
                              <span className="font-semibold" style={{ color: '#2E211C' }}>{entry.value}</span>
                              <span className="mx-1">·</span>
                              {pct}%
                            </span>
                          </div>
                          <div
                            className="h-1.5 rounded-full overflow-hidden"
                            style={{ background: 'rgba(46,33,28,0.06)' }}
                          >
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, background: color }}
                            />
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Department stats table */}
      {departmentStats.length > 0 && (() => {
        const minSize = departmentStats.find((d) => d.minGroupSize)?.minGroupSize ?? 5;
        return (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-base font-semibold text-gray-700">Statystyki działów</h3>
                <p className="text-xs text-gray-400 mt-0.5">Dane zagregowane — bez identyfikacji indywidualnych osób</p>
              </div>
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap"
                style={{ background: 'rgba(99,102,241,0.08)', color: '#4f46e5', border: '1px solid rgba(99,102,241,0.18)' }}
                title={`Anonimizacja k=${minSize}: dane dla grup mniejszych niż ${minSize} osób są ukrywane.`}
              >
                <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
                </svg>
                Anonimizacja: min. {minSize} osób w grupie
              </span>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-6 py-3 text-left">Dział</th>
                <th className="px-6 py-3 text-right">Aktywni</th>
                <th className="px-6 py-3 text-right">Uczestników</th>
                <th className="px-6 py-3 text-right">Wypełnień</th>
                <th className="px-6 py-3 text-right">Śr. wynik</th>
                <th className="px-6 py-3 text-right">Uczestnictwo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {departmentStats.map((dept) => (
                <tr key={dept.department} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-3 font-medium text-gray-800">{dept.department}</td>
                  <td className="px-6 py-3 text-right text-gray-600">{dept.activeUsers}</td>
                  <td className="px-6 py-3 text-right text-gray-600">{dept.participantCount}</td>
                  <td className="px-6 py-3 text-right text-gray-600">{dept.submissions}</td>
                  <td className="px-6 py-3 text-right">
                    {dept.anonymized ? (
                      <span
                        className="inline-flex items-center gap-1 text-[11px] font-medium"
                        style={{ color: '#6366f1' }}
                        title={`Grupa < ${dept.minGroupSize ?? minSize} osób — dane ukryte dla zachowania anonimowości.`}
                      >
                        <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
                        </svg>
                        Ukryte
                      </span>
                    ) : (
                      <span className="text-gray-600">{dept.avgScore !== null ? `${dept.avgScore} / 100` : '—'}</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <span className={`font-semibold ${dept.participationRate >= 50 ? 'text-emerald-600' : dept.participationRate >= 25 ? 'text-amber-600' : 'text-red-500'}`}>
                      {dept.participationRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        );
      })()}

      {/* Participation bar chart */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-700 mb-4">Uczestnictwo per test (%)</h3>
        {participation.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">Brak danych uczestnictwa</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={participation} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="assessmentCode" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                formatter={(value, name) => {
                  if (name === 'participationRate') return [`${value}%`, 'Uczestnictwo'];
                  if (name === 'submissions') return [value, 'Wypełnień'];
                  return [value, String(name)];
                }}
              />
              <Legend formatter={(v) => v === 'participationRate' ? 'Uczestnictwo (%)' : 'Wypełnień'} />
              <Bar dataKey="participationRate" fill="#6366f1" radius={[4, 4, 0, 0]} name="participationRate" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Participation table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-700">Szczegóły uczestnictwa</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-6 py-3 text-left">Test</th>
              <th className="px-6 py-3 text-left">Kod</th>
              <th className="px-6 py-3 text-right">Uczestników</th>
              <th className="px-6 py-3 text-right">Wypełnień</th>
              <th className="px-6 py-3 text-right">Uczestnictwo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {participation.map((item) => (
              <tr key={item.assessmentCode} className="hover:bg-gray-50 transition">
                <td className="px-6 py-3 font-medium text-gray-800">{item.assessmentName}</td>
                <td className="px-6 py-3 text-gray-400 font-mono text-xs">{item.assessmentCode}</td>
                <td className="px-6 py-3 text-right text-gray-700">{item.participants}</td>
                <td className="px-6 py-3 text-right text-gray-700">{item.submissions}</td>
                <td className="px-6 py-3 text-right">
                  <span className={`font-semibold ${item.participationRate >= 50 ? 'text-emerald-600' : item.participationRate >= 25 ? 'text-amber-600' : 'text-red-500'}`}>
                    {item.participationRate}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
