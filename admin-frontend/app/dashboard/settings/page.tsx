'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axiosClient from '../../../lib/axiosClient';
import { getAccessToken, getSessionTimeout, setSessionTimeout } from '../../../lib/auth';

const TIMEOUT_OPTIONS = [
  { value: 5, label: '5 minut' },
  { value: 15, label: '15 minut' },
  { value: 30, label: '30 minut' },
  { value: 60, label: '1 godzina' },
];

export default function SettingsPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdMessage, setPwdMessage] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [sessionTimeout, setSessionTimeoutState] = useState(15);
  const [inviteCode, setInviteCode] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!getAccessToken()) { router.push('/login'); return; }
    setSessionTimeoutState(getSessionTimeout());
    axiosClient.get('/organizations/my')
      .then((res) => setInviteCode(res.data?.inviteCode ?? ''))
      .catch(() => {});
  }, [router]);

  const handleCopy = () => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMessage('');
    setPwdError('');
    if (newPassword !== confirmPassword) {
      setPwdError('Nowe hasła nie są identyczne');
      return;
    }
    if (newPassword.length < 8) {
      setPwdError('Nowe hasło musi mieć co najmniej 8 znaków');
      return;
    }
    setPwdLoading(true);
    try {
      await axiosClient.post('/users/me/change-password', { currentPassword, newPassword });
      setPwdMessage('Hasło zostało zmienione');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setPwdError(e.response?.data?.message ?? 'Błąd zmiany hasła');
    } finally {
      setPwdLoading(false);
    }
  };

  const handleTimeoutChange = (value: number) => {
    setSessionTimeoutState(value);
    setSessionTimeout(value);
  };

  return (
    <div className="space-y-8 max-w-xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Ustawienia</h2>
        <p className="text-sm text-gray-400 mt-0.5">Konfiguracja konta administratora</p>
      </div>

      {/* Invite code */}
      {inviteCode && (
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
          <div>
            <h3 className="text-base font-semibold" style={{ color: '#2E211C' }}>Kod zaproszeniowy firmy</h3>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(46,33,28,0.45)' }}>
              Udostępnij ten kod pracownikom — wpiszą go podczas rejestracji, aby dołączyć do Twojej firmy
            </p>
          </div>
          <div
            className="flex items-center gap-3 rounded-xl px-4 py-3"
            style={{ background: 'rgba(192,98,38,0.06)', border: '1px solid rgba(192,98,38,0.2)' }}
          >
            <code
              className="flex-1 text-lg font-bold tracking-widest"
              style={{ color: '#C06226', fontFamily: 'monospace' }}
            >
              {inviteCode}
            </code>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
              style={{
                background: copied ? 'rgba(34,197,94,0.12)' : 'rgba(192,98,38,0.12)',
                color: copied ? '#16a34a' : '#C06226',
                border: copied ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(192,98,38,0.25)',
              }}
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Skopiowano
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Kopiuj
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Password */}
      <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
        <h3 className="text-base font-semibold text-gray-700">Zmiana hasła</h3>
        <form onSubmit={handlePasswordChange} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Aktualne hasło</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Nowe hasło</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Potwierdź nowe hasło</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          {pwdError && <p className="text-sm text-red-600">{pwdError}</p>}
          {pwdMessage && <p className="text-sm text-emerald-600">{pwdMessage}</p>}
          <button
            type="submit"
            disabled={pwdLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 rounded-lg transition disabled:opacity-50"
          >
            {pwdLoading ? 'Zapisywanie...' : 'Zmień hasło'}
          </button>
        </form>
      </div>

      {/* Session timeout */}
      <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-gray-700">Limit sesji</h3>
          <p className="text-xs text-gray-400 mt-0.5">Po tym czasie braku aktywności nastąpi automatyczne wylogowanie</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {TIMEOUT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleTimeoutChange(opt.value)}
              className={`py-2.5 rounded-lg text-sm font-medium border transition ${
                sessionTimeout === opt.value
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400">
          Aktualny limit: <span className="font-medium text-gray-600">{TIMEOUT_OPTIONS.find(o => o.value === sessionTimeout)?.label}</span>
        </p>
      </div>
    </div>
  );
}
