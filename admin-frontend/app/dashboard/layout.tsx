'use client';
import { useEffect, useRef, useCallback, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../../components/Sidebar';
import axiosClient from '../../lib/axiosClient';
import { clearTokens, getAccessToken, getSessionTimeout, getRole } from '../../lib/auth';

// H4: strefy panelu dostępne dla HR (obok tras admina). Wszystko poza nimi = tylko ADMIN.
// Admin ma dostęp również do stref HR (spójne z backendem: analityka @Roles(HR, ADMIN)).
function isHrArea(pathname: string): boolean {
  return pathname.startsWith('/dashboard/hr') || pathname.startsWith('/dashboard/assessments');
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // H4: renderujemy zawartość dopiero po potwierdzeniu roli — bez tego HR na chwilę
  // widział panel admina (użytkownicy, kod zaproszeniowy) zanim nastąpił redirect.
  const [authorized, setAuthorized] = useState(false);

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
    if (!getAccessToken()) { router.replace('/login'); return; }

    // H4: kontrola roli względem żądanej trasy (RoleGate).
    const role = getRole();
    const allowed = isHrArea(pathname) ? role === 'hr' || role === 'admin' : role === 'admin';
    if (!allowed) {
      setAuthorized(false);
      router.replace(role === 'hr' ? '/dashboard/hr' : role === 'admin' ? '/dashboard' : '/login');
      return;
    }
    setAuthorized(true);

    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [router, pathname, resetTimer]);

  // Nie renderuj treści dopóki rola nie zostanie potwierdzona dla tej trasy
  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'hsl(220 14% 97%)' }}>
        <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: '#C06226', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'hsl(220 14% 97%)' }}>
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="p-8 min-h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
