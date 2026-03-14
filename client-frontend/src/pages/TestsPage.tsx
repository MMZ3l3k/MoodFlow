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
    return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">Wykonany</span>;
  }
  if (hoursLeft === 0) {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">Wygasło</span>;
  }
  if (hoursLeft <= 3) {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 font-medium">Zostało {hoursLeft}h</span>;
  }
  return <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 font-medium">Zostało {hoursLeft}h</span>;
}

function ProgressBar({ hoursLeft }: { hoursLeft: number }) {
  const pct = Math.max(0, Math.min(100, (hoursLeft / 24) * 100));
  const color = hoursLeft === 0 ? 'bg-red-400' : hoursLeft <= 3 ? 'bg-orange-400' : 'bg-blue-400';
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
      <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
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

  const filtered = assigned.filter((a) => {
    if (filter === 'pending') return !a.completedAt && getHoursRemaining(a.availableTo) > 0;
    if (filter === 'done') return !!a.completedAt;
    return true;
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Testy</h1>
        <p className="text-gray-500 text-sm mt-0.5">Testy przydzielone przez HR</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['pending', 'all', 'done'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition ${
              filter === f
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-gray-500 border border-gray-200 hover:border-blue-300'
            }`}
          >
            {f === 'pending' ? 'Do zrobienia' : f === 'done' ? 'Wykonane' : 'Wszystkie'}
          </button>
        ))}
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm p-4 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-2/3 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-full mb-3" />
              <div className="h-2 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <p className="text-3xl mb-2">
            {filter === 'done' ? '📭' : '✅'}
          </p>
          <p className="text-gray-500 text-sm">
            {filter === 'done'
              ? 'Nie wykonałeś(aś) jeszcze żadnego testu'
              : filter === 'pending'
              ? 'Brak testów do wykonania'
              : 'Brak testów'}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((item) => {
          const hoursLeft = getHoursRemaining(item.availableTo);
          const isCompleted = !!item.completedAt;
          const isExpired = hoursLeft === 0 && !isCompleted;
          const canTake = !isExpired && !isCompleted;
          const toDate = new Date(item.availableTo);

          return (
            <div
              key={item.id}
              className={`bg-white rounded-2xl shadow-sm p-4 transition ${
                canTake ? 'hover:shadow-md cursor-pointer active:scale-[0.99]' : 'opacity-70'
              }`}
              onClick={() => {
                if (canTake) navigate(`/app/take/${item.assessmentId}?assignmentId=${item.id}`);
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-800">{item.assessmentName}</h3>
                    <StatusBadge hoursLeft={hoursLeft} completed={isCompleted} />
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">{item.assessmentDescription}</p>

                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span>
                      📅 Do: {toDate.toLocaleDateString('pl-PL', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                    {item.questionCount && <span>❓ {item.questionCount} pytań</span>}
                  </div>

                  {!isCompleted && (
                    <ProgressBar hoursLeft={hoursLeft} />
                  )}

                  {isCompleted && (
                    <p className="text-xs text-green-600 mt-2 font-medium">
                      ✓ Wykonany:{' '}
                      {new Date(item.completedAt!).toLocaleDateString('pl-PL', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </p>
                  )}
                </div>

                {canTake && (
                  <span className="text-blue-400 text-lg shrink-0">→</span>
                )}
                {isCompleted && (
                  <span className="text-green-400 text-lg shrink-0">✓</span>
                )}
                {isExpired && (
                  <span className="text-red-300 text-lg shrink-0">✕</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
