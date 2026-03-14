import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../store/store';
import { register, clearError } from '../store/slices/authSlice';
import { useAuth } from '../hooks/useAuth';

const DEPARTMENTS = ['IT', 'HR', 'Finanse', 'Marketing', 'Sprzedaż', 'Operacje', 'Prawny', 'Inny'];

export default function RegisterPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useAuth();

  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    department: '',
  });
  const [validationError, setValidationError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    dispatch(clearError());

    if (form.password !== form.confirmPassword) {
      setValidationError('Hasła nie są identyczne');
      return;
    }

    const { confirmPassword, ...payload } = form;
    const result = await dispatch(register(payload));
    if (register.fulfilled.match(result)) {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8 text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Rejestracja zakończona</h2>
          <p className="text-gray-500 text-sm mb-2">
            Twoje konto zostało utworzone i oczekuje na zatwierdzenie przez administratora.
          </p>
          <p className="text-gray-400 text-xs mb-6">
            Dostęp do aplikacji uzyskasz po weryfikacji Twojego konta.
          </p>
          <Link
            to="/login"
            className="text-blue-600 hover:underline text-sm font-medium"
          >
            Wróć do logowania
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-1">MoodFlow</h1>
        <p className="text-center text-gray-500 mb-6 text-sm">Utwórz nowe konto</p>

        {(error || validationError) && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
            {validationError ?? error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Imię</label>
              <input
                type="text"
                required
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Jan"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nazwisko</label>
              <input
                type="text"
                required
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Kowalski"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="jan.kowalski@firma.pl"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dział</label>
            <select
              required
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="" disabled>Wybierz dział...</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hasło</label>
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="min. 8 znaków"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Powtórz hasło</label>
            <input
              type="password"
              required
              minLength={8}
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Powtórz hasło"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Rejestracja...' : 'Zarejestruj się'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Masz już konto?{' '}
          <Link to="/login" className="text-blue-600 hover:underline font-medium">
            Zaloguj się
          </Link>
        </p>
      </div>
    </div>
  );
}
