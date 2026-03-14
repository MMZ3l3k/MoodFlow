import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import type { Assessment, AssessmentResult } from '../types/assessment.types';
import SeverityBadge from '../components/SeverityBadge';

export default function TakeAssessmentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const assignmentId = new URLSearchParams(window.location.search).get('assignmentId');
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!assignmentId) {
      navigate('/app/tests');
      return;
    }
    axiosClient.get<Assessment>(`/assessments/${id}`)
      .then((r) => setAssessment(r.data))
      .catch(() => navigate('/app/tests'))
      .finally(() => setLoading(false));
  }, [id, assignmentId, navigate]);

  const allAnswered = assessment
    ? assessment.questions.every((q) => answers[q.id] !== undefined)
    : false;

  const handleSubmit = async () => {
    if (!assessment || !allAnswered) return;
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        assessmentId: assessment.id,
        assignmentId: Number(assignmentId),
        answers: Object.entries(answers).map(([questionId, value]) => ({
          questionId: Number(questionId),
          value,
        })),
      };
      const { data } = await axiosClient.post<AssessmentResult>('/responses', payload);
      setResult(data);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Błąd podczas wysyłania odpowiedzi');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400">Ładowanie testu...</p>
    </div>
  );

  if (result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8 text-center">
          <div className="text-5xl mb-4">✓</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-1">Test ukończony</h2>
          <p className="text-gray-500 text-sm mb-6">{assessment?.name}</p>

          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <p className="text-sm text-gray-500 mb-1">Wynik</p>
            <p className="text-3xl font-bold text-gray-800">{result.rawScore}</p>
            {result.normalizedScore !== result.rawScore && (
              <p className="text-sm text-gray-400">({result.normalizedScore}/100)</p>
            )}
            <div className="mt-2 flex justify-center">
              <SeverityBadge severity={result.severity} />
            </div>
          </div>

          {result.riskFlags?.selfHarmRiskFlag && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              Twoja odpowiedź wskazuje na trudne myśli. Rozważ rozmowę ze specjalistą.
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Link
              to="/app/tests"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition text-sm"
            >
              Wróć do testów
            </Link>
            <Link
              to="/app/results"
              className="w-full text-sm text-gray-500 hover:text-gray-700 py-2"
            >
              Historia wyników
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!assessment) return null;

  const sortedQuestions = [...assessment.questions].sort((a, b) => a.order - b.order);
  const sortedOptions = [...assessment.answerOptions].sort((a, b) => a.order - b.order);
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/app/tests" className="text-sm text-gray-500 hover:text-gray-700">← Wróć</Link>
          <h1 className="font-semibold text-gray-800">{assessment.name}</h1>
          <span className="text-sm text-gray-400">{answeredCount}/{sortedQuestions.length}</span>
        </div>
        <div className="h-1 bg-gray-100">
          <div
            className="h-1 bg-blue-500 transition-all duration-300"
            style={{ width: `${(answeredCount / sortedQuestions.length) * 100}%` }}
          />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
          <p className="text-sm text-blue-700 font-medium">Zakres: {assessment.timeframe}</p>
          {assessment.description && (
            <p className="text-sm text-blue-600 mt-1">{assessment.description}</p>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {sortedQuestions.map((question, idx) => (
            <div key={question.id} className="bg-white rounded-2xl shadow-sm p-5">
              <p className="font-medium text-gray-800 mb-4">
                <span className="text-blue-500 font-bold">{idx + 1}.</span> {question.text}
              </p>
              <div className="space-y-2">
                {sortedOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition border ${
                      answers[question.id] === option.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q-${question.id}`}
                      value={option.value}
                      checked={answers[question.id] === option.value}
                      onChange={() => setAnswers({ ...answers, [question.id]: option.value })}
                      className="accent-blue-500"
                    />
                    <span className="text-sm text-gray-700">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Wysyłanie...' : 'Wyślij odpowiedzi'}
          </button>
          {!allAnswered && (
            <p className="text-center text-sm text-gray-400 mt-2">
              Odpowiedz na wszystkie pytania, aby wysłać
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
