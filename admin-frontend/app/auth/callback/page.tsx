'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveTokens, saveRole } from '../../../lib/auth';

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
    const access = params.get('access');
    const refresh = params.get('refresh');
    const role = params.get('role');

    if (!access || !refresh || !role) {
      setStatus('error');
      return;
    }

    saveTokens(decodeURIComponent(access), decodeURIComponent(refresh));
    saveRole(role);

    // Wyczyść fragment z adresu URL
    window.history.replaceState(null, '', window.location.pathname);

    router.replace(role === 'hr' ? '/dashboard/hr' : '/dashboard');
  }, [router]);

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5EEE3' }}>
        <div className="text-center">
          <p className="text-raisin/70 mb-4">Nieprawidłowy link logowania.</p>
          <a href="http://localhost:3000/login" className="text-sm underline" style={{ color: '#C06226' }}>
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
