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
    return (
      <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold"
        style={{ background: 'rgba(152,70,25,0.12)', color: '#984619' }}>
        Wygasło
      </span>
    );
  }
  if (hoursLeft <= 3) {
    return (
      <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold"
        style={{ background: 'rgba(192,98,38,0.12)', color: '#C06226' }}>
        Zostało {hoursLeft}h
      </span>
    );
  }
  return (
    <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold"
      style={{ background: 'rgba(156,184,183,0.2)', color: '#5A8A89' }}>
      Zostało {hoursLeft}h
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(221,211,186,0.5)' }}>
      <div className="shimmer-bg h-4 rounded-lg w-2/3 mb-2.5" />
      <div className="shimmer-bg h-3 rounded-lg w-full mb-1.5" />
      <div className="shimmer-bg h-3 rounded-lg w-1/2" />
    </div>
  );
}

export default function HomePage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [assigned, setAssigned] = useState<AssignedAssessment[]>([]);
  const [recentResults, setRecentResults] = useState<AssessmentResult[]>([]);
  const [streak, setStreak] = useState(0);
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
        if (assignedRes.status === 'fulfilled') setAssigned(assignedRes.value.data);
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

    let s = 0;
    const current = new Date();
    current.setHours(0, 0, 0, 0);

    for (const day of uniqueDays) {
      const d = new Date(day);
      d.setHours(0, 0, 0, 0);
      const diff = Math.round((current.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      if (diff === s) s++;
      else break;
    }
    return s;
  }

  const activePending = assigned.filter(
    (a) => !a.completedAt && getHoursRemaining(a.availableTo) > 0
  );

  const greetingHour = new Date().getHours();
  const greeting =
    greetingHour < 12 ? 'Dzień dobry' : greetingHour < 18 ? 'Witaj' : 'Dobry wieczór';

  return (
    <div className="space-y-6 animate-slide-up">

      {/* ── Greeting ──────────────────────────── */}
      <div className="pt-1">
        <h1 className="text-2xl font-bold text-raisin">
          {greeting}{user ? `, ${user.firstName}` : ''}!
        </h1>
        <p className="text-raisin/50 text-sm mt-0.5">
          {new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* ── Stats row ─────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">

        {/* Streak card */}
        <div
          className="rounded-2xl p-4 flex items-center gap-3"
          style={{
            background: 'linear-gradient(135deg, rgba(192,98,38,0.08) 0%, rgba(152,70,25,0.05) 100%)',
            border: '1px solid rgba(192,98,38,0.15)',
          }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
            style={{ background: 'rgba(192,98,38,0.12)' }}
          >
            🔥
          </div>
          <div>
            <p className="text-2xl font-bold text-raisin">{streak}</p>
            <p className="text-xs text-raisin/50 leading-tight">dni z rzędu</p>
          </div>
        </div>

        {/* Pending tests card */}
        <div
          className="rounded-2xl p-4 flex items-center gap-3"
          style={{
            background: 'linear-gradient(135deg, rgba(156,184,183,0.12) 0%, rgba(122,158,157,0.06) 100%)',
            border: '1px solid rgba(156,184,183,0.25)',
          }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
            style={{ background: 'rgba(156,184,183,0.15)' }}
          >
            📋
          </div>
          <div>
            <p className="text-2xl font-bold text-raisin">{loading ? '…' : activePending.length}</p>
            <p className="text-xs text-raisin/50 leading-tight">testów do zrobienia</p>
          </div>
        </div>
      </div>

      {/* ── Active tests ──────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-raisin/60 uppercase tracking-wider mb-3">
          Testy do wykonania
        </h2>

        {loading && (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {!loading && activePending.length === 0 && (
          <div
            className="rounded-2xl p-6 text-center"
            style={{
              background: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(221,211,186,0.5)',
            }}
          >
            <div className="text-4xl mb-3">✅</div>
            <p className="text-raisin/70 text-sm font-medium">Brak testów do wykonania</p>
            <p className="text-raisin/40 text-xs mt-1">Wszystko na bieżąco!</p>
          </div>
        )}

        <div className="space-y-3">
          {activePending.map((item, i) => {
            const hoursLeft = getHoursRemaining(item.availableTo);
            return (
              <button
                key={item.id}
                onClick={() => navigate(`/app/take/${item.assessmentId}?assignmentId=${item.id}`)}
                className="w-full text-left rounded-2xl p-4 group ripple transition-all duration-200 hover:shadow-warm-md active:scale-[0.99]"
                style={{
                  background: 'rgba(255,255,255,0.9)',
                  border: '1px solid rgba(221,211,186,0.6)',
                  animationDelay: `${i * 60}ms`,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <h3 className="font-semibold text-raisin group-hover:text-ruddy transition-colors truncate">
                        {item.assessmentName}
                      </h3>
                      <DeadlineBadge hoursLeft={hoursLeft} />
                    </div>
                    <p className="text-xs text-raisin/50 line-clamp-1">{item.assessmentDescription}</p>
                    <p className="text-xs text-raisin/35 mt-1.5 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Do: {new Date(item.availableTo).toLocaleDateString('pl-PL', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-all duration-200 group-hover:scale-110"
                    style={{ background: 'rgba(192,98,38,0.1)', color: '#C06226' }}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Recent results ────────────────────── */}
      {recentResults.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-raisin/60 uppercase tracking-wider">
              Ostatnie wyniki
            </h2>
            <button
              onClick={() => navigate('/app/results')}
              className="text-xs font-semibold transition-colors flex items-center gap-1"
              style={{ color: '#C06226' }}
            >
              Wszystkie
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="space-y-2">
            {recentResults.map((result) => (
              <div
                key={result.id}
                className="rounded-2xl p-4 flex items-center justify-between"
                style={{
                  background: 'rgba(255,255,255,0.8)',
                  border: '1px solid rgba(221,211,186,0.5)',
                }}
              >
                <div>
                  <p className="text-sm font-semibold text-raisin">{result.assessment?.name}</p>
                  <p className="text-xs text-raisin/40 mt-0.5">
                    {new Date(result.submittedAt).toLocaleDateString('pl-PL', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-xl font-bold text-raisin">{result.rawScore}</span>
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
