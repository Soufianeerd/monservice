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

    // Cleanup Storage test objects via SQL
    if (createdStoragePaths.length > 0) {
      await sql`DELETE FROM storage.objects WHERE bucket_id = 'clinical-documents' AND name IN ${sql(createdStoragePaths)}`;
    }

    await sql.end();
  });

  // ==========================================
  // 1. Clinical Documents Table RLS
  // ==========================================
  describe('Clinical Documents Table RLS', () => {
    it('anon cannot read clinical documents', async () => {
      const { data } = await anonClient.from('clinical_documents').select('*');
      expect(data).toBeNull();
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

    it('pro B reads only their own clinical documents, never pro A', async () => {
      const { data, error } = await proBClient.from('clinical_documents').select('*');
      expect(error).toBeNull();
      expect(data).not.toBeNull();

      const foundB = data?.find((d) => d.id === SEED_CLINICAL_EXPANSION_IDS.clinicalDocumentB);
      expect(foundB).toBeDefined();

      const foundA = data?.find((d) => d.id === SEED_CLINICAL_EXPANSION_IDS.clinicalDocumentA);
      expect(foundA).toBeUndefined();
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

    it('client A cannot insert clinical document', async () => {
      const { error } = await clientAClient.from('clinical_documents').insert({
        id: randomUUID(),
        organization_id: SEED_PRACTICE_IDS.orgA,
        patient_id: SEED_PATIENT_IDS.patientA,
        practitioner_id: SEED_PRACTICE_IDS.practitionerA,
        title: 'Hacked Doc',
        category: 'other',
        file_name: 'hacked.pdf',
        mime_type: 'application/pdf',
        size_bytes: 1024,
        storage_path: 'path',
      });
      expect(error).not.toBeNull();
    });

    it('staff A cannot insert clinical document', async () => {
      const { error } = await staffAClient.from('clinical_documents').insert({
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
      expect(error).not.toBeNull();
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

    it('client A and staff A cannot read clinical form templates', async () => {
      const { data: clientData } = await clientAClient.from('clinical_form_templates').select('*');
      expect(clientData).toHaveLength(0);

      const { data: staffData } = await staffAClient.from('clinical_form_templates').select('*');
      expect(staffData).toHaveLength(0);
    });

    it('pro A reads their own form responses, never pro B responses', async () => {
      const { data } = await proAClient.from('clinical_form_responses').select('*');
      const foundA = data?.find((r) => r.id === SEED_CLINICAL_EXPANSION_IDS.clinicalFormResponseA);
      const foundB = data?.find((r) => r.id === SEED_CLINICAL_EXPANSION_IDS.clinicalFormResponseB);

      expect(foundA).toBeDefined();
      expect(foundB).toBeUndefined();
    });

    it('client A and staff A cannot read clinical form responses', async () => {
      const { data: clientData } = await clientAClient.from('clinical_form_responses').select('*');
      expect(clientData).toHaveLength(0);

      const { data: staffData } = await staffAClient.from('clinical_form_responses').select('*');
      expect(staffData).toHaveLength(0);
    });

    it('pro A cannot update pro B form response', async () => {
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
    });

    it('pro A cannot delete clinical form responses (hard delete denied)', async () => {
      const { error } = await proAClient
        .from('clinical_form_responses')
        .delete()
        .eq('id', SEED_CLINICAL_EXPANSION_IDS.clinicalFormResponseA);

      expect(error).not.toBeNull();
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

    it('client A and staff A cannot read clinical measurements', async () => {
      const { data: clientData } = await clientAClient.from('clinical_measurements').select('*');
      expect(clientData).toHaveLength(0);

      const { data: staffData } = await staffAClient.from('clinical_measurements').select('*');
      expect(staffData).toHaveLength(0);
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

    it('pro A cannot delete clinical measurements (hard delete denied)', async () => {
      const { error } = await proAClient
        .from('clinical_measurements')
        .delete()
        .eq('id', SEED_CLINICAL_EXPANSION_IDS.clinicalMeasurementA);

      expect(error).not.toBeNull();
    });
  });

  // ==========================================
  // 4. Storage Bucket RLS & Path Security
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
