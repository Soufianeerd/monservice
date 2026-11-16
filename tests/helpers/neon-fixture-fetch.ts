/** Tests uniquement : attendre les limites temporaires du fournisseur, sans
 * rejouer une erreur de connexion ou un refus d'authentification. */
export async function fetchNeonFixture(url: string, init: Omit<RequestInit, 'signal'>): Promise<Response> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(url, { ...init, signal: AbortSignal.timeout(20000) });
    if (response.status !== 429 || attempt === 2) return response;
    const retry = response.headers.get('retry-after');
    const seconds = retry && /^\d+(?:\.\d+)?$/.test(retry) ? Number(retry) * 1000 : NaN;
    const date = retry ? Date.parse(retry) - Date.now() : NaN;
    const milliseconds = Number.isFinite(seconds) ? seconds : Number.isFinite(date) ? date : 30000;
    const delay = Math.min(30000, Math.max(1000, milliseconds));
    await response.body?.cancel();
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  throw new Error('Unreachable fixture retry');
}
