'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axiosClient from '../../../lib/axiosClient';
import { User } from '../../../types';
import { getAccessToken } from '../../../lib/auth';

const roleLabels: Record<string, string> = { employee: 'Pracownik', hr: 'HR', admin: 'Admin' };

type ActivityFilter = 'all' | 'online' | 'offline' | 'pending' | 'last24h';

function OnlineBadge({ user }: { user: User }) {
  if (user.status === 'pending') {
    return <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />Oczekuje
    </span>;
  }
  if (user.status === 'rejected') {
    return <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />Odrzucony
    </span>;
  }
  if (user.isOnline) {
    return <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />Aktywny
    </span>;
  }
  return <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">
    <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" />Offline
  </span>;
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all');

  const fetchUsers = useCallback(() => {
    if (!getAccessToken()) { router.push('/login'); return; }
    axiosClient.get<User[]>('/users')
      .then((r) => setUsers(r.data))
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    fetchUsers();
    const interval = setInterval(fetchUsers, 30000);
    return () => clearInterval(interval);
  }, [fetchUsers]);

  const departments = useMemo(() => {
    const set = new Set(users.map((u) => u.department).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [users]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const h24 = 24 * 60 * 60 * 1000;
    return users.filter((u) => {
      const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
      if (search && !fullName.includes(search.toLowerCase())) return false;
      if (deptFilter && u.department !== deptFilter) return false;
      if (activityFilter === 'online' && !u.isOnline) return false;
      if (activityFilter === 'offline' && (u.isOnline || u.status !== 'active')) return false;
      if (activityFilter === 'pending' && u.status !== 'pending') return false;
      if (activityFilter === 'last24h') {
        if (!u.lastSeenAt) return false;
        if (now - new Date(u.lastSeenAt).getTime() > h24) return false;
      }
      return true;
    });
  }, [users, search, deptFilter, activityFilter]);

  const formatLastSeen = (iso?: string) => {
    if (!iso) return '—';
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'przed chwilą';
    if (m < 60) return `${m} min temu`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} h temu`;
    return new Date(iso).toLocaleDateString('pl-PL');
  };

  if (loading) return <p className="text-gray-400 text-sm">Ładowanie...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Użytkownicy</h2>
          <p className="text-sm text-gray-400 mt-0.5">Wszyscy użytkownicy systemu ({users.length})</p>
        </div>
        <button
          onClick={fetchUsers}
          className="text-xs text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded-lg px-3 py-1.5"
        >
          Odśwież
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Szukaj po imieniu lub nazwisku..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-64"
        />
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="">Wszystkie działy</option>
          {departments.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select
          value={activityFilter}
          onChange={(e) => setActivityFilter(e.target.value as ActivityFilter)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="all">Wszystkie statusy</option>
          <option value="online">Aktywni teraz</option>
          <option value="offline">Offline</option>
          <option value="pending">Oczekujące</option>
          <option value="last24h">Aktywni w ciągu 24h</option>
        </select>
        {(search || deptFilter || activityFilter !== 'all') && (
          <button
            onClick={() => { setSearch(''); setDeptFilter(''); setActivityFilter('all'); }}
            className="text-xs text-indigo-600 hover:text-indigo-800"
          >
            Wyczyść filtry
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-10">Brak wyników</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-5 py-3 text-left text-gray-500 font-medium">Imię i nazwisko</th>
                <th className="px-5 py-3 text-left text-gray-500 font-medium">Email</th>
                <th className="px-5 py-3 text-left text-gray-500 font-medium">Dział</th>
                <th className="px-5 py-3 text-left text-gray-500 font-medium">Rola</th>
                <th className="px-5 py-3 text-left text-gray-500 font-medium">Status</th>
                <th className="px-5 py-3 text-left text-gray-500 font-medium">Ostatnia aktywność</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-800">{user.firstName} {user.lastName}</td>
                  <td className="px-5 py-3 text-gray-500">{user.email}</td>
                  <td className="px-5 py-3 text-gray-500">{user.department ?? '—'}</td>
                  <td className="px-5 py-3 text-gray-500">{roleLabels[user.role] ?? user.role}</td>
                  <td className="px-5 py-3"><OnlineBadge user={user} /></td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{formatLastSeen(user.lastSeenAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
