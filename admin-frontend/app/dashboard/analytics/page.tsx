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
}

const SEVERITY_COLORS: Record<string, string> = {
  minimal: '#22c55e',
  mild: '#84cc16',
  moderate: '#f59e0b',
  'moderately-severe': '#f97316',
  severe: '#ef4444',
  high: '#ef4444',
  low: '#22c55e',
  average: '#3b82f6',
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
  low: 'Niskie',
  average: 'Przeciętne',
  'low-distress': 'Niski stres',
  'moderate-distress': 'Umiark. stres',
  'high-distress': 'Wysoki stres',
};

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

        {/* Severity distribution pie */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-base font-semibold text-gray-700 mb-4">Rozkład nasilenia objawów</h3>
          {pieData.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">Brak danych dla wybranego filtru</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  dataKey="value"
                  label={({ name, percent }: { name?: string; percent?: number }) =>
                    `${SEVERITY_LABELS[name ?? ''] ?? name ?? ''} ${Math.round((percent ?? 0) * 100)}%`
                  }
                  labelLine={false}
                >
                  {pieData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={SEVERITY_COLORS[entry.name] ?? '#94a3b8'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                  formatter={(value, name) => [value, SEVERITY_LABELS[String(name)] ?? String(name)]}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Department stats table */}
      {departmentStats.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-700">Statystyki działów</h3>
            <p className="text-xs text-gray-400 mt-0.5">Dane zagregowane — bez identyfikacji indywidualnych osób</p>
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
                  <td className="px-6 py-3 text-right text-gray-600">
                    {dept.avgScore !== null ? `${dept.avgScore} / 100` : '—'}
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
      )}

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
