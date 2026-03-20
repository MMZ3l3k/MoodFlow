'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axiosClient from '../../../lib/axiosClient';
import { User } from '../../../types';
import { getAccessToken } from '../../../lib/auth';

// ─── Types ────────────────────────────────────────────────────────────────────
type ActivityFilter = 'all' | 'active' | 'pending' | 'suspended' | 'rejected';
type RoleFilter = 'all' | 'employee' | 'hr' | 'admin';
type Tab = 'users' | 'departments';

const ROLE_LABELS: Record<string, string> = { employee: 'Pracownik', hr: 'HR', admin: 'Admin' };
const ROLE_COLORS: Record<string, string> = {
  employee: 'bg-blue-100 text-blue-700',
  hr: 'bg-purple-100 text-purple-700',
  admin: 'bg-amber-100 text-amber-700',
};
const STATUS_COLORS: Record<string, string> = {
  active:    'bg-emerald-100 text-emerald-700',
  pending:   'bg-amber-100 text-amber-700',
  suspended: 'bg-red-100 text-red-600',
  rejected:  'bg-gray-100 text-gray-500',
};
const STATUS_LABELS: Record<string, string> = {
  active: 'Aktywny', pending: 'Oczekuje', suspended: 'Zawieszony', rejected: 'Odrzucony',
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function Badge({ cls, label }: { cls: string; label: string }) {
  return <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function UsersPage() {
  const router = useRouter();

  // ── Data
  const [users, setUsers]             = useState<User[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading]         = useState(true);
  const [mounted, setMounted]         = useState(false);
  const [tab, setTab]                 = useState<Tab>('users');

  // ── Filters
  const [search, setSearch]           = useState('');
  const [roleFilter, setRoleFilter]   = useState<RoleFilter>('all');
  const [deptFilter, setDeptFilter]   = useState('');
  const [statusFilter, setStatusFilter] = useState<ActivityFilter>('all');

  // ── Create user modal
  const [showCreate, setShowCreate]   = useState(false);
  const [createForm, setCreateForm]   = useState({ firstName: '', lastName: '', email: '', password: '', role: 'employee', department: '' });
  const [creating, setCreating]       = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // ── Edit drawer
  const [editUser, setEditUser]       = useState<User | null>(null);
  const [editForm, setEditForm]       = useState({ firstName: '', lastName: '', email: '', role: 'employee', department: '', status: 'active' });
  const [saving, setSaving]           = useState(false);
  const [editError, setEditError]     = useState<string | null>(null);

  // ── Department management
  const [deptRename, setDeptRename]   = useState<{ old: string; newName: string } | null>(null);
  const [deptSaving, setDeptSaving]   = useState(false);

  // ── Notifications
  const [toast, setToast]             = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  // ── Fetch
  const fetchAll = useCallback(async () => {
    if (!getAccessToken()) { router.push('/login'); return; }
    try {
      const [usersRes, deptsRes] = await Promise.all([
        axiosClient.get<User[]>('/users'),
        axiosClient.get<string[]>('/users/departments'),
      ]);
      setUsers(usersRes.data);
      setDepartments(deptsRes.data);
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    setMounted(true);
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  // ── Derived
  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (search) {
        const q = search.toLowerCase();
        if (!`${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(q)) return false;
      }
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (deptFilter && u.department !== deptFilter) return false;
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;
      return true;
    });
  }, [users, search, roleFilter, deptFilter, statusFilter]);

  const activeFilters = [
    search && `"${search}"`,
    roleFilter !== 'all' && ROLE_LABELS[roleFilter],
    deptFilter && deptFilter,
    statusFilter !== 'all' && STATUS_LABELS[statusFilter],
  ].filter(Boolean);

  const deptStats = useMemo(() =>
    departments.map((d) => ({
      name: d,
      count: users.filter((u) => u.department === d && u.status === 'active').length,
      total: users.filter((u) => u.department === d).length,
    })),
  [departments, users]);

  const formatLastSeen = (iso?: string) => {
    if (!iso || !mounted) return '—';
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'przed chwilą';
    if (m < 60) return `${m} min temu`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h temu`;
    return new Date(iso).toLocaleDateString('pl-PL');
  };

  // ── Create user
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true); setCreateError(null);
    try {
      await axiosClient.post('/users', {
        firstName:  createForm.firstName.trim(),
        lastName:   createForm.lastName.trim(),
        email:      createForm.email.trim(),
        password:   createForm.password,
        role:       createForm.role,
        department: createForm.department.trim() || undefined,
      });
      setShowCreate(false);
      setCreateForm({ firstName: '', lastName: '', email: '', password: '', role: 'employee', department: '' });
      showToast('Konto zostało utworzone');
      await fetchAll();
    } catch (err: any) {
      setCreateError(err.response?.data?.message ?? 'Błąd tworzenia konta');
    } finally {
      setCreating(false);
    }
  }

  // ── Open edit drawer
  function openEdit(u: User) {
    setEditUser(u);
    setEditForm({
      firstName:  u.firstName,
      lastName:   u.lastName,
      email:      u.email,
      role:       u.role,
      department: u.department ?? '',
      status:     u.status,
    });
    setEditError(null);
  }

  // ── Save edit
  async function handleSave() {
    if (!editUser) return;
    setSaving(true); setEditError(null);
    try {
      await axiosClient.patch(`/users/${editUser.id}`, {
        firstName:  editForm.firstName.trim(),
        lastName:   editForm.lastName.trim(),
        role:       editForm.role,
        department: editForm.department.trim() || null,
        status:     editForm.status,
      });
      setEditUser(null);
      showToast('Dane zostały zapisane');
      await fetchAll();
    } catch (err: any) {
      setEditError(err.response?.data?.message ?? 'Błąd zapisu');
    } finally {
      setSaving(false);
    }
  }

  // ── Quick toggle active/suspended
  async function toggleStatus(u: User) {
    const newStatus = u.status === 'active' ? 'suspended' : 'active';
    try {
      await axiosClient.patch(`/users/${u.id}`, { status: newStatus });
      showToast(newStatus === 'active' ? 'Konto aktywowane' : 'Konto zawieszone');
      await fetchAll();
    } catch {
      showToast('Błąd zmiany statusu');
    }
  }

  // ── Rename department
  async function handleRename() {
    if (!deptRename || !deptRename.newName.trim()) return;
    setDeptSaving(true);
    try {
      await axiosClient.patch('/users/departments/rename', { oldName: deptRename.old, newName: deptRename.newName.trim() });
      setDeptRename(null);
      showToast(`Dział "${deptRename.old}" zmieniony na "${deptRename.newName.trim()}"`);
      await fetchAll();
    } catch {
      showToast('Błąd zmiany nazwy działu');
    } finally {
      setDeptSaving(false);
    }
  }

  // ── Render
  const counters = {
    total:     users.length,
    active:    users.filter((u) => u.status === 'active').length,
    pending:   users.filter((u) => u.status === 'pending').length,
    suspended: users.filter((u) => u.status === 'suspended').length,
  };

  return (
    <div className="space-y-6">

      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg animate-in">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Zarządzanie użytkownikami</h2>
          <p className="text-sm text-gray-400 mt-0.5">Twórz konta, edytuj role, zarządzaj działami</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
          Utwórz konto
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Wszyscy użytkownicy', val: counters.total,     color: 'border-indigo-200 bg-indigo-50',   txt: 'text-indigo-700' },
          { label: 'Aktywni',             val: counters.active,    color: 'border-emerald-200 bg-emerald-50', txt: 'text-emerald-700' },
          { label: 'Oczekujące',          val: counters.pending,   color: 'border-amber-200 bg-amber-50',     txt: 'text-amber-700' },
          { label: 'Zawieszone',          val: counters.suspended, color: 'border-red-200 bg-red-50',         txt: 'text-red-600' },
        ].map((k) => (
          <div key={k.label} className={`rounded-2xl border p-4 ${k.color}`}>
            <p className="text-xs text-gray-500 font-medium">{k.label}</p>
            <p className={`text-2xl font-bold mt-1 ${k.txt}`}>{k.val}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(['users', 'departments'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t === 'users' ? `Użytkownicy (${users.length})` : `Działy (${departments.length})`}
          </button>
        ))}
      </div>

      {/* ══ TAB: USERS ══════════════════════════════════════════════════════════ */}
      {tab === 'users' && (
        <>
          {/* Filter bar */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 space-y-3">
            <div className="flex flex-wrap gap-3 items-center">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                </span>
                <input
                  type="text"
                  placeholder="Szukaj po imieniu, nazwisku, e-mailu..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50"
                />
              </div>

              {/* Role filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 appearance-none cursor-pointer"
              >
                <option value="all">Wszystkie role</option>
                <option value="employee">Pracownik</option>
                <option value="hr">HR</option>
                <option value="admin">Admin</option>
              </select>

              {/* Department filter */}
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 appearance-none cursor-pointer"
              >
                <option value="">Wszystkie działy</option>
                {departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ActivityFilter)}
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 appearance-none cursor-pointer"
              >
                <option value="all">Wszystkie statusy</option>
                <option value="active">Aktywni</option>
                <option value="pending">Oczekujące</option>
                <option value="suspended">Zawieszone</option>
                <option value="rejected">Odrzucone</option>
              </select>

              {activeFilters.length > 0 && (
                <button
                  onClick={() => { setSearch(''); setRoleFilter('all'); setDeptFilter(''); setStatusFilter('all'); }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 underline"
                >
                  Wyczyść
                </button>
              )}
            </div>

            {activeFilters.length > 0 && (
              <div className="flex items-center gap-2 pt-1 border-t border-gray-100 flex-wrap">
                <span className="text-xs text-gray-400">Filtry:</span>
                {activeFilters.map((f) => (
                  <span key={String(f)} className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">{f}</span>
                ))}
                <span className="text-xs text-gray-400 ml-auto">{filtered.length} / {users.length} użytkowników</span>
              </div>
            )}
          </div>

          {/* Table */}
          {loading ? (
            <div className="space-y-2">
              {[1,2,3,4].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-4 animate-pulse border border-gray-100 h-14" />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {filtered.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-sm">Brak użytkowników pasujących do filtrów</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Użytkownik</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Dział</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rola</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ostatnia aktywność</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Akcje</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filtered.map((u) => (
                        <tr key={u.id} className="hover:bg-gray-50 transition">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                                {u.firstName[0]}{u.lastName[0]}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-800">{u.firstName} {u.lastName}</p>
                                <p className="text-xs text-gray-400">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-gray-500 text-xs">{u.department ?? <span className="italic text-gray-300">bez działu</span>}</td>
                          <td className="px-5 py-3">
                            <Badge cls={ROLE_COLORS[u.role] ?? 'bg-gray-100 text-gray-500'} label={ROLE_LABELS[u.role] ?? u.role} />
                          </td>
                          <td className="px-5 py-3">
                            <Badge cls={STATUS_COLORS[u.status] ?? 'bg-gray-100 text-gray-500'} label={STATUS_LABELS[u.status] ?? u.status} />
                          </td>
                          <td className="px-5 py-3 text-xs text-gray-400" suppressHydrationWarning>{formatLastSeen(u.lastSeenAt)}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end gap-2">
                              {/* Activate/Suspend toggle */}
                              {(u.status === 'active' || u.status === 'suspended') && (
                                <button
                                  onClick={() => toggleStatus(u)}
                                  title={u.status === 'active' ? 'Zawieś konto' : 'Aktywuj konto'}
                                  className={`p-1.5 rounded-lg transition ${u.status === 'active' ? 'text-red-400 hover:bg-red-50 hover:text-red-600' : 'text-emerald-500 hover:bg-emerald-50 hover:text-emerald-700'}`}
                                >
                                  {u.status === 'active' ? (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636"/></svg>
                                  ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>
                                  )}
                                </button>
                              )}
                              {/* Edit */}
                              <button
                                onClick={() => openEdit(u)}
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition"
                                title="Edytuj"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/>
                                </svg>
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
          )}
        </>
      )}

      {/* ══ TAB: DEPARTMENTS ════════════════════════════════════════════════════ */}
      {tab === 'departments' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Działy są przypisywane do użytkowników. Możesz zmienić nazwę działu — zostanie ona zaktualizowana u wszystkich przypisanych pracowników.</p>

          {departments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
              <p className="text-gray-400 text-sm">Brak zdefiniowanych działów. Przypisz pracowników do działów przez edycję ich kont.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Nazwa działu</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Aktywni pracownicy</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Wszyscy w dziale</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Akcje</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {deptStats.map((d) => (
                    <tr key={d.name} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        {deptRename?.old === d.name ? (
                          <div className="flex items-center gap-2">
                            <input
                              autoFocus
                              type="text"
                              value={deptRename.newName}
                              onChange={(e) => setDeptRename({ ...deptRename, newName: e.target.value })}
                              className="border border-indigo-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-44"
                            />
                            <button
                              onClick={handleRename}
                              disabled={deptSaving}
                              className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                            >
                              {deptSaving ? '…' : 'Zapisz'}
                            </button>
                            <button onClick={() => setDeptRename(null)} className="text-xs text-gray-400 hover:text-gray-600">Anuluj</button>
                          </div>
                        ) : (
                          <span className="font-semibold text-gray-800">{d.name}</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-emerald-700 font-semibold">{d.count}</span>
                      </td>
                      <td className="px-5 py-3 text-gray-500">{d.total}</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => setDeptRename({ old: d.name, newName: d.name })}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          Zmień nazwę
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══ MODAL: CREATE USER ══════════════════════════════════════════════════ */}
      {showCreate && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 text-lg">Utwórz nowe konto</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Imię *</label>
                  <input required type="text" value={createForm.firstName} onChange={(e) => setCreateForm((f) => ({...f, firstName: e.target.value}))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Nazwisko *</label>
                  <input required type="text" value={createForm.lastName} onChange={(e) => setCreateForm((f) => ({...f, lastName: e.target.value}))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">E-mail *</label>
                <input required type="email" value={createForm.email} onChange={(e) => setCreateForm((f) => ({...f, email: e.target.value}))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Hasło * (min. 8 znaków)</label>
                <input required type="password" minLength={8} value={createForm.password} onChange={(e) => setCreateForm((f) => ({...f, password: e.target.value}))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Rola</label>
                  <select value={createForm.role} onChange={(e) => setCreateForm((f) => ({...f, role: e.target.value}))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 appearance-none">
                    <option value="employee">Pracownik</option>
                    <option value="hr">HR</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Dział</label>
                  <input list="dept-list-create" type="text" value={createForm.department} onChange={(e) => setCreateForm((f) => ({...f, department: e.target.value}))}
                    placeholder="np. IT, HR..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  <datalist id="dept-list-create">
                    {departments.map((d) => <option key={d} value={d} />)}
                  </datalist>
                </div>
              </div>
              {createError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">{createError}</div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition">
                  Anuluj
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition">
                  {creating ? 'Tworzenie…' : 'Utwórz konto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ DRAWER: EDIT USER ═══════════════════════════════════════════════════ */}
      {editUser && (
        <div className="fixed inset-0 z-40 flex" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={(e) => { if (e.target === e.currentTarget) setEditUser(null); }}>
          <div className="ml-auto w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold flex items-center justify-center">
                  {editUser.firstName[0]}{editUser.lastName[0]}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{editUser.firstName} {editUser.lastName}</p>
                  <p className="text-xs text-gray-400">{editUser.email}</p>
                </div>
              </div>
              <button onClick={() => setEditUser(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Drawer body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Imię</label>
                  <input type="text" value={editForm.firstName} onChange={(e) => setEditForm((f) => ({...f, firstName: e.target.value}))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Nazwisko</label>
                  <input type="text" value={editForm.lastName} onChange={(e) => setEditForm((f) => ({...f, lastName: e.target.value}))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Dział</label>
                <input list="dept-list-edit" type="text" value={editForm.department} onChange={(e) => setEditForm((f) => ({...f, department: e.target.value}))}
                  placeholder="np. IT, HR, Sprzedaż"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                <datalist id="dept-list-edit">
                  {departments.map((d) => <option key={d} value={d} />)}
                </datalist>
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Rola</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['employee','hr','admin'] as const).map((r) => (
                    <button key={r} type="button" onClick={() => setEditForm((f) => ({...f, role: r}))}
                      className={`py-2.5 rounded-xl border text-sm font-medium transition ${editForm.role === r ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}>
                      {ROLE_LABELS[r]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Status konta</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['active','suspended','pending','rejected'] as const).map((s) => (
                    <button key={s} type="button" onClick={() => setEditForm((f) => ({...f, status: s}))}
                      className={`py-2.5 rounded-xl border text-sm font-medium transition ${editForm.status === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}>
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              {editError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">{editError}</div>
              )}
            </div>

            {/* Drawer footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button onClick={() => setEditUser(null)}
                className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition">
                Anuluj
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition">
                {saving ? 'Zapisywanie…' : 'Zapisz zmiany'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
