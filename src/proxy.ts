import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Routes publiques (non protégées)
  const publicRoutes = [
    '/',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/callback',
    '/api/stripe/webhook',
    '/api/auth/',
    '/pro/', // Profils publics
    '/quotes/', // Routes publiques pour la signature de devis
  ];
  
  const isPublicRoute = publicRoutes.some((route) => {
    if (route === '/') {
      return request.nextUrl.pathname === '/';
    }
    return request.nextUrl.pathname.startsWith(route);
  });

  // Routes API protégées (sauf webhooks)
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');
  const isStripeWebhook = request.nextUrl.pathname.startsWith('/api/stripe/webhook');

  // Si l'utilisateur n'est pas connecté et tente d'accéder à une route protégée
  if (!user && !isPublicRoute && !(isApiRoute && isStripeWebhook)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Si l'utilisateur est connecté et va sur login/register → redirige vers dashboard
  if (user && ['/login', '/register'].includes(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = user.user_metadata?.profileType === 'client' ? '/client/dashboard' : '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
