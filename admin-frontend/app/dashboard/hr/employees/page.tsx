'use client';
import { useEffect, useState } from 'react';
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

export default function HrEmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ firstName: '', lastName: '', department: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!getAccessToken()) { router.push('/login'); return; }
    axiosClient
      .get<Employee[]>('/users')
      .then((r) => setEmployees(r.data.filter((u) => u.status === 'active' && u.role === 'employee')))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  function startEdit(emp: Employee) {
    setEditingId(emp.id);
    setEditForm({
      firstName: emp.firstName,
      lastName: emp.lastName,
      department: emp.department ?? '',
    });
    setError(null);
    setSuccess(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function handleSave(id: number) {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await axiosClient.patch<Employee>(`/users/${id}/profile`, {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
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

  const filtered = employees.filter((e) => {
    const q = search.toLowerCase();
    return (
      e.firstName.toLowerCase().includes(q) ||
      e.lastName.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      (e.department ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Pracownicy</h2>
        <p className="text-sm text-gray-400 mt-0.5">Zarządzaj danymi zatwierdzonych pracowników</p>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Szukaj po imieniu, nazwisku, e-mailu lub dziale..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
      />

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center border border-gray-100">
          <p className="text-gray-400 text-sm">
            {search ? 'Brak wyników dla podanego zapytania' : 'Brak aktywnych pracowników'}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((emp) => {
          const isEditing = editingId === emp.id;
          return (
            <div key={emp.id} className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
              {isEditing ? (
                <div className="space-y-3">
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
                      <input
                        type="text"
                        value={editForm.department}
                        onChange={(e) => setEditForm((f) => ({ ...f, department: e.target.value }))}
                        placeholder="np. IT, HR, Sprzedaż"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">{emp.email}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSave(emp.id)}
                      disabled={saving}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
                    >
                      {saving ? 'Zapisywanie...' : 'Zapisz'}
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
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800">
                      {emp.firstName} {emp.lastName}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{emp.email}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Dział: {emp.department ?? <span className="italic">nieokreślony</span>}
                    </p>
                  </div>
                  <button
                    onClick={() => startEdit(emp)}
                    className="text-sm text-emerald-600 hover:text-emerald-800 font-medium transition shrink-0"
                  >
                    Edytuj
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
