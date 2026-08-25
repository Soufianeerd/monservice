import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSupabaseSession } from '@/utils/supabase/middleware';

/**
 * Barrière périmétrique + rafraîchissement de la session Supabase.
 *
 * Deux rôles distincts :
 *  1. Prolonger la session Supabase (sans quoi le jeton expire au bout d'une
 *     heure et l'utilisateur est déconnecté en pleine navigation).
 *  2. Bloquer l'accès anonyme aux routes privées.
 *
 * ATTENTION : ne jamais réintroduire `'/'` dans une liste de préfixes.
 * `'/dashboard'.startsWith('/')` vaut `true` : la racine placée en préfixe
 * rendait l'intégralité du contrôle d'accès inopérante (anomalie MS-001).
 *
 * Ce middleware est une défense périphérique, pas la défense principale :
 * chaque server action et chaque route API vérifie la session elle-même via
 * `requireSession()`. Le middleware ne connaît pas le `profileType` (qui vit
 * dans la table applicative) ; le cloisonnement client / professionnel est
 * assuré par les layouts serveur, qui eux ont accès à la base.
 */

/** Chemins publics comparés par égalité stricte. */
const PUBLIC_EXACT = new Set([
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
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
  '/auth/', // callbacks Supabase (confirmation e-mail, OAuth)
  '/api/stripe/webhook', // signature Stripe vérifiée dans la route
];

function isPublic(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  // Le rafraîchissement doit avoir lieu à chaque requête, y compris sur les
  // routes publiques, sinon la session expire pendant la navigation.
  const { response } = await updateSupabaseSession(request);

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
