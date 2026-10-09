import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/server';

/** Chemins publics comparés par égalité stricte. */
const PUBLIC_EXACT = new Set([
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/forbidden',
  '/demo',
  '/conditions',
  '/confidentialite',
  '/mentions-legales',
  '/robots.txt',
  '/sitemap.xml',
]);

/** Chemins publics comparés par préfixe (jamais `'/'`). */
const PUBLIC_PREFIXES = [
  '/pro/', // profils publics des professionnels
  '/auth/', // auth callbacks
  '/api/', // handlers independently verify sessions or webhook signatures
  '/api/stripe/webhook', // signature Stripe vérifiée dans la route
];

function isPublic(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function proxy(request: NextRequest) {
  const response = isPublic(request.nextUrl.pathname) ? NextResponse.next() : await auth.middleware({ loginUrl: '/login' })(request);

  // i18n logic
  const hasLocaleCookie = request.cookies.has('NEXT_LOCALE');
  if (!hasLocaleCookie) {
    const locales = ['fr', 'de', 'nl', 'en'];
    const defaultLocale = 'fr';
    const acceptLanguage = request.headers.get('accept-language');
    let locale = defaultLocale;
    
    if (acceptLanguage) {
      const preferred = acceptLanguage.split(',')[0].split('-')[0];
      if (locales.includes(preferred)) {
        locale = preferred;
      }
    }
    
    response.cookies.set('NEXT_LOCALE', locale, {
      path: '/',
      maxAge: 365 * 24 * 60 * 60
    });
  }

  // NOTE: Les redirections d'authentification sont gérées par les layouts
  // serveur (ex: ClientLayout, DashboardLayout) et requireSession().
  // Ne pas faire de redirection ici pour éviter les boucles (MS-008).

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
