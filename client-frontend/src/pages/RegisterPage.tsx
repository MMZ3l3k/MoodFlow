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
      <div className="min-h-screen auth-bg flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-scale-in text-center">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
            style={{
              background: 'linear-gradient(135deg, #9CB8B7 0%, #7A9E9D 100%)',
              boxShadow: '0 8px 32px rgba(156, 184, 183, 0.4)',
            }}
          >
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-raisin mb-2">Konto utworzone!</h2>
          <p className="text-raisin/60 text-sm mb-1">
            Twoje konto oczekuje na zatwierdzenie przez administratora.
          </p>
          <p className="text-raisin/40 text-xs mb-8">
            Dostęp uzyskasz po weryfikacji Twojego konta.
          </p>

          <Link
            to="/login"
            className="btn-primary inline-flex items-center gap-2"
            style={{ textDecoration: 'none' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Wróć do logowania
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen auth-bg flex items-center justify-center p-4 py-8">

      {/* Decorative blobs */}
      <div
        className="fixed top-[-100px] right-[-80px] w-72 h-72 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(156,184,183,0.25) 0%, transparent 70%)' }}
      />
      <div
        className="fixed bottom-[-60px] left-[-60px] w-56 h-56 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(192,98,38,0.12) 0%, transparent 70%)' }}
      />

      <div className="w-full max-w-md animate-slide-up">

        {/* Logo */}
        <div className="text-center mb-7">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold mx-auto mb-3"
            style={{
              background: 'linear-gradient(135deg, #C06226 0%, #984619 100%)',
              boxShadow: '0 8px 28px rgba(192, 98, 38, 0.35)',
            }}
          >
            M
          </div>
          <h1 className="text-2xl font-bold text-raisin">Dołącz do MoodFlow</h1>
          <p className="text-raisin/50 mt-1 text-sm">Utwórz nowe konto</p>
        </div>

        {/* Card */}
        <div
          className="rounded-3xl p-7"
          style={{
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(221, 211, 186, 0.7)',
            boxShadow: '0 16px 48px rgba(46, 33, 28, 0.10)',
          }}
        >

          {/* Error */}
          {(error || validationError) && (
            <div
              className="mb-5 p-3.5 rounded-xl text-sm flex items-center gap-2 animate-fade-in"
              style={{ background: 'rgba(192,98,38,0.08)', color: '#C06226', border: '1px solid rgba(192,98,38,0.2)' }}
            >
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              {validationError ?? error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-raisin/70 mb-1.5">Imię</label>
                <input
                  type="text"
                  required
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className="input-field"
                  placeholder="Jan"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-raisin/70 mb-1.5">Nazwisko</label>
                <input
                  type="text"
                  required
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className="input-field"
                  placeholder="Kowalski"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-raisin/70 mb-1.5">Adres email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-field"
                placeholder="jan.kowalski@firma.pl"
              />
            </div>

            {/* Department */}
            <div>
              <label className="block text-sm font-semibold text-raisin/70 mb-1.5">Dział</label>
              <select
                required
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="input-field"
              >
                <option value="" disabled>Wybierz dział...</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-raisin/70 mb-1.5">Hasło</label>
              <input
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="input-field"
                placeholder="min. 8 znaków"
              />
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-sm font-semibold text-raisin/70 mb-1.5">Powtórz hasło</label>
              <input
                type="password"
                required
                minLength={8}
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                className="input-field"
                placeholder="Powtórz hasło"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full mt-2 ripple"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Rejestracja...
                </span>
              ) : 'Utwórz konto'}
            </button>
          </form>

          <p className="text-center text-sm text-raisin/50 mt-5">
            Masz już konto?{' '}
            <Link to="/login" className="font-semibold transition-colors" style={{ color: '#C06226' }}>
              Zaloguj się
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-raisin/30 mt-6">
          Twoje dane są bezpieczne i szyfrowane
        </p>
      </div>
    </div>
  );
}
