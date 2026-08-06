import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Client Supabase côté serveur (Server Components, Server Actions, routes API).
 *
 * Supabase Auth est la source d'identité unique de l'application. Ne jamais
 * réintroduire un second système d'authentification en parallèle : c'est la
 * coexistence NextAuth / Supabase qui rendait l'application inutilisable
 * (anomalie MS-008).
 *
 * Variable normalisée : `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (MS-009).
 */
export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY sont requises.',
    );
  }

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Appelé depuis un Server Component : ignoré, le middleware
          // (`proxy.ts`) se charge du rafraîchissement des cookies.
        }
      },
    },
  });
}
