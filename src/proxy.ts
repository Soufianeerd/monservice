import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  // Routes publiques
  const publicRoutes = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/pro/', '/api/stripe/webhook'];
  const isPublicRoute = publicRoutes.some((route) => request.nextUrl.pathname.startsWith(route));

  if (!token && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (token && ['/login', '/register'].includes(request.nextUrl.pathname)) {
    const profileType = token.profileType;
    return NextResponse.redirect(new URL(profileType === 'client' ? '/client/dashboard' : '/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'] };
