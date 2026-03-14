import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../store/store';
import { fetchMe } from '../store/slices/authSlice';
import { useAuth } from '../hooks/useAuth';

const roleLabels: Record<string, string> = {
  employee: 'Pracownik',
  hr: 'HR',
  admin: 'Administrator',
};

export default function DashboardPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { user, handleLogout } = useAuth();

  useEffect(() => {
    dispatch(fetchMe());
  }, [dispatch]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-blue-600">MoodFlow</h1>
          <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-700">
            Wyloguj
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        {user ? (
          <div>
            <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-1">
                Witaj, {user.firstName} {user.lastName}
              </h2>
              <p className="text-gray-500 text-sm">
                Rola: <span className="font-medium text-blue-600">{roleLabels[user.role]}</span>
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                to="/assessments"
                className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition group"
              >
                <div className="text-3xl mb-3">📋</div>
                <h3 className="font-semibold text-gray-800 group-hover:text-blue-600">Wypełnij test</h3>
                <p className="text-sm text-gray-500 mt-1">Wybierz i wypełnij ankietę dobrostanu</p>
              </Link>

              <Link
                to="/results"
                className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition group"
              >
                <div className="text-3xl mb-3">📊</div>
                <h3 className="font-semibold text-gray-800 group-hover:text-blue-600">Historia wyników</h3>
                <p className="text-sm text-gray-500 mt-1">Przeglądaj swoje poprzednie wyniki</p>
              </Link>
            </div>
          </div>
        ) : (
          <p className="text-gray-400">Ładowanie...</p>
        )}
      </main>
    </div>
  );
}
