'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axiosClient from '../../../lib/axiosClient';
import { getRole, clearTokens } from '../../../lib/auth';

interface Organization {
  id: number;
  name: string;
  nip: string | null;
  description: string | null;
  status: 'pending' | 'active' | 'blocked' | 'rejected';
  inviteCode: string | null;
  createdAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Oczekuje',
  active: 'Aktywna',
  blocked: 'Zablokowana',
  rejected: 'Odrzucona',
};

const STATUS_COLOR: Record<string, string> = {
  pending: '#f59e0b',
  active: '#22c55e',
  blocked: '#ef4444',
  rejected: '#94a3b8',
};

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [tab, setTab] = useState<'pending' | 'all'>('pending');

  useEffect(() => {
    const role = getRole();
    if (role !== 'super_admin') {
      router.replace('/super-admin/login');
      return;
    }
    fetchOrgs();
  }, []);

  const fetchOrgs = async () => {
    setLoading(true);
    try {
      const { data } = await axiosClient.get<Organization[]>('/organizations');
      setOrgs(data);
    } catch {
      router.replace('/super-admin/login');
    } finally {
      setLoading(false);
    }
  };

  const action = async (id: number, type: 'approve' | 'reject' | 'block') => {
    setActionLoading(id);
    try {
      await axiosClient.post(`/organizations/${id}/${type}`);
      await fetchOrgs();
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogout = () => {
    clearTokens();
    router.replace('/super-admin/login');
  };

  const displayed = tab === 'pending'
    ? orgs.filter((o) => o.status === 'pending')
    : orgs;

  const pendingCount = orgs.filter((o) => o.status === 'pending').length;

  return (
    <div style={{ minHeight: '100vh', background: '#F0EFF8', fontFamily: 'inherit' }}>

      {/* Header */}
      <div style={{
        background: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(99,102,241,0.12)',
        padding: '0 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 60,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, color: 'white',
          }}>M</div>
          <span style={{ fontWeight: 700, color: '#1e1b4b', fontSize: 15 }}>MoodFlow</span>
          <span style={{
            fontSize: 11, fontWeight: 600, color: '#6366f1',
            background: 'rgba(99,102,241,0.1)', padding: '2px 8px', borderRadius: 99,
            border: '1px solid rgba(99,102,241,0.2)',
          }}>PANEL WŁAŚCICIELA</span>
        </div>
        <button
          onClick={handleLogout}
          style={{
            fontSize: 13, color: 'rgba(30,27,75,0.5)', background: 'none',
            border: 'none', cursor: 'pointer', padding: '4px 8px',
          }}
        >
          Wyloguj
        </button>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'Wszystkie firmy', value: orgs.length, color: '#6366f1' },
            { label: 'Oczekują na akceptację', value: pendingCount, color: '#f59e0b' },
            { label: 'Aktywne firmy', value: orgs.filter(o => o.status === 'active').length, color: '#22c55e' },
          ].map((s) => (
            <div key={s.label} style={{
              background: 'rgba(255,255,255,0.9)', borderRadius: 16,
              padding: '20px 24px', border: '1px solid rgba(99,102,241,0.08)',
              boxShadow: '0 2px 12px rgba(79,70,229,0.06)',
            }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 13, color: 'rgba(30,27,75,0.5)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
          {(['pending', 'all'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
                background: tab === t ? '#6366f1' : 'rgba(255,255,255,0.8)',
                color: tab === t ? 'white' : 'rgba(30,27,75,0.5)',
                transition: 'all 0.15s',
              }}
            >
              {t === 'pending' ? `Oczekujące (${pendingCount})` : 'Wszystkie firmy'}
            </button>
          ))}
        </div>

        {/* Table */}
        <div style={{
          background: 'rgba(255,255,255,0.9)', borderRadius: 16,
          border: '1px solid rgba(99,102,241,0.08)',
          boxShadow: '0 2px 12px rgba(79,70,229,0.06)',
          overflow: 'hidden',
        }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'rgba(30,27,75,0.4)' }}>
              Ładowanie...
            </div>
          ) : displayed.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'rgba(30,27,75,0.4)', fontSize: 14 }}>
              {tab === 'pending' ? 'Brak oczekujących rejestracji' : 'Brak firm w systemie'}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(99,102,241,0.08)' }}>
                  {['Firma', 'NIP', 'Kod zaproszenia', 'Data zgłoszenia', 'Status', 'Akcje'].map((h) => (
                    <th key={h} style={{
                      padding: '12px 16px', textAlign: 'left',
                      fontSize: 11, fontWeight: 700, color: 'rgba(30,27,75,0.4)',
                      letterSpacing: '0.05em', textTransform: 'uppercase',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.map((org) => (
                  <tr key={org.id} style={{ borderBottom: '1px solid rgba(99,102,241,0.05)' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#1e1b4b', fontSize: 14 }}>{org.name}</div>
                      {org.description && (
                        <div style={{ fontSize: 12, color: 'rgba(30,27,75,0.4)', marginTop: 2 }}>
                          {org.description.slice(0, 50)}{org.description.length > 50 ? '...' : ''}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: 'rgba(30,27,75,0.6)' }}>
                      {org.nip ?? '—'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {org.inviteCode ? (
                        <code style={{
                          fontSize: 12, background: 'rgba(99,102,241,0.08)',
                          color: '#6366f1', padding: '2px 8px', borderRadius: 6,
                          fontFamily: 'monospace',
                        }}>{org.inviteCode}</code>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: 'rgba(30,27,75,0.5)' }}>
                      {new Date(org.createdAt).toLocaleDateString('pl-PL')}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        fontSize: 12, fontWeight: 600,
                        color: STATUS_COLOR[org.status],
                        background: `${STATUS_COLOR[org.status]}18`,
                        padding: '3px 10px', borderRadius: 99,
                        border: `1px solid ${STATUS_COLOR[org.status]}30`,
                      }}>
                        {STATUS_LABEL[org.status]}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {org.status === 'pending' && (
                          <>
                            <button
                              onClick={() => action(org.id, 'approve')}
                              disabled={actionLoading === org.id}
                              style={{
                                fontSize: 12, fontWeight: 600, padding: '5px 12px',
                                borderRadius: 8, border: 'none', cursor: 'pointer',
                                background: '#22c55e', color: 'white',
                                opacity: actionLoading === org.id ? 0.5 : 1,
                              }}
                            >Zatwierdź</button>
                            <button
                              onClick={() => action(org.id, 'reject')}
                              disabled={actionLoading === org.id}
                              style={{
                                fontSize: 12, fontWeight: 600, padding: '5px 12px',
                                borderRadius: 8, border: 'none', cursor: 'pointer',
                                background: '#94a3b8', color: 'white',
                                opacity: actionLoading === org.id ? 0.5 : 1,
                              }}
                            >Odrzuć</button>
                          </>
                        )}
                        {org.status === 'active' && (
                          <button
                            onClick={() => action(org.id, 'block')}
                            disabled={actionLoading === org.id}
                            style={{
                              fontSize: 12, fontWeight: 600, padding: '5px 12px',
                              borderRadius: 8, border: 'none', cursor: 'pointer',
                              background: '#ef4444', color: 'white',
                              opacity: actionLoading === org.id ? 0.5 : 1,
                            }}
                          >Zablokuj</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
