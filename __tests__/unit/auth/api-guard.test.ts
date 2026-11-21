import { describe, expect, it } from 'vitest';
import { guardAuthRequest } from '@/lib/auth/api-guard';

const post = (body: unknown) => new Request('https://app.test/api/auth/x', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });

describe('guardAuthRequest', () => {
  it('refuse la création de compte directe chez le fournisseur', async () => {
    const response = await guardAuthRequest('POST', ['sign-up', 'email'], post({ email: 'a@b.fr', password: 'court' }));
    expect(response?.status).toBe(403);
  });

  it('applique la politique de mot de passe à la réinitialisation', async () => {
    expect((await guardAuthRequest('POST', ['reset-password'], post({ newPassword: 'motdepasse', token: 't' })))?.status).toBe(400);
    expect(await guardAuthRequest('POST', ['reset-password'], post({ newPassword: 'Solide-Mot2Passe!', token: 't' }))).toBeNull();
  });

  it('applique la politique au changement de mot de passe', async () => {
    expect((await guardAuthRequest('POST', ['change-password'], post({ newPassword: 'Court1!', currentPassword: 'x' })))?.status).toBe(400);
  });

  it('laisse passer la connexion et les lectures', async () => {
    expect(await guardAuthRequest('POST', ['sign-in', 'email'], post({ email: 'a@b.fr', password: 'x' }))).toBeNull();
    expect(await guardAuthRequest('GET', ['get-session'], new Request('https://app.test/api/auth/get-session'))).toBeNull();
  });
});
