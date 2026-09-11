import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import postgres from 'postgres';
import {
  SEED_PRACTICE_IDS,
  SEED_PATIENT_IDS,
  SEED_CLINICAL_IDS,
} from '../../scripts/e2e/seed-local';
import { randomUUID } from 'crypto';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'dummy';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres';

const PRO_A_EMAIL = 'pro_a@monservice.com';
const PRO_B_EMAIL = 'pro_b@monservice.com';
const CLIENT_A_EMAIL = 'client_a@monservice.com';
const STAFF_A_EMAIL = 'staff_a@monservice.com';
const PASSWORD = 'password123';

describe('Clinical Record RLS & Practitioner-Bound Security (Session 11)', () => {
  let sql: postgres.Sql;
  let anonClient: SupabaseClient;
  let proAClient: SupabaseClient;
  let proBClient: SupabaseClient;
  let clientAClient: SupabaseClient;
  let staffAClient: SupabaseClient;

  const dynamicCreatedEpisodeIds: string[] = [];
  const dynamicCreatedEncounterIds: string[] = [];
  const dynamicCreatedNoteIds: string[] = [];

  beforeAll(async () => {
    sql = postgres(DATABASE_URL);

    anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });

    // 1. Pro A Client
    proAClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    const { data: authA, error: errA } = await proAClient.auth.signInWithPassword({
      email: PRO_A_EMAIL,
      password: PASSWORD,
    });
    if (errA || !authA?.user) {
      throw new Error(`Failed to authenticate Pro A: ${errA?.message || 'No user'}`);
    }

    // 2. Pro B Client
    proBClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    const { data: authB, error: errB } = await proBClient.auth.signInWithPassword({
      email: PRO_B_EMAIL,
      password: PASSWORD,
    });
    if (errB || !authB?.user) {
      throw new Error(`Failed to authenticate Pro B: ${errB?.message || 'No user'}`);
    }

    // 3. Client A Client
    clientAClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    const { data: authCliA, error: errCliA } = await clientAClient.auth.signInWithPassword({
      email: CLIENT_A_EMAIL,
      password: PASSWORD,
    });
    if (errCliA || !authCliA?.user) {
      throw new Error(`Failed to authenticate Client A: ${errCliA?.message || 'No user'}`);
    }

    // 4. Staff A Client (unlinked professional in Org A)
    staffAClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    const { data: authStaffA, error: errStaffA } = await staffAClient.auth.signInWithPassword({
      email: STAFF_A_EMAIL,
      password: PASSWORD,
    });
    if (errStaffA || !authStaffA?.user) {
      throw new Error(`Failed to authenticate Staff A: ${errStaffA?.message || 'No user'}`);
    }
  });

  afterAll(async () => {
    if (dynamicCreatedNoteIds.length > 0) {
      await sql`DELETE FROM clinical_notes WHERE id = ANY(${dynamicCreatedNoteIds})`;
    }
    if (dynamicCreatedEncounterIds.length > 0) {
      await sql`DELETE FROM clinical_encounters WHERE id = ANY(${dynamicCreatedEncounterIds})`;
    }
    if (dynamicCreatedEpisodeIds.length > 0) {
      await sql`DELETE FROM care_episodes WHERE id = ANY(${dynamicCreatedEpisodeIds})`;
    }
    await sql.end();
  });

  // ==========================================
  // 1. POSITIVE READ ACCESS (OWNER)
  // ==========================================
  it('Pro A can SELECT own care episode, encounter, and clinical note in Org A', async () => {
    const { data: episodes, error: epErr } = await proAClient
      .from('care_episodes')
      .select('id, organization_id, practitioner_id, status')
      .eq('id', SEED_CLINICAL_IDS.careEpisodeA);

    expect(epErr).toBeNull();
    expect(episodes).toHaveLength(1);
    expect(episodes?.[0]?.organization_id).toBe(SEED_PRACTICE_IDS.orgA);
    expect(episodes?.[0]?.practitioner_id).toBe(SEED_PRACTICE_IDS.practitionerA);

    const { data: encounters, error: encErr } = await proAClient
      .from('clinical_encounters')
      .select('id, organization_id, practitioner_id')
      .eq('id', SEED_CLINICAL_IDS.clinicalEncounterA);

    expect(encErr).toBeNull();
    expect(encounters).toHaveLength(1);

    const { data: notes, error: noteErr } = await proAClient
      .from('clinical_notes')
      .select('id, organization_id, author_practitioner_id, content')
      .eq('id', SEED_CLINICAL_IDS.clinicalNoteA);

    expect(noteErr).toBeNull();
    expect(notes).toHaveLength(1);
    expect(notes?.[0]?.content).toBe('Note clinique de test A.');
  });

  it('Pro B can SELECT own care episode, encounter, and clinical note in Org B', async () => {
    const { data: episodes, error: epErr } = await proBClient
      .from('care_episodes')
      .select('id, organization_id, practitioner_id')
      .eq('id', SEED_CLINICAL_IDS.careEpisodeB);

    expect(epErr).toBeNull();
    expect(episodes).toHaveLength(1);

    const { data: encounters, error: encErr } = await proBClient
      .from('clinical_encounters')
      .select('id, organization_id')
      .eq('id', SEED_CLINICAL_IDS.clinicalEncounterB);

    expect(encErr).toBeNull();
    expect(encounters).toHaveLength(1);

    const { data: notes, error: noteErr } = await proBClient
      .from('clinical_notes')
      .select('id, content')
      .eq('id', SEED_CLINICAL_IDS.clinicalNoteB);

    expect(noteErr).toBeNull();
    expect(notes).toHaveLength(1);
    expect(notes?.[0]?.content).toBe('Note clinique de test B.');
  });

  // ==========================================
  // 2. CROSS-TENANT ISOLATION
  // ==========================================
  it('Pro A cannot SELECT Org B care episodes, encounters, or clinical notes', async () => {
    const { data: episodes } = await proAClient
      .from('care_episodes')
      .select('id')
      .eq('organization_id', SEED_PRACTICE_IDS.orgB);
    expect(episodes).toHaveLength(0);

    const { data: encounters } = await proAClient
      .from('clinical_encounters')
      .select('id')
      .eq('organization_id', SEED_PRACTICE_IDS.orgB);
    expect(encounters).toHaveLength(0);

    const { data: notes } = await proAClient
      .from('clinical_notes')
      .select('id')
      .eq('organization_id', SEED_PRACTICE_IDS.orgB);
    expect(notes).toHaveLength(0);
  });

  it('Pro A cannot INSERT into Org B care episodes', async () => {
    const fakeEpId = randomUUID();
    const { error } = await proAClient.from('care_episodes').insert({
      id: fakeEpId,
      organization_id: SEED_PRACTICE_IDS.orgB,
      patient_id: SEED_PATIENT_IDS.patientB,
      practitioner_id: SEED_PRACTICE_IDS.practitionerB,
      status: 'active',
    });

    expect(error).not.toBeNull();
  });

  // ==========================================
  // 3. SAME-TENANT CLIENT ACCESS (ZERO ACCESS)
  // ==========================================
  it('Client A in Org A cannot read or write any care episodes, encounters, or clinical notes', async () => {
    const { data: episodes } = await clientAClient
      .from('care_episodes')
      .select('id')
      .eq('organization_id', SEED_PRACTICE_IDS.orgA);
    expect(episodes).toHaveLength(0);

    const { data: encounters } = await clientAClient
      .from('clinical_encounters')
      .select('id')
      .eq('organization_id', SEED_PRACTICE_IDS.orgA);
    expect(encounters).toHaveLength(0);

    const { data: notes } = await clientAClient
      .from('clinical_notes')
      .select('id')
      .eq('organization_id', SEED_PRACTICE_IDS.orgA);
    expect(notes).toHaveLength(0);

    const { error: insertErr } = await clientAClient.from('care_episodes').insert({
      id: randomUUID(),
      organization_id: SEED_PRACTICE_IDS.orgA,
      patient_id: SEED_PATIENT_IDS.patientA,
      practitioner_id: SEED_PRACTICE_IDS.practitionerA,
      status: 'active',
    });
    expect(insertErr).not.toBeNull();
  });

  // ==========================================
  // 4. SAME-TENANT UNLINKED PROFESSIONAL (STAFF_A)
  // ==========================================
  it('P0: Staff A (professional without active practitioner link) cannot read or write clinical records in same Org A', async () => {
    const { data: episodes } = await staffAClient
      .from('care_episodes')
      .select('id')
      .eq('organization_id', SEED_PRACTICE_IDS.orgA);
    expect(episodes).toHaveLength(0);

    const { data: encounters } = await staffAClient
      .from('clinical_encounters')
      .select('id')
      .eq('organization_id', SEED_PRACTICE_IDS.orgA);
    expect(encounters).toHaveLength(0);

    const { data: notes } = await staffAClient
      .from('clinical_notes')
      .select('id')
      .eq('organization_id', SEED_PRACTICE_IDS.orgA);
    expect(notes).toHaveLength(0);

    const { error: insertErr } = await staffAClient.from('care_episodes').insert({
      id: randomUUID(),
      organization_id: SEED_PRACTICE_IDS.orgA,
      patient_id: SEED_PATIENT_IDS.patientA,
      practitioner_id: SEED_PRACTICE_IDS.practitionerA,
      status: 'active',
    });
    expect(insertErr).not.toBeNull();
  });

  // ==========================================
  // 5. ANONYMOUS ACCESS (ZERO ACCESS)
  // ==========================================
  it('Anon client cannot read or write any clinical table', async () => {
    const { data: episodes } = await anonClient.from('care_episodes').select('id');
    expect(episodes).toBeNull(); // Permission denied by grant

    const { data: encounters } = await anonClient.from('clinical_encounters').select('id');
    expect(encounters).toBeNull();

    const { data: notes } = await anonClient.from('clinical_notes').select('id');
    expect(notes).toBeNull();
  });

  // ==========================================
  // 6. FORGED PRACTITIONER / AUTHOR RLS REJECTION
  // ==========================================
  it('Pro A cannot insert care episode or encounter with forged practitioner_id', async () => {
    const fakeEpId = randomUUID();
    const { error: epErr } = await proAClient.from('care_episodes').insert({
      id: fakeEpId,
      organization_id: SEED_PRACTICE_IDS.orgA,
      patient_id: SEED_PATIENT_IDS.patientA,
      practitioner_id: SEED_PRACTICE_IDS.practitionerB, // Forged
      status: 'active',
    });
    expect(epErr).not.toBeNull();

    const fakeEncId = randomUUID();
    const { error: encErr } = await proAClient.from('clinical_encounters').insert({
      id: fakeEncId,
      organization_id: SEED_PRACTICE_IDS.orgA,
      care_episode_id: SEED_CLINICAL_IDS.careEpisodeA,
      patient_id: SEED_PATIENT_IDS.patientA,
      practitioner_id: SEED_PRACTICE_IDS.practitionerB, // Forged
      occurred_at: new Date(Date.now() - 3600000).toISOString(),
    });
    expect(encErr).not.toBeNull();
  });

  // ==========================================
  // 7. FINALIZED NOTE IMMUTABILITY DIRECT BYPASS
  // ==========================================
  it('P0: direct PostgREST UPDATE on finalized note is rejected by DB trigger (23514)', async () => {
    const dynamicNoteId = randomUUID();
    dynamicCreatedNoteIds.push(dynamicNoteId);

    // 1. Pro A creates draft note via PostgREST
    const { error: insertErr } = await proAClient.from('clinical_notes').insert({
      id: dynamicNoteId,
      organization_id: SEED_PRACTICE_IDS.orgA,
      encounterId: undefined, // Drizzle vs Supabase column name
      encounter_id: SEED_CLINICAL_IDS.clinicalEncounterA,
      patient_id: SEED_PATIENT_IDS.patientA,
      author_practitioner_id: SEED_PRACTICE_IDS.practitionerA,
      content: 'Contenu brouillon pour test finalisation',
      status: 'draft',
    });
    expect(insertErr).toBeNull();

    // 2. Pro A finalizes note via PostgREST
    const { error: finalizeErr } = await proAClient
      .from('clinical_notes')
      .update({ status: 'finalized' })
      .eq('id', dynamicNoteId);
    expect(finalizeErr).toBeNull();

    // 3. Pro A attempts direct UPDATE on finalized note content
    const { error: directUpdateErr } = await proAClient
      .from('clinical_notes')
      .update({ content: 'Contournement direct PostgREST interdit' })
      .eq('id', dynamicNoteId);

    expect(directUpdateErr).not.toBeNull();
    expect(directUpdateErr?.code).toBe('23514');
    expect(directUpdateErr?.message).toContain('Finalized clinical notes are immutable');
  });

  // ==========================================
  // 8. DELETE PRIVILEGES (NO DELETE GRANTS)
  // ==========================================
  it('Pro A cannot DELETE clinical notes or care episodes (permission denied)', async () => {
    const { error: delNoteErr } = await proAClient
      .from('clinical_notes')
      .delete()
      .eq('id', SEED_CLINICAL_IDS.clinicalNoteA);
    expect(delNoteErr).not.toBeNull();

    const { error: delEpErr } = await proAClient
      .from('care_episodes')
      .delete()
      .eq('id', SEED_CLINICAL_IDS.careEpisodeA);
    expect(delEpErr).not.toBeNull();
  });
});
