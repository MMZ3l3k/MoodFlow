import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';

interface AssignedAssessment {
  id: number;
  assessmentId: number;
  assessmentName: string;
  assessmentCode: string;
  assessmentDescription: string;
  questionCount: number;
  availableFrom: string;
  availableTo: string;
  completedAt: string | null;
}

function getHoursRemaining(availableTo: string): number {
  const diff = new Date(availableTo).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60)));
}

function StatusBadge({ hoursLeft, completed }: { hoursLeft: number; completed: boolean }) {
  if (completed) {
    return (
      <span className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold whitespace-nowrap"
        style={{ background: 'rgba(34,197,94,0.12)', color: '#16a34a' }}>
        Wykonany
      </span>
    );
  }
  if (hoursLeft === 0) {
    return (
      <span className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold whitespace-nowrap"
        style={{ background: 'rgba(220,38,38,0.10)', color: '#b91c1c' }}>
        Wygasło
      </span>
    );
  }
  if (hoursLeft <= 3) {
    return (
      <span className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold whitespace-nowrap"
        style={{ background: 'rgba(192,98,38,0.12)', color: '#C06226' }}>
        Zostało {hoursLeft}h
      </span>
    );
  }
  return (
    <span className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold whitespace-nowrap"
      style={{ background: 'rgba(122,158,157,0.18)', color: '#5A8A89' }}>
      Zostało {hoursLeft}h
    </span>
  );
}

function ProgressBar({ hoursLeft }: { hoursLeft: number }) {
  const pct = Math.max(0, Math.min(100, (hoursLeft / 24) * 100));
  const color = hoursLeft === 0 ? '#dc2626' : hoursLeft <= 3 ? '#C06226' : '#7A9E9D';
  return (
    <div className="w-full rounded-full h-1.5 mt-3 overflow-hidden" style={{ background: 'rgba(46,33,28,0.07)' }}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function TestsPage() {
  const navigate = useNavigate();
  const [assigned, setAssigned] = useState<AssignedAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('pending');

  useEffect(() => {
    axiosClient
      .get<AssignedAssessment[]>('/assessments/assigned')
      .then((r) => setAssigned(r.data))
      .catch(() => setAssigned([]))
      .finally(() => setLoading(false));
  }, []);

  const counts = {
    pending: assigned.filter((a) => !a.completedAt && getHoursRemaining(a.availableTo) > 0).length,
    done: assigned.filter((a) => !!a.completedAt).length,
    all: assigned.length,
  };

  const filtered = assigned.filter((a) => {
    if (filter === 'pending') return !a.completedAt && getHoursRemaining(a.availableTo) > 0;
    if (filter === 'done') return !!a.completedAt;
    return true;
  });

  return (
    <div className="space-y-6 sm:space-y-7 animate-slide-up">

      <div className="client-page-header">
        <h1>Testy</h1>
        <p>Testy przydzielone przez HR oraz Twoja historia</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, rgba(192,98,38,0.14) 0%, rgba(152,70,25,0.08) 100%)' }}>
            <svg className="w-5 h-5" style={{ color: '#C06226' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="stat-card-label">Do wykonania</p>
            <p className="stat-card-value">{loading ? '…' : counts.pending}</p>
            <p className="stat-card-sub"><span className="stat-card-dot" style={{ background: '#C06226' }} />aktywnych</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.18) 0%, rgba(22,163,74,0.10) 100%)' }}>
            <svg className="w-5 h-5" style={{ color: '#16a34a' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="stat-card-label">Wykonane</p>
            <p className="stat-card-value">{loading ? '…' : counts.done}</p>
            <p className="stat-card-sub"><span className="stat-card-dot" style={{ background: '#16a34a' }} />ukończone</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'linear-gradient(135deg, rgba(156,184,183,0.22) 0%, rgba(122,158,157,0.10) 100%)' }}>
            <svg className="w-5 h-5" style={{ color: '#5A8A89' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="stat-card-label">Wszystkie</p>
            <p className="stat-card-value">{loading ? '…' : counts.all}</p>
            <p className="stat-card-sub"><span className="stat-card-dot" style={{ background: '#5A8A89' }} />przypisanych</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex">
        <div className="client-tabs">
          {(['pending', 'all', 'done'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={filter === f ? 'active' : ''}
            >
              {f === 'pending' ? 'Do zrobienia' : f === 'done' ? 'Wykonane' : 'Wszystkie'}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="client-card p-4">
              <div className="shimmer-bg h-4 rounded-lg w-2/3 mb-2.5" />
              <div className="shimmer-bg h-3 rounded-lg w-full mb-2" />
              <div className="shimmer-bg h-2 rounded-full w-full mt-3" />
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="client-card p-8 text-center">
          <div
            className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
            style={{ background: filter === 'done' ? 'rgba(122,158,157,0.15)' : 'rgba(34,197,94,0.10)' }}
          >
            <svg className="w-7 h-7" style={{ color: filter === 'done' ? '#5A8A89' : '#16a34a' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              {filter === 'done' ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              )}
            </svg>
          </div>
          <p className="text-raisin font-semibold text-sm">
            {filter === 'done' ? 'Brak ukończonych testów' : filter === 'pending' ? 'Brak testów do wykonania' : 'Brak testów'}
          </p>
          <p className="text-raisin/45 text-xs mt-1">
            {filter === 'done' ? 'Twoje wykonane testy pojawią się tutaj' : 'Wszystko na bieżąco'}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {filtered.map((item) => {
          const hoursLeft = getHoursRemaining(item.availableTo);
          const isCompleted = !!item.completedAt;
          const isExpired = hoursLeft === 0 && !isCompleted;
          const canTake = !isExpired && !isCompleted;
          const toDate = new Date(item.availableTo);

          return (
            <button
              key={item.id}
              type="button"
              disabled={!canTake}
              onClick={() => canTake && navigate(`/app/take/${item.assessmentId}?assignmentId=${item.id}`)}
              className={`client-card text-left p-4 ${canTake ? 'client-card-hover group' : ''}`}
              style={{
                opacity: canTake ? 1 : 0.78,
                cursor: canTake ? 'pointer' : 'default',
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <h3 className={`font-semibold text-raisin truncate ${canTake ? 'group-hover:text-ruddy transition-colors' : ''}`}>
                      {item.assessmentName}
                    </h3>
                    <StatusBadge hoursLeft={hoursLeft} completed={isCompleted} />
                  </div>

                  <p className="text-xs text-raisin/55 line-clamp-2">{item.assessmentDescription}</p>

                  <div className="flex items-center gap-3 mt-2 text-[11px] text-raisin/40">
                    <span className="inline-flex items-center gap-1.5">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Do: {toDate.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {item.questionCount > 0 && (
                      <span className="inline-flex items-center gap-1.5">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {item.questionCount} pytań
                      </span>
                    )}
                  </div>

                  {!isCompleted && <ProgressBar hoursLeft={hoursLeft} />}

                  {isCompleted && item.completedAt && (
                    <p className="text-[11px] mt-2 font-medium inline-flex items-center gap-1" style={{ color: '#16a34a' }}>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Wykonany {new Date(item.completedAt).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </div>

                {canTake && (
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 group-hover:scale-110"
                    style={{ background: 'rgba(192,98,38,0.10)', color: '#C06226' }}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
                {isCompleted && (
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(34,197,94,0.12)', color: '#16a34a' }}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                {isExpired && (
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(220,38,38,0.10)', color: '#b91c1c' }}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
