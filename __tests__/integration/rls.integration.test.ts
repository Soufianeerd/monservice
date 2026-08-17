import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'dummy';

// We assume seed-local.ts has already run and created these users and data
const PRO_A_EMAIL = 'pro_a@monservice.com';
const PRO_B_EMAIL = 'pro_b@monservice.com';
const PASSWORD = 'password123';
const ORG_A_ID = 'org-a-1234';
const ORG_B_ID = 'org-b-5678';
const CLIENT_B_RECORD_ID = 'cli-rec-b-5678';

describe('Row Level Security (RLS) Integration Tests', () => {
  let anonClient: SupabaseClient;
  let proAClient: SupabaseClient;
  let proBClient: SupabaseClient;

  beforeAll(async () => {
    // 1. Create ANON client
    anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });

    // 2. Create Pro A client and authenticate
    proAClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    const { error: errA } = await proAClient.auth.signInWithPassword({
      email: PRO_A_EMAIL,
      password: PASSWORD,
    });
    if (errA) throw new Error(`Failed to login Pro A: ${errA.message}`);

    // 3. Create Pro B client and authenticate
    proBClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    const { error: errB } = await proBClient.auth.signInWithPassword({
      email: PRO_B_EMAIL,
      password: PASSWORD,
    });
    if (errB) throw new Error(`Failed to login Pro B: ${errB.message}`);
  });

  it('ANON cannot read clients', async () => {
    const { data, error } = await anonClient.from('clients').select('*');
    // PostgREST will either return empty array or error for anon if completely blocked
    expect(data).toHaveLength(0);
  });

  describe('Isolation between Organization A and Organization B', () => {
    
    it('Professional A SELECTs ClientRecord B -> 0 rows returned', async () => {
      const { data, error } = await proAClient
        .from('clients')
        .select('*')
        .eq('id', CLIENT_B_RECORD_ID);
        
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
      expect(data).toHaveLength(0); // Nothing was updated
    });

    it('Professional A DELETEs ClientRecord B -> 0 rows deleted', async () => {
      const { data, error } = await proAClient
        .from('clients')
        .delete()
        .eq('id', CLIENT_B_RECORD_ID)
        .select();
        
      expect(error).toBeNull();
      expect(data).toHaveLength(0); // Nothing was deleted
    });

    it('Professional A INSERTs client with organization_id = Org B -> RLS violation', async () => {
      const { data, error } = await proAClient
        .from('clients')
        .insert({
          id: 'hacked-client-id',
          organization_id: ORG_B_ID, // Pro A tries to inject into Org B
          name: 'Hacked Client',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select();

      // PostgREST throws an error if INSERT violates RLS WITH CHECK policy
      expect(error).not.toBeNull();
      // Code 42501 = insufficient_privilege / new row violates row-level security policy
      expect(error?.code).toBe('42501'); 
    });

    it('Professional B verifies ClientRecord B is still intact', async () => {
      const { data, error } = await proBClient
        .from('clients')
        .select('name')
        .eq('id', CLIENT_B_RECORD_ID)
        .single();
        
      expect(error).toBeNull();
      expect(data?.name).toBe('Client B Record'); // Name was not hacked
    });
  });
});
