'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axiosClient from '../../../lib/axiosClient';
import { saveTokens, saveRole } from '../../../lib/auth';
import { AuthTokens } from '../../../types';

function clearTokens() {
  localStorage.removeItem('admin_access_token');
  localStorage.removeItem('admin_refresh_token');
}

export default function SuperAdminLoginPage() {
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
      if (me.data.role !== 'super_admin') {
        clearTokens();
        setError('Ten panel jest przeznaczony wyłącznie dla właściciela platformy');
        setLoading(false);
        return;
      }

      saveRole(me.data.role);
      router.push('/super-admin/dashboard');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setError(axiosError.response?.data?.message ?? 'Błąd logowania');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: `
          radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.12) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 20%, rgba(79,70,229,0.08) 0%, transparent 50%),
          #F0EFF8
        `,
      }}
    >
      {/* Decorative blobs */}
      <div
        style={{
          position: 'fixed', top: -80, right: -60,
          width: 280, height: 280, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'fixed', bottom: -60, left: -60,
          width: 220, height: 220, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(79,70,229,0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ width: '100%', maxWidth: 420, animation: 'fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 60, height: 60, borderRadius: 16,
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              boxShadow: '0 8px 32px rgba(99, 102, 241, 0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: 24, fontWeight: 700, color: 'white',
            }}
          >
            M
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1e1b4b', margin: 0 }}>MoodFlow</h1>
          <p style={{ fontSize: 13, color: 'rgba(30,27,75,0.45)', marginTop: 4 }}>
            Panel właściciela platformy
          </p>
        </div>

        {/* Badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', borderRadius: 99,
            background: 'rgba(99,102,241,0.1)', color: '#6366f1',
            fontSize: 11, fontWeight: 600, letterSpacing: '0.05em',
            border: '1px solid rgba(99,102,241,0.2)',
          }}>
            <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
            </svg>
            DOSTĘP ZASTRZEŻONY
          </span>
        </div>

        {/* Card */}
        <div
          style={{
            background: 'rgba(255,255,255,0.90)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(99,102,241,0.15)',
            borderRadius: 24,
            padding: 28,
            boxShadow: '0 16px 48px rgba(79, 70, 229, 0.10)',
          }}
        >
          {/* Error */}
          {error && (
            <div
              style={{
                marginBottom: 20, padding: '12px 14px', borderRadius: 12,
                background: 'rgba(99,102,241,0.08)', color: '#6366f1',
                border: '1px solid rgba(99,102,241,0.2)',
                fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'rgba(30,27,75,0.65)', marginBottom: 6 }}>
                Adres email
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="admin-input"
                placeholder="owner@moodflow.pl"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'rgba(30,27,75,0.65)', marginBottom: 6 }}>
                Hasło
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="admin-input"
                  style={{ paddingRight: 44 }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'rgba(30,27,75,0.35)', padding: 2,
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
              style={{
                marginTop: 4, width: '100%',
                padding: '12px 20px', borderRadius: 12, border: 'none',
                background: loading
                  ? 'rgba(99,102,241,0.5)'
                  : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                color: 'white', fontSize: 14, fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 14px rgba(99,102,241,0.4)',
                transition: 'all 0.2s',
              }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
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

        <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(30,27,75,0.3)', marginTop: 20 }}>
          Jesteś użytkownikiem firmy?{' '}
          <a
            href="http://localhost:3000/login"
            style={{ color: 'rgba(30,27,75,0.45)', textDecoration: 'underline' }}
          >
            Zaloguj się tutaj
          </a>
        </p>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .admin-input {
          width: 100%;
          padding: 10px 14px;
          border: 1.5px solid rgba(99,102,241,0.2);
          border-radius: 10px;
          font-size: 14px;
          color: #1e1b4b;
          background: rgba(255,255,255,0.8);
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }
        .admin-input:focus {
          border-color: rgba(99,102,241,0.5);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
        }
      `}</style>
    </div>
  );
}
