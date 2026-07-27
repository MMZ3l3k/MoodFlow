'use client';

// PU-13: przegląd alertów dobrostanu — lista aktywnych alertów organizacji,
// oznaczanie jako obsłużone i notatki HR. Pusty stan zgodny ze scenariuszem.
import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, TrendingDown, CheckCircle2, StickyNote } from 'lucide-react';
import axiosClient from '../../../../lib/axiosClient';

interface WellbeingAlert {
  id: number;
  department: string;
  type: 'HIGH_LOAD' | 'WORSENING';
  wellbeingIndex: number | null;
  participants: number;
  deptSize: number;
  status: 'ACTIVE' | 'HANDLED' | 'RESOLVED';
  note: string | null;
  handledAt: string | null;
  createdAt: string;
}

const TYPE_META = {
  HIGH_LOAD: { label: 'Wysokie obciążenie', icon: AlertTriangle, bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', sub: 'text-red-500' },
  WORSENING: { label: 'Pogorszenie trendu', icon: TrendingDown, bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', sub: 'text-amber-600' },
} as const;

const STATUS_LABEL: Record<WellbeingAlert['status'], string> = {
  ACTIVE: 'Aktywny',
  HANDLED: 'Obsłużony',
  RESOLVED: 'Wygaszony',
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<WellbeingAlert[] | null>(null);
  const [includeClosed, setIncludeClosed] = useState(false);
  const [noteDraft, setNoteDraft] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (closed: boolean) => {
    try {
      const res = await axiosClient.get<WellbeingAlert[]>(`/alerts?includeClosed=${closed}`);
      setAlerts(res.data);
      setError(null);
    } catch {
      setError('Nie udało się pobrać alertów. Spróbuj ponownie.');
      setAlerts([]);
    }
  }, []);

  useEffect(() => { load(includeClosed); }, [load, includeClosed]);

  const update = async (id: number, changes: { status?: 'HANDLED'; note?: string }) => {
    setBusyId(id);
    try {
      await axiosClient.patch(`/alerts/${id}`, changes);
      await load(includeClosed);
    } catch {
      setError('Nie udało się zaktualizować alertu. Spróbuj ponownie.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Alerty dobrostanu</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Automatycznie generowane sygnały ryzyka dla działów spełniających próg anonimizacji (k=5)
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-500 select-none">
          <input
            type="checkbox"
            checked={includeClosed}
            onChange={(e) => setIncludeClosed(e.target.checked)}
            className="rounded border-gray-300"
          />
          Pokaż obsłużone i wygaszone
        </label>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
      )}

      {alerts === null ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm p-5 animate-pulse h-28" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Brak alertów wymagających uwagi</p>
          <p className="text-sm text-gray-400 mt-1">
            Żaden dział nie przekracza obecnie progów ryzyka.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => {
            const meta = TYPE_META[a.type];
            const Icon = meta.icon;
            const closed = a.status !== 'ACTIVE';
            return (
              <div
                key={a.id}
                className={`rounded-2xl border px-5 py-4 ${closed ? 'bg-gray-50 border-gray-200 opacity-75' : `${meta.bg} ${meta.border}`}`}
              >
                <div className="flex items-start gap-3">
                  <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${closed ? 'text-gray-400' : meta.text}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm font-semibold ${closed ? 'text-gray-600' : meta.text}`}>
                        {meta.label} — {a.department}
                      </p>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full border ${closed ? 'border-gray-300 text-gray-500' : `${meta.border} ${meta.sub}`}`}>
                        {STATUS_LABEL[a.status]}
                      </span>
                    </div>
                    <p className={`text-xs mt-0.5 ${closed ? 'text-gray-400' : meta.sub}`}>
                      Indeks dobrostanu: {a.wellbeingIndex ?? '—'}/100 · {a.participants} uczestników z {a.deptSize} ·
                      utworzono {new Date(a.createdAt).toLocaleDateString('pl-PL')}
                      {a.handledAt && ` · obsłużono ${new Date(a.handledAt).toLocaleDateString('pl-PL')}`}
                    </p>

                    {a.note && (
                      <p className="text-xs mt-2 flex items-start gap-1.5 text-gray-600">
                        <StickyNote className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span className="whitespace-pre-wrap">{a.note}</span>
                      </p>
                    )}

                    {!closed && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          placeholder="Dodaj notatkę (np. podjęte działania)…"
                          value={noteDraft[a.id] ?? ''}
                          onChange={(e) => setNoteDraft((d) => ({ ...d, [a.id]: e.target.value }))}
                          className="flex-1 min-w-[220px] text-xs rounded-lg border border-gray-300 bg-white px-3 py-2"
                          maxLength={1000}
                        />
                        <button
                          onClick={() => update(a.id, { note: noteDraft[a.id] ?? '' })}
                          disabled={busyId === a.id || !(noteDraft[a.id] ?? '').trim()}
                          className="text-xs px-3 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                          Zapisz notatkę
                        </button>
                        <button
                          onClick={() => update(a.id, { status: 'HANDLED', note: (noteDraft[a.id] ?? '').trim() || undefined })}
                          disabled={busyId === a.id}
                          className="text-xs px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          Oznacz jako obsłużony
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
