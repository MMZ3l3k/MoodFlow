export type AuthVariant = 'employee' | 'admin' | 'super';

const ADMIN_BASE = (import.meta as any).env?.VITE_ADMIN_URL ?? 'https://lavish-bravery-production.up.railway.app';
const CLIENT_BASE = (import.meta as any).env?.VITE_CLIENT_URL ?? 'https://innovative-presence-production.up.railway.app';

export interface VariantTheme {
  badge: string;
  badgeBg: string;
  badgeBorder: string;
  primary: string;
  primaryDark: string;
  pageBg: string;
  heroGradient: string;
  heroAccent: string;
  cardBorder: string;
  buttonShadow: string;
  ringFocus: string;
  text: string;
  textMuted: string;
  inputBorder: string;
  blobColor1: string;
  blobColor2: string;
  tagline: string;
  subTagline: string;
  features: { icon: string; title: string; desc: string }[];
  loginRoute: string;
  panelLabel: string;
}

export const VARIANTS: Record<AuthVariant, VariantTheme> = {
  employee: {
    badge: 'PRACOWNIK',
    badgeBg: 'rgba(192,98,38,0.10)',
    badgeBorder: 'rgba(192,98,38,0.22)',
    primary: '#C06226',
    primaryDark: '#984619',
    pageBg: '#F5EEE3',
    heroGradient: 'linear-gradient(135deg, #C06226 0%, #984619 60%, #6E3414 100%)',
    heroAccent: '#F5EEE3',
    cardBorder: 'rgba(221, 211, 186, 0.7)',
    buttonShadow: '0 8px 24px rgba(192,98,38,0.35)',
    ringFocus: 'rgba(192,98,38,0.18)',
    text: '#2E211C',
    textMuted: 'rgba(46,33,28,0.55)',
    inputBorder: 'rgba(46,33,28,0.12)',
    blobColor1: 'rgba(156,184,183,0.22)',
    blobColor2: 'rgba(192,98,38,0.10)',
    tagline: 'Twój dobrostan ma znaczenie.',
    subTagline: 'Codzienne check-iny i ankiety, które pomagają lepiej rozumieć siebie i Twój zespół.',
    features: [
      { icon: '🌿', title: 'Codzienny check-in nastroju', desc: 'Krótkie pytania, większa świadomość emocji.' },
      { icon: '📈', title: 'Twoja historia, Twoja prywatność', desc: 'Dane osobowe widoczne tylko dla Ciebie.' },
      { icon: '🧭', title: 'Wsparcie, kiedy go potrzebujesz', desc: 'Walidowane narzędzia psychologiczne (PHQ-9, GAD-7, WHO-5).' },
    ],
    loginRoute: `${CLIENT_BASE}/login`,
    panelLabel: 'Pracownik',
  },
  admin: {
    badge: 'ADMINISTRATOR FIRMY',
    badgeBg: 'rgba(122,158,157,0.14)',
    badgeBorder: 'rgba(122,158,157,0.32)',
    primary: '#2E211C',
    primaryDark: '#1a0f0c',
    pageBg: '#F5EEE3',
    heroGradient: 'linear-gradient(135deg, #2E211C 0%, #4a3a33 50%, #7A9E9D 100%)',
    heroAccent: '#EAE0C7',
    cardBorder: 'rgba(46,33,28,0.10)',
    buttonShadow: '0 8px 24px rgba(46,33,28,0.30)',
    ringFocus: 'rgba(46,33,28,0.15)',
    text: '#2E211C',
    textMuted: 'rgba(46,33,28,0.55)',
    inputBorder: 'rgba(46,33,28,0.12)',
    blobColor1: 'rgba(156,184,183,0.28)',
    blobColor2: 'rgba(46,33,28,0.08)',
    tagline: 'Wspieraj zespół danymi, nie domysłami.',
    subTagline: 'Anonimowe wskaźniki dobrostanu, trendy i alerty wczesnego ostrzegania w jednym panelu.',
    features: [],
    loginRoute: `${ADMIN_BASE}/login`,
    panelLabel: 'Administrator firmy',
  },
  super: {
    badge: 'WŁAŚCICIEL PLATFORMY',
    badgeBg: 'rgba(99,102,241,0.10)',
    badgeBorder: 'rgba(99,102,241,0.25)',
    primary: '#6366f1',
    primaryDark: '#4f46e5',
    pageBg: '#F0EFF8',
    heroGradient: 'linear-gradient(135deg, #1e1b4b 0%, #4f46e5 55%, #7c3aed 100%)',
    heroAccent: '#fbbf24',
    cardBorder: 'rgba(99,102,241,0.18)',
    buttonShadow: '0 8px 24px rgba(99,102,241,0.42)',
    ringFocus: 'rgba(99,102,241,0.18)',
    text: '#1e1b4b',
    textMuted: 'rgba(30,27,75,0.55)',
    inputBorder: 'rgba(30,27,75,0.12)',
    blobColor1: 'rgba(99,102,241,0.22)',
    blobColor2: 'rgba(124,58,237,0.14)',
    tagline: 'Cała platforma w jednym miejscu.',
    subTagline: 'Centralne zarządzanie organizacjami, użytkownikami i wskaźnikami zdrowia całej platformy MoodFlow.',
    features: [],
    loginRoute: `${ADMIN_BASE}/super-admin/login`,
    panelLabel: 'Właściciel platformy',
  },
};
