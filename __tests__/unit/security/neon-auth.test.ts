import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Tests structurels de la bascule vers Neon Auth.
 *
 * Objectif : empêcher la réapparition de l'anomalie MS-008 (deux systèmes
 * d'authentification concurrents), qui rendait l'application inutilisable.
 */
const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), 'utf8');

describe('Bascule Neon Auth', () => {
  it('la route NextAuth a été supprimée', () => {
    expect(existsSync(join(root, 'src/app/api/auth/[...nextauth]/route.ts'))).toBe(false);
  });

  it('next-auth n’est plus une dépendance', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.dependencies['next-auth']).toBeUndefined();
    expect(pkg.dependencies['@auth/core']).toBeUndefined();
  });

  it('le socle de session utilise une identité applicative stable', () => {
    const session = read('src/lib/auth/session.ts');
    expect(session).toContain('public.current_app_user_id()');
    expect(session).not.toContain('@/utils/supabase');
    expect(read('src/lib/db/server.ts')).toContain('public.provider_session_is_active');
    expect(read('src/lib/db/server.ts')).toContain('createSecurityScopedClient');
  });

  it('le middleware ne gère plus les redirections (délégué aux layouts)', () => {
    const middleware = read('src/proxy.ts');
    expect(middleware).not.toContain('NextResponse.redirect');
  });

  it('le proxy vérifie la session Neon', () => {
    expect(read('src/proxy.ts')).toContain('auth.middleware');
  });

  it('les secrets Auth restent exclusivement côté serveur', () => {
    expect(read('src/lib/auth/server.ts')).toContain('NEON_AUTH_COOKIE_SECRET');
    expect(read('src/lib/auth/client.ts')).not.toContain('COOKIE_SECRET');
    expect(read('src/lib/env.ts')).not.toContain('NEXT_PUBLIC_SUPABASE_URL:');
  });

  it('la réinitialisation de mot de passe n’est plus factice (MS-016)', () => {
    const forgot = read('src/app/(auth)/forgot-password/page.tsx');
    expect(forgot).not.toContain('dummy-token');
    expect(forgot).toContain('requestPasswordReset');
  });

  it('le callback d’authentification refuse les redirections externes', () => {
    const callback = read('src/app/auth/callback/route.ts');
    expect(callback).toContain("startsWith('/')");
    expect(callback).toContain("startsWith('//')");
  });
});
