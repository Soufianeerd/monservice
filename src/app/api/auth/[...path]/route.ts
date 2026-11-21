import { auth } from '@/lib/auth/server';

// Gestionnaires créés à la première requête (voir src/lib/auth/server.ts).
type Context = { params: Promise<{ path: string[] }> };
type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

function forward(method: Method) {
  return (request: Request, context: Context): Promise<Response> => auth.handler()[method](request, context);
}

export const GET = forward('GET');
export const POST = forward('POST');
export const PUT = forward('PUT');
export const DELETE = forward('DELETE');
export const PATCH = forward('PATCH');
