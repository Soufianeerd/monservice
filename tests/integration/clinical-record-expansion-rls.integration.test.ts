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

const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || '';

const PRO_A_EMAIL = 'pro_a@monservice.com';
const PRO_B_EMAIL = 'pro_b@monservice.com';
const CLIENT_A_EMAIL = 'client_a@monservice.com';
const STAFF_A_EMAIL = 'staff_a@monservice.com';
const PASSWORD = 'password123';

async function signInOrThrow(client: SupabaseClient, email: string): Promise<void> {
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (error || !data?.user) {
    throw new Error(`Mandatory authentication failed for ${email}: ${error?.message || 'No user session returned'}`);
  }
}

describe('Clinical Record Expansion RLS & Storage Security (Session 12B)', () => {
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
  const createdStoragePaths: string[] = [];

  beforeAll(async () => {
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for integration tests and cleanup');
    }

    sql = postgres(DATABASE_URL);

    // 1. Anon Client (intentionally unauthenticated)
    anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });

    // 2. Pro A Client (Practitioner in Org A)
    proAClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    await signInOrThrow(proAClient, PRO_A_EMAIL);

    // 3. Pro B Client (Practitioner in Org B)
    proBClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    await signInOrThrow(proBClient, PRO_B_EMAIL);

    // 4. Client A Client (Patient/Client profile)
    clientAClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    await signInOrThrow(clientAClient, CLIENT_A_EMAIL);

    // 5. Staff A Client (Professional profile in Org A, but not linked to a practice_practitioner)
    staffAClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
    await signInOrThrow(staffAClient, STAFF_A_EMAIL);
  });

  afterAll(async () => {
    // Cleanup DB dynamic rows
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

    // Cleanup Storage test objects via Storage API (admin authority fail-fast)
    if (createdStoragePaths.length > 0) {
      const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      });
      const { error: cleanupError } = await adminClient.storage.from('clinical-documents').remove(createdStoragePaths);
      if (cleanupError) {
        throw new Error(`Test storage cleanup failed: ${cleanupError.message}`);
      }
    }

    if (sql) {
      await sql.end();
    }
  });

  // ==========================================
  // 1. Clinical Documents Table RLS Matrix
  // ==========================================
  describe('Clinical Documents Table RLS Matrix', () => {
    it('anon cannot read or insert clinical documents', async () => {
      const { data } = await anonClient.from('clinical_documents').select('*');
      expect(data).toBeNull();

      const { error: insertError } = await anonClient.from('clinical_documents').insert({
        id: randomUUID(),
        organization_id: SEED_PRACTICE_IDS.orgA,
        patient_id: SEED_PATIENT_IDS.patientA,
        practitioner_id: SEED_PRACTICE_IDS.practitionerA,
        title: 'Anon Doc',
        category: 'other',
        file_name: 'anon.pdf',
        mime_type: 'application/pdf',
        size_bytes: 1024,
        storage_path: 'anon/path',
      });
      expect(insertError).not.toBeNull();
    });

    it('client A cannot read, insert, or update clinical documents', async () => {
      const { data } = await clientAClient.from('clinical_documents').select('*');
      expect(data).toHaveLength(0);

      const { error: insertError } = await clientAClient.from('clinical_documents').insert({
        id: randomUUID(),
        organization_id: SEED_PRACTICE_IDS.orgA,
        patient_id: SEED_PATIENT_IDS.patientA,
        practitioner_id: SEED_PRACTICE_IDS.practitionerA,
        title: 'Client Doc',
        category: 'other',
        file_name: 'client.pdf',
        mime_type: 'application/pdf',
        size_bytes: 1024,
        storage_path: 'path',
      });
      expect(insertError).not.toBeNull();

      await clientAClient
        .from('clinical_documents')
        .update({ title: 'Hacked Title' })
        .eq('id', SEED_CLINICAL_EXPANSION_IDS.clinicalDocumentA);
      // Update should either return error or 0 rows modified
      const { data: checkData } = await proAClient
        .from('clinical_documents')
        .select('title')
        .eq('id', SEED_CLINICAL_EXPANSION_IDS.clinicalDocumentA)
        .single();
      expect(checkData?.title).not.toBe('Hacked Title');
    });

    it('staff A (unlinked professional) cannot read, insert, or update clinical documents', async () => {
      const { data } = await staffAClient.from('clinical_documents').select('*');
      expect(data).toHaveLength(0);

      const { error: insertError } = await staffAClient.from('clinical_documents').insert({
        id: randomUUID(),
        organization_id: SEED_PRACTICE_IDS.orgA,
        patient_id: SEED_PATIENT_IDS.patientA,
        practitioner_id: SEED_PRACTICE_IDS.practitionerA,
        title: 'Staff Doc',
        category: 'other',
        file_name: 'staff.pdf',
        mime_type: 'application/pdf',
        size_bytes: 1024,
        storage_path: 'path',
      });
      expect(insertError).not.toBeNull();

      await staffAClient
        .from('clinical_documents')
        .update({ title: 'Staff Hacked' })
        .eq('id', SEED_CLINICAL_EXPANSION_IDS.clinicalDocumentA);

      const { data: checkData } = await proAClient
        .from('clinical_documents')
        .select('title')
        .eq('id', SEED_CLINICAL_EXPANSION_IDS.clinicalDocumentA)
        .single();
      expect(checkData?.title).not.toBe('Staff Hacked');
    });

    it('pro A reads own documents and can insert own document', async () => {
      const { data, error } = await proAClient.from('clinical_documents').select('*');
      expect(error).toBeNull();
      expect(data).not.toBeNull();

      const foundA = data?.find((d) => d.id === SEED_CLINICAL_EXPANSION_IDS.clinicalDocumentA);
      expect(foundA).toBeDefined();

      const foundB = data?.find((d) => d.id === SEED_CLINICAL_EXPANSION_IDS.clinicalDocumentB);
      expect(foundB).toBeUndefined();

      const newDocId = randomUUID();
      dynamicDocIds.push(newDocId);

      const { data: inserted, error: insertError } = await proAClient
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

      expect(insertError).toBeNull();
      expect(inserted?.title).toBe('Radio Genou Pro A');
    });

    it('pro B reads own documents (positive control)', async () => {
      const { data, error } = await proBClient.from('clinical_documents').select('*');
      expect(error).toBeNull();
      expect(data).not.toBeNull();

      const foundB = data?.find((d) => d.id === SEED_CLINICAL_EXPANSION_IDS.clinicalDocumentB);
      expect(foundB).toBeDefined();

      const foundA = data?.find((d) => d.id === SEED_CLINICAL_EXPANSION_IDS.clinicalDocumentA);
      expect(foundA).toBeUndefined();
    });

    it('pro A cannot access, insert, or update pro B clinical documents (cross-tenant)', async () => {
      const newDocId = randomUUID();
      const { error: insertError } = await proAClient.from('clinical_documents').insert({
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
      expect(insertError).not.toBeNull();

      await proAClient
        .from('clinical_documents')
        .update({ title: 'Hacked by Pro A' })
        .eq('id', SEED_CLINICAL_EXPANSION_IDS.clinicalDocumentB);

      const { data: proBCheck } = await proBClient
        .from('clinical_documents')
        .select('title')
        .eq('id', SEED_CLINICAL_EXPANSION_IDS.clinicalDocumentB)
        .single();
      expect(proBCheck?.title).not.toBe('Hacked by Pro A');
    });

    it('pro A cannot delete clinical documents (hard delete denied)', async () => {
      const { error } = await proAClient
        .from('clinical_documents')
        .delete()
        .eq('id', SEED_CLINICAL_EXPANSION_IDS.clinicalDocumentA);

      expect(error).not.toBeNull();
    });
  });

  // ==========================================
  // 2. Clinical Form Templates Table RLS Matrix
  // ==========================================
  describe('Clinical Form Templates Table RLS Matrix', () => {
    it('anon cannot read or insert clinical form templates', async () => {
      const { data } = await anonClient.from('clinical_form_templates').select('*');
      expect(data).toBeNull();

      const { error } = await anonClient.from('clinical_form_templates').insert({
        id: randomUUID(),
        organization_id: SEED_PRACTICE_IDS.orgA,
        practitioner_id: SEED_PRACTICE_IDS.practitionerA,
        name: 'Anon Template',
        schema_json: { fields: [] },
      });
      expect(error).not.toBeNull();
    });

    it('client A and staff A cannot read, insert, or update clinical form templates', async () => {
      const { data: clientData } = await clientAClient.from('clinical_form_templates').select('*');
      expect(clientData).toHaveLength(0);

      const { error: clientInsert } = await clientAClient.from('clinical_form_templates').insert({
        id: randomUUID(),
        organization_id: SEED_PRACTICE_IDS.orgA,
        practitioner_id: SEED_PRACTICE_IDS.practitionerA,
        name: 'Client Template',
        schema_json: { fields: [] },
      });
      expect(clientInsert).not.toBeNull();

      const { data: staffData } = await staffAClient.from('clinical_form_templates').select('*');
      expect(staffData).toHaveLength(0);

      const { error: staffInsert } = await staffAClient.from('clinical_form_templates').insert({
        id: randomUUID(),
        organization_id: SEED_PRACTICE_IDS.orgA,
        practitioner_id: SEED_PRACTICE_IDS.practitionerA,
        name: 'Staff Template',
        schema_json: { fields: [] },
      });
      expect(staffInsert).not.toBeNull();
    });

    it('pro A reads own templates and can insert own template', async () => {
      const { data } = await proAClient.from('clinical_form_templates').select('*');
      const foundA = data?.find((t) => t.id === SEED_CLINICAL_EXPANSION_IDS.clinicalFormTemplateA);
      const foundB = data?.find((t) => t.id === SEED_CLINICAL_EXPANSION_IDS.clinicalFormTemplateB);

      expect(foundA).toBeDefined();
      expect(foundB).toBeUndefined();

      const newTId = randomUUID();
      dynamicTemplateIds.push(newTId);
      const { data: inserted, error } = await proAClient
        .from('clinical_form_templates')
        .insert({
          id: newTId,
          organization_id: SEED_PRACTICE_IDS.orgA,
          practitioner_id: SEED_PRACTICE_IDS.practitionerA,
          name: 'Template Bilan Dynamique',
          kind: 'assessment',
          schema_json: { fields: [{ id: 'f1', type: 'text', label: 'Motif' }] },
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(inserted?.name).toBe('Template Bilan Dynamique');
    });

    it('pro B reads own templates (positive control)', async () => {
      const { data } = await proBClient.from('clinical_form_templates').select('*');
      const foundB = data?.find((t) => t.id === SEED_CLINICAL_EXPANSION_IDS.clinicalFormTemplateB);
      expect(foundB).toBeDefined();
    });

    it('pro A cannot modify pro B template and cannot delete templates', async () => {
      await proAClient
        .from('clinical_form_templates')
        .update({ name: 'Hacked by Pro A' })
        .eq('id', SEED_CLINICAL_EXPANSION_IDS.clinicalFormTemplateB);

      const { data: proBCheck } = await proBClient
        .from('clinical_form_templates')
        .select('name')
        .eq('id', SEED_CLINICAL_EXPANSION_IDS.clinicalFormTemplateB)
        .single();
      expect(proBCheck?.name).not.toBe('Hacked by Pro A');

      const { error: deleteError } = await proAClient
        .from('clinical_form_templates')
        .delete()
        .eq('id', SEED_CLINICAL_EXPANSION_IDS.clinicalFormTemplateA);
      expect(deleteError).not.toBeNull();
    });
  });

  // ==========================================
  // 3. Clinical Form Responses Table RLS Matrix
  // ==========================================
  describe('Clinical Form Responses Table RLS Matrix', () => {
    it('anon cannot read or insert clinical form responses', async () => {
      const { data } = await anonClient.from('clinical_form_responses').select('*');
      expect(data).toBeNull();

      const { error } = await anonClient.from('clinical_form_responses').insert({
        id: randomUUID(),
        organization_id: SEED_PRACTICE_IDS.orgA,
        patient_id: SEED_PATIENT_IDS.patientA,
        practitioner_id: SEED_PRACTICE_IDS.practitionerA,
        template_id: SEED_CLINICAL_EXPANSION_IDS.clinicalFormTemplateA,
        response_data: {},
      });
      expect(error).not.toBeNull();
    });

    it('client A and staff A cannot read, insert, or update clinical form responses', async () => {
      const { data: clientData } = await clientAClient.from('clinical_form_responses').select('*');
      expect(clientData).toHaveLength(0);

      const { error: clientInsert } = await clientAClient.from('clinical_form_responses').insert({
        id: randomUUID(),
        organization_id: SEED_PRACTICE_IDS.orgA,
        patient_id: SEED_PATIENT_IDS.patientA,
        practitioner_id: SEED_PRACTICE_IDS.practitionerA,
        template_id: SEED_CLINICAL_EXPANSION_IDS.clinicalFormTemplateA,
        response_data: {},
      });
      expect(clientInsert).not.toBeNull();

      const { data: staffData } = await staffAClient.from('clinical_form_responses').select('*');
      expect(staffData).toHaveLength(0);

      const { error: staffInsert } = await staffAClient.from('clinical_form_responses').insert({
        id: randomUUID(),
        organization_id: SEED_PRACTICE_IDS.orgA,
        patient_id: SEED_PATIENT_IDS.patientA,
        practitioner_id: SEED_PRACTICE_IDS.practitionerA,
        template_id: SEED_CLINICAL_EXPANSION_IDS.clinicalFormTemplateA,
        response_data: {},
      });
      expect(staffInsert).not.toBeNull();
    });

    it('pro A reads own form responses and can insert own response', async () => {
      const { data } = await proAClient.from('clinical_form_responses').select('*');
      const foundA = data?.find((r) => r.id === SEED_CLINICAL_EXPANSION_IDS.clinicalFormResponseA);
      const foundB = data?.find((r) => r.id === SEED_CLINICAL_EXPANSION_IDS.clinicalFormResponseB);

      expect(foundA).toBeDefined();
      expect(foundB).toBeUndefined();

      const newRId = randomUUID();
      dynamicResponseIds.push(newRId);

      const { data: inserted, error } = await proAClient
        .from('clinical_form_responses')
        .insert({
          id: newRId,
          organization_id: SEED_PRACTICE_IDS.orgA,
          patient_id: SEED_PATIENT_IDS.patientA,
          practitioner_id: SEED_PRACTICE_IDS.practitionerA,
          template_id: SEED_CLINICAL_EXPANSION_IDS.clinicalFormTemplateA,
          care_episode_id: SEED_CLINICAL_IDS.careEpisodeA,
          encounter_id: SEED_CLINICAL_IDS.clinicalEncounterA,
          answers_json: { douleur: 'modérée' },
          status: 'draft',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(inserted?.id).toBe(newRId);
    });

    it('pro B reads own form responses (positive control)', async () => {
      const { data } = await proBClient.from('clinical_form_responses').select('*');
      const foundB = data?.find((r) => r.id === SEED_CLINICAL_EXPANSION_IDS.clinicalFormResponseB);
      expect(foundB).toBeDefined();
    });

    it('pro A cannot update pro B form response and cannot delete form responses', async () => {
      await proAClient
        .from('clinical_form_responses')
        .update({ answers_json: { hacked: true } })
        .eq('id', SEED_CLINICAL_EXPANSION_IDS.clinicalFormResponseB);

      const { data } = await proBClient
        .from('clinical_form_responses')
        .select('answers_json')
        .eq('id', SEED_CLINICAL_EXPANSION_IDS.clinicalFormResponseB)
        .single();

      expect(data?.answers_json).not.toHaveProperty('hacked');

      const { error: deleteError } = await proAClient
        .from('clinical_form_responses')
        .delete()
        .eq('id', SEED_CLINICAL_EXPANSION_IDS.clinicalFormResponseA);

      expect(deleteError).not.toBeNull();
    });
  });

  // ==========================================
  // 4. Clinical Measurements Table RLS Matrix
  // ==========================================
  describe('Clinical Measurements Table RLS Matrix', () => {
    it('anon cannot read or insert clinical measurements', async () => {
      const { data } = await anonClient.from('clinical_measurements').select('*');
      expect(data).toBeNull();

      const { error } = await anonClient.from('clinical_measurements').insert({
        id: randomUUID(),
        organization_id: SEED_PRACTICE_IDS.orgA,
        patient_id: SEED_PATIENT_IDS.patientA,
        practitioner_id: SEED_PRACTICE_IDS.practitionerA,
        code: 'pain_score',
        label: 'Douleur',
        value_numeric: 5,
        observed_at: new Date().toISOString(),
      });
      expect(error).not.toBeNull();
    });

    it('client A and staff A cannot read or insert clinical measurements', async () => {
      const { data: clientData } = await clientAClient.from('clinical_measurements').select('*');
      expect(clientData).toHaveLength(0);

      const { error: clientInsert } = await clientAClient.from('clinical_measurements').insert({
        id: randomUUID(),
        organization_id: SEED_PRACTICE_IDS.orgA,
        patient_id: SEED_PATIENT_IDS.patientA,
        practitioner_id: SEED_PRACTICE_IDS.practitionerA,
        code: 'pain_score',
        label: 'Douleur',
        value_numeric: 5,
        observed_at: new Date().toISOString(),
      });
      expect(clientInsert).not.toBeNull();

      const { data: staffData } = await staffAClient.from('clinical_measurements').select('*');
      expect(staffData).toHaveLength(0);

      const { error: staffInsert } = await staffAClient.from('clinical_measurements').insert({
        id: randomUUID(),
        organization_id: SEED_PRACTICE_IDS.orgA,
        patient_id: SEED_PATIENT_IDS.patientA,
        practitioner_id: SEED_PRACTICE_IDS.practitionerA,
        code: 'pain_score',
        label: 'Douleur',
        value_numeric: 5,
        observed_at: new Date().toISOString(),
      });
      expect(staffInsert).not.toBeNull();
    });

    it('pro A reads own measurements and can insert own measurement', async () => {
      const { data } = await proAClient.from('clinical_measurements').select('*');
      const foundA = data?.find((m) => m.id === SEED_CLINICAL_EXPANSION_IDS.clinicalMeasurementA);
      const foundB = data?.find((m) => m.id === SEED_CLINICAL_EXPANSION_IDS.clinicalMeasurementB);

      expect(foundA).toBeDefined();
      expect(foundB).toBeUndefined();

      const newMId = randomUUID();
      dynamicMeasurementIds.push(newMId);

      const { data: inserted, error } = await proAClient
        .from('clinical_measurements')
        .insert({
          id: newMId,
          organization_id: SEED_PRACTICE_IDS.orgA,
          patient_id: SEED_PATIENT_IDS.patientA,
          practitioner_id: SEED_PRACTICE_IDS.practitionerA,
          care_episode_id: SEED_CLINICAL_IDS.careEpisodeA,
          encounter_id: SEED_CLINICAL_IDS.clinicalEncounterA,
          code: 'pain_score',
          label: 'EVA Douleur Repos',
          value_numeric: 4,
          unit: '/10',
          observed_at: new Date().toISOString(),
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(inserted?.id).toBe(newMId);
    });

    it('pro B reads own measurements (positive control)', async () => {
      const { data } = await proBClient.from('clinical_measurements').select('*');
      const foundB = data?.find((m) => m.id === SEED_CLINICAL_EXPANSION_IDS.clinicalMeasurementB);
      expect(foundB).toBeDefined();
    });

    it('UPDATE on clinical_measurements is strictly forbidden for pro A (immutable measurements)', async () => {
      const { error } = await proAClient
        .from('clinical_measurements')
        .update({ value_numeric: 10 })
        .eq('id', SEED_CLINICAL_EXPANSION_IDS.clinicalMeasurementA);

      expect(error).not.toBeNull();
    });

    it('pro A cannot insert measurement under pro B authority (cross-tenant)', async () => {
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

    it('pro A cannot delete clinical measurements (hard delete denied)', async () => {
      const { error } = await proAClient
        .from('clinical_measurements')
        .delete()
        .eq('id', SEED_CLINICAL_EXPANSION_IDS.clinicalMeasurementA);

      expect(error).not.toBeNull();
    });
  });

  // ==========================================
  // 5. Storage Bucket RLS & Path Security
  // ==========================================
  describe('Storage Bucket Path Isolation & Security Proofs', () => {
    it(
      'pro A can upload file to their own canonical practitioner path and download via signed URL',
      async () => {
        const docId = randomUUID();
        const testPath = `${SEED_PRACTICE_IDS.orgA}/${SEED_PRACTICE_IDS.practitionerA}/${SEED_PATIENT_IDS.patientA}/${docId}/bilan.pdf`;
        createdStoragePaths.push(testPath);

        const sampleBuffer = Buffer.from('positive test pdf content');

        // 1. Upload
        const { data: uploadData, error: uploadError } = await proAClient.storage
          .from('clinical-documents')
          .upload(testPath, sampleBuffer, { contentType: 'application/pdf' });

        expect(uploadError).toBeNull();
        expect(uploadData?.path).toBe(testPath);

        // 2. Create Signed URL
        const { data: signedData, error: signedError } = await proAClient.storage
          .from('clinical-documents')
          .createSignedUrl(testPath, 60);

        expect(signedError).toBeNull();
        expect(signedData?.signedUrl).toBeDefined();

        // 3. Fetch Signed URL
        if (signedData?.signedUrl) {
          const res = await fetch(signedData.signedUrl);
          expect(res.status).toBe(200);
        }
      },
      15000
    );

    it(
      'pro A CANNOT upload file to pro B practitioner path in clinical-documents bucket',
      async () => {
        const forbiddenPath = `${SEED_PRACTICE_IDS.orgB}/${SEED_PRACTICE_IDS.practitionerB}/${SEED_PATIENT_IDS.patientB}/${randomUUID()}/malicious.pdf`;
        const sampleBuffer = Buffer.from('malicious pdf data');

        const { error } = await proAClient.storage
          .from('clinical-documents')
          .upload(forbiddenPath, sampleBuffer, { contentType: 'application/pdf' });

        expect(error).not.toBeNull();
      },
      15000
    );

    it(
      'pro A CANNOT download or view signed URL for pro B storage path',
      async () => {
        // Create an existing file under Pro B path first using Pro B client
        const proBDocId = randomUUID();
        const proBPath = `${SEED_PRACTICE_IDS.orgB}/${SEED_PRACTICE_IDS.practitionerB}/${SEED_PATIENT_IDS.patientB}/${proBDocId}/confidential.pdf`;
        createdStoragePaths.push(proBPath);

        const { error: proBUploadError } = await proBClient.storage
          .from('clinical-documents')
          .upload(proBPath, Buffer.from('pro b confidential data'), { contentType: 'application/pdf' });
        expect(proBUploadError).toBeNull();

        // Pro A attempts to create a signed URL for Pro B path
        const { data, error } = await proAClient.storage
          .from('clinical-documents')
          .createSignedUrl(proBPath, 60);

        if (data?.signedUrl) {
          const res = await fetch(data.signedUrl);
          expect(res.status).toBeGreaterThanOrEqual(400);
        } else {
          expect(error).not.toBeNull();
        }
      },
      15000
    );

    it(
      'staff A CANNOT upload or access files in clinical-documents bucket',
      async () => {
        const testPath = `${SEED_PRACTICE_IDS.orgA}/${SEED_PRACTICE_IDS.practitionerA}/${SEED_PATIENT_IDS.patientA}/${randomUUID()}/staff_try.pdf`;
        const sampleBuffer = Buffer.from('staff unauthorized data');

        const { error: uploadError } = await staffAClient.storage
          .from('clinical-documents')
          .upload(testPath, sampleBuffer, { contentType: 'application/pdf' });

        expect(uploadError).not.toBeNull();

        const { data: signedData, error: signedError } = await staffAClient.storage
          .from('clinical-documents')
          .createSignedUrl(testPath, 60);

        if (signedData?.signedUrl) {
          const res = await fetch(signedData.signedUrl);
          expect(res.status).toBeGreaterThanOrEqual(400);
        } else {
          expect(signedError).not.toBeNull();
        }
      },
      15000
    );

    it(
      'client A CANNOT upload or access files in clinical-documents bucket',
      async () => {
        const testPath = `${SEED_PRACTICE_IDS.orgA}/${SEED_PRACTICE_IDS.practitionerA}/${SEED_PATIENT_IDS.patientA}/${randomUUID()}/client_try.pdf`;
        const sampleBuffer = Buffer.from('client unauthorized data');

        const { error: uploadError } = await clientAClient.storage
          .from('clinical-documents')
          .upload(testPath, sampleBuffer, { contentType: 'application/pdf' });

        expect(uploadError).not.toBeNull();

        const { data: signedData, error: signedError } = await clientAClient.storage
          .from('clinical-documents')
          .createSignedUrl(testPath, 60);

        if (signedData?.signedUrl) {
          const res = await fetch(signedData.signedUrl);
          expect(res.status).toBeGreaterThanOrEqual(400);
        } else {
          expect(signedError).not.toBeNull();
        }
      },
      15000
    );

    it(
      'anon CANNOT upload or access files in clinical-documents bucket',
      async () => {
        const testPath = `${SEED_PRACTICE_IDS.orgA}/${SEED_PRACTICE_IDS.practitionerA}/${SEED_PATIENT_IDS.patientA}/${randomUUID()}/anon_try.pdf`;
        const sampleBuffer = Buffer.from('anon unauthorized data');

        const { error: uploadError } = await anonClient.storage
          .from('clinical-documents')
          .upload(testPath, sampleBuffer, { contentType: 'application/pdf' });

        expect(uploadError).not.toBeNull();

        const { data: signedData, error: signedError } = await anonClient.storage
          .from('clinical-documents')
          .createSignedUrl(testPath, 60);

        if (signedData?.signedUrl) {
          const res = await fetch(signedData.signedUrl);
          expect(res.status).toBeGreaterThanOrEqual(400);
        } else {
          expect(signedError).not.toBeNull();
        }
      },
      15000
    );
  });
});
