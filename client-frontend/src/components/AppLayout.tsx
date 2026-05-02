import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../store/store';
import { useAuth } from '../hooks/useAuth';
import { fetchMe, logoutThunk } from '../store/slices/authSlice';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from 'sonner';
import ThemeToggle from './ThemeToggle';

interface NavItem {
  to: string;
  label: string;
  icon: (active: boolean) => ReactElement;
}

const navItems: NavItem[] = [
  {
    to: '/app/home',
    label: 'Główna',
    icon: (active) => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-6 h-6 transition-all duration-300"
        fill={active ? 'currentColor' : 'none'}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={active ? 0 : 1.8}
        style={{ transform: active ? 'scale(1.1)' : 'scale(1)' }}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    to: '/app/tests',
    label: 'Testy',
    icon: (active) => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-6 h-6 transition-all duration-300"
        fill={active ? 'currentColor' : 'none'}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={active ? 0 : 1.8}
        style={{ transform: active ? 'scale(1.1)' : 'scale(1)' }}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    to: '/app/results',
    label: 'Wyniki',
    icon: (active) => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-6 h-6 transition-all duration-300"
        fill={active ? 'currentColor' : 'none'}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={active ? 0 : 1.8}
        style={{ transform: active ? 'scale(1.1)' : 'scale(1)' }}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    to: '/app/settings',
    label: 'Ustawienia',
    icon: (active) => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-6 h-6 transition-all duration-300"
        fill={active ? 'currentColor' : 'none'}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={active ? 0 : 1.8}
        style={{ transform: active ? 'scale(1.1) rotate(30deg)' : 'scale(1) rotate(0deg)' }}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

function DesktopSidebar({
  user,
  onLogout,
}: {
  user: ReturnType<typeof useAuth>['user'];
  onLogout: () => void;
}) {
  const location = useLocation();

  return (
    <aside className="client-sidebar">
      <div className="client-sidebar-inner">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-2 mb-7">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg font-bold"
            style={{
              background: 'linear-gradient(135deg, #C06226 0%, #984619 100%)',
              boxShadow: '0 6px 18px rgba(192, 98, 38, 0.35)',
            }}
          >
            M
          </div>
          <span className="text-base font-bold tracking-tight" style={{ color: '#fff' }}>
            MoodFlow
          </span>
        </div>

        {/* User card */}
        {user && (
          <div
            className="px-2 py-3 rounded-xl mb-5"
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.10)',
            }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
                style={{ background: 'linear-gradient(135deg, #9CB8B7 0%, #7A9E9D 100%)' }}
              >
                {user.firstName?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'rgba(255,255,255,0.95)' }}>
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {user.email}
                </p>
              </div>
            </div>
            {user.organization?.name && (
              <div
                className="mt-2.5 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5"
                style={{ background: 'rgba(192,98,38,0.18)', border: '1px solid rgba(192,98,38,0.28)' }}
              >
                <svg className="w-3 h-3 shrink-0" style={{ color: '#F5C99B' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="text-[11px] font-semibold truncate" style={{ color: '#F5C99B' }}>
                  {user.organization.name}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-0.5">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2 px-3" style={{ color: 'rgba(255,255,255,0.32)' }}>
            Nawigacja
          </p>
          {navItems.map((item) => {
            const isActive =
              item.to === '/app/home'
                ? location.pathname === item.to || location.pathname === '/app'
                : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className="client-sidebar-item"
                style={{
                  background: isActive
                    ? 'linear-gradient(135deg, #C06226 0%, #984619 100%)'
                    : 'transparent',
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.55)',
                  boxShadow: isActive ? '0 4px 14px rgba(192,98,38,0.35)' : 'none',
                }}
              >
                <span className="w-5 h-5 flex items-center justify-center shrink-0">
                  {item.icon(isActive)}
                </span>
                <span className="text-[13.5px] font-medium">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Theme + Logout */}
        <div className="flex items-center gap-2 mt-3">
          <ThemeToggle compact />
          <button onClick={onLogout} className="client-sidebar-logout" style={{ marginTop: 0, flex: 1 }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Wyloguj się</span>
          </button>
        </div>

        <p className="text-[10px] mt-3 px-2" style={{ color: 'rgba(255,255,255,0.28)' }}>
          © MoodFlow · 2026
        </p>
      </div>
    </aside>
  );
}

export default function AppLayout() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const location = useLocation();
  const navRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    if (!user) dispatch(fetchMe());
  }, [dispatch, user]);

  useEffect(() => {
    const activeIndex = navItems.findIndex((item) =>
      location.pathname.startsWith(item.to)
    );
    if (activeIndex >= 0) {
      const el = itemRefs.current[activeIndex];
      if (el && navRef.current) {
        const navRect = navRef.current.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const indicatorWidth = Math.min(elRect.width * 0.5, 40);
        setIndicatorStyle({
          left: elRect.left - navRect.left + (elRect.width - indicatorWidth) / 2,
          width: indicatorWidth,
        });
      }
    }
  }, [location.pathname]);

  const handleLogout = async () => {
    await dispatch(logoutThunk());
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-pearl-light client-shell">

      {/* ── Desktop sidebar ─────────────────────────── */}
      <DesktopSidebar user={user} onLogout={handleLogout} />

      {/* ── Mobile top header ───────────────────────── */}
      <header
        className="sticky top-0 z-20 client-mobile-header"
        style={{
          background: 'rgba(245, 238, 227, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(221, 211, 186, 0.6)',
        }}
      >
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 shrink-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-ruddy"
              style={{ background: 'linear-gradient(135deg, #C06226 0%, #984619 100%)' }}
            >
              M
            </div>
            <span className="text-lg font-bold tracking-tight" style={{ color: '#2E211C' }}>
              MoodFlow
            </span>
          </div>

          {user?.organization?.name && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg min-w-0 overflow-hidden"
              style={{ background: 'rgba(192,98,38,0.08)', border: '1px solid rgba(192,98,38,0.18)' }}
            >
              <svg className="w-3 h-3 shrink-0" style={{ color: '#C06226' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span className="text-xs font-semibold truncate" style={{ color: '#C06226' }}>
                {user.organization.name}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle compact />
            {user && (
              <>
                <span className="text-sm text-raisin/60 hidden sm:block font-medium">{user.firstName}</span>
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-warm"
                  style={{ background: 'linear-gradient(135deg, #9CB8B7 0%, #7A9E9D 100%)' }}
                >
                  {user.firstName?.[0]?.toUpperCase() ?? '?'}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Main content ────────────────────────────── */}
      <main className="client-main">
        <div className="client-main-inner">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(221,211,186,0.5)',
              borderRadius: '12px',
            },
          }}
        />
      </main>

      {/* ── Mobile bottom navigation ────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-20 client-mobile-nav"
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(221, 211, 186, 0.7)',
          boxShadow: '0 -4px 24px rgba(46, 33, 28, 0.06)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div ref={navRef} className="max-w-2xl mx-auto flex relative" style={{ height: 68 }}>
          <div
            className="nav-indicator"
            style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
          />
          {navItems.map((item, index) => (
            <NavLink
              key={item.to}
              to={item.to}
              ref={(el) => { itemRefs.current[index] = el; }}
              className="flex-1 flex flex-col items-center justify-center gap-1 relative"
              style={{ textDecoration: 'none' }}
            >
              {({ isActive }) => (
                <>
                  <div
                    className="relative flex items-center justify-center transition-all duration-300"
                    style={{ color: isActive ? '#C06226' : 'rgba(46, 33, 28, 0.4)' }}
                  >
                    {isActive && (
                      <div
                        className="absolute inset-0 rounded-full"
                        style={{
                          background: 'rgba(192, 98, 38, 0.12)',
                          transform: 'scale(2)',
                          borderRadius: '50%',
                        }}
                      />
                    )}
                    <div className="relative z-10">{item.icon(isActive)}</div>
                  </div>
                  <span
                    className="text-xs transition-all duration-300"
                    style={{
                      color: isActive ? '#C06226' : 'rgba(46, 33, 28, 0.4)',
                      fontWeight: isActive ? 600 : 400,
                    }}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
