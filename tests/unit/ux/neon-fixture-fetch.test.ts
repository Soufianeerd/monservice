import { afterEach, expect, it, vi } from 'vitest';
import { fetchNeonFixture } from '../../helpers/neon-fixture-fetch';

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

it('respecte Retry-After avant de rejouer un 429 puis renvoie la réponse fournisseur', async () => {
  vi.useFakeTimers();
  const response = new Response('{}', { status: 200 });
  const fetch = vi.fn().mockResolvedValueOnce(new Response('{}', { status: 429, headers: { 'retry-after': '2' } })).mockResolvedValueOnce(response);
  vi.stubGlobal('fetch', fetch);
  const pending = fetchNeonFixture('https://auth.example/sign-in/email', { method: 'POST' });
  await vi.advanceTimersByTimeAsync(1999); expect(fetch).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1); expect(await pending).toBe(response); expect(fetch).toHaveBeenCalledTimes(2);
});

it('reste borné et laisse échouer une limite persistante', async () => {
  vi.useFakeTimers();
  const fetch = vi.fn().mockImplementation(async () => new Response('{}', { status: 429, headers: { 'retry-after': '3600' } }));
  vi.stubGlobal('fetch', fetch);
  const pending = fetchNeonFixture('https://auth.example/sign-in/email', { method: 'POST' });
  await vi.advanceTimersByTimeAsync(60000);
  expect((await pending).status).toBe(429); expect(fetch).toHaveBeenCalledTimes(3);
});

it('ne rejoue jamais un mot de passe refusé', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 401 })); vi.stubGlobal('fetch', fetch);
  expect((await fetchNeonFixture('https://auth.example/sign-in/email', { method: 'POST' })).status).toBe(401);
  expect(fetch).toHaveBeenCalledTimes(1);
});
