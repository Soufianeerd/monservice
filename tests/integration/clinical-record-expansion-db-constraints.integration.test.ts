import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import postgres from 'postgres';
import { randomUUID } from 'crypto';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres';

function hasPostgresErrorCode(error: unknown): error is { code: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof Reflect.get(error, 'code') === 'string'
  );
}

describe('Clinical Records Expansion Database Integrity & State Machines (Session 12)', () => {
  let sql: postgres.Sql;

  const orgA = 'org-exp-test-a';
  const orgB = 'org-exp-test-b';

  const userA = 'user-exp-pro-a';
  const userB = 'user-exp-pro-b';

  const locA = 'loc-exp-test-a';
  const locB = 'loc-exp-test-b';

  const pracA = 'prac-exp-test-a';
  const pracB = 'prac-exp-test-b';

  const patientA = 'pat-exp-test-a';
  const patientB = 'pat-exp-test-b';

  const episodeA = 'ep-exp-test-a';
  const episodeB = 'ep-exp-test-b';

  const encounterA = 'enc-exp-test-a';
  const encounterB = 'enc-exp-test-b';

  beforeAll(async () => {
    sql = postgres(DATABASE_URL);

    // Setup Orgs
    await sql`INSERT INTO organizations (id, name, slug, sector, profession, created_at, updated_at) VALUES (${orgA}, 'Expansion Org A', 'exp-org-a', 'health', 'physiotherapist', now(), now()) ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO organizations (id, name, slug, sector, profession, created_at, updated_at) VALUES (${orgB}, 'Expansion Org B', 'exp-org-b', 'health', 'osteopath', now(), now()) ON CONFLICT DO NOTHING`;

    // Setup Users
    await sql`INSERT INTO users (id, email, organization_id, profile_type, created_at, updated_at) VALUES (${userA}, 'proA@exp.test', ${orgA}, 'professional', now(), now()) ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO users (id, email, organization_id, profile_type, created_at, updated_at) VALUES (${userB}, 'proB@exp.test', ${orgB}, 'professional', now(), now()) ON CONFLICT DO NOTHING`;

    // Setup Locations
    await sql`INSERT INTO practice_locations (id, organization_id, name, timezone, created_at, updated_at) VALUES (${locA}, ${orgA}, 'Cabinet Exp A', 'Europe/Paris', now(), now()) ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO practice_locations (id, organization_id, name, timezone, created_at, updated_at) VALUES (${locB}, ${orgB}, 'Cabinet Exp B', 'Europe/Paris', now(), now()) ON CONFLICT DO NOTHING`;

    // Setup Practitioners
    await sql`INSERT INTO practice_practitioners (id, organization_id, user_id, display_name, profession, created_at, updated_at) VALUES (${pracA}, ${orgA}, ${userA}, 'Dr Exp A', 'physiotherapist', now(), now()) ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO practice_practitioners (id, organization_id, user_id, display_name, profession, created_at, updated_at) VALUES (${pracB}, ${orgB}, ${userB}, 'Dr Exp B', 'osteopath', now(), now()) ON CONFLICT DO NOTHING`;

    // Setup Patients
    await sql`INSERT INTO patient_profiles (id, organization_id, birth_name, first_birth_name, birth_date, sex, is_active, created_at, updated_at) VALUES (${patientA}, ${orgA}, 'DUPONT', 'Alex', '1992-05-10', 'male', true, now(), now()) ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO patient_profiles (id, organization_id, birth_name, first_birth_name, birth_date, sex, is_active, created_at, updated_at) VALUES (${patientB}, ${orgB}, 'MARTIN', 'Chloe', '1995-08-20', 'female', true, now(), now()) ON CONFLICT DO NOTHING`;

    // Setup Episodes & Encounters
    await sql`INSERT INTO care_episodes (id, organization_id, patient_id, practitioner_id, title, status, started_at, created_at, updated_at) VALUES (${episodeA}, ${orgA}, ${patientA}, ${pracA}, 'Épisode A', 'active', now(), now(), now()) ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO care_episodes (id, organization_id, patient_id, practitioner_id, title, status, started_at, created_at, updated_at) VALUES (${episodeB}, ${orgB}, ${patientB}, ${pracB}, 'Épisode B', 'active', now(), now(), now()) ON CONFLICT DO NOTHING`;

    await sql`INSERT INTO clinical_encounters (id, organization_id, care_episode_id, patient_id, practitioner_id, occurred_at, created_at, updated_at) VALUES (${encounterA}, ${orgA}, ${episodeA}, ${patientA}, ${pracA}, now() - interval '1 hour', now(), now()) ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO clinical_encounters (id, organization_id, care_episode_id, patient_id, practitioner_id, occurred_at, created_at, updated_at) VALUES (${encounterB}, ${orgB}, ${episodeB}, ${patientB}, ${pracB}, now() - interval '1 hour', now(), now()) ON CONFLICT DO NOTHING`;
  });

  afterAll(async () => {
    // Cleanup in reverse dependency order
    await sql`DELETE FROM clinical_measurements WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM clinical_form_responses WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM clinical_form_templates WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM clinical_documents WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM clinical_notes WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM clinical_encounters WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM care_episodes WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM patient_profiles WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM practice_practitioners WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM practice_locations WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM users WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM organizations WHERE id IN (${orgA}, ${orgB})`;
    await sql.end();
  });

  // ==========================================
  // 1. Clinical Documents Constraints & Triggers
  // ==========================================
  describe('Clinical Documents DB Integrity', () => {
    it('successfully inserts a valid clinical document', async () => {
      const docId = randomUUID();
      const rows = await sql`
        INSERT INTO clinical_documents (
          id, organization_id, patient_id, practitioner_id, care_episode_id, encounter_id,
          title, category, file_name, mime_type, size_bytes, storage_path, is_archived
        ) VALUES (
          ${docId}, ${orgA}, ${patientA}, ${pracA}, ${episodeA}, ${encounterA},
          'Ordonnance de radiologie', 'report', 'radio.pdf', 'application/pdf', 102400, 'org-a/radio.pdf', false
        ) RETURNING id, title, category
      `;
      expect(rows).toHaveLength(1);
      expect(rows[0].title).toBe('Ordonnance de radiologie');
      expect(rows[0].category).toBe('report');
    });

    it('rejects invalid category with check violation (23514)', async () => {
      const docId = randomUUID();
      try {
        await sql`
          INSERT INTO clinical_documents (
            id, organization_id, patient_id, practitioner_id,
            title, category, file_name, mime_type, size_bytes, storage_path
          ) VALUES (
            ${docId}, ${orgA}, ${patientA}, ${pracA},
            'Titre', 'invalid_cat', 'file.pdf', 'application/pdf', 1024, 'path'
          )
        `;
        expect.fail('Should have failed check constraint');
      } catch (err: unknown) {
        expect(hasPostgresErrorCode(err)).toBe(true);
        if (hasPostgresErrorCode(err)) {
          expect(err.code).toBe('23514');
        }
      }
    });

    it('rejects unsupported mime type with check violation (23514)', async () => {
      const docId = randomUUID();
      try {
        await sql`
          INSERT INTO clinical_documents (
            id, organization_id, patient_id, practitioner_id,
            title, category, file_name, mime_type, size_bytes, storage_path
          ) VALUES (
            ${docId}, ${orgA}, ${patientA}, ${pracA},
            'Titre', 'other', 'script.exe', 'application/x-msdownload', 1024, 'path'
          )
        `;
        expect.fail('Should have failed mime check');
      } catch (err: unknown) {
        expect(hasPostgresErrorCode(err)).toBe(true);
        if (hasPostgresErrorCode(err)) {
          expect(err.code).toBe('23514');
        }
      }
    });

    it('rejects size > 10 MiB with check violation (23514)', async () => {
      const docId = randomUUID();
      try {
        await sql`
          INSERT INTO clinical_documents (
            id, organization_id, patient_id, practitioner_id,
            title, category, file_name, mime_type, size_bytes, storage_path
          ) VALUES (
            ${docId}, ${orgA}, ${patientA}, ${pracA},
            'Titre', 'other', 'huge.pdf', 'application/pdf', 10485761, 'path'
          )
        `;
        expect.fail('Should have failed size check');
      } catch (err: unknown) {
        expect(hasPostgresErrorCode(err)).toBe(true);
        if (hasPostgresErrorCode(err)) {
          expect(err.code).toBe('23514');
        }
      }
    });

    it('enforces immutability of structural fields via trigger (23514)', async () => {
      const docId = randomUUID();
      await sql`
        INSERT INTO clinical_documents (
          id, organization_id, patient_id, practitioner_id,
          title, category, file_name, mime_type, size_bytes, storage_path
        ) VALUES (
          ${docId}, ${orgA}, ${patientA}, ${pracA},
          'Doc Original', 'prescription', 'presc.pdf', 'application/pdf', 1024, 'path/presc.pdf'
        )
      `;

      // Updating title, category or is_archived is allowed
      const updated = await sql`
        UPDATE clinical_documents SET title = 'Doc Renommé', is_archived = true WHERE id = ${docId} RETURNING title, is_archived
      `;
      expect(updated[0].title).toBe('Doc Renommé');
      expect(updated[0].is_archived).toBe(true);

      // Attempting to mutate storage_path or file_name must trigger SQLSTATE 23514
      try {
        await sql`UPDATE clinical_documents SET storage_path = 'hacked/path.pdf' WHERE id = ${docId}`;
        expect.fail('Trigger should block mutation of storage_path');
      } catch (err: unknown) {
        expect(hasPostgresErrorCode(err)).toBe(true);
        if (hasPostgresErrorCode(err)) {
          expect(err.code).toBe('23514');
        }
      }

      try {
        await sql`UPDATE clinical_documents SET file_name = 'new_name.pdf' WHERE id = ${docId}`;
        expect.fail('Trigger should block mutation of file_name');
      } catch (err: unknown) {
        expect(hasPostgresErrorCode(err)).toBe(true);
        if (hasPostgresErrorCode(err)) {
          expect(err.code).toBe('23514');
        }
      }
    });

    it('rejects cross-tenant composite FK violation (23503)', async () => {
      const docId = randomUUID();
      try {
        // Patient from Org B attached to Org A practitioner
        await sql`
          INSERT INTO clinical_documents (
            id, organization_id, patient_id, practitioner_id,
            title, category, file_name, mime_type, size_bytes, storage_path
          ) VALUES (
            ${docId}, ${orgA}, ${patientB}, ${pracA},
            'Cross tenant doc', 'other', 'test.pdf', 'application/pdf', 1024, 'path'
          )
        `;
        expect.fail('Should fail foreign key');
      } catch (err: unknown) {
        expect(hasPostgresErrorCode(err)).toBe(true);
        if (hasPostgresErrorCode(err)) {
          expect(err.code).toBe('23503');
        }
      }
    });
  });

  // ==========================================
  // 2. Clinical Form Templates & Responses
  // ==========================================
  describe('Clinical Form Templates & Responses DB Integrity', () => {
    const templateId = randomUUID();

    it('inserts valid clinical form template', async () => {
      const rows = await sql`
        INSERT INTO clinical_form_templates (
          id, organization_id, practitioner_id, name, kind, description, schema_json, is_active
        ) VALUES (
          ${templateId}, ${orgA}, ${pracA}, 'Bilan Initial Kiné', 'assessment', 'Description',
          '{"fields": [{"id": "score", "label": "Score", "type": "number", "required": true}]}'::jsonb, true
        ) RETURNING id, name, kind
      `;
      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe('Bilan Initial Kiné');
      expect(rows[0].kind).toBe('assessment');
    });

    it('rejects invalid form template kind (23514)', async () => {
      try {
        await sql`
          INSERT INTO clinical_form_templates (
            id, organization_id, practitioner_id, name, kind, schema_json
          ) VALUES (
            ${randomUUID()}, ${orgA}, ${pracA}, 'Invalid Template', 'invalid_kind', '{}'::jsonb
          )
        `;
        expect.fail('Should have failed kind check');
      } catch (err: unknown) {
        expect(hasPostgresErrorCode(err)).toBe(true);
        if (hasPostgresErrorCode(err)) {
          expect(err.code).toBe('23514');
        }
      }
    });

    it('inserts form response in draft mode', async () => {
      const responseId = randomUUID();
      const rows = await sql`
        INSERT INTO clinical_form_responses (
          id, organization_id, template_id, patient_id, practitioner_id, care_episode_id, encounter_id,
          answers_json, status
        ) VALUES (
          ${responseId}, ${orgA}, ${templateId}, ${patientA}, ${pracA}, ${episodeA}, ${encounterA},
          '{"score": 8}'::jsonb, 'draft'
        ) RETURNING id, status
      `;
      expect(rows).toHaveLength(1);
      expect(rows[0].status).toBe('draft');
    });

    it('allows draft -> finalized transition and records finalized_at timestamp', async () => {
      const responseId = randomUUID();
      await sql`
        INSERT INTO clinical_form_responses (
          id, organization_id, template_id, patient_id, practitioner_id, answers_json, status
        ) VALUES (
          ${responseId}, ${orgA}, ${templateId}, ${patientA}, ${pracA}, '{"score": 5}'::jsonb, 'draft'
        )
      `;

      const finalized = await sql`
        UPDATE clinical_form_responses
        SET status = 'finalized', answers_json = '{"score": 10}'::jsonb
        WHERE id = ${responseId}
        RETURNING status, finalized_at
      `;
      expect(finalized[0].status).toBe('finalized');
      expect(finalized[0].finalized_at).not.toBeNull();
    });

    it('prevents modifying finalized form response via trigger (23514)', async () => {
      const responseId = randomUUID();
      await sql`
        INSERT INTO clinical_form_responses (
          id, organization_id, template_id, patient_id, practitioner_id, answers_json, status
        ) VALUES (
          ${responseId}, ${orgA}, ${templateId}, ${patientA}, ${pracA}, '{"score": 5}'::jsonb, 'draft'
        )
      `;

      // Finalize
      await sql`UPDATE clinical_form_responses SET status = 'finalized' WHERE id = ${responseId}`;

      // Try mutating answers
      try {
        await sql`
          UPDATE clinical_form_responses SET answers_json = '{"score": 99}'::jsonb WHERE id = ${responseId}
        `;
        expect.fail('Should prevent modifying finalized response');
      } catch (err: unknown) {
        expect(hasPostgresErrorCode(err)).toBe(true);
        if (hasPostgresErrorCode(err)) {
          expect(err.code).toBe('23514');
        }
      }

      // Try moving back to draft
      try {
        await sql`
          UPDATE clinical_form_responses SET status = 'draft' WHERE id = ${responseId}
        `;
        expect.fail('Should prevent moving back to draft');
      } catch (err: unknown) {
        expect(hasPostgresErrorCode(err)).toBe(true);
        if (hasPostgresErrorCode(err)) {
          expect(err.code).toBe('23514');
        }
      }
    });
  });

  // ==========================================
  // 3. Clinical Measurements
  // ==========================================
  describe('Clinical Measurements DB Integrity', () => {
    it('inserts valid numeric measurement', async () => {
      const mId = randomUUID();
      const rows = await sql`
        INSERT INTO clinical_measurements (
          id, organization_id, patient_id, practitioner_id, care_episode_id, encounter_id,
          code, label, value_numeric, value_text, unit, observed_at
        ) VALUES (
          ${mId}, ${orgA}, ${patientA}, ${pracA}, ${episodeA}, ${encounterA},
          'pain_score', 'Score EVA', 7.5, NULL, '/10', now() - interval '10 minutes'
        ) RETURNING id, code, value_numeric, value_text, unit
      `;
      expect(rows).toHaveLength(1);
      expect(rows[0].code).toBe('pain_score');
      expect(Number(rows[0].value_numeric)).toBe(7.5);
      expect(rows[0].value_text).toBeNull();
    });

    it('inserts valid text observation', async () => {
      const mId = randomUUID();
      const rows = await sql`
        INSERT INTO clinical_measurements (
          id, organization_id, patient_id, practitioner_id,
          code, label, value_numeric, value_text, unit, observed_at
        ) VALUES (
          ${mId}, ${orgA}, ${patientA}, ${pracA},
          'posture', 'Observation posturale', NULL, 'Cyphose dorsale marquée', NULL, now() - interval '5 minutes'
        ) RETURNING id, code, value_text
      `;
      expect(rows).toHaveLength(1);
      expect(rows[0].value_text).toBe('Cyphose dorsale marquée');
    });

    it('enforces XOR check: rejects both numeric and text provided (23514)', async () => {
      const mId = randomUUID();
      try {
        await sql`
          INSERT INTO clinical_measurements (
            id, organization_id, patient_id, practitioner_id,
            code, label, value_numeric, value_text, observed_at
          ) VALUES (
            ${mId}, ${orgA}, ${patientA}, ${pracA},
            'weight', 'Poids', 75, 'soixante-quinze', now() - interval '1 minute'
          )
        `;
        expect.fail('Should have failed XOR check');
      } catch (err: unknown) {
        expect(hasPostgresErrorCode(err)).toBe(true);
        if (hasPostgresErrorCode(err)) {
          expect(err.code).toBe('23514');
        }
      }
    });

    it('enforces XOR check: rejects neither numeric nor text provided (23514)', async () => {
      const mId = randomUUID();
      try {
        await sql`
          INSERT INTO clinical_measurements (
            id, organization_id, patient_id, practitioner_id,
            code, label, value_numeric, value_text, observed_at
          ) VALUES (
            ${mId}, ${orgA}, ${patientA}, ${pracA},
            'weight', 'Poids', NULL, NULL, now() - interval '1 minute'
          )
        `;
        expect.fail('Should have failed XOR check');
      } catch (err: unknown) {
        expect(hasPostgresErrorCode(err)).toBe(true);
        if (hasPostgresErrorCode(err)) {
          expect(err.code).toBe('23514');
        }
      }
    });

    it('prevents future observed_at via trigger (23514)', async () => {
      const mId = randomUUID();
      try {
        await sql`
          INSERT INTO clinical_measurements (
            id, organization_id, patient_id, practitioner_id,
            code, label, value_numeric, value_text, observed_at
          ) VALUES (
            ${mId}, ${orgA}, ${patientA}, ${pracA},
            'pain_score', 'Douleur', 5, NULL, now() + interval '1 day'
          )
        `;
        expect.fail('Should block future observed_at');
      } catch (err: unknown) {
        expect(hasPostgresErrorCode(err)).toBe(true);
        if (hasPostgresErrorCode(err)) {
          expect(err.code).toBe('23514');
        }
      }
    });
  });
});
