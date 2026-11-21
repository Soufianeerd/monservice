/**
 * Content-Security-Policy par requête, à base de nonce (doc Next 16 :
 * 01-app/02-guides/content-security-policy.md).
 *
 * - Scripts : uniquement ceux portant le nonce de la requête, et ceux qu'ils
 *   chargent ('strict-dynamic'). Plus de 'unsafe-inline' ni de 'unsafe-eval'
 *   en production. 'wasm-unsafe-eval' reste permis : la génération de PDF
 *   (yoga-layout) compile du WebAssembly, ce qui n'autorise pas eval().
 * - Styles : 'unsafe-inline' conservé, les attributs style de React, du
 *   calendrier et des notifications ne peuvent pas porter de nonce.
 */
export function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function buildContentSecurityPolicy(nonce: string, isDev = process.env.NODE_ENV === 'development'): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval' https://js.stripe.com${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.stripe.com",
    'frame-src https://js.stripe.com https://hooks.stripe.com',
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

/** Les documents HTML reçoivent la CSP à nonce ; les actions et données non. */
export function wantsDocumentCsp(method: string, headers: Headers): boolean {
  if (method !== 'GET' && method !== 'HEAD') return false;
  if (headers.get('next-router-prefetch') || headers.get('purpose') === 'prefetch') return false;
  return true;
}
