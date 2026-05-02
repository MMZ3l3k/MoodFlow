import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

// Pokazuje banner gdy Service Worker wykryje nową wersję aplikacji.
// Klik „Odśwież" → SW.skipWaiting() + reload — nowa wersja staje się aktywna.
export default function PwaUpdatePrompt() {
  const [show, setShow] = useState(false);
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url: string, registration: ServiceWorkerRegistration | undefined) {
      // Sprawdzaj nową wersję co 30 minut
      if (registration) {
        setInterval(() => registration.update().catch(() => {}), 30 * 60 * 1000);
      }
    },
  });

  useEffect(() => {
    if (needRefresh) setShow(true);
  }, [needRefresh]);

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      style={{
        position: 'fixed',
        left: 16,
        right: 16,
        bottom: 84,
        zIndex: 100,
        maxWidth: 480,
        margin: '0 auto',
        padding: '14px 16px',
        borderRadius: 16,
        background: 'rgba(255, 255, 255, 0.95)',
        border: '1px solid rgba(192, 98, 38, 0.25)',
        boxShadow: '0 16px 48px rgba(46, 33, 28, 0.18)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          background: 'linear-gradient(135deg, #C06226 0%, #984619 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <polyline points="23 4 23 10 17 10"></polyline>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#2E211C' }}>
          Dostępna nowa wersja
        </p>
        <p style={{ margin: '2px 0 0 0', fontSize: 12, color: 'rgba(46, 33, 28, 0.55)' }}>
          Odśwież, aby zainstalować aktualizację
        </p>
      </div>
      <button
        onClick={() => updateServiceWorker(true)}
        style={{
          padding: '8px 14px',
          borderRadius: 10,
          border: 'none',
          background: 'linear-gradient(135deg, #C06226 0%, #984619 100%)',
          color: 'white',
          fontWeight: 600,
          fontSize: 13,
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        Odśwież
      </button>
      <button
        onClick={() => setShow(false)}
        aria-label="Zamknij"
        style={{
          padding: 6,
          borderRadius: 8,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          color: 'rgba(46, 33, 28, 0.45)',
          flexShrink: 0,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  );
}
