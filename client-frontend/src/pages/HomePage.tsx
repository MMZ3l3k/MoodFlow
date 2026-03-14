import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../store/store';
import { fetchMe } from '../store/slices/authSlice';
import { useAuth } from '../hooks/useAuth';
import axiosClient from '../api/axiosClient';
import type { AssessmentResult } from '../types/assessment.types';
import SeverityBadge from '../components/SeverityBadge';

interface AssignedAssessment {
  id: number;
  assessmentId: number;
  assessmentName: string;
  assessmentCode: string;
  assessmentDescription: string;
  availableFrom: string;
  availableTo: string;
  completedAt: string | null;
}

function getHoursRemaining(availableTo: string): number {
  const diff = new Date(availableTo).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60)));
}

function DeadlineBadge({ hoursLeft }: { hoursLeft: number }) {
  if (hoursLeft === 0) {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">Wygasło</span>;
  }
  if (hoursLeft <= 3) {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 font-medium">Zostało {hoursLeft}h</span>;
  }
  return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Zostało {hoursLeft}h</span>;
}

export default function HomePage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [assigned, setAssigned] = useState<AssignedAssessment[]>([]);
  const [recentResults, setRecentResults] = useState<AssessmentResult[]>([]);
  const [streak, setStreak] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) dispatch(fetchMe());
  }, [dispatch, user]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [assignedRes, resultsRes] = await Promise.allSettled([
          axiosClient.get<AssignedAssessment[]>('/assessments/assigned'),
          axiosClient.get<AssessmentResult[]>('/results'),
        ]);

        if (assignedRes.status === 'fulfilled') {
          setAssigned(assignedRes.value.data);
        }
        if (resultsRes.status === 'fulfilled') {
          const results = resultsRes.value.data;
          setRecentResults(results.slice(0, 3));
          setStreak(calculateStreak(results));
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  function calculateStreak(results: AssessmentResult[]): number {
    if (results.length === 0) return 0;
    const uniqueDays = Array.from(
      new Set(results.map((r) => new Date(r.submittedAt).toDateString()))
    ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    let streak = 0;
    let current = new Date();
    current.setHours(0, 0, 0, 0);

    for (const day of uniqueDays) {
      const d = new Date(day);
      d.setHours(0, 0, 0, 0);
      const diff = Math.round((current.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      if (diff === streak) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }

  // Backend already filters out future assignments — all returned ones are currently active
  const activePending = assigned.filter(
    (a) => !a.completedAt && getHoursRemaining(a.availableTo) > 0
  );

  const greetingHour = new Date().getHours();
  const greeting =
    greetingHour < 12 ? 'Dzień dobry' : greetingHour < 18 ? 'Witaj' : 'Dobry wieczór';

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          {greeting}{user ? `, ${user.firstName}` : ''}!
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-orange-100 flex items-center justify-center text-xl">
            🔥
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{streak}</p>
            <p className="text-xs text-gray-500 leading-tight">dni z rzędu</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center text-xl">
            📋
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{loading ? '…' : activePending.length}</p>
            <p className="text-xs text-gray-500 leading-tight">testów do zrobienia</p>
          </div>
        </div>
      </div>

      {/* Active tests */}
      <section>
        <h2 className="text-base font-semibold text-gray-700 mb-3">Testy do wykonania</h2>

        {loading && (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm p-4 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-3/4" />
              </div>
            ))}
          </div>
        )}

        {!loading && activePending.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            <p className="text-3xl mb-2">✅</p>
            <p className="text-gray-500 text-sm">Brak testów do wykonania</p>
            <p className="text-gray-400 text-xs mt-1">Wszystko na bieżąco!</p>
          </div>
        )}

        <div className="space-y-3">
          {activePending.map((item) => {
            const hoursLeft = getHoursRemaining(item.availableTo);
            return (
              <button
                key={item.id}
                onClick={() => navigate(`/app/take/${item.assessmentId}?assignmentId=${item.id}`)}
                className="w-full bg-white rounded-2xl shadow-sm p-4 text-left hover:shadow-md transition active:scale-[0.99] group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-800 group-hover:text-blue-600 transition truncate">
                        {item.assessmentName}
                      </h3>
                      <DeadlineBadge hoursLeft={hoursLeft} />
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-1">{item.assessmentDescription}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Do: {new Date(item.availableTo).toLocaleDateString('pl-PL', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <span className="text-blue-400 text-lg mt-0.5 shrink-0">→</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Recent results */}
      {recentResults.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-700">Ostatnie wyniki</h2>
            <button
              onClick={() => navigate('/app/results')}
              className="text-xs text-blue-500 hover:text-blue-700"
            >
              Zobacz wszystkie →
            </button>
          </div>
          <div className="space-y-2">
            {recentResults.map((result) => (
              <div key={result.id} className="bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{result.assessment?.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(result.submittedAt).toLocaleDateString('pl-PL', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-gray-800">{result.rawScore}</span>
                  <SeverityBadge severity={result.severity} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
