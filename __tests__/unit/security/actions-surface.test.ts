import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Tests de non-régression structurels — anomalies MS-002, MS-003, MS-006.
 *
 * Plutôt que de tester chaque action une à une, on vérifie une propriété
 * invariante du dossier `src/app/actions` : aucune action ne doit dériver
 * l'identité d'ailleurs que de la session serveur.
 */
const ACTIONS_DIR = join(process.cwd(), 'src/app/actions');
const files = readdirSync(ACTIONS_DIR).filter((f) => f.endsWith('.ts'));
const read = (f: string) => readFileSync(join(ACTIONS_DIR, f), 'utf8');

describe('Surface des server actions', () => {
  it('trouve bien les fichiers d’actions', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it.each(files)('%s ne lit jamais le cookie applicatif "session" (MS-006)', (file) => {
    expect(read(file)).not.toMatch(/cookies\(\)[\s\S]{0,60}get\(['"]session['"]\)/);
  });

  it.each(files)('%s importe le contexte de session serveur (MS-002)', (file) => {
    const content = read(file);
    // `auth.ts` est le point d'entrée public d'inscription : il n'exige pas
    // de session, mais valide strictement ses entrées.
    if (file === 'auth.ts') {
      expect(content).toContain('registerSchema');
      return;
    }
    expect(content).toMatch(/require(Session|Organization|Professional)|getSessionContext/);
  });

  it.each(files)('%s n’utilise plus NextAuth (migration Supabase Auth)', (file) => {
    expect(read(file)).not.toMatch(/next-auth/);
  });

  it('n’expose plus d’action de création d’utilisateur arbitraire (MS-003)', () => {
    expect(read('user.actions.ts')).not.toMatch(/export async function createUserAction/);
    expect(read('user.actions.ts')).not.toMatch(/export async function getUserByEmailAction/);
  });

  it('n’expose plus markAsPaidAction ni updateSignatureAction (MS-007)', () => {
    const invoiceActions = read('invoice.actions.ts');
    expect(invoiceActions).not.toMatch(/export async function markAsPaidAction/);
    expect(invoiceActions).not.toMatch(/export async function updateSignatureAction/);
  });
});
