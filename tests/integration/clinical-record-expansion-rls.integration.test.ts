import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import postgres from 'postgres';
import {
  SEED_PRACTICE_IDS,
  SEED_PATIENT_IDS,
  SEED_CLINICAL_IDS,
  SEED_CLINICAL_EXPANSION_IDS,
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

describe('Clinical Record Expansion RLS & Storage Security (Session 12)', () => {
  let sql: postgres.Sql;
  let anonClient: SupabaseClient;
  let proAClient: SupabaseClient;
  let proBClient: SupabaseClient;
  let clientAClient: SupabaseClient;
  let staffAClient: SupabaseClient;

  const dynamicDocIds: string[] = [];
  const dynamicTemplateIds: string[] = [];
  const dynamicResponseIds: string[] = [];
  const dynamicMeasurementIds: string[] = [];

  beforeAll(async () => {
    sql = postgres(DATABASE_URL);

    anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });

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

    clientAClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    await clientAClient.auth.signInWithPassword({
      email: CLIENT_A_EMAIL,
      password: PASSWORD,
    });

    staffAClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    await staffAClient.auth.signInWithPassword({
      email: STAFF_A_EMAIL,
      password: PASSWORD,
    });
  });

  afterAll(async () => {
    if (dynamicMeasurementIds.length > 0) {
      await sql`DELETE FROM clinical_measurements WHERE id IN ${sql(dynamicMeasurementIds)}`;
    }
    if (dynamicResponseIds.length > 0) {
      await sql`DELETE FROM clinical_form_responses WHERE id IN ${sql(dynamicResponseIds)}`;
    }
    if (dynamicTemplateIds.length > 0) {
      await sql`DELETE FROM clinical_form_templates WHERE id IN ${sql(dynamicTemplateIds)}`;
    }
    if (dynamicDocIds.length > 0) {
      await sql`DELETE FROM clinical_documents WHERE id IN ${sql(dynamicDocIds)}`;
    }
    await sql.end();
  });

  // ==========================================
  // 1. Clinical Documents RLS
  // ==========================================
  describe('Clinical Documents Table RLS', () => {
    it('anon cannot read clinical documents', async () => {
      const { data } = await anonClient.from('clinical_documents').select('*');
      expect(data).toHaveLength(0);
    });

    it('client role cannot read clinical documents', async () => {
      const { data } = await clientAClient.from('clinical_documents').select('*');
      expect(data).toHaveLength(0);
    });

    it('staff role (unlinked to practitioner) cannot read clinical documents', async () => {
      const { data } = await staffAClient.from('clinical_documents').select('*');
      expect(data).toHaveLength(0);
    });

    it('pro A reads only their own clinical documents, never pro B', async () => {
      const { data, error } = await proAClient.from('clinical_documents').select('*');
      expect(error).toBeNull();
      expect(data).not.toBeNull();

      // Should contain documentA
      const foundA = data?.find((d) => d.id === SEED_CLINICAL_EXPANSION_IDS.clinicalDocumentA);
      expect(foundA).toBeDefined();

      // Should NOT contain documentB
      const foundB = data?.find((d) => d.id === SEED_CLINICAL_EXPANSION_IDS.clinicalDocumentB);
      expect(foundB).toBeUndefined();
    });

    it('pro A cannot insert clinical document under pro B authority', async () => {
      const newDocId = randomUUID();
      const { error } = await proAClient.from('clinical_documents').insert({
        id: newDocId,
        organization_id: SEED_PRACTICE_IDS.orgB,
        patient_id: SEED_PATIENT_IDS.patientB,
        practitioner_id: SEED_PRACTICE_IDS.practitionerB,
        title: 'Document Frauduleux',
        category: 'other',
        file_name: 'test.pdf',
        mime_type: 'application/pdf',
        size_bytes: 1024,
        storage_path: 'path',
      });
      expect(error).not.toBeNull();
    });

    it('pro A can insert valid document under their own authority', async () => {
      const newDocId = randomUUID();
      dynamicDocIds.push(newDocId);

      const { data, error } = await proAClient
        .from('clinical_documents')
        .insert({
          id: newDocId,
          organization_id: SEED_PRACTICE_IDS.orgA,
          patient_id: SEED_PATIENT_IDS.patientA,
          practitioner_id: SEED_PRACTICE_IDS.practitionerA,
          care_episode_id: SEED_CLINICAL_IDS.careEpisodeA,
          encounter_id: SEED_CLINICAL_IDS.clinicalEncounterA,
          title: 'Radio Genou Pro A',
          category: 'report',
          file_name: 'radio_genou.png',
          mime_type: 'image/png',
          size_bytes: 204800,
          storage_path: `${SEED_PRACTICE_IDS.orgA}/${SEED_PRACTICE_IDS.practitionerA}/${SEED_PATIENT_IDS.patientA}/${newDocId}/radio_genou.png`,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.title).toBe('Radio Genou Pro A');
    });
  });

  // ==========================================
  // 2. Clinical Form Templates & Responses RLS
  // ==========================================
  describe('Clinical Form Templates & Responses Table RLS', () => {
    it('pro A reads their own templates, never pro B templates', async () => {
      const { data } = await proAClient.from('clinical_form_templates').select('*');
      const foundA = data?.find((t) => t.id === SEED_CLINICAL_EXPANSION_IDS.clinicalFormTemplateA);
      const foundB = data?.find((t) => t.id === SEED_CLINICAL_EXPANSION_IDS.clinicalFormTemplateB);

      expect(foundA).toBeDefined();
      expect(foundB).toBeUndefined();
    });

    it('pro A reads their own form responses, never pro B responses', async () => {
      const { data } = await proAClient.from('clinical_form_responses').select('*');
      const foundA = data?.find((r) => r.id === SEED_CLINICAL_EXPANSION_IDS.clinicalFormResponseA);
      const foundB = data?.find((r) => r.id === SEED_CLINICAL_EXPANSION_IDS.clinicalFormResponseB);

      expect(foundA).toBeDefined();
      expect(foundB).toBeUndefined();
    });

    it('pro A cannot update pro B form response', async () => {
      await proAClient
        .from('clinical_form_responses')
        .update({ answers_json: { hacked: true } })
        .eq('id', SEED_CLINICAL_EXPANSION_IDS.clinicalFormResponseB);

      // Either error or 0 rows affected
      const { data } = await proBClient
        .from('clinical_form_responses')
        .select('answers_json')
        .eq('id', SEED_CLINICAL_EXPANSION_IDS.clinicalFormResponseB)
        .single();

      expect(data?.answers_json).not.toHaveProperty('hacked');
    });
  });

  // ==========================================
  // 3. Clinical Measurements RLS
  // ==========================================
  describe('Clinical Measurements Table RLS', () => {
    it('pro A reads their own measurements, never pro B measurements', async () => {
      const { data } = await proAClient.from('clinical_measurements').select('*');
      const foundA = data?.find((m) => m.id === SEED_CLINICAL_EXPANSION_IDS.clinicalMeasurementA);
      const foundB = data?.find((m) => m.id === SEED_CLINICAL_EXPANSION_IDS.clinicalMeasurementB);

      expect(foundA).toBeDefined();
      expect(foundB).toBeUndefined();
    });

    it('pro A cannot insert measurement under pro B authority', async () => {
      const newMId = randomUUID();
      const { error } = await proAClient.from('clinical_measurements').insert({
        id: newMId,
        organization_id: SEED_PRACTICE_IDS.orgB,
        patient_id: SEED_PATIENT_IDS.patientB,
        practitioner_id: SEED_PRACTICE_IDS.practitionerB,
        code: 'pain_score',
        label: 'Douleur',
        value_numeric: 8,
        observed_at: new Date().toISOString(),
      });
      expect(error).not.toBeNull();
    });
  });

  // ==========================================
  // 4. Storage Bucket RLS & Path Security
  // ==========================================
  describe('Storage Bucket Path Isolation', () => {
    it('pro A can upload file to their own practitioner path in clinical-documents bucket', async () => {
      const sampleBlob = new Blob(['sample pdf data'], { type: 'application/pdf' });
      const testPath = `${SEED_PRACTICE_IDS.orgA}/${SEED_PRACTICE_IDS.practitionerA}/${SEED_PATIENT_IDS.patientA}/test-doc/file.pdf`;

      const { data, error } = await proAClient.storage
        .from('clinical-documents')
        .upload(testPath, sampleBlob, { upsert: true });

      expect(error).toBeNull();
      expect(data?.path).toBe(testPath);
    });

    it('pro A CANNOT upload file to pro B practitioner path in clinical-documents bucket', async () => {
      const sampleBlob = new Blob(['malicious pdf data'], { type: 'application/pdf' });
      const forbiddenPath = `${SEED_PRACTICE_IDS.orgB}/${SEED_PRACTICE_IDS.practitionerB}/${SEED_PATIENT_IDS.patientB}/malicious/file.pdf`;

      const { error } = await proAClient.storage
        .from('clinical-documents')
        .upload(forbiddenPath, sampleBlob);

      expect(error).not.toBeNull();
    });

    it('pro A CANNOT download or view signed URL for pro B storage path', async () => {
      const forbiddenPath = `${SEED_PRACTICE_IDS.orgB}/${SEED_PRACTICE_IDS.practitionerB}/${SEED_PATIENT_IDS.patientB}/compte_rendu.pdf`;

      const { data, error } = await proAClient.storage
        .from('clinical-documents')
        .createSignedUrl(forbiddenPath, 60);

      // Supabase storage returns error or fails access
      if (data?.signedUrl) {
        // Fetching the URL should return 403 or error
        const res = await fetch(data.signedUrl);
        expect(res.status).toBeGreaterThanOrEqual(400);
      } else {
        expect(error).not.toBeNull();
      }
    });
  });
});
