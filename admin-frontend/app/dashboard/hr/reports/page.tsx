'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';
import axiosClient from '../../../../lib/axiosClient';
import { getAccessToken } from '../../../../lib/auth';

interface TrendPoint {
  week: string;
  avgScore: number;
  count: number;
  assessmentCode: string;
  assessmentName: string;
}

interface DepartmentStat {
  department: string;
  activeUsers: number;
  participantCount: number;
  submissions: number;
  avgScore: number | null;
  participationRate: number;
}

interface SeverityItem {
  severity: string;
  assessmentCode: string;
  count: number;
}

interface AssessmentOption {
  code: string;
  name: string;
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

export default function HrReportsPage() {
  const router = useRouter();
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [deptStats, setDeptStats] = useState<DepartmentStat[]>([]);
  const [severity, setSeverity] = useState<SeverityItem[]>([]);
  const [assessments, setAssessments] = useState<AssessmentOption[]>([]);
  const [selectedCode, setSelectedCode] = useState('');
  const [loading, setLoading] = useState(true);

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
    Promise.all([
      axiosClient.get<AssessmentOption[]>('/analytics/assessments'),
      axiosClient.get<DepartmentStat[]>('/analytics/departments'),
    ]).then(([asmRes, deptRes]) => {
      setAssessments(asmRes.data);
      setDeptStats(deptRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
    fetchFiltered('');
  }, [router, fetchFiltered]);

  const handleCodeChange = async (code: string) => {
    setSelectedCode(code);
    await fetchFiltered(code);
  };

  // Group trends by week
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

  const pieData = Object.entries(
    severity.reduce<Record<string, number>>((acc, item) => {
      acc[item.severity] = (acc[item.severity] ?? 0) + item.count;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  if (loading) return <p className="text-gray-400 text-sm">Ładowanie...</p>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Raporty</h2>
        <p className="text-sm text-gray-400 mt-0.5">Wykresy i statystyki dobrostanu pracowników</p>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-600">Filtruj po teście:</label>
        <select
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
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
        {/* Trend */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-base font-semibold text-gray-700 mb-4">Trend średniego wyniku (tygodniowo)</h3>
          {trendsByWeek.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">Brak danych</p>
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
                <Line type="monotone" dataKey="avgScore" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name="Śr. wynik" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Severity pie */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-base font-semibold text-gray-700 mb-4">Rozkład nasilenia objawów</h3>
          {pieData.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">Brak danych</p>
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
                    <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name] ?? '#94a3b8'} />
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

      {/* Department stats */}
      {deptStats.length > 0 && (
        <>
          {/* Bar chart */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-base font-semibold text-gray-700 mb-4">Uczestnictwo i śr. wynik wg działu</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={deptStats} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="department" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis yAxisId="left" domain={[0, 100]} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="participationRate" name="Uczestnictwo (%)" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="avgScore" name="Śr. wynik / 100" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-700">Statystyki działów</h3>
              <p className="text-xs text-gray-400 mt-0.5">Dane zagregowane — dane anonimowe</p>
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
                {deptStats.map((dept) => (
                  <tr key={dept.department} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-3 font-medium text-gray-800">{dept.department}</td>
                    <td className="px-6 py-3 text-right text-gray-600">{dept.activeUsers}</td>
                    <td className="px-6 py-3 text-right text-gray-600">{dept.participantCount}</td>
                    <td className="px-6 py-3 text-right text-gray-600">{dept.submissions}</td>
                    <td className="px-6 py-3 text-right text-gray-600">
                      {dept.avgScore !== null ? `${dept.avgScore} / 100` : '—'}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <span className={`font-semibold ${
                        dept.participationRate >= 50 ? 'text-emerald-600'
                          : dept.participationRate >= 25 ? 'text-amber-600' : 'text-red-500'
                      }`}>
                        {dept.participationRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
