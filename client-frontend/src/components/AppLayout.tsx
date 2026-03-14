import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../store/store';
import { useAuth } from '../hooks/useAuth';
import { fetchMe } from '../store/slices/authSlice';
import { useEffect, useRef, useState } from 'react';

const navItems = [
  {
    to: '/app/home',
    label: 'Główna',
    icon: (active: boolean) => (
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
    icon: (active: boolean) => (
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
    icon: (active: boolean) => (
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
    icon: (active: boolean) => (
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

export default function AppLayout() {
  const dispatch = useDispatch<AppDispatch>();
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

  const activeIndex = navItems.findIndex((item) =>
    location.pathname.startsWith(item.to)
  );

  return (
    <div className="min-h-screen bg-pearl-light flex flex-col">

      {/* ── Top Header ───────────────────────────────── */}
      <header
        className="sticky top-0 z-20"
        style={{
          background: 'rgba(245, 238, 227, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(221, 211, 186, 0.6)',
        }}
      >
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-ruddy"
              style={{ background: 'linear-gradient(135deg, #C06226 0%, #984619 100%)' }}
            >
              M
            </div>
            <span
              className="text-lg font-bold tracking-tight"
              style={{ color: '#2E211C' }}
            >
              MoodFlow
            </span>
          </div>

          {/* User avatar */}
          {user && (
            <div className="flex items-center gap-2.5">
              <span className="text-sm text-raisin/60 hidden sm:block font-medium">
                {user.firstName}
              </span>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-warm"
                style={{ background: 'linear-gradient(135deg, #9CB8B7 0%, #7A9E9D 100%)' }}
              >
                {user.firstName?.[0]?.toUpperCase() ?? '?'}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ── Page Content ─────────────────────────────── */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 pt-5 pb-nav page-enter">
        <Outlet />
      </main>

      {/* ── Bottom Navigation ────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-20"
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

          {/* Sliding indicator at top */}
          <div
            className="nav-indicator"
            style={{
              left: indicatorStyle.left,
              width: indicatorStyle.width,
            }}
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
                  {/* Icon container with background animation */}
                  <div
                    className="relative flex items-center justify-center transition-all duration-300"
                    style={{
                      color: isActive ? '#C06226' : 'rgba(46, 33, 28, 0.4)',
                    }}
                  >
                    {/* Glow ring on active */}
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
                    <div className="relative z-10">
                      {item.icon(isActive)}
                    </div>
                  </div>

                  {/* Label */}
                  <span
                    className="text-xs transition-all duration-300"
                    style={{
                      color: isActive ? '#C06226' : 'rgba(46, 33, 28, 0.4)',
                      fontWeight: isActive ? 600 : 400,
                      transform: isActive ? 'translateY(0px)' : 'translateY(0)',
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
