import { useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';

type Mode = 'employee' | 'company';

export default function RegisterPage() {
  const [mode, setMode] = useState<Mode>('employee');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<Mode | null>(null);

  // Employee form
  const [emp, setEmp] = useState({
    firstName: '', lastName: '', email: '',
    password: '', confirmPassword: '', inviteCode: '',
  });

  // Company form
  const [comp, setComp] = useState({
    firstName: '', lastName: '', email: '',
    password: '', confirmPassword: '', companyName: '', nip: '', description: '',
  });

  const handleEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (emp.password !== emp.confirmPassword) { setError('Hasła nie są identyczne'); return; }
    setLoading(true);
    try {
      await axiosClient.post('/auth/register-employee', {
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        password: emp.password,
        inviteCode: emp.inviteCode,
      });
      setSuccess('employee');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Błąd rejestracji');
    } finally {
      setLoading(false);
    }
  };

  const handleCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (comp.password !== comp.confirmPassword) { setError('Hasła nie są identyczne'); return; }
    if (!/^\d{10}$/.test(comp.nip)) { setError('NIP musi składać się z 10 cyfr'); return; }
    setLoading(true);
    try {
      await axiosClient.post('/auth/register-company', {
        firstName: comp.firstName,
        lastName: comp.lastName,
        email: comp.email,
        password: comp.password,
        companyName: comp.companyName,
        nip: comp.nip,
        description: comp.description || undefined,
      });
      setSuccess('company');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Błąd rejestracji');
    } finally {
      setLoading(false);
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
          <h2 className="text-2xl font-bold text-raisin mb-2">
            {success === 'company' ? 'Rejestracja firmy wysłana!' : 'Konto utworzone!'}
          </h2>
          <p className="text-raisin/60 text-sm mb-1">
            {success === 'company'
              ? 'Twoja firma oczekuje na weryfikację przez właściciela platformy.'
              : 'Twoje konto oczekuje na zatwierdzenie przez administratora firmy.'}
          </p>
          <p className="text-raisin/40 text-xs mb-8">
            Dostęp uzyskasz po weryfikacji konta.
          </p>
          <Link to="/login" className="btn-primary inline-flex items-center gap-2" style={{ textDecoration: 'none' }}>
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
          >M</div>
          <h1 className="text-2xl font-bold text-raisin">Dołącz do MoodFlow</h1>
          <p className="text-raisin/50 mt-1 text-sm">Utwórz nowe konto</p>
        </div>

        {/* Mode toggle */}
        <div
          className="flex rounded-2xl p-1 mb-5"
          style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(221,211,186,0.7)' }}
        >
          {(['employee', 'company'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError(''); }}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: mode === m ? 'linear-gradient(135deg, #C06226 0%, #984619 100%)' : 'transparent',
                color: mode === m ? 'white' : 'rgba(46,33,28,0.45)',
                boxShadow: mode === m ? '0 2px 8px rgba(192,98,38,0.3)' : 'none',
                border: 'none', cursor: 'pointer',
              }}
            >
              {m === 'employee' ? 'Jestem pracownikiem' : 'Rejestruję firmę'}
            </button>
          ))}
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

          {/* EMPLOYEE FORM */}
          {mode === 'employee' && (
            <form onSubmit={handleEmployee} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-raisin/70 mb-1.5">Imię</label>
                  <input type="text" required value={emp.firstName} onChange={(e) => setEmp({ ...emp, firstName: e.target.value })} className="input-field" placeholder="Jan" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-raisin/70 mb-1.5">Nazwisko</label>
                  <input type="text" required value={emp.lastName} onChange={(e) => setEmp({ ...emp, lastName: e.target.value })} className="input-field" placeholder="Kowalski" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-raisin/70 mb-1.5">Adres email</label>
                <input type="email" required value={emp.email} onChange={(e) => setEmp({ ...emp, email: e.target.value })} className="input-field" placeholder="jan.kowalski@firma.pl" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-raisin/70 mb-1.5">
                  Kod firmy
                  <span className="ml-1 text-xs font-normal text-raisin/40">(otrzymasz od administratora)</span>
                </label>
                <input
                  type="text"
                  required
                  value={emp.inviteCode}
                  onChange={(e) => setEmp({ ...emp, inviteCode: e.target.value.toUpperCase() })}
                  className="input-field"
                  placeholder="MOOD-XXXXXXXX"
                  style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-raisin/70 mb-1.5">Hasło</label>
                <input type="password" required minLength={8} value={emp.password} onChange={(e) => setEmp({ ...emp, password: e.target.value })} className="input-field" placeholder="min. 8 znaków" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-raisin/70 mb-1.5">Powtórz hasło</label>
                <input type="password" required minLength={8} value={emp.confirmPassword} onChange={(e) => setEmp({ ...emp, confirmPassword: e.target.value })} className="input-field" placeholder="Powtórz hasło" />
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full mt-2 ripple">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Rejestracja...
                  </span>
                ) : 'Dołącz do firmy'}
              </button>
            </form>
          )}

          {/* COMPANY FORM */}
          {mode === 'company' && (
            <form onSubmit={handleCompany} className="space-y-4">
              <div
                className="p-3 rounded-xl text-xs text-raisin/60 mb-1"
                style={{ background: 'rgba(156,184,183,0.12)', border: '1px solid rgba(156,184,183,0.3)' }}
              >
                Po rejestracji firma zostanie zweryfikowana przez nasz zespół. Otrzymasz dostęp po akceptacji.
              </div>

              <div>
                <label className="block text-sm font-semibold text-raisin/70 mb-1.5">Nazwa firmy</label>
                <input type="text" required value={comp.companyName} onChange={(e) => setComp({ ...comp, companyName: e.target.value })} className="input-field" placeholder="Nazwa Sp. z o.o." />
              </div>

              <div>
                <label className="block text-sm font-semibold text-raisin/70 mb-1.5">NIP</label>
                <input
                  type="text"
                  required
                  value={comp.nip}
                  onChange={(e) => setComp({ ...comp, nip: e.target.value.replace(/\D/g, '') })}
                  className="input-field"
                  placeholder="1234567890"
                  maxLength={10}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-raisin/70 mb-1.5">
                  Opis działalności
                  <span className="ml-1 text-xs font-normal text-raisin/40">(opcjonalny)</span>
                </label>
                <textarea
                  value={comp.description}
                  onChange={(e) => setComp({ ...comp, description: e.target.value })}
                  className="input-field"
                  placeholder="Krótki opis firmy..."
                  rows={2}
                  style={{ resize: 'none' }}
                />
              </div>

              <div className="border-t border-raisin/10 pt-4">
                <p className="text-xs font-semibold text-raisin/50 mb-3 uppercase tracking-wide">Dane osoby zgłaszającej</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-sm font-semibold text-raisin/70 mb-1.5">Imię</label>
                    <input type="text" required value={comp.firstName} onChange={(e) => setComp({ ...comp, firstName: e.target.value })} className="input-field" placeholder="Jan" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-raisin/70 mb-1.5">Nazwisko</label>
                    <input type="text" required value={comp.lastName} onChange={(e) => setComp({ ...comp, lastName: e.target.value })} className="input-field" placeholder="Kowalski" />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-raisin/70 mb-1.5">Email służbowy</label>
                  <input type="email" required value={comp.email} onChange={(e) => setComp({ ...comp, email: e.target.value })} className="input-field" placeholder="jan@firma.pl" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-raisin/70 mb-1.5">Hasło</label>
                    <input type="password" required minLength={8} value={comp.password} onChange={(e) => setComp({ ...comp, password: e.target.value })} className="input-field" placeholder="min. 8 znaków" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-raisin/70 mb-1.5">Powtórz hasło</label>
                    <input type="password" required minLength={8} value={comp.confirmPassword} onChange={(e) => setComp({ ...comp, confirmPassword: e.target.value })} className="input-field" placeholder="Powtórz" />
                  </div>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full mt-2 ripple">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Rejestracja...
                  </span>
                ) : 'Zarejestruj firmę'}
              </button>
            </form>
          )}

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
