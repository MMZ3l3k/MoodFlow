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

  useEffect(() => {
    if (!getAccessToken()) { router.push('/login'); return; }
    setSessionTimeoutState(getSessionTimeout());
  }, [router]);

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
