import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../store/store';
import { useAuth } from '../hooks/useAuth';
import { logout } from '../store/slices/authSlice';
import axiosClient from '../api/axiosClient';

export default function SettingsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(false);

    if (pwForm.next.length < 8) {
      setPwError('Nowe hasło musi mieć co najmniej 8 znaków.');
      return;
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwError('Nowe hasła nie są identyczne.');
      return;
    }

    setPwLoading(true);
    try {
      await axiosClient.patch('/users/me/password', {
        currentPassword: pwForm.current,
        newPassword: pwForm.next,
      });
      setPwSuccess(true);
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err: any) {
      setPwError(err.response?.data?.message ?? 'Błąd zmiany hasła.');
    } finally {
      setPwLoading(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleteError(null);
    setDeleteLoading(true);
    try {
      await axiosClient.delete('/users/me');
      dispatch(logout());
      navigate('/login');
    } catch (err: any) {
      setDeleteError(err.response?.data?.message ?? 'Błąd usuwania konta.');
      setDeleteLoading(false);
    }
  }

  function handleLogout() {
    dispatch(logout());
    navigate('/login');
  }

  return (
    <div className="space-y-6 sm:space-y-7 animate-slide-up">

      <div className="client-page-header">
        <h1>Ustawienia</h1>
        <p>Zarządzaj swoim kontem i prywatnością</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">

        {/* Account info */}
        <section className="client-card p-5">
          <h2 className="section-title mb-4">Twoje konto</h2>
          {user && (
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-semibold shrink-0"
                style={{ background: 'linear-gradient(135deg, #9CB8B7 0%, #7A9E9D 100%)', boxShadow: '0 6px 18px rgba(122,158,157,0.30)' }}
              >
                {user.firstName?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-raisin truncate">{user.firstName} {user.lastName}</p>
                <p className="text-sm text-raisin/55 truncate">{user.email}</p>
                {user.organization?.name && (
                  <span
                    className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                    style={{ background: 'rgba(192,98,38,0.10)', color: '#C06226', border: '1px solid rgba(192,98,38,0.18)' }}
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {user.organization.name}
                  </span>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Session */}
        <section className="client-card p-5">
          <h2 className="section-title mb-4">Sesja</h2>
          <p className="text-xs text-raisin/55 mb-4 leading-relaxed">
            Wyloguj się z tego urządzenia. Aby zalogować się ponownie, użyj swojego adresu email i hasła.
          </p>
          <button onClick={handleLogout} className="btn-client-ghost flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Wyloguj się
          </button>
        </section>
      </div>

      {/* Change password */}
      <section className="client-card p-5 sm:p-6">
        <h2 className="section-title mb-4">Zmień hasło</h2>
        <form onSubmit={handleChangePassword} className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
          <div>
            <label className="client-label">Obecne hasło</label>
            <input
              type="password"
              value={pwForm.current}
              onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))}
              required
              className="client-input"
              placeholder="••••••••"
            />
          </div>
          <div className="hidden lg:block" />
          <div>
            <label className="client-label">Nowe hasło</label>
            <input
              type="password"
              value={pwForm.next}
              onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))}
              required
              minLength={8}
              className="client-input"
              placeholder="Minimum 8 znaków"
            />
          </div>
          <div>
            <label className="client-label">Powtórz nowe hasło</label>
            <input
              type="password"
              value={pwForm.confirm}
              onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
              required
              className="client-input"
              placeholder="••••••••"
            />
          </div>

          {pwError && (
            <div
              className="lg:col-span-2 flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm"
              style={{ background: 'rgba(220,38,38,0.06)', color: '#b91c1c', border: '1px solid rgba(220,38,38,0.20)' }}
            >
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              {pwError}
            </div>
          )}
          {pwSuccess && (
            <div
              className="lg:col-span-2 flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm"
              style={{ background: 'rgba(34,197,94,0.10)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.22)' }}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Hasło zostało zmienione pomyślnie
            </div>
          )}

          <div className="lg:col-span-2 flex justify-end mt-1">
            <button
              type="submit"
              disabled={pwLoading}
              className="btn-client-primary"
              style={{ width: 'auto', minWidth: 200 }}
            >
              {pwLoading ? 'Zapisywanie...' : 'Zmień hasło'}
            </button>
          </div>
        </form>
      </section>

      {/* Danger zone */}
      <section
        className="client-card p-5 sm:p-6"
        style={{ borderColor: 'rgba(220,38,38,0.20)' }}
      >
        <div className="flex items-start gap-4 mb-4">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(220,38,38,0.08)' }}
          >
            <svg className="w-5 h-5" style={{ color: '#dc2626' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: '#dc2626' }}>
              Strefa niebezpieczna
            </h2>
            <p className="text-xs text-raisin/55 mt-1.5 leading-relaxed">
              Usunięcie konta jest nieodwracalne. Wszystkie Twoje dane (testy, wyniki, historia dobrostanu) zostaną trwale usunięte.
            </p>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={() => setShowDeleteModal(true)}
            className="btn-client-danger"
            style={{ width: 'auto', minWidth: 180 }}
          >
            Usuń konto
          </button>
        </div>
      </section>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 animate-fade-in">
          <div className="client-card w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(220,38,38,0.10)' }}
              >
                <svg className="w-5 h-5" style={{ color: '#dc2626' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-raisin">Usuń konto</h3>
            </div>
            <p className="text-sm text-raisin/55 mb-4 leading-relaxed">
              Ta operacja jest nieodwracalna. Wpisz <strong className="text-raisin">USUŃ</strong>, aby potwierdzić.
            </p>

            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="Wpisz: USUŃ"
              className="client-input mb-3"
              style={{
                borderColor: deleteConfirm === 'USUŃ' ? '#dc2626' : undefined,
              }}
            />

            {deleteError && (
              <div
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm mb-3"
                style={{ background: 'rgba(220,38,38,0.06)', color: '#b91c1c', border: '1px solid rgba(220,38,38,0.20)' }}
              >
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                </svg>
                {deleteError}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirm('');
                  setDeleteError(null);
                }}
                className="btn-client-ghost"
              >
                Anuluj
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirm !== 'USUŃ' || deleteLoading}
                className="btn-client-primary"
                style={{
                  background: deleteConfirm === 'USUŃ'
                    ? 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)'
                    : undefined,
                  boxShadow: deleteConfirm === 'USUŃ' ? '0 6px 18px rgba(220,38,38,0.30)' : undefined,
                }}
              >
                {deleteLoading ? 'Usuwanie...' : 'Usuń konto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
