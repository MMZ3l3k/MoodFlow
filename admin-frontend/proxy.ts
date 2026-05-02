import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Proxy Next.js (poprzednio middleware) — chroni trasy /dashboard/* i
// /super-admin/* zanim strona zostanie wyrenderowana po stronie klienta.
// Uwaga: nie weryfikujemy podpisu JWT (to robi backend). Tutaj tylko
// szybki UX-guard: sprawdzamy obecność cookie i dekodujemy rolę.

const ACCESS_COOKIE = 'mf_access';

function decodeRole(token: string): string | null {
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return null;
    // Edge runtime nie ma Buffer — używamy atob z padowaniem
    const padded = payloadPart.replace(/-/g, '+').replace(/_/g, '/').padEnd(
      payloadPart.length + ((4 - (payloadPart.length % 4)) % 4),
      '=',
    );
    const json = atob(padded);
    const payload = JSON.parse(json) as { role?: string; exp?: number };
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return payload.role ?? null;
  } catch {
    return null;
  }
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(ACCESS_COOKIE)?.value;

  const isDashboard = pathname.startsWith('/dashboard');
  const isSuperAdmin = pathname.startsWith('/super-admin') && !pathname.startsWith('/super-admin/login');

  if (!isDashboard && !isSuperAdmin) {
    return NextResponse.next();
  }

  if (!token) {
    const loginUrl = new URL(isSuperAdmin ? '/super-admin/login' : '/login', req.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = decodeRole(token);

  if (!role) {
    const loginUrl = new URL(isSuperAdmin ? '/super-admin/login' : '/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  if (isSuperAdmin && role !== 'super_admin') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  if (isDashboard && role === 'super_admin') {
    return NextResponse.redirect(new URL('/super-admin/dashboard', req.url));
  }

  if (isDashboard && role !== 'admin' && role !== 'hr') {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/super-admin/:path*'],
};
