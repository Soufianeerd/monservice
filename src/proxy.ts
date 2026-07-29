import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

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
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            const secureOptions = {
              ...options,
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax' as const
            };
            supabaseResponse.cookies.set(name, value, secureOptions);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

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

  // Si authentifié et sur login/register → rediriger vers dashboard
  if (user && ['/login', '/register'].includes(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    const profileType = user.user_metadata?.profileType || 'professional';
    url.pathname = profileType === 'client' ? '/client/dashboard' : '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
