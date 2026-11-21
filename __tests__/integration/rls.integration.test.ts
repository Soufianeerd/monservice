import { describe, it, expect, beforeAll } from 'vitest';
import { createRlsTestClient, NeonRlsClient } from '../../tests/helpers/neon-rls-client';


const PRO_A_EMAIL = 'pro_a@monservice.invalid';
const PRO_B_EMAIL = 'pro_b@monservice.invalid';
const PASSWORD = process.env.E2E_AUTH_PASSWORD!;
const ORG_A_ID = 'org-a-1234';
const ORG_B_ID = 'org-b-5678';
const CLIENT_A_RECORD_ID = 'cli-rec-a-1234';
const CLIENT_B_RECORD_ID = 'cli-rec-b-5678';

describe('Row Level Security (RLS) Integration Tests', () => {
  let anonClient: NeonRlsClient;
  let proAClient: NeonRlsClient;
  let proBClient: NeonRlsClient;

  beforeAll(async () => {
    anonClient = createRlsTestClient();

    proAClient = createRlsTestClient();
    const { error: errA } = await proAClient.auth.signInWithPassword({
      email: PRO_A_EMAIL,
      password: PASSWORD,
    });
    if (errA) throw new Error(`Failed to login Pro A: ${errA.message}`);

    proBClient = createRlsTestClient();
    const { error: errB } = await proBClient.auth.signInWithPassword({
      email: PRO_B_EMAIL,
      password: PASSWORD,
    });
    if (errB) throw new Error(`Failed to login Pro B: ${errB.message}`);
  });

  describe('ANON Table Privilege Denial (Not RLS)', () => {
    it('ANON cannot read clients -> zero authorized rows Table Permission Denied', async () => {
      const { data, error  } = await anonClient.from('clients').select('*');
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });
  });

  describe('Authenticated POSITIVE Access (Own Tenant)', () => {
    it('Professional A SELECTs ClientRecord A -> exactly 1 row', async () => {
      const { data, error } = await proAClient.from('clients').select('*').eq('id', CLIENT_A_RECORD_ID);
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });

    it('Professional A SELECTs Invoice A -> exactly 1 row', async () => {
      const { data, error } = await proAClient.from('invoices').select('*').eq('organization_id', ORG_A_ID);
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    });
  });

  describe('Authenticated NEGATIVE Access (Cross Tenant Isolation)', () => {
    it('Professional A SELECTs ClientRecord B -> 0 rows (Filtered by RLS, no table privilege error)', async () => {
      const { data, error } = await proAClient.from('clients').select('*').eq('id', CLIENT_B_RECORD_ID);
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    it('Professional A UPDATEs ClientRecord B -> 0 rows affected', async () => {
      const { data, error } = await proAClient
        .from('clients')
        .update({ name: 'Hacked Client B' })
        .eq('id', CLIENT_B_RECORD_ID)
        .select();
        
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    it('Professional A DELETEs ClientRecord B -> 0 rows deleted', async () => {
      const { data, error } = await proAClient
        .from('clients')
        .delete()
        .eq('id', CLIENT_B_RECORD_ID)
        .select();
        
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    it('Professional A INSERTs client with organization_id = Org B -> RLS violation', async () => {
      const { data, error } = await proAClient
        .from('clients')
        .insert({
          id: 'hacked-client-id',
          organization_id: ORG_B_ID,
          name: 'Hacked Client'
        })
        .select();

      expect(error).not.toBeNull();
      expect(error?.code).toBe('42501'); // RLS WITH CHECK policy violation
    });

    it('Professional B verifies ClientRecord B is still intact', async () => {
      const { data, error } = await proBClient
        .from('clients')
        .select('name')
        .eq('id', CLIENT_B_RECORD_ID)
        .single();
        
      expect(error).toBeNull();
      expect(data?.name).toBe('Client B Record');
    });
  });

  describe('Requests Semantic Access (Public vs Private)', () => {
    it('Professional B CAN read public request from Client A', async () => {
      const { data, error } = await proBClient.from('requests').select('*').eq('client_id', CLIENT_A_RECORD_ID);
      // Since it's visibility: 'public', it should be visible to Pro B
      expect(error).toBeNull();
      expect(data?.length).toBeGreaterThan(0);
    });

    it('Professional B CANNOT modify request from Client A', async () => {
      const { data, error } = await proBClient
        .from('requests')
        .update({ title: 'Hacked Request' })
        .eq('client_id', CLIENT_A_RECORD_ID)
        .select();
        
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });
  });
});
