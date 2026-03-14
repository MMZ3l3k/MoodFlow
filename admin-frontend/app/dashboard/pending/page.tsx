'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axiosClient from '../../../lib/axiosClient';
import { User } from '../../../types';
import { getAccessToken } from '../../../lib/auth';

export default function PendingPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    if (!getAccessToken()) { router.push('/login'); return; }
    axiosClient.get<User[]>('/users')
      .then((r) => setUsers(r.data.filter((u) => u.status === 'pending')))
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  const updateStatus = async (id: number, status: 'active' | 'rejected') => {
    setActionLoading(id);
    try {
      await axiosClient.patch(`/users/${id}/status`, { status });
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (loading) return <p className="text-gray-400 text-sm">Ładowanie...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Oczekujące konta</h2>
        <p className="text-sm text-gray-400 mt-0.5">Konta czekające na zatwierdzenie przez administratora</p>
      </div>

      {users.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-gray-400 text-sm">
          Brak oczekujących kont
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-5 py-3 text-left text-gray-500 font-medium">Imię i nazwisko</th>
                <th className="px-5 py-3 text-left text-gray-500 font-medium">Email</th>
                <th className="px-5 py-3 text-left text-gray-500 font-medium">Dział</th>
                <th className="px-5 py-3 text-left text-gray-500 font-medium">Data zgłoszenia</th>
                <th className="px-5 py-3 text-left text-gray-500 font-medium">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-800">{user.firstName} {user.lastName}</td>
                  <td className="px-5 py-3 text-gray-500">{user.email}</td>
                  <td className="px-5 py-3 text-gray-500">{user.department ?? '—'}</td>
                  <td className="px-5 py-3 text-gray-500">{formatDate(user.createdAt)}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateStatus(user.id, 'active')}
                        disabled={actionLoading === user.id}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg disabled:opacity-50 transition"
                      >
                        Zatwierdź
                      </button>
                      <button
                        onClick={() => updateStatus(user.id, 'rejected')}
                        disabled={actionLoading === user.id}
                        className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs rounded-lg disabled:opacity-50 transition"
                      >
                        Odrzuć
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
