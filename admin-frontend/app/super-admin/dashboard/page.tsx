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

interface PlatformStats {
  organizations: { total: number; active: number; pending: number };
  activeEmployees: number;
  totalActiveUsers: number;
  completedTests: number;
  avgCompletionTimeHours: number | null;
}

interface ActivityPoint { day: string; count: number }

interface AuditEntry {
  id: number;
  action: string;
  actorUserId: number | null;
  organizationId: number | null;
  entityType: string | null;
  entityId: number | null;
  metadata: Record<string, unknown> | null;
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

const AUDIT_LABEL: Record<string, string> = {
  LOGIN_SUCCESS: 'Udane logowanie',
  LOGIN_FAILED: 'Nieudane logowanie',
  USER_APPROVED: 'Zatwierdzenie konta',
  USER_REJECTED: 'Odrzucenie konta',
  USER_SUSPENDED: 'Zawieszenie konta',
  USER_REACTIVATED: 'Przywrócenie konta',
  USER_ROLE_CHANGED: 'Zmiana roli',
  ORGANIZATION_APPROVED: 'Zatwierdzenie firmy',
  ORGANIZATION_REJECTED: 'Odrzucenie firmy',
  ORGANIZATION_SUSPENDED: 'Blokada firmy',
  ORGANIZATION_UNBLOCKED: 'Odblokowanie firmy',
  ASSIGNMENT_CREATED: 'Przypisanie testu',
  PASSWORD_CHANGED: 'Zmiana hasła',
  ACCOUNT_DELETED: 'Usunięcie konta (RODO)',
  PROFILE_UPDATED: 'Edycja profilu',
  REPORT_EXPORTED: 'Eksport raportu',
  ALERT_HANDLED: 'Obsłużenie alertu',
  ACCESS_DENIED: 'Odmowa dostępu',
};

const btn = (bg: string, disabled: boolean): React.CSSProperties => ({
  fontSize: 12, fontWeight: 600, padding: '5px 12px',
  borderRadius: 8, border: 'none', cursor: 'pointer',
  background: bg, color: 'white',
  opacity: disabled ? 0.5 : 1,
});

export default function SuperAdminDashboardPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [activity, setActivity] = useState<ActivityPoint[]>([]);
  const [audit, setAudit] = useState<AuditEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [tab, setTab] = useState<'pending' | 'all' | 'audit'>('pending');
  const [statsDays, setStatsDays] = useState<number | 'all'>('all');
  // PU-21/PU-22: okno z uzasadnieniem decyzji (odrzucenie / blokada)
  const [reasonModal, setReasonModal] = useState<{ org: Organization; type: 'reject' | 'block' } | null>(null);
  const [reasonText, setReasonText] = useState('');

  useEffect(() => {
    const role = getRole();
    if (role !== 'super_admin') {
      router.replace('/super-admin/login');
      return;
    }
    fetchOrgs();
  }, []);

  useEffect(() => { fetchStats(statsDays); }, [statsDays]);

  useEffect(() => {
    if (tab === 'audit' && audit === null) {
      axiosClient.get<AuditEntry[]>('/audit?limit=200')
        .then((res) => setAudit(res.data))
        .catch(() => setAudit([]));
    }
  }, [tab]);

  const fetchStats = async (days: number | 'all') => {
    // PU-23: metryki platformy z opcjonalnym filtrem zakresu czasu
    try {
      const from = days === 'all' ? undefined : new Date(Date.now() - days * 86400000).toISOString();
      const { data } = await axiosClient.get<PlatformStats>('/admin/platform-stats', { params: from ? { from } : {} });
      setStats(data);
    } catch { setStats(null); }
    try {
      const { data } = await axiosClient.get<ActivityPoint[]>('/admin/platform-activity?days=30');
      setActivity(data);
    } catch { setActivity([]); }
  };

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

  const action = async (id: number, type: 'approve' | 'reject' | 'block' | 'unblock', reason?: string) => {
    setActionLoading(id);
    try {
      await axiosClient.post(`/organizations/${id}/${type}`, reason?.trim() ? { reason: reason.trim() } : {});
      await fetchOrgs();
      setAudit(null);
    } finally {
      setActionLoading(null);
    }
  };

