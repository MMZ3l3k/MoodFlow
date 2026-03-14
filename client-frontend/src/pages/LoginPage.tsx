import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../store/store';
import { login, fetchMe, clearError } from '../store/slices/authSlice';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, error } = useAuth();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate('/app/home');
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(clearError());
    const result = await dispatch(login(form));
    if (login.fulfilled.match(result)) {
      await dispatch(fetchMe());
      navigate('/app/home');
    }
  };

  return (
    <div className="min-h-screen auth-bg flex items-center justify-center p-4">

      {/* Decorative blobs */}
      <div
        className="fixed top-[-100px] right-[-80px] w-72 h-72 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(156,184,183,0.25) 0%, transparent 70%)' }}
      />
      <div
        className="fixed bottom-[-60px] left-[-60px] w-56 h-56 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(192,98,38,0.12) 0%, transparent 70%)' }}
      />

      <div className="w-full max-w-md animate-scale-in">

        {/* Logo block */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4"
            style={{
              background: 'linear-gradient(135deg, #C06226 0%, #984619 100%)',
              boxShadow: '0 8px 32px rgba(192, 98, 38, 0.35)',
            }}
          >
            M
          </div>
          <h1 className="text-3xl font-bold text-raisin tracking-tight">MoodFlow</h1>
          <p className="text-raisin/50 mt-1.5 text-sm">Zaloguj się do swojego konta</p>
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

          {/* Error alert */}
          {error && (
            <div
              className="mb-5 p-3.5 rounded-xl text-sm flex items-center gap-2 animate-fade-in"
              style={{ background: 'rgba(192,98,38,0.08)', color: '#C06226', border: '1px solid rgba(192,98,38,0.2)' }}
            >
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-raisin/70 mb-1.5">
                Adres email
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-field"
                placeholder="jan.kowalski@firma.pl"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-raisin/70 mb-1.5">
                Hasło
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input-field pr-11"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-raisin/40 hover:text-raisin/70 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full mt-6 ripple"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Logowanie...
                </span>
              ) : 'Zaloguj się'}
            </button>
          </form>

          {/* Register link */}
          <p className="text-center text-sm text-raisin/50 mt-5">
            Nie masz konta?{' '}
            <Link
              to="/register"
              className="font-semibold transition-colors"
              style={{ color: '#C06226' }}
            >
              Zarejestruj się
            </Link>
          </p>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-raisin/30 mt-6">
          Twoje dane są bezpieczne i szyfrowane
        </p>
      </div>
    </div>
  );
}
