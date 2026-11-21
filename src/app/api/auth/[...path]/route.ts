import { auth } from '@/lib/auth/server';
import { guardAuthRequest } from '@/lib/auth/api-guard';

// Gestionnaires créés à la première requête (voir src/lib/auth/server.ts), précédés
// des contrôles de politique (src/lib/auth/api-guard.ts).
type Context = { params: Promise<{ path: string[] }> };
type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

function forward(method: Method) {
  return async (request: Request, context: Context): Promise<Response> => {
    const { path } = await context.params;
    const refused = await guardAuthRequest(method, path, request);
    if (refused) return refused;
    return auth.handler()[method](request, context);
  };
}

export const GET = forward('GET');
export const POST = forward('POST');
export const PUT = forward('PUT');
export const DELETE = forward('DELETE');
export const PATCH = forward('PATCH');
