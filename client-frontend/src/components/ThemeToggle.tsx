import { useTheme } from '../hooks/useTheme';

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggle } = useTheme();

  const label =
    theme === 'light' ? 'Jasny' : theme === 'dark' ? 'Ciemny' : 'System';
  const tooltip = `Motyw: ${label} (kliknij aby zmienić)`;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={tooltip}
      title={tooltip}
      className="theme-toggle"
      style={compact ? { width: 32, height: 32 } : undefined}
    >
      {theme === 'dark' ? (
        // Słońce — przy ciemnym motywie pokazujemy słońce (sugestia: kliknij aby przełączyć)
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4"></circle>
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : theme === 'light' ? (
        // Księżyc — przy jasnym motywie
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        // Auto / system
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="14" rx="2" />
          <path d="M8 22h8M12 18v4" />
        </svg>
      )}
    </button>
  );
}