  const submitReason = async () => {
    if (!reasonModal) return;
    const { org, type } = reasonModal;
    setReasonModal(null);
    await action(org.id, type, reasonText);
    setReasonText('');
  };

  const handleLogout = () => {
    clearTokens();
    router.replace('/super-admin/login');
  };

  const displayed = tab === 'pending' ? orgs.filter((o) => o.status === 'pending') : orgs;
  const pendingCount = orgs.filter((o) => o.status === 'pending').length;
  const maxActivity = Math.max(1, ...activity.map((a) => a.count));

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

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>

        {/* Filtr zakresu statystyk (PU-23, krok 4) */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10, gap: 6 }}>
          {([['all', 'Całość'], [7, '7 dni'], [30, '30 dni'], [90, '90 dni']] as const).map(([v, label]) => (
            <button
              key={String(v)}
              onClick={() => setStatsDays(v as number | 'all')}
              style={{
                padding: '4px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600,
                background: statsDays === v ? '#6366f1' : 'rgba(255,255,255,0.8)',
                color: statsDays === v ? 'white' : 'rgba(30,27,75,0.5)',
              }}
            >{label}</button>
          ))}
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginBottom: 20 }}>
          {[
            { label: 'Wszystkie firmy', value: orgs.length, color: '#6366f1' },
            { label: 'Oczekują na akceptację', value: pendingCount, color: '#f59e0b' },
            { label: 'Aktywne firmy', value: orgs.filter(o => o.status === 'active').length, color: '#22c55e' },
            ...(stats ? [
              { label: 'Aktywni pracownicy', value: stats.activeEmployees, color: '#0ea5e9' },
              { label: statsDays === 'all' ? 'Wypełnione testy' : `Testy (${statsDays} dni)`, value: stats.completedTests, color: '#8b5cf6' },
              { label: 'Śr. czas wypełnienia', value: stats.avgCompletionTimeHours !== null ? `${stats.avgCompletionTimeHours} h` : '—', color: '#14b8a6' },
            ] : []),
          ].map((s) => (
            <div key={s.label} style={{
              background: 'rgba(255,255,255,0.9)', borderRadius: 16,
              padding: '20px 24px', border: '1px solid rgba(99,102,241,0.08)',
              boxShadow: '0 2px 12px rgba(79,70,229,0.06)',
            }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 13, color: 'rgba(30,27,75,0.5)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Wykres aktywności platformy (PU-23) */}
        {activity.length > 0 && (
          <div style={{
            background: 'rgba(255,255,255,0.9)', borderRadius: 16,
            padding: '18px 24px 12px', border: '1px solid rgba(99,102,241,0.08)',
            boxShadow: '0 2px 12px rgba(79,70,229,0.06)', marginBottom: 32,
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(30,27,75,0.6)', marginBottom: 10 }}>
              Wypełnione testy — ostatnie 30 dni
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 72 }}>
              {activity.map((p) => (
                <div
                  key={p.day}
                  title={`${p.day}: ${p.count}`}
                  style={{
                    flex: 1,
                    height: `${Math.max(4, (p.count / maxActivity) * 100)}%`,
                    background: p.count > 0 ? 'linear-gradient(180deg, #818cf8 0%, #6366f1 100%)' : 'rgba(99,102,241,0.12)',
                    borderRadius: 3,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
          {(['pending', 'all', 'audit'] as const).map((t) => (
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
              {t === 'pending' ? `Oczekujące (${pendingCount})` : t === 'all' ? 'Wszystkie firmy' : 'Dziennik audytu'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{
          background: 'rgba(255,255,255,0.9)', borderRadius: 16,
          border: '1px solid rgba(99,102,241,0.08)',
          boxShadow: '0 2px 12px rgba(79,70,229,0.06)',
          overflow: 'hidden',
        }}>
          {tab === 'audit' ? (
            audit === null ? (
              <div style={{ padding: 48, textAlign: 'center', color: 'rgba(30,27,75,0.4)' }}>Ładowanie...</div>
            ) : audit.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: 'rgba(30,27,75,0.4)', fontSize: 14 }}>
                Dziennik audytu jest pusty
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(99,102,241,0.08)' }}>
                    {['Data', 'Zdarzenie', 'Org.', 'Wykonawca', 'Szczegóły'].map((h) => (
                      <th key={h} style={{
                        padding: '12px 16px', textAlign: 'left',
                        fontSize: 11, fontWeight: 700, color: 'rgba(30,27,75,0.4)',
                        letterSpacing: '0.05em', textTransform: 'uppercase',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {audit.map((e) => (
                    <tr key={e.id} style={{ borderBottom: '1px solid rgba(99,102,241,0.05)' }}>
                      <td style={{ padding: '10px 16px', fontSize: 12, color: 'rgba(30,27,75,0.5)', whiteSpace: 'nowrap' }}>
                        {new Date(e.createdAt).toLocaleString('pl-PL')}
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#1e1b4b' }}>
                        {AUDIT_LABEL[e.action] ?? e.action}
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 12, color: 'rgba(30,27,75,0.5)' }}>{e.organizationId ?? '—'}</td>
                      <td style={{ padding: '10px 16px', fontSize: 12, color: 'rgba(30,27,75,0.5)' }}>{e.actorUserId ?? '—'}</td>
                      <td style={{ padding: '10px 16px', fontSize: 12, color: 'rgba(30,27,75,0.4)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.metadata ? Object.entries(e.metadata).filter(([, v]) => v !== null && typeof v !== 'object').map(([k, v]) => `${k}: ${v}`).join(' · ') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : loading ? (
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
                              onClick={() => { if (window.confirm(`Zatwierdzić rejestrację firmy „${org.name}”? Konto administratora zostanie aktywowane.`)) action(org.id, 'approve'); }}
                              disabled={actionLoading === org.id}
                              style={btn('#22c55e', actionLoading === org.id)}
                            >Zatwierdź</button>
                            <button
                              onClick={() => { setReasonText(''); setReasonModal({ org, type: 'reject' }); }}
                              disabled={actionLoading === org.id}
                              style={btn('#94a3b8', actionLoading === org.id)}
                            >Odrzuć</button>
                          </>
                        )}
                        {org.status === 'active' && (
                          <button
                            onClick={() => { setReasonText(''); setReasonModal({ org, type: 'block' }); }}
                            disabled={actionLoading === org.id}
                            style={btn('#ef4444', actionLoading === org.id)}
                          >Zablokuj</button>
                        )}
                        {org.status === 'blocked' && (
                          <button
                            onClick={() => action(org.id, 'unblock')}
                            disabled={actionLoading === org.id}
                            style={btn('#22c55e', actionLoading === org.id)}
                          >Odblokuj</button>
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

      {/* Modal potwierdzenia z uzasadnieniem (PU-21 odrzucenie / PU-22 blokada) */}
      {reasonModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(30,27,75,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
        }}>
          <div style={{
            background: 'white', borderRadius: 16, padding: 24, width: 420, maxWidth: '90vw',
            boxShadow: '0 12px 40px rgba(30,27,75,0.25)',
          }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1e1b4b', marginBottom: 6 }}>
              {reasonModal.type === 'block' ? 'Zablokować firmę?' : 'Odrzucić rejestrację?'}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(30,27,75,0.55)', marginBottom: 14 }}>
              {reasonModal.type === 'block'
                ? <>Użytkownicy firmy <b>{reasonModal.org.name}</b> natychmiast utracą dostęp do systemu.</>
                : <>Administrator firmy <b>{reasonModal.org.name}</b> otrzyma e-mail z decyzją i uzasadnieniem.</>}
            </div>
            <textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder="Uzasadnienie (opcjonalne, trafi do dziennika audytu)"
              maxLength={500}
              rows={3}
              style={{
                width: '100%', fontSize: 13, borderRadius: 10,
                border: '1px solid rgba(99,102,241,0.25)', padding: '10px 12px',
                resize: 'vertical', fontFamily: 'inherit',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
              <button
                onClick={() => setReasonModal(null)}
                style={{ ...btn('rgba(30,27,75,0.08)', false), color: 'rgba(30,27,75,0.6)' }}
              >Anuluj</button>
              <button
                onClick={submitReason}
                style={btn(reasonModal.type === 'block' ? '#ef4444' : '#94a3b8', false)}
              >{reasonModal.type === 'block' ? 'Zablokuj firmę' : 'Odrzuć rejestrację'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
