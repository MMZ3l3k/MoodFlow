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

  // Change password form
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  // Delete account
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Ustawienia</h1>
        <p className="text-gray-500 text-sm mt-0.5">Zarządzaj swoim kontem</p>
      </div>

      {/* Account info */}
      <section className="bg-white rounded-2xl shadow-sm p-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Twoje konto</h2>
        {user && (
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-lg font-bold text-blue-600">
                {user.firstName?.[0]?.toUpperCase() ?? '?'}
              </span>
            </div>
            <div>
              <p className="font-semibold text-gray-800">{user.firstName} {user.lastName}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>
        )}
      </section>

      {/* Change password */}
      <section className="bg-white rounded-2xl shadow-sm p-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Zmień hasło</h2>
        <form onSubmit={handleChangePassword} className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Obecne hasło</label>
            <input
              type="password"
              value={pwForm.current}
              onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))}
              required
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Nowe hasło</label>
            <input
              type="password"
              value={pwForm.next}
              onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))}
              required
              minLength={8}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Minimum 8 znaków"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Powtórz nowe hasło</label>
            <input
              type="password"
              value={pwForm.confirm}
              onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
              required
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          {pwError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-3 py-2">
              {pwError}
            </div>
          )}
          {pwSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-600 text-sm rounded-xl px-3 py-2">
              Hasło zostało zmienione pomyślnie.
            </div>
          )}

          <button
            type="submit"
            disabled={pwLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition text-sm"
          >
            {pwLoading ? 'Zapisywanie...' : 'Zmień hasło'}
          </button>
        </form>
      </section>

      {/* Logout */}
      <section className="bg-white rounded-2xl shadow-sm p-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Sesja</h2>
        <button
          onClick={handleLogout}
          className="w-full border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium py-2.5 rounded-xl transition text-sm"
        >
          Wyloguj się
        </button>
      </section>

      {/* Delete account */}
      <section className="bg-white rounded-2xl shadow-sm p-4 border border-red-100">
        <h2 className="text-sm font-semibold text-red-500 uppercase tracking-wide mb-1">Strefa niebezpieczna</h2>
        <p className="text-xs text-gray-500 mb-3">Usunięcie konta jest nieodwracalne. Wszystkie Twoje dane zostaną trwale usunięte.</p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="w-full bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-medium py-2.5 rounded-xl transition text-sm"
        >
          Usuń konto
        </button>
      </section>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5">
            <h3 className="text-lg font-bold text-gray-800 mb-1">Usuń konto</h3>
            <p className="text-sm text-gray-500 mb-4">
              Ta operacja jest nieodwracalna. Wpisz <strong>USUŃ</strong> aby potwierdzić.
            </p>

            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="Wpisz: USUŃ"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 mb-3"
            />

            {deleteError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-3 py-2 mb-3">
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
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
              >
                Anuluj
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirm !== 'USUŃ' || deleteLoading}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white py-2.5 rounded-xl text-sm font-semibold transition"
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
