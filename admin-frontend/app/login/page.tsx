'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axiosClient from '../../lib/axiosClient';
import { saveTokens, saveRole } from '../../lib/auth';
import { AuthTokens } from '../../types';
import AuthHero from '../../components/auth/AuthHero';
import RolePicker from '../../components/auth/RolePicker';
import { VARIANTS } from '../../components/auth/AuthVariants';

function clearTokens() {
  localStorage.removeItem('admin_access_token');
  localStorage.removeItem('admin_refresh_token');
}

const t = VARIANTS.admin;

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await axiosClient.post<AuthTokens>('/auth/login', form);
      saveTokens(data.accessToken, data.refreshToken);

      const me = await axiosClient.get('/users/me');
      if (me.data.role !== 'admin' && me.data.role !== 'hr') {
        clearTokens();
        setError('Brak dostępu do panelu administracyjnego');
        setLoading(false);
        return;
      }

      saveRole(me.data.role);
      router.push(me.data.role === 'hr' ? '/dashboard/hr' : '/dashboard');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setError(axiosError.response?.data?.message ?? 'Błąd logowania');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell" style={{ background: t.pageBg }}>
      <AuthHero variant="admin" />

      <div className="auth-form-side">
        <div
          className="auth-form-bg-1"
          style={{ background: `radial-gradient(circle, ${t.blobColor1} 0%, transparent 70%)` }}
        />
        <div
          className="auth-form-bg-2"
          style={{ background: `radial-gradient(circle, ${t.blobColor2} 0%, transparent 70%)` }}
        />

        <div className="auth-form-wrap">
          <div className="auth-mobile-brand">
            <div
              className="auth-mobile-brand-logo"
              style={{ background: t.heroGradient }}
            >
              M
            </div>
            <span className="auth-mobile-brand-name" style={{ color: t.text }}>MoodFlow</span>
          </div>

          <div
            className="auth-card"
            style={{ border: `1px solid ${t.cardBorder}` }}
          >
            <div className="auth-card-header">
              <span
                className="auth-hero-badge"
                style={{
                  background: t.badgeBg,
                  border: `1px solid ${t.badgeBorder}`,
                  color: t.primary,
                  marginBottom: 14,
                }}
              >
                {t.badge}
              </span>
              <h1 className="auth-card-title" style={{ color: t.text }}>
                Witaj z powrotem
              </h1>
              <p className="auth-card-subtitle" style={{ color: t.textMuted }}>
                Zaloguj się, aby zarządzać dobrostanem swojego zespołu.
              </p>
            </div>

            {error && (
              <div
                className="auth-error"
                style={{
                  background: 'rgba(192,98,38,0.08)',
                  color: '#C06226',
                  border: '1px solid rgba(192,98,38,0.22)',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="auth-label" style={{ color: t.textMuted }}>Adres email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="auth-input"
                  placeholder="admin@firma.pl"
                  style={{
                    border: `1.5px solid ${t.inputBorder}`,
                    background: 'rgba(255,255,255,0.7)',
                    color: t.text,
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = t.primary;
                    e.currentTarget.style.boxShadow = `0 0 0 3px ${t.ringFocus}`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = t.inputBorder;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div>
                <label className="auth-label" style={{ color: t.textMuted }}>Hasło</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="auth-input"
                    placeholder="••••••••"
                    style={{
                      border: `1.5px solid ${t.inputBorder}`,
                      background: 'rgba(255,255,255,0.7)',
                      color: t.text,
                      paddingRight: 44,
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = t.primary;
                      e.currentTarget.style.boxShadow = `0 0 0 3px ${t.ringFocus}`;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = t.inputBorder;
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: t.textMuted, padding: 2,
                    }}
                  >
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      {showPassword ? (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      ) : (
                        <>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </>
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="auth-submit"
                style={{
                  background: t.heroGradient,
                  boxShadow: t.buttonShadow,
                  marginTop: 6,
                }}
              >
                {loading ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <svg style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} fill="none" viewBox="0 0 24 24">
                      <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Logowanie...
                  </span>
                ) : 'Zaloguj się'}
              </button>
            </form>
          </div>

          <RolePicker active="admin" />

          <p style={{
            textAlign: 'center', fontSize: 11.5,
            color: t.textMuted, marginTop: 16, opacity: 0.7,
          }}>
            Wybierz panel logowania odpowiedni do Twojej roli.
          </p>
        </div>
      </div>
    </div>
  );
}
