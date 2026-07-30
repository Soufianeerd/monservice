import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  
  // Local mock auth: Check for session cookie
  const sessionId = request.cookies.get('session')?.value;
  const user = sessionId ? { id: sessionId, profileType: 'professional' } : null; // We can't fetch the real user profile easily in edge without edge-compatible DB, so we mock for now or use JWT instead of session ID.

  // Routes publiques
  const publicRoutes = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/callback', '/pro/', '/api/stripe/webhook'];
  const isPublicRoute = publicRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route) || request.nextUrl.pathname === route
  );

  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');
  const isStripeWebhook = request.nextUrl.pathname.startsWith('/api/stripe/webhook');

  // Si non authentifié et route protégée
  if (!user && !isPublicRoute && !(isApiRoute && isStripeWebhook)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Vérification des rôles si l'utilisateur est connecté
  if (user) {
    // We cannot accurately know the profileType without querying the DB, but since it's a mock local auth,
    // we'll let them access the routes they try, and the client-side AuthContext will kick them out if needed.
    const pathname = request.nextUrl.pathname;

    // Rediriger login/register vers le bon dashboard
    if (['/login', '/register'].includes(pathname)) {
      const url = request.nextUrl.clone();
      // Assume professional dashboard for now since we don't know the role in edge middleware
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
