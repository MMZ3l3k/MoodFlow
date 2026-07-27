'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Clock, Users, Settings, TrendingUp,
  FileBarChart, Download, UserCircle, ClipboardList, LogOut,
  AlertTriangle, ScrollText,
} from 'lucide-react';
import { clearTokens, getRole } from '../lib/auth';
import axiosClient from '../lib/axiosClient';
import ThemeToggle from './ThemeToggle';
import NotificationBell from './NotificationBell';

const adminItems = [
  { href: '/dashboard', label: 'Przegląd', exact: true, icon: LayoutDashboard },
  { href: '/dashboard/pending', label: 'Oczekujące', icon: Clock },
  { href: '/dashboard/users', label: 'Użytkownicy', icon: Users },
  { href: '/dashboard/audit', label: 'Dziennik audytu', icon: ScrollText },
  { href: '/dashboard/settings', label: 'Ustawienia', icon: Settings },
];

const hrItems = [
  { href: '/dashboard/hr', label: 'Dashboard HR', exact: true, icon: TrendingUp },
  { href: '/dashboard/hr/alerts', label: 'Alerty', icon: AlertTriangle },
  { href: '/dashboard/hr/reports', label: 'Raporty', icon: FileBarChart },
  { href: '/dashboard/hr/generate', label: 'Wygeneruj raport', icon: Download },
  { href: '/dashboard/hr/employees', label: 'Pracownicy', icon: UserCircle },
  { href: '/dashboard/assessments', label: 'Zaplanuj test', icon: ClipboardList },
];

interface NavItemProps {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  accentFrom: string;
  accentTo: string;
}

function NavItem({ href, label, icon: Icon, active, accentFrom, accentTo }: NavItemProps) {
  return (
    <Link href={href} className="block mb-0.5">
      <motion.div
        whileHover={{ x: 2 }}
        transition={{ duration: 0.15 }}
        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors duration-200 relative"
        style={{
          color: active ? '#fff' : 'rgba(255,255,255,0.45)',
        }}
      >
        {active && (
          <motion.div
            layoutId="adminSidebarActive"
            className="absolute inset-0 rounded-xl"
            style={{ background: `linear-gradient(135deg, ${accentFrom} 0%, ${accentTo} 100%)` }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          />
        )}
        <Icon className="w-[17px] h-[17px] relative z-10 shrink-0" />
        <span className="relative z-10">{label}</span>
      </motion.div>
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isHr, setIsHr] = useState(false);
  const [orgName, setOrgName] = useState('');

  useEffect(() => {
    const role = getRole();
    setIsHr(role === 'hr');
    if (role === 'admin' || role === 'hr') {
      axiosClient.get('/organizations/my')
        .then((res) => setOrgName(res.data?.name ?? ''))
        .catch(() => {});
    }
  }, []);

  const handleLogout = async () => {
    try { await axiosClient.post('/auth/logout'); } catch {}
    clearTokens();
    router.push('/login');
  };

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');

  const items = isHr ? hrItems : adminItems;
  const sectionLabel = isHr ? 'Panel HR' : 'Administracja';
  const accentFrom = isHr ? '#0d9488' : '#C06226';
  const accentTo = isHr ? '#0f766e' : '#984619';

  return (
    <aside className="w-60 flex flex-col min-h-screen bg-gradient-to-b from-gray-900 to-gray-950">

      {/* Brand */}
      <div className="flex items-center gap-3 px-5 h-16">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-base font-bold shadow-lg"
          style={{ background: `linear-gradient(135deg, ${accentFrom} 0%, ${accentTo} 100%)` }}
        >
          M
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-white">MoodFlow</h1>
          {orgName ? (
            <p className="text-[11px] font-light text-gray-500 truncate" title={orgName} suppressHydrationWarning>
              {orgName}
            </p>
          ) : (
            <p className="text-[11px] font-light text-gray-500" suppressHydrationWarning>
              {isHr ? 'Panel HR' : 'Panel admina'}
            </p>
          )}
        </div>
      </div>

      {/* Divider */}
      <div
        className="mx-5 h-px"
        style={{ background: `linear-gradient(to right, ${accentFrom}66, transparent)` }}
      />

      {/* Nav */}
      <nav className="flex-1 px-3 pt-4 overflow-y-auto">
        <p className="px-3 pt-2 pb-2 text-[10px] font-light uppercase tracking-[0.12em] text-gray-500">
          {sectionLabel}
        </p>
        {items.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={isActive(item.href, item.exact)}
            accentFrom={accentFrom}
            accentTo={accentTo}
          />
        ))}

        {/* Analytics link for both roles */}
        <p className="px-3 pt-6 pb-2 text-[10px] font-light uppercase tracking-[0.12em] text-gray-500">
          Analityka
        </p>
        <NavItem
          href="/dashboard/analytics"
          label="Analityka"
          icon={FileBarChart}
          active={isActive('/dashboard/analytics')}
          accentFrom={accentFrom}
          accentTo={accentTo}
        />
      </nav>

      {/* User / Logout */}
      <div className="px-4 py-4 flex items-center gap-2">
        <NotificationBell compact />
        <ThemeToggle compact />
        <button
          onClick={handleLogout}
          className="flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium text-gray-500 hover:text-rose-400 hover:bg-white/5 transition-all duration-200"
        >
          <LogOut className="w-[17px] h-[17px]" />
          Wyloguj się
        </button>
      </div>
    </aside>
  );
}
