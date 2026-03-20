'use client';
import { useEffect, useState, useMemo } from 'react';
import axiosClient from '../../../lib/axiosClient';

interface Assessment {
  id: number;
  code: string;
  name: string;
  description: string;
  questionCount: number;
}

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  department: string | null;
}

interface Assignment {
  id: number;
  assessmentId: number;
  assessment: { name: string; code: string };
  targetType: 'ALL' | 'DEPARTMENT' | 'USER';
  targetUserId: number | null;
  targetDepartment: string | null;
  availableFrom: string;
  availableTo: string;
  assignedBy: { firstName: string; lastName: string };
  createdAt: string;
}

const DURATION_OPTIONS = [
  { value: 24,  label: '24 godziny' },
  { value: 48,  label: '48 godzin'  },
  { value: 72,  label: '3 dni'      },
  { value: 168, label: '7 dni'      },
];

const TARGET_OPTIONS = [
  { value: 'ALL',        label: 'Wszyscy pracownicy', icon: '👥' },
  { value: 'DEPARTMENT', label: 'Wybrany dział',      icon: '🏢' },
  { value: 'USER',       label: 'Konkretny pracownik',icon: '👤' },
] as const;

function timeRemaining(availableTo: string) {
  const diff = new Date(availableTo).getTime() - Date.now();
  if (diff <= 0) return { expired: true, label: 'Wygasło', pct: 0 };
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const label = h >= 24
    ? `${Math.floor(h / 24)}d ${h % 24}h`
    : h > 0 ? `${h}h ${m}m` : `${m} min`;
  return { expired: false, label, pct: 0 };
}

function timePct(from: string, to: string) {
  const total = new Date(to).getTime() - new Date(from).getTime();
  const elapsed = Date.now() - new Date(from).getTime();
  return Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));
}

