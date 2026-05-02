'use client';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // next-themes wymaga mounted check (SSR/CSR mismatch)
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <button
        type="button"
        className="theme-toggle-admin"
        style={compact ? { width: 32, height: 32 } : undefined}
        aria-label="Motyw"
      />
    );
  }

  const current = theme === 'system' ? 'system' : resolvedTheme;
  const label = current === 'dark' ? 'Ciemny' : current === 'light' ? 'Jasny' : 'System';
  const tooltip = `Motyw: ${label} (kliknij aby zmienić)`;

  const next = () => {
    setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light');
  };

  return (
    <button
      type="button"
      onClick={next}
      aria-label={tooltip}
      title={tooltip}
      className="theme-toggle-admin"
      style={compact ? { width: 32, height: 32 } : undefined}
    >
      {current === 'dark' ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4"></circle>
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : theme === 'light' ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="14" rx="2" />
          <path d="M8 22h8M12 18v4" />
        </svg>
      )}
    </button>
  );
}
