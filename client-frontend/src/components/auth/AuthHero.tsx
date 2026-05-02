import { VARIANTS, type AuthVariant } from './AuthVariants';

interface Props {
  variant: AuthVariant;
}

export default function AuthHero({ variant }: Props) {
  const t = VARIANTS[variant];
  const features = [
    { icon: '🌿', title: 'Codzienny check-in nastroju', desc: 'Krótkie pytania, większa świadomość emocji.' },
    { icon: '📈', title: 'Twoja historia, Twoja prywatność', desc: 'Dane osobowe widoczne tylko dla Ciebie.' },
    { icon: '🧭', title: 'Wsparcie, kiedy go potrzebujesz', desc: 'Walidowane narzędzia psychologiczne (PHQ-9, GAD-7, WHO-5).' },
  ];

  return (
    <div className="auth-hero" style={{ background: t.heroGradient, color: '#fff' }}>
      <div className="auth-hero-decor auth-hero-decor-1" />
      <div className="auth-hero-decor auth-hero-decor-2" />
      <div className="auth-hero-decor-grid" />

      <div className="auth-hero-content">
        <div className="auth-hero-brand">
          <div
            className="auth-hero-logo"
            style={{
              background: 'rgba(255,255,255,0.12)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.22)',
            }}
          >
            M
          </div>
          <span className="auth-hero-brand-name">MoodFlow</span>
        </div>

        <span
          className="auth-hero-badge"
          style={{
            background: 'rgba(255,255,255,0.10)',
            border: '1px solid rgba(255,255,255,0.20)',
            color: t.heroAccent,
          }}
        >
          {t.badge}
        </span>

        <h2 className="auth-hero-title">{t.tagline}</h2>
        <p className="auth-hero-subtitle">{t.subTagline}</p>

        <ul className="auth-hero-features">
          {features.map((f) => (
            <li key={f.title} className="auth-hero-feature">
              <span className="auth-hero-feature-icon">{f.icon}</span>
              <div>
                <div className="auth-hero-feature-title">{f.title}</div>
                <div className="auth-hero-feature-desc">{f.desc}</div>
              </div>
            </li>
          ))}
        </ul>

        <div className="auth-hero-footer">
          <span style={{ opacity: 0.7 }}>© MoodFlow · 2026</span>
          <span style={{ opacity: 0.7 }}>Bezpieczne · Anonimowe · Zgodne z RODO</span>
        </div>
      </div>
    </div>
  );
}
