'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axiosClient from '../../../lib/axiosClient';
import { getAccessToken } from '../../../lib/auth';

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

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm p-6 border-l-4 ${color}`}>
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
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

export default function HrDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<HrDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getAccessToken()) { router.push('/login'); return; }
    axiosClient
      .get<HrDashboard>('/analytics/hr-dashboard')
      .then((r) => setData(r.data))
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) return <p className="text-gray-400 text-sm">Ładowanie...</p>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Dashboard HR</h2>
        <p className="text-sm text-gray-400 mt-0.5">Przegląd dobrostanu pracowników</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Aktywni pracownicy"
          value={data.activeEmployees}
          sub={`+${data.newThisMonth} w tym miesiącu`}
          color="border-indigo-500"
        />
        <StatCard
          label="Testy przypisane dziś"
          value={data.assignedToday}
          sub={`${data.completedToday} ukończonych`}
          color="border-blue-500"
        />
        <StatCard
          label="Ukończenie testów"
          value={`${data.completionRate}%`}
          sub="testy przypisane dziś"
          color="border-amber-500"
        />
        <div className="bg-white rounded-2xl shadow-sm p-6 border-l-4 border-rose-500">
          <p className="text-sm text-gray-500 mb-1">Śr. poziom stresu (7 dni)</p>
          <p className="text-3xl font-bold text-gray-800">
            {data.avgStressThisWeek !== null ? `${data.avgStressThisWeek}` : '—'}
            {data.avgStressThisWeek !== null && (
              <span className="text-lg font-medium text-gray-400 ml-1">/ 100</span>
            )}
          </p>
          <div className="mt-1">
            <DeltaBadge delta={data.stressDelta} />
          </div>
        </div>
      </div>

      {/* Hourly activity chart */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-700 mb-4">
          Aktywność użytkowników — testy dziś (godzinowo)
        </h3>
        {data.activityToday.every((h) => h.count === 0) ? (
          <p className="text-sm text-gray-400 text-center py-10">Brak aktywności dziś</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.activityToday} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#9ca3af' }} interval={1} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                formatter={(v) => [v, 'Testy']}
              />
              <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} name="count" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
