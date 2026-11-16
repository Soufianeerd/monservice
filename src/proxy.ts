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
  '/invitation/portail', // la page gère elle-même l'absence de session
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

  // L’interface possède une seule langue source. Corriger aussi les anciens cookies.
  if (request.cookies.get('NEXT_LOCALE')?.value !== 'fr') {
    response.cookies.set('NEXT_LOCALE', 'fr', { path: '/', maxAge: 365 * 24 * 60 * 60, sameSite: 'lax' });
  }

  // NOTE: Les redirections d'authentification sont gérées par les layouts
  // serveur (ex: ClientLayout, DashboardLayout) et requireSession().
  // Ne pas faire de redirection ici pour éviter les boucles (MS-008).

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
