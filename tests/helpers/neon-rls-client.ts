// This is a SQL test harness, not a replacement Data API or application client.
// Historical scenario assertions use real restricted PostgreSQL transactions;
// identity comes from a successful Managed Auth HTTP session, not fixture IDs.
import postgres from 'postgres';
import { vi } from 'vitest';
import { withVerifiedProvider, registerVerifiedSession } from './neon-auth-context';
import { createSecurityScopedClient } from '@/lib/db/security-context';

vi.mock('@/lib/auth/server', async () => {
  const { getTestProviderSession } = await import('./neon-auth-context');
  return { auth: { getSession: getTestProviderSession } };
});

const quote = (value: string) => {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) throw new Error('Invalid SQL identifier');
  return '"' + value + '"';
};
const runtimeUrl = process.env.NEON_RUNTIME_DATABASE_URL ?? process.env.DATABASE_URL!;
if (!process.env.NEON_BRANCH || process.env.NEON_BRANCH === 'production') throw new Error('Isolated Neon validation branch required');
const pool = postgres(runtimeUrl, { max: 2, prepare: false });
const authenticate = async (email: string, password: string) => {
  const baseUrl = process.env.NEON_AUTH_BASE_URL!;
  let response: Response | undefined;
  for (let attempt = 0; attempt < 5; attempt++) {
    response = await fetch(`${baseUrl}/sign-in/email`, {
      method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://localhost:3039' },
      body: JSON.stringify({ email, password }), signal: AbortSignal.timeout(20000),
    });
    if (response.status !== 429) break;
    await new Promise(resolve => setTimeout(resolve, 30000));
  }
  if (!response?.ok) throw new Error('Managed Auth login failed');
  const cookie = response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
  const verified = await fetch(`${baseUrl}/get-session`, { headers: { cookie }, signal: AbortSignal.timeout(20000) });
  const data = await verified.json();
  if (!verified.ok || !data?.user?.id) throw new Error('Managed Auth session verification failed');
  registerVerifiedSession(data.user.id,data.session.id);
  return data.user.id as string;
};

type Result = { data: any; error: { code: string; message: string } | null };
export class NeonRlsClient {
  private providerId: string | null = null;
  private connection = createSecurityScopedClient(pool, async () => this.providerId);
  auth = {
    signInWithPassword: async ({ email, password }: { email: string; password: string }): Promise<Result> => {
      try {
        this.providerId = await authenticate(email, password);
        const [identity] = await this.connection.unsafe('select public.current_app_user_id() as id');
        if (!identity.id) throw new Error('Application mapping unavailable');
        return { data: { user: { id: this.providerId }, appUserId: identity.id }, error: null };
      } catch { return { data: null, error: { code: 'AUTH_FAILED', message: 'Verified synthetic login failed' } }; }
    },
  };
  from(table: string) {
    quote(table);
    let operation = 'select';
    let columns = '*';
    let values: Record<string, unknown> | Record<string, unknown>[] = {};
    const filters: Array<[string, unknown]> = [];
    let single = false;
    let returnRows = false;
    const execute = async (): Promise<Result> => {
      const params: any[] = [];
      const parameter = (value: unknown) => { params.push(value && typeof value === 'object' && !(value instanceof Date) && !Array.isArray(value) ? JSON.stringify(value) : value); return '$' + params.length; };
      const projection = columns === '*' ? '*' : columns.split(',').map(c => quote(c.trim())).join(',');
      let query = '';
      if (operation === 'select') query = `select ${projection} from public.${quote(table)}`;
      if (operation === 'delete') query = `delete from public.${quote(table)}`;
      if (operation === 'update') query = `update public.${quote(table)} set ` + Object.entries(values).map(([key,value]) => `${quote(key)}=${parameter(value)}`).join(',');
      if (operation === 'insert') {
        const rows = Array.isArray(values) ? values : [values];
        const keys = Object.keys(rows[0]);
        query = `insert into public.${quote(table)} (${keys.map(quote).join(',')}) values ` + rows.map(row => '(' + keys.map(k => parameter(row[k])).join(',') + ')').join(',');
      } else if (filters.length) query += ' where ' + filters.map(([key,value]) => `${quote(key)}=${parameter(value)}`).join(' and ');
      if (operation !== 'select' && returnRows) query += ` returning ${projection}`;
      try {
        const rows = await this.connection.unsafe(query, params);
        if (single && rows.length !== 1) return { data: null, error: { code: 'PGRST116', message: 'Expected one authorized row' } };
        return { data: single ? rows[0] : operation === 'select' || returnRows ? [...rows] : null, error: null };
      } catch (error: any) { return { data: null, error: { code: error.code ?? 'DATABASE_ERROR', message: 'Restricted database operation denied' } }; }
    };
    const builder = {
      select: (selection = '*') => { columns = selection; returnRows = true; return builder; },
      insert: (input: Record<string, unknown> | Record<string, unknown>[]) => { operation = 'insert'; values = input; return builder; },
      update: (input: Record<string, unknown>) => { operation = 'update'; values = input; return builder; },
      delete: () => { operation = 'delete'; return builder; },
      eq: (column: string, value: unknown) => { filters.push([column,value]); return builder; },
      single: () => { single = true; return builder; },
      then: (resolve: (result: Result) => unknown, reject?: (error: unknown) => unknown) => execute().then(resolve,reject),
    };
    return builder;
  }
  storage = {
    from: (bucket: string) => ({
      upload: async (key: string, bytes: Blob | Buffer | Uint8Array, options?: { contentType?: string }): Promise<Result> => {
        try {
          if (bucket !== 'clinical-documents') throw new Error('Unsupported test bucket');
          const { clinicalStorageService } = await import('@/lib/services/clinical-storage.service');
          const buffer = Buffer.isBuffer(bytes) ? bytes : bytes instanceof Uint8Array ? Buffer.from(bytes) : Buffer.from(new Uint8Array(await bytes.arrayBuffer()));
          await withVerifiedProvider(this.providerId, () => clinicalStorageService.uploadFile(key, buffer, options?.contentType ?? 'application/pdf'));
          return { data: { path: key }, error: null };
        } catch { return { data: null, error: { code: 'STORAGE_DENIED', message: 'Clinical upload denied' } }; }
      },
      createSignedUrl: async (key: string, expiresIn: number): Promise<Result> => {
        try {
          const { clinicalStorageService } = await import('@/lib/services/clinical-storage.service');
          const signedUrl = await withVerifiedProvider(this.providerId, () => clinicalStorageService.getSignedDownloadUrl(key, expiresIn));
          return { data: { signedUrl }, error: null };
        } catch { return { data: null, error: { code: 'STORAGE_DENIED', message: 'Clinical download denied' } }; }
      },
    }),
  };
}

export const createRlsTestClient = () => new NeonRlsClient();
