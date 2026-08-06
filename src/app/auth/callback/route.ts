import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * Callback Supabase Auth : confirmation d'e-mail et réinitialisation de mot
 * de passe. Échange le code à usage unique contre une session.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  // Anti open-redirect : seules les destinations internes sont acceptées.
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=lien_invalide`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[auth] échec de l’échange du code:', error.message);
    return NextResponse.redirect(`${origin}/login?error=lien_expire`);
  }

  return NextResponse.redirect(`${origin}${safeNext}`);
}
