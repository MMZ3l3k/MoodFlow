'use client';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import axiosClient from '../../../../lib/axiosClient';
import { getAccessToken } from '../../../../lib/auth';

interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  department: string | null;
  status: string;
  role: string;
}

interface EditForm {
  firstName: string;
  lastName: string;
  department: string;
}

type SortKey = 'name_asc' | 'name_desc' | 'dept_asc' | 'dept_desc';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'name_asc',  label: 'Nazwisko A → Z' },
  { value: 'name_desc', label: 'Nazwisko Z → A' },
  { value: 'dept_asc',  label: 'Dział A → Z'    },
  { value: 'dept_desc', label: 'Dział Z → A'    },
];

export default function HrEmployeesPage() {
  const router = useRouter();

  // ── Data ──────────────────────────────────────────────────────────────
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [success, setSuccess]     = useState<string | null>(null);

  // ── Filters ───────────────────────────────────────────────────────────
  const [searchName, setSearchName]   = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const [deptFilter, setDeptFilter]   = useState('');
  const [sortKey, setSortKey]         = useState<SortKey>('name_asc');

  // ── Edit ──────────────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm]   = useState<EditForm>({ firstName: '', lastName: '', department: '' });
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    if (!getAccessToken()) { router.push('/login'); return; }
    axiosClient
      .get<Employee[]>('/users')
      .then((r) => setEmployees(r.data.filter((u) => u.status === 'active' && u.role === 'employee')))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  // ── Derived values ────────────────────────────────────────────────────
  const departments = useMemo(() => {
    const set = new Set(employees.map((e) => e.department ?? '').filter(Boolean));
    return Array.from(set).sort();
  }, [employees]);

  const filtered = useMemo(() => {
    let list = [...employees];

    if (searchName.trim()) {
      const q = searchName.trim().toLowerCase();
      list = list.filter(
        (e) =>
          e.firstName.toLowerCase().includes(q) ||
          e.lastName.toLowerCase().includes(q)
      );
    }
    if (searchEmail.trim()) {
      const q = searchEmail.trim().toLowerCase();
      list = list.filter((e) => e.email.toLowerCase().includes(q));
    }
    if (deptFilter) {
      list = deptFilter === '__none__'
        ? list.filter((e) => !e.department)
        : list.filter((e) => e.department === deptFilter);
    }

    list.sort((a, b) => {
      switch (sortKey) {
        case 'name_asc':  return `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`);
        case 'name_desc': return `${b.lastName}${b.firstName}`.localeCompare(`${a.lastName}${a.firstName}`);
        case 'dept_asc':  return (a.department ?? '').localeCompare(b.department ?? '');
        case 'dept_desc': return (b.department ?? '').localeCompare(a.department ?? '');
      }
    });

    return list;
  }, [employees, searchName, searchEmail, deptFilter, sortKey]);

  const activeFilters: { label: string; clear: () => void }[] = [];
  if (searchName)  activeFilters.push({ label: `Imię/nazwisko: "${searchName}"`, clear: () => setSearchName('') });
  if (searchEmail) activeFilters.push({ label: `E-mail: "${searchEmail}"`,       clear: () => setSearchEmail('') });
  if (deptFilter)  activeFilters.push({
    label: `Dział: ${deptFilter === '__none__' ? 'nieokreślony' : deptFilter}`,
    clear: () => setDeptFilter(''),
  });

  function clearAll() {
    setSearchName(''); setSearchEmail(''); setDeptFilter('');
  }

  // ── Edit handlers ─────────────────────────────────────────────────────
  function startEdit(emp: Employee) {
    setEditingId(emp.id);
    setEditForm({ firstName: emp.firstName, lastName: emp.lastName, department: emp.department ?? '' });
    setError(null); setSuccess(null);
  }
  function cancelEdit() { setEditingId(null); }

  async function handleSave(id: number) {
    setSaving(true); setError(null); setSuccess(null);
    try {
      const updated = await axiosClient.patch<Employee>(`/users/${id}/profile`, {
        firstName:  editForm.firstName.trim(),
        lastName:   editForm.lastName.trim(),
        department: editForm.department.trim() || null,
      });
      setEmployees((prev) => prev.map((e) => e.id === id ? { ...e, ...updated.data } : e));
      setSuccess('Dane pracownika zostały zaktualizowane.');
      setEditingId(null);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Błąd zapisu danych');
    } finally {
      setSaving(false);
    }
  }

  // ── Avatar helper ─────────────────────────────────────────────────────
  function initials(emp: Employee) {
    return `${emp.firstName[0] ?? ''}${emp.lastName[0] ?? ''}`.toUpperCase();
  }

  const DEPT_COLORS = ['bg-emerald-100 text-emerald-700','bg-indigo-100 text-indigo-700',
    'bg-amber-100 text-amber-700','bg-rose-100 text-rose-700','bg-purple-100 text-purple-700',
    'bg-sky-100 text-sky-700','bg-teal-100 text-teal-700'];
  const deptColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    departments.forEach((d, i) => { map[d] = DEPT_COLORS[i % DEPT_COLORS.length]; });
    return map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departments]);

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Pracownicy</h2>
          <p className="text-sm text-gray-400 mt-0.5">Zarządzaj danymi zatwierdzonych pracowników</p>
        </div>
        <span className="text-sm text-gray-500 font-medium">
          {loading ? '…' : `${filtered.length} / ${employees.length} pracowników`}
        </span>
      </div>

      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 space-y-3">

        {/* Row 1: text inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Name search */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </span>
            <input
              type="text"
              placeholder="Szukaj po imieniu lub nazwisku..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-50"
            />
            {searchName && (
              <button onClick={() => setSearchName('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            )}
          </div>

          {/* Email search */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
              </svg>
            </span>
            <input
              type="text"
              placeholder="Szukaj po adresie e-mail..."
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-50"
            />
            {searchEmail && (
              <button onClick={() => setSearchEmail('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: selects + clear */}
        <div className="flex flex-wrap items-center gap-3">

          {/* Department select */}
          <div className="relative min-w-[180px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M3 9h18M3 15h18M9 3v18M15 3v18" opacity=".3"/><rect width="18" height="18" x="3" y="3" rx="2"/>
              </svg>
            </span>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 appearance-none cursor-pointer"
            >
              <option value="">Wszystkie działy</option>
              <option value="__none__">— bez działu —</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>
            </span>
          </div>

          {/* Sort select */}
          <div className="relative min-w-[180px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M3 6h18M7 12h10M11 18h2"/>
              </svg>
            </span>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="w-full pl-9 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 appearance-none cursor-pointer"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>
            </span>
          </div>

          {/* Dept quick chips */}
          {departments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 flex-1">
              {departments.map((d) => (
                <button
                  key={d}
                  onClick={() => setDeptFilter(deptFilter === d ? '' : d)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full border transition ${
                    deptFilter === d
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : `${deptColorMap[d] ?? 'bg-gray-100 text-gray-600'} border-transparent hover:border-gray-300`
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Active filter chips */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100">
            <span className="text-xs text-gray-400 font-medium">Aktywne filtry:</span>
            {activeFilters.map((f) => (
              <span
                key={f.label}
                className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium px-2.5 py-1 rounded-full"
              >
                {f.label}
                <button onClick={f.clear} className="ml-0.5 hover:text-emerald-900">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </span>
            ))}
            <button
              onClick={clearAll}
              className="text-xs text-gray-400 hover:text-gray-600 underline ml-1"
            >
              Wyczyść wszystkie
            </button>
          </div>
        )}
      </div>

      {/* Notifications */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-4 animate-pulse border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 bg-gray-100 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center border border-gray-100">
          <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <p className="text-gray-500 font-medium text-sm">
            {activeFilters.length > 0 ? 'Brak pracowników pasujących do filtrów' : 'Brak aktywnych pracowników'}
          </p>
          {activeFilters.length > 0 && (
            <button onClick={clearAll} className="mt-2 text-sm text-emerald-600 hover:underline">
              Wyczyść filtry
            </button>
          )}
        </div>
      )}

      {/* Employee list */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((emp) => {
            const isEditing = editingId === emp.id;
            const deptColor = emp.department ? (deptColorMap[emp.department] ?? 'bg-gray-100 text-gray-600') : 'bg-gray-100 text-gray-400';

            return (
              <div
                key={emp.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition hover:shadow-md"
              >
                {isEditing ? (
                  /* ── Edit mode ─────────────────────────────────────────── */
                  <div className="p-4 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">
                        {initials(emp)}
                      </span>
                      <span className="text-sm font-semibold text-gray-700">Edytuj dane pracownika</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Imię</label>
                        <input
                          type="text"
                          value={editForm.firstName}
                          onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Nazwisko</label>
                        <input
                          type="text"
                          value={editForm.lastName}
                          onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Dział</label>
                        <div className="relative">
                          <input
                            list={`dept-list-${emp.id}`}
                            type="text"
                            value={editForm.department}
                            onChange={(e) => setEditForm((f) => ({ ...f, department: e.target.value }))}
                            placeholder="np. IT, HR, Sprzedaż"
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                          />
                          <datalist id={`dept-list-${emp.id}`}>
                            {departments.map((d) => <option key={d} value={d} />)}
                          </datalist>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">{emp.email}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSave(emp.id)}
                        disabled={saving}
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
                      >
                        {saving ? 'Zapisywanie…' : 'Zapisz zmiany'}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-medium px-4 py-2 rounded-lg transition"
                      >
                        Anuluj
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── View mode ─────────────────────────────────────────── */
                  <div className="flex items-center gap-4 px-4 py-3.5">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold flex items-center justify-center shrink-0 select-none">
                      {initials(emp)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm leading-tight">
                        {emp.firstName} {emp.lastName}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{emp.email}</p>
                    </div>

                    {/* Dept badge */}
                    <span className={`hidden sm:inline-flex text-xs font-medium px-3 py-1 rounded-full ${deptColor}`}>
                      {emp.department ?? 'bez działu'}
                    </span>

                    {/* Edit */}
                    <button
                      onClick={() => startEdit(emp)}
                      className="shrink-0 flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-800 font-medium transition"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/>
                      </svg>
                      Edytuj
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
