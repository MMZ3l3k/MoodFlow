'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveTokens, saveRole } from '../../../lib/auth';
import axiosClient from '../../../lib/axiosClient';

// H3/M15: dozwolone role przy logowaniu do panelu (walidacja przeciw manipulacji linkiem)
const ALLOWED_ROLES = ['admin', 'hr'];

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'processing' | 'error'>('processing');

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) {
      setStatus('error');
      return;
    }

    const params = new URLSearchParams(hash);
    const code = params.get('code');
    const access = params.get('access');
    const refresh = params.get('refresh');
    const role = params.get('role');

    const finish = (r: string) => {
      window.history.replaceState(null, '', window.location.pathname);
      router.replace(r === 'hr' ? '/dashboard/hr' : '/dashboard');
    };

    (async () => {
      try {
        if (code) {
          // H3: nowy przepływ — wymiana jednorazowego kodu na tokeny
          const { data } = await axiosClient.post('/auth/handoff/exchange', { code });
          const effectiveRole = data.role ?? role;
          if (!ALLOWED_ROLES.includes(effectiveRole)) { setStatus('error'); return; }
          saveTokens(data.accessToken, data.refreshToken);
          saveRole(effectiveRole);
          finish(effectiveRole);
        } else if (access && refresh && role && ALLOWED_ROLES.includes(role)) {
          // Kompatybilność wsteczna: stary link z tokenami (do czasu wdrożenia obu frontów)
          saveTokens(decodeURIComponent(access), decodeURIComponent(refresh));
          saveRole(role);
          finish(role);
        } else {
          setStatus('error');
        }
      } catch {
        setStatus('error');
      }
    })();
  }, [router]);

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5EEE3' }}>
        <div className="text-center">
          <p className="text-raisin/70 mb-4">Nieprawidłowy link logowania.</p>
          <a href={`${process.env.NEXT_PUBLIC_CLIENT_URL ?? 'https://innovative-presence-production.up.railway.app'}/login`} className="text-sm underline" style={{ color: '#C06226' }}>
            Wróć do strony logowania
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5EEE3' }}>
      <div className="text-center">
        <div
          className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin mx-auto mb-4"
          style={{ borderColor: '#C06226', borderTopColor: 'transparent' }}
        />
        <p className="text-raisin/50 text-sm">Trwa logowanie...</p>
      </div>
    </div>
  );
}
