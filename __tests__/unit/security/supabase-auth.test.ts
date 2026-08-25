import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Tests structurels de la bascule vers Supabase Auth.
 *
 * Objectif : empêcher la réapparition de l'anomalie MS-008 (deux systèmes
 * d'authentification concurrents), qui rendait l'application inutilisable.
 */
const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), 'utf8');

describe('Bascule Supabase Auth', () => {
  it('la route NextAuth a été supprimée', () => {
    expect(existsSync(join(root, 'src/app/api/auth/[...nextauth]/route.ts'))).toBe(false);
  });

  it('next-auth n’est plus une dépendance', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.dependencies['next-auth']).toBeUndefined();
    expect(pkg.dependencies['@auth/core']).toBeUndefined();
  });

  it('le socle de session s’appuie sur Supabase', () => {
    const session = read('src/lib/auth/session.ts');
    expect(session).toContain('@/utils/supabase/server');
    expect(session).toContain('auth.getUser()');
    // getSession() n'est pas fiable côté serveur : il ne valide pas le jeton.
    expect(session).not.toMatch(/auth\.getSession\(\)/);
  });

  it('le middleware ne gère plus les redirections (délégué aux layouts)', () => {
    const middleware = read('src/middleware.ts');
    expect(middleware).not.toContain('NextResponse.redirect');
  });

  it('le middleware rafraîchit la session Supabase', () => {
    expect(read('src/middleware.ts')).toContain('updateSupabaseSession');
  });

  it('les helpers utilisent la clé publishable, pas l’ancienne clé anon (MS-009)', () => {
    for (const file of [
      'src/utils/supabase/server.ts',
      'src/utils/supabase/client.ts',
      'src/utils/supabase/middleware.ts',
    ]) {
      expect(read(file)).toContain('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
      expect(read(file)).not.toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    }
  });

  it('la réinitialisation de mot de passe n’est plus factice (MS-016)', () => {
    const forgot = read('src/app/(auth)/forgot-password/page.tsx');
    expect(forgot).not.toContain('dummy-token');
    expect(forgot).toContain('resetPasswordForEmail');
  });

  it('le callback d’authentification refuse les redirections externes', () => {
    const callback = read('src/app/auth/callback/route.ts');
    expect(callback).toContain("startsWith('/')");
    expect(callback).toContain("startsWith('//')");
  });
});
