'use client';
import { useEffect, useState } from 'react';
import axiosClient from '../../../lib/axiosClient';

interface Assessment {
  id: number;
  code: string;
  name: string;
  description: string;
  questionCount: number;
}

interface Assignment {
  id: number;
  assessmentId: number;
  assessment: { name: string; code: string };
  targetType: string;
  targetUserId: number | null;
  targetDepartment: string | null;
  availableFrom: string;
  availableTo: string;
  assignedBy: { firstName: string; lastName: string };
  createdAt: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pl-PL', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function hoursRemaining(availableTo: string) {
  const diff = new Date(availableTo).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60)));
}

export default function AssessmentsManagePage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    assessmentId: '',
    targetType: 'ALL',
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [asmRes, assignRes] = await Promise.all([
        axiosClient.get<Assessment[]>('/assessments'),
        axiosClient.get<Assignment[]>('/assessments/assignments'),
      ]);
      setAssessments(asmRes.data);
      setAssignments(assignRes.data);
    } catch {
      setError('Błąd ładowania danych');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      await axiosClient.post('/assessments/assignments', {
        assessmentId: Number(form.assessmentId),
        targetType: form.targetType,
      });
      setSuccess('Test został zaplanowany — pracownicy mają 24h na jego wykonanie.');
      setForm({ assessmentId: '', targetType: 'ALL' });
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Zarządzanie testami</h1>
        <p className="text-gray-500 text-sm mt-0.5">Planuj testy dla pracowników</p>
      </div>

      {/* Create assignment form */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800 mb-1">Zaplanuj nowy test</h2>
        <p className="text-sm text-gray-400 mb-4">Test będzie dostępny natychmiast przez 24 godziny.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Wybierz test</label>
            <select
              required
              value={form.assessmentId}
              onChange={(e) => setForm((f) => ({ ...f, assessmentId: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">-- Wybierz test --</option>
              {assessments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.code}) — {a.questionCount} pytań
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dla kogo</label>
            <div className="flex gap-2">
              {[{ value: 'ALL', label: 'Wszyscy pracownicy' }].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, targetType: opt.value }))}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition border ${
                    form.targetType === opt.value
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-600 text-sm rounded-xl px-4 py-3">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition text-sm"
          >
            {submitting ? 'Zapisywanie...' : 'Zaplanuj test (24h)'}
          </button>
        </form>
      </div>

      {/* Existing assignments */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Zaplanowane testy</h2>

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

        {!loading && assignments.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center border border-gray-100">
            <p className="text-gray-400 text-sm">Brak zaplanowanych testów</p>
          </div>
        )}

        <div className="space-y-3">
          {assignments.map((a) => {
            const hoursLeft = hoursRemaining(a.availableTo);
            const isExpired = hoursLeft === 0;

            return (
              <div
                key={a.id}
                className={`bg-white rounded-2xl shadow-sm p-4 border border-gray-100 ${isExpired ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-800">{a.assessment?.name}</h3>
                      {isExpired ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Wygasło</span>
                      ) : (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          hoursLeft <= 3 ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-700'
                        }`}>
                          {hoursLeft === 1 ? 'Ostatnia godzina' : `${hoursLeft}h`}
                        </span>
                      )}
                      <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600">
                        {a.targetType === 'ALL' ? 'Wszyscy' : a.targetType === 'DEPARTMENT' ? `Dział: ${a.targetDepartment}` : `Użytkownik #${a.targetUserId}`}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Do: {formatDate(a.availableTo)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Dodał(a): {a.assignedBy?.firstName} {a.assignedBy?.lastName}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="ml-4 text-red-400 hover:text-red-600 text-sm transition shrink-0"
                    title="Usuń przypisanie"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
