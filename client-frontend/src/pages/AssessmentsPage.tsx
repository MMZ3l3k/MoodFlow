import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import type { Assessment } from '../types/assessment.types';

export default function AssessmentsPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosClient.get<Assessment[]>('/assessments')
      .then((r) => setAssessments(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400">Ładowanie testów...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-blue-600">MoodFlow</h1>
          <Link to="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">← Powrót</Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Dostępne testy</h2>
        <p className="text-gray-500 text-sm mb-6">Wybierz test, który chcesz wypełnić</p>
        <div className="space-y-3">
          {assessments.map((a) => (
            <Link
              key={a.id}
              to={`/assessments/${a.id}`}
              className="block bg-white rounded-2xl shadow-sm p-5 hover:shadow-md transition group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800 group-hover:text-blue-600 transition">{a.name}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{a.description}</p>
                  <div className="flex gap-3 mt-2 text-xs text-gray-400">
                    <span>📅 {a.timeframe}</span>
                    <span>❓ {a.questionCount} pytań</span>
                  </div>
                </div>
                <span className="text-blue-500 text-lg mt-1">→</span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