function formatDt(iso: string) {
  return new Date(iso).toLocaleDateString('pl-PL', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function AssessmentsManagePage() {
  const [assessments, setAssessments]   = useState<Assessment[]>([]);
  const [assignments, setAssignments]   = useState<Assignment[]>([]);
  const [employees, setEmployees]       = useState<Employee[]>([]);
  const [loading, setLoading]           = useState(true);
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [success, setSuccess]           = useState<string | null>(null);
  const [showExpired, setShowExpired]   = useState(false);
  const [empSearch, setEmpSearch]       = useState('');
  const [mounted, setMounted]           = useState(false);

  const [form, setForm] = useState({
    assessmentId: '',
    targetType: 'ALL' as 'ALL' | 'DEPARTMENT' | 'USER',
    targetDepartment: '',
    targetUserId: '',
    durationHours: 24,
  });

  useEffect(() => { setMounted(true); fetchData(); }, []);

  async function fetchData() {
    try {
      const [asmRes, assignRes, empRes] = await Promise.all([
        axiosClient.get<Assessment[]>('/assessments'),
        axiosClient.get<Assignment[]>('/assessments/assignments'),
        axiosClient.get<Employee[]>('/users'),
      ]);
      setAssessments(asmRes.data);
      setAssignments(assignRes.data);
      setEmployees(empRes.data.filter((u: any) => u.status === 'active' && u.role === 'employee'));
    } catch {
      setError('Błąd ładowania danych');
    } finally {
      setLoading(false);
    }
  }

  const departments = useMemo(() => {
    const set = new Set(employees.map((e) => e.department ?? '').filter(Boolean));
    return Array.from(set).sort();
  }, [employees]);

  const filteredEmps = useMemo(() => {
    const q = empSearch.toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (e) =>
        e.firstName.toLowerCase().includes(q) ||
        e.lastName.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q)
    );
  }, [employees, empSearch]);

  const activeAssignments  = assignments.filter((a) => new Date(a.availableTo) > new Date());
  const expiredAssignments = assignments.filter((a) => new Date(a.availableTo) <= new Date());

  function setField<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSuccess(null);

    if (!form.assessmentId) { setError('Wybierz test'); return; }
    if (form.targetType === 'DEPARTMENT' && !form.targetDepartment) { setError('Wybierz dział'); return; }
    if (form.targetType === 'USER' && !form.targetUserId) { setError('Wybierz pracownika'); return; }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        assessmentId: Number(form.assessmentId),
        targetType: form.targetType,
        durationHours: form.durationHours,
      };
      if (form.targetType === 'DEPARTMENT') payload.targetDepartment = form.targetDepartment;
      if (form.targetType === 'USER') payload.targetUserId = Number(form.targetUserId);

      await axiosClient.post('/assessments/assignments', payload);
      const hrs = form.durationHours;
      const durLabel = hrs < 24 ? `${hrs}h` : hrs === 24 ? '24h' : hrs < 168 ? `${hrs / 24} dni` : '7 dni';
      setSuccess(`Test został zaplanowany — pracownicy mają ${durLabel} na jego wykonanie.`);
      setForm({ assessmentId: '', targetType: 'ALL', targetDepartment: '', targetUserId: '', durationHours: 24 });
      setEmpSearch('');
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Błąd tworzenia przypisania');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Czy na pewno chcesz usunąć to przypisanie?')) return;
    try {
      await axiosClient.delete(`/assessments/assignments/${id}`);
      setAssignments((prev) => prev.filter((a) => a.id !== id));
    } catch {
      alert('Błąd usuwania przypisania');
    }
  }

  const selectedAssessment = assessments.find((a) => String(a.id) === form.assessmentId);
  const selectedEmployee   = employees.find((e) => String(e.id) === form.targetUserId);

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Zaplanuj test</h1>
        <p className="text-gray-500 text-sm mt-0.5">Przypisz test psychologiczny do pracowników, działu lub całej firmy</p>
      </div>

      {/* ── Form ──────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

        {/* Form header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-4">
          <h2 className="text-white font-semibold text-lg">Nowe przypisanie testu</h2>
          <p className="text-indigo-200 text-sm mt-0.5">Wypełnij poniższe pola i kliknij „Zaplanuj"</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">

          {/* Step 1 — choose test */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center">1</span>
              <span className="text-sm font-semibold text-gray-700">Wybierz test</span>
            </div>
            <select
              required
              value={form.assessmentId}
              onChange={(e) => setField('assessmentId', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50 appearance-none cursor-pointer"
            >
              <option value="">— Wybierz test —</option>
              {assessments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.code}) — {a.questionCount} pytań
                </option>
              ))}
            </select>

            {/* Test detail card */}
            {selectedAssessment && (
              <div className="mt-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex items-start gap-3">
                <span className="text-2xl">📋</span>
                <div>
                  <p className="font-semibold text-indigo-800 text-sm">{selectedAssessment.name}</p>
                  <p className="text-indigo-600 text-xs mt-0.5">{selectedAssessment.description}</p>
                  <p className="text-indigo-500 text-xs mt-1">Kod: <b>{selectedAssessment.code}</b> · {selectedAssessment.questionCount} pytań</p>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100" />

          {/* Step 2 — target */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center">2</span>
              <span className="text-sm font-semibold text-gray-700">Dla kogo?</span>
            </div>

            {/* Target type toggle */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {TARGET_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setField('targetType', opt.value); setField('targetDepartment', ''); setField('targetUserId', ''); setEmpSearch(''); }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition ${
                    form.targetType === opt.value
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                  }`}
                >
                  <span className="text-lg">{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>

            {/* DEPARTMENT picker */}
            {form.targetType === 'DEPARTMENT' && (
              <div className="mt-4">
                <label className="block text-xs font-medium text-gray-500 mb-2">Wybierz dział</label>
                {departments.length === 0 ? (
                  <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    Brak przypisanych działów w systemie. Najpierw przypisz pracowników do działów.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {departments.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setField('targetDepartment', form.targetDepartment === d ? '' : d)}
                        className={`px-4 py-2 rounded-xl border text-sm font-medium transition ${
                          form.targetDepartment === d
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                        }`}
                      >
                        {d}
                        <span className="ml-2 text-xs opacity-70">
                          ({employees.filter((e) => e.department === d).length} os.)
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {form.targetDepartment && (
                  <p className="mt-2 text-xs text-indigo-600">
                    ✓ Wybrany dział: <b>{form.targetDepartment}</b> ({employees.filter((e) => e.department === form.targetDepartment).length} pracowników)
                  </p>
                )}
              </div>
            )}

            {/* USER picker */}
            {form.targetType === 'USER' && (
              <div className="mt-4 space-y-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Wyszukaj pracownika</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="Imię, nazwisko lub e-mail..."
                    value={empSearch}
                    onChange={(e) => setEmpSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50"
                  />
                </div>
                {empSearch && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto shadow-sm">
                    {filteredEmps.length === 0 ? (
                      <p className="text-sm text-gray-400 p-3 text-center">Brak wyników</p>
                    ) : (
                      filteredEmps.map((emp) => (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => { setField('targetUserId', String(emp.id)); setEmpSearch(''); }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-indigo-50 transition border-b border-gray-100 last:border-0 ${
                            form.targetUserId === String(emp.id) ? 'bg-indigo-50' : 'bg-white'
                          }`}
                        >
                          <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                            {emp.firstName[0]}{emp.lastName[0]}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800">{emp.firstName} {emp.lastName}</p>
                            <p className="text-xs text-gray-400 truncate">{emp.email} · {emp.department ?? 'bez działu'}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
                {selectedEmployee && !empSearch && (
                  <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
                    <span className="w-8 h-8 rounded-full bg-indigo-200 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                      {selectedEmployee.firstName[0]}{selectedEmployee.lastName[0]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-indigo-800">{selectedEmployee.firstName} {selectedEmployee.lastName}</p>
                      <p className="text-xs text-indigo-500">{selectedEmployee.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setField('targetUserId', '')}
                      className="text-indigo-400 hover:text-indigo-700"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100" />

          {/* Step 3 — duration */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center">3</span>
              <span className="text-sm font-semibold text-gray-700">Czas trwania</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {DURATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setField('durationHours', opt.value)}
                  className={`px-4 py-2 rounded-xl border text-sm font-medium transition ${
                    form.durationHours === opt.value
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Summary preview */}
          {form.assessmentId && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-600">
              <span className="font-medium text-gray-800">Podsumowanie: </span>
              Test <b>{selectedAssessment?.name}</b> zostanie przypisany{' '}
              {form.targetType === 'ALL' && <b>wszystkim aktywnym pracownikom</b>}
              {form.targetType === 'DEPARTMENT' && form.targetDepartment && <>działowi <b>{form.targetDepartment}</b></>}
              {form.targetType === 'DEPARTMENT' && !form.targetDepartment && <span className="text-amber-600">— wybierz dział</span>}
              {form.targetType === 'USER' && selectedEmployee && <><b>{selectedEmployee.firstName} {selectedEmployee.lastName}</b></>}
              {form.targetType === 'USER' && !selectedEmployee && <span className="text-amber-600">— wybierz pracownika</span>}
              . Dostępny przez <b>{DURATION_OPTIONS.find((o) => o.value === form.durationHours)?.label}</b>.
            </div>
          )}

          {/* Notifications */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition text-sm flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/></svg>
                Zapisywanie…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z"/></svg>
                Zaplanuj test
              </>
            )}
          </button>
        </form>
      </div>

      {/* ── Active assignments ────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-800">Aktywne testy</h2>
            {activeAssignments.length > 0 && (
              <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
                {activeAssignments.length}
              </span>
            )}
          </div>
        </div>

        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-4 animate-pulse border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 bg-gray-100 rounded w-1/3" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && activeAssignments.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-10 text-center border border-gray-100">
            <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z"/>
            </svg>
            <p className="text-gray-400 text-sm">Brak aktywnych przypisań testów</p>
          </div>
        )}

        <div className="space-y-3">
          {activeAssignments.map((a) => {
            const { label: timeLabel } = mounted ? timeRemaining(a.availableTo) : { label: '…' };
            const pct = mounted ? timePct(a.availableFrom, a.availableTo) : 0;
            const remaining = 100 - pct;
            const isUrgent = mounted && remaining < 20;

            const targetBadge =
              a.targetType === 'ALL' ? { label: 'Wszyscy pracownicy', color: 'bg-indigo-100 text-indigo-700' } :
              a.targetType === 'DEPARTMENT' ? { label: `Dział: ${a.targetDepartment}`, color: 'bg-purple-100 text-purple-700' } :
              { label: 'Konkretny pracownik', color: 'bg-sky-100 text-sky-700' };

            return (
              <div key={a.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-4 pt-4 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Icon */}
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-800 text-sm">{a.assessment?.name}</h3>
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{a.assessment?.code}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${targetBadge.color}`}>
                            {targetBadge.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          Do: {formatDt(a.availableTo)} · Dodał: {a.assignedBy?.firstName} {a.assignedBy?.lastName}
                        </p>
                      </div>
                    </div>

                    {/* Time + delete */}
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-sm font-bold ${isUrgent ? 'text-red-500' : 'text-emerald-600'}`}>
                        {timeLabel}
                      </span>
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="text-gray-300 hover:text-red-500 transition"
                        title="Usuń przypisanie"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Progress bar (time remaining) */}
                <div className="h-1.5 bg-gray-100">
                  <div
                    className={`h-full transition-all ${isUrgent ? 'bg-red-400' : 'bg-emerald-500'}`}
                    style={{ width: `${remaining}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Expired assignments (collapsible) ────────────────────────────── */}
      {expiredAssignments.length > 0 && (
        <div>
          <button
            onClick={() => setShowExpired((v) => !v)}
            className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition mb-3"
          >
            <svg className={`w-4 h-4 transition-transform ${showExpired ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="m9 18 6-6-6-6"/>
            </svg>
            Wygasłe testy ({expiredAssignments.length})
          </button>

          {showExpired && (
            <div className="space-y-2">
              {expiredAssignments.map((a) => {
                const targetBadge =
                  a.targetType === 'ALL' ? 'Wszyscy' :
                  a.targetType === 'DEPARTMENT' ? `Dział: ${a.targetDepartment}` :
                  'Pracownik';
                return (
                  <div key={a.id} className="bg-white rounded-2xl border border-gray-100 px-4 py-3 opacity-60">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <span className="text-sm font-medium text-gray-600">{a.assessment?.name}</span>
                        <span className="ml-2 text-xs text-gray-400">{a.assessment?.code}</span>
                        <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{targetBadge}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-gray-400">Wygasło: {formatDt(a.availableTo)}</span>
                        <button
                          onClick={() => handleDelete(a.id)}
                          className="text-gray-300 hover:text-red-500 transition"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
