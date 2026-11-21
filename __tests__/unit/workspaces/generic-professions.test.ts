import { describe, expect, it } from 'vitest';
import { GENERIC_PROFESSION_CODES, GENERIC_PROFESSIONS, GENERIC_PROFESSION_FAMILIES } from '@/lib/workspaces/generic/professions';
import { resolveWorkspace } from '@/lib/workspaces/resolver';
import fs from 'node:fs';

describe('métiers de l’univers général', () => {
  it('chaque code a une fiche et une famille', () => {
    for (const code of GENERIC_PROFESSION_CODES) {
      expect(GENERIC_PROFESSIONS[code].code).toBe(code);
      expect(GENERIC_PROFESSION_FAMILIES[GENERIC_PROFESSIONS[code].family]).toBeDefined();
    }
  });

  it('adapte le libellé et l’unité de travail', () => {
    const notary = resolveWorkspace({ sector: 'freelance', profession: 'notary' });
    expect(notary.label).toBe('Espace Notaire');
    expect(notary.terminology.workPlural).toBe('Dossiers');
    expect(resolveWorkspace({ sector: 'freelance', profession: 'musician' }).terminology.workPlural).toBe('Prestations');
    expect(resolveWorkspace({ sector: 'freelance', profession: null }).label).toBe('Espace Professionnel');
  });

  it('la migration 0023 autorise exactement ces métiers', () => {
    const sql = fs.readFileSync('drizzle/neon/0023_generic_professions.sql', 'utf8');
    for (const code of GENERIC_PROFESSION_CODES) expect(sql).toContain(`'${code}'::text`);
    expect(sql).toContain("(sector = 'freelance'::text)");
  });
});
