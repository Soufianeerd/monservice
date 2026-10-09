import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/server';

/** Managed Auth exchanges verification/OAuth codes in the SDK proxy. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const next = searchParams.get('next') ?? '/dashboard';
  const safeNext = next.startsWith('/') && !next.startsWith('//') && !next.includes('\\') ? next : '/dashboard';
  const { data, error } = await auth.getSession({ query: { disableCookieCache: true } });
  return NextResponse.redirect(`${origin}${!error && data?.user ? safeNext : '/login'}`);
}
