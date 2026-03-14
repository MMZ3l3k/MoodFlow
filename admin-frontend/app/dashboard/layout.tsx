'use client';
import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import axiosClient from '../../lib/axiosClient';
import { clearTokens, getAccessToken, getSessionTimeout } from '../../lib/auth';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doLogout = useCallback(async () => {
    try { await axiosClient.post('/auth/logout'); } catch {}
    clearTokens();
    router.push('/login');
  }, [router]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const minutes = getSessionTimeout();
    timerRef.current = setTimeout(doLogout, minutes * 60 * 1000);
  }, [doLogout]);

  useEffect(() => {
    if (!getAccessToken()) { router.push('/login'); return; }
    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [router, resetTimer]);

  return (
    <div className="flex min-h-screen" style={{ background: '#F5EEE3' }}>
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto animate-in">{children}</main>
    </div>
  );
}
