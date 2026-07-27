'use client';

// Dziennik audytu firmy — konsument endpointu GET /audit (administrator widzi
// wyłącznie zdarzenia własnej organizacji; filtrowanie egzekwuje backend).
import { useEffect, useState } from 'react';
import { ScrollText } from 'lucide-react';
import axiosClient from '../../../lib/axiosClient';

interface AuditEntry {
  id: number;
  action: string;
  actorUserId: number | null;
  entityType: string | null;
  entityId: number | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  LOGIN_SUCCESS: 'Udane logowanie',
  LOGIN_FAILED: 'Nieudane logowanie',
  USER_APPROVED: 'Zatwierdzenie konta',
  USER_REJECTED: 'Odrzucenie konta',
  USER_SUSPENDED: 'Zawieszenie konta',
  USER_REACTIVATED: 'Przywrócenie konta',
  USER_DELETED: 'Usunięcie konta',
  USER_ROLE_CHANGED: 'Zmiana roli',
  ORGANIZATION_APPROVED: 'Zatwierdzenie firmy',
  ORGANIZATION_REJECTED: 'Odrzucenie firmy',
  ORGANIZATION_SUSPENDED: 'Blokada firmy',
  ORGANIZATION_UNBLOCKED: 'Odblokowanie firmy',
  ASSIGNMENT_CREATED: 'Przypisanie testu',
  ASSIGNMENT_DELETED: 'Usunięcie przypisania',
  PASSWORD_CHANGED: 'Zmiana hasła',
  ACCOUNT_DELETED: 'Usunięcie konta (RODO)',
  PROFILE_UPDATED: 'Edycja profilu',
  REPORT_EXPORTED: 'Eksport raportu',
  ALERT_HANDLED: 'Obsłużenie alertu',
  ACCESS_DENIED: 'Odmowa dostępu',
};

function metaSummary(meta: Record<string, unknown> | null): string {
  if (!meta) return '';
  return Object.entries(meta)
    .filter(([, v]) => v !== null && v !== undefined && typeof v !== 'object')
    .slice(0, 4)
    .map(([k, v]) => `${k}: ${v}`)
    .join(' · ');
}

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    axiosClient
      .get<AuditEntry[]>('/audit?limit=200')
      .then((res) => setEntries(res.data))
      .catch(() => setError('Nie udało się pobrać dziennika audytu.'));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Dziennik audytu</h2>
        <p className="text-sm text-gray-400 mt-0.5">
          Rejestr zdarzeń bezpieczeństwa organizacji (model append-only — wpisów nie można modyfikować)
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
      )}

      {entries === null && !error ? (
        <div className="bg-white rounded-2xl shadow-sm p-5 animate-pulse h-64" />
      ) : entries && entries.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
          <ScrollText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Dziennik nie zawiera jeszcze żadnych zdarzeń.</p>
        </div>
      ) : entries ? (
        <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                <th className="px-5 py-3 font-medium">Data</th>
                <th className="px-5 py-3 font-medium">Zdarzenie</th>
                <th className="px-5 py-3 font-medium">Wykonawca</th>
                <th className="px-5 py-3 font-medium">Obiekt</th>
                <th className="px-5 py-3 font-medium">Szczegóły</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                  <td className="px-5 py-3 whitespace-nowrap text-gray-500">
                    {new Date(e.createdAt).toLocaleString('pl-PL')}
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-medium text-gray-700">{ACTION_LABELS[e.action] ?? e.action}</span>
                  </td>
                  <td className="px-5 py-3 text-gray-500">{e.actorUserId ?? '—'}</td>
                  <td className="px-5 py-3 text-gray-500">
                    {e.entityType ? `${e.entityType} #${e.entityId ?? '—'}` : '—'}
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs max-w-[360px] truncate" title={metaSummary(e.metadata)}>
                    {metaSummary(e.metadata) || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
