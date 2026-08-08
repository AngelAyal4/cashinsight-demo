import { NextResponse, type NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME, verifySessionToken } from '@/lib/session';

const PUBLIC_API_PREFIX = '/api/auth';

const PROTECTED_PAGES = ['/', '/metas', '/perfil', '/onboarding'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const sessionValid = token ? verifySessionToken(token) !== null : false;

  if (pathname.startsWith('/api/')) {
    if (pathname.startsWith(PUBLIC_API_PREFIX)) {
      return NextResponse.next();
    }

    if (!sessionValid) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    return NextResponse.next();
  }

  if (pathname === '/login' || pathname === '/register') {
    if (sessionValid) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
  }

  if (
    PROTECTED_PAGES.some(
      (page) => pathname === page || pathname.startsWith(`${page}/`)
    ) &&
    !sessionValid
  ) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf)$).*)',
  ],
};