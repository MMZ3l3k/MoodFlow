'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axiosClient from '../../lib/axiosClient';
import { getAccessToken } from '../../lib/auth';

interface Overview {
  totalUsers: number;
  newThisMonth: number;
  pendingCount: number;
  testsToday: number;
}

interface HourActivity {
  hour: string;
  count: number;
}

function StatCard({
  label, value, sub, icon, gradient, dotColor,
}: {
  label: string;
  value: number;
  sub?: string;
  icon: React.ReactNode;
  gradient: string;
  dotColor: string;
}) {
  return (
    <div
      className="admin-card p-5 flex items-start gap-4 transition-all duration-200"
      style={{ cursor: 'default' }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: gradient }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(46,33,28,0.45)' }}>
          {label}
        </p>
        <p className="text-3xl font-bold mt-0.5" style={{ color: '#2E211C' }}>{value}</p>
        {sub && (
          <p className="text-xs mt-1 flex items-center gap-1.5" style={{ color: 'rgba(46,33,28,0.45)' }}>
            <span
              className="w-1.5 h-1.5 rounded-full inline-block"
              style={{ background: dotColor }}
            />
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [activity, setActivity] = useState<HourActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getAccessToken()) { router.push('/login'); return; }
    Promise.all([
      axiosClient.get<Overview>('/admin/overview'),
      axiosClient.get<HourActivity[]>('/admin/activity-today'),
    ])
      .then(([ov, act]) => {
        setOverview(ov.data);
        setActivity(act.data);
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="shimmer h-7 w-48 rounded-lg mb-2" />
          <div className="shimmer h-4 w-64 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="admin-card p-5">
              <div className="shimmer h-4 w-24 rounded mb-3" />
              <div className="shimmer h-8 w-16 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold" style={{ color: '#2E211C' }}>Przegląd systemu</h2>
        <p className="text-sm mt-0.5" style={{ color: 'rgba(46,33,28,0.45)' }}>
          {new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Stat cards */}
      {overview && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Wszyscy użytkownicy"
            value={overview.totalUsers}
            sub={`+${overview.newThisMonth} w tym miesiącu`}
            gradient="linear-gradient(135deg, rgba(192,98,38,0.12) 0%, rgba(152,70,25,0.08) 100%)"
            dotColor="#C06226"
            icon={
              <svg className="w-6 h-6" style={{ color: '#C06226' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          />
          <StatCard
            label="Oczekujące konta"
            value={overview.pendingCount}
            sub="czekają na aktywację"
            gradient="linear-gradient(135deg, rgba(234,180,100,0.15) 0%, rgba(200,150,60,0.08) 100%)"
            dotColor="#C09020"
            icon={
              <svg className="w-6 h-6" style={{ color: '#C09020' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            label="Testy wypełnione dziś"
            value={overview.testsToday}
            sub="zeruje się o północy"
            gradient="linear-gradient(135deg, rgba(156,184,183,0.18) 0%, rgba(122,158,157,0.10) 100%)"
            dotColor="#7A9E9D"
            icon={
              <svg className="w-6 h-6" style={{ color: '#7A9E9D' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            }
          />
        </div>
      )}

      {/* Activity chart */}
      <div className="admin-card p-6">
        <h3 className="text-base font-semibold mb-1" style={{ color: '#2E211C' }}>
          Aktywność dziś — testy (godzinowo)
        </h3>
        <p className="text-xs mb-5" style={{ color: 'rgba(46,33,28,0.4)' }}>
          Liczba wypełnionych testów w poszczególnych godzinach
        </p>
        {activity.every((h) => h.count === 0) ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📊</div>
            <p className="text-sm" style={{ color: 'rgba(46,33,28,0.4)' }}>Brak aktywności dzisiaj</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={activity} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(221,211,186,0.5)" />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 10, fill: 'rgba(46,33,28,0.4)' }}
                interval={1}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: 'rgba(46,33,28,0.4)' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid rgba(221,211,186,0.8)',
                  background: 'rgba(255,255,255,0.95)',
                  fontSize: 12,
                  color: '#2E211C',
                  boxShadow: '0 4px 16px rgba(46,33,28,0.08)',
                }}
                formatter={(v) => [v, 'Testy']}
              />
              <Bar dataKey="count" fill="#C06226" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
