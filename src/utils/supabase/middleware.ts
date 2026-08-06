import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Rafraîchit la session Supabase et renvoie la réponse porteuse des cookies
 * mis à jour, ainsi que l'utilisateur courant.
 *
 * Sans ce rafraîchissement, le jeton d'accès expire (une heure par défaut) et
 * l'utilisateur est déconnecté en cours de navigation.
 *
 * ⚠️ Toujours utiliser `getUser()`, jamais `getSession()`, côté serveur :
 * `getSession()` lit le cookie sans le valider auprès du serveur Supabase et
 * peut donc être falsifié.
 */
export async function updateSupabaseSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    // Configuration absente : on ne bloque pas la requête ici, la validation
    // stricte est faite au démarrage par `src/lib/env.ts`.
    return { response: supabaseResponse, user: null };
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response: supabaseResponse, user };
}
