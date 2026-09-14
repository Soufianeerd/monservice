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

describe('Patient Portal, Billing Bridge & Communication Database Constraints (Session 14)', () => {
  let sql: postgres.Sql;

  const orgA = 'org-s14-db-a';
  const orgB = 'org-s14-db-b';
  const userProA = 'user-s14-pro-a';
  const userProB = 'user-s14-pro-b';
  const userPatientA = 'user-s14-pat-a';
  const userPatientB = 'user-s14-pat-b';
  const pracA = 'prac-s14-db-a';
  const pracB = 'prac-s14-db-b';
  const patientA = 'pat-s14-db-a';
  const patientB = 'pat-s14-db-b';
  const formTemplateA = 'tpl-s14-db-a';
  const appointmentA = 'apt-s14-db-a';

  beforeAll(async () => {
    sql = postgres(DATABASE_URL);

    // Setup Orgs
    await sql`INSERT INTO organizations (id, name, slug, sector, profession, created_at, updated_at) VALUES (${orgA}, 'Cabinet S14 A', 's14-org-a', 'health', 'physiotherapist', now(), now()) ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO organizations (id, name, slug, sector, profession, created_at, updated_at) VALUES (${orgB}, 'Cabinet S14 B', 's14-org-b', 'health', 'osteopath', now(), now()) ON CONFLICT DO NOTHING`;

    // Setup Users
    await sql`INSERT INTO users (id, email, organization_id, profile_type, created_at, updated_at) VALUES (${userProA}, 'proA@s14.test', ${orgA}, 'professional', now(), now()) ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO users (id, email, organization_id, profile_type, created_at, updated_at) VALUES (${userProB}, 'proB@s14.test', ${orgB}, 'professional', now(), now()) ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO users (id, email, organization_id, profile_type, created_at, updated_at) VALUES (${userPatientA}, 'patA@s14.test', ${orgA}, 'client', now(), now()) ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO users (id, email, organization_id, profile_type, created_at, updated_at) VALUES (${userPatientB}, 'patB@s14.test', ${orgB}, 'client', now(), now()) ON CONFLICT DO NOTHING`;

    // Setup Practitioners
    await sql`INSERT INTO practice_practitioners (id, organization_id, user_id, display_name, profession, created_at, updated_at) VALUES (${pracA}, ${orgA}, ${userProA}, 'Dr S14 A', 'physiotherapist', now(), now()) ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO practice_practitioners (id, organization_id, user_id, display_name, profession, created_at, updated_at) VALUES (${pracB}, ${orgB}, ${userProB}, 'Dr S14 B', 'osteopath', now(), now()) ON CONFLICT DO NOTHING`;

    // Setup Patients
    await sql`INSERT INTO patient_profiles (id, organization_id, first_birth_name, used_name, birth_date, email, phone, created_at, updated_at) VALUES (${patientA}, ${orgA}, 'Jean', 'Dupont', '1990-01-01', 'patA@s14.test', '0600000001', now(), now()) ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO patient_profiles (id, organization_id, first_birth_name, used_name, birth_date, email, phone, created_at, updated_at) VALUES (${patientB}, ${orgB}, 'Marie', 'Curie', '1992-02-02', 'patB@s14.test', '0600000002', now(), now()) ON CONFLICT DO NOTHING`;

    // Setup Form Template
    await sql`INSERT INTO clinical_form_templates (id, organization_id, title, category, schema_definition, is_system, is_active, created_at, updated_at) VALUES (${formTemplateA}, ${orgA}, 'Bilan Initial', 'intake', '{"version":1,"fields":[]}', false, true, now(), now()) ON CONFLICT DO NOTHING`;

    // Setup Appointment
    await sql`INSERT INTO appointments (id, organization_id, practitioner_id, patient_id, start_time, end_time, status, created_at, updated_at) VALUES (${appointmentA}, ${orgA}, ${pracA}, ${patientA}, now() + interval '24 hours', now() + interval '25 hours', 'confirmed', now(), now()) ON CONFLICT DO NOTHING`;
  });

  afterAll(async () => {
    // Cleanup in reverse dependency order
    await sql`DELETE FROM appointment_reminders WHERE appointment_id = ${appointmentA}`;
    await sql`DELETE FROM appointments WHERE id = ${appointmentA}`;
    await sql`DELETE FROM messages WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM patient_billing_links WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM patient_questionnaire_assignments WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM patient_portal_access WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM clinical_form_templates WHERE id = ${formTemplateA}`;
    await sql`DELETE FROM patient_profiles WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM practice_practitioners WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM users WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM organizations WHERE id IN (${orgA}, ${orgB})`;
    await sql.end();
  });

  describe('patient_portal_access constraints', () => {
    it('enforces foreign key on organization_id', async () => {
      try {
        await sql`INSERT INTO patient_portal_access (id, organization_id, patient_id, user_id, status, created_at, updated_at) VALUES (${randomUUID()}, 'non-existent-org', ${patientA}, ${userPatientA}, 'active', now(), now())`;
        expect.unreachable('Should have violated foreign key');
      } catch (err) {
        expect(hasPostgresErrorCode(err) && err.code === '23503').toBe(true);
      }
    });

    it('enforces foreign key on patient_id', async () => {
      try {
        await sql`INSERT INTO patient_portal_access (id, organization_id, patient_id, user_id, status, created_at, updated_at) VALUES (${randomUUID()}, ${orgA}, 'non-existent-pat', ${userPatientA}, 'active', now(), now())`;
        expect.unreachable('Should have violated foreign key');
      } catch (err) {
        expect(hasPostgresErrorCode(err) && err.code === '23503').toBe(true);
      }
    });

    it('enforces status check constraint', async () => {
      try {
        await sql`INSERT INTO patient_portal_access (id, organization_id, patient_id, user_id, status, created_at, updated_at) VALUES (${randomUUID()}, ${orgA}, ${patientA}, ${userPatientA}, 'invalid_status', now(), now())`;
        expect.unreachable('Should have violated status constraint');
      } catch (err) {
        expect(hasPostgresErrorCode(err) && (err.code === '23514' || err.code === '22P02')).toBe(true);
      }
    });

    it('allows valid portal access record', async () => {
      const accessId = randomUUID();
      await sql`INSERT INTO patient_portal_access (id, organization_id, patient_id, user_id, status, invited_email, created_at, updated_at) VALUES (${accessId}, ${orgA}, ${patientA}, ${userPatientA}, 'active', 'patA@s14.test', now(), now())`;
      const [record] = await sql`SELECT * FROM patient_portal_access WHERE id = ${accessId}`;
      expect(record.status).toBe('active');
      await sql`DELETE FROM patient_portal_access WHERE id = ${accessId}`;
    });
  });

  describe('patient_questionnaire_assignments constraints', () => {
    it('enforces status check constraint on assignments', async () => {
      try {
        await sql`INSERT INTO patient_questionnaire_assignments (id, organization_id, patient_id, template_id, assigned_by_practitioner_id, status, created_at, updated_at) VALUES (${randomUUID()}, ${orgA}, ${patientA}, ${formTemplateA}, ${pracA}, 'bad_status', now(), now())`;
        expect.unreachable('Should have violated status constraint');
      } catch (err) {
        expect(hasPostgresErrorCode(err) && (err.code === '23514' || err.code === '22P02')).toBe(true);
      }
    });

    it('allows lifecycle progression pending -> in_progress -> completed', async () => {
      const assignId = randomUUID();
      await sql`INSERT INTO patient_questionnaire_assignments (id, organization_id, patient_id, template_id, assigned_by_practitioner_id, status, created_at, updated_at) VALUES (${assignId}, ${orgA}, ${patientA}, ${formTemplateA}, ${pracA}, 'pending', now(), now())`;
      
      await sql`UPDATE patient_questionnaire_assignments SET status = 'in_progress', draft_responses = '{"q1":"draft"}' WHERE id = ${assignId}`;
      const [inProgress] = await sql`SELECT * FROM patient_questionnaire_assignments WHERE id = ${assignId}`;
      expect(inProgress.status).toBe('in_progress');

      await sql`UPDATE patient_questionnaire_assignments SET status = 'completed', submitted_at = now() WHERE id = ${assignId}`;
      const [completed] = await sql`SELECT * FROM patient_questionnaire_assignments WHERE id = ${assignId}`;
      expect(completed.status).toBe('completed');
      expect(completed.submitted_at).not.toBeNull();

      await sql`DELETE FROM patient_questionnaire_assignments WHERE id = ${assignId}`;
    });
  });

  describe('appointment_reminders unique constraint & idempotency', () => {
    it('enforces uniqueness on (appointment_id, offset_minutes, channel)', async () => {
      const rem1 = randomUUID();
      const rem2 = randomUUID();

      await sql`INSERT INTO appointment_reminders (id, appointment_id, organization_id, offset_minutes, channel, scheduled_for, status, created_at, updated_at) VALUES (${rem1}, ${appointmentA}, ${orgA}, 1440, 'email', now() + interval '24 hours', 'pending', now(), now())`;

      try {
        await sql`INSERT INTO appointment_reminders (id, appointment_id, organization_id, offset_minutes, channel, scheduled_for, status, created_at, updated_at) VALUES (${rem2}, ${appointmentA}, ${orgA}, 1440, 'email', now() + interval '24 hours', 'pending', now(), now())`;
        expect.unreachable('Should have failed duplicate reminder');
      } catch (err) {
        expect(hasPostgresErrorCode(err) && err.code === '23505').toBe(true);
      } finally {
        await sql`DELETE FROM appointment_reminders WHERE id = ${rem1}`;
      }
    });
  });

  describe('patient_billing_links uniqueness & constraints', () => {
    it('enforces unique link between patient_profile and organization', async () => {
      const clientId1 = randomUUID();
      const clientId2 = randomUUID();
      const link1 = randomUUID();
      const link2 = randomUUID();

      await sql`INSERT INTO clients (id, organization_id, name, email, created_at, updated_at) VALUES (${clientId1}, ${orgA}, 'Jean Dupont', 'patA@s14.test', now(), now())`;
      await sql`INSERT INTO clients (id, organization_id, name, email, created_at, updated_at) VALUES (${clientId2}, ${orgA}, 'Jean Dupont 2', 'patA@s14.test', now(), now())`;

      await sql`INSERT INTO patient_billing_links (id, organization_id, patient_id, client_id, status, created_at, updated_at) VALUES (${link1}, ${orgA}, ${patientA}, ${clientId1}, 'active', now(), now())`;

      try {
        await sql`INSERT INTO patient_billing_links (id, organization_id, patient_id, client_id, status, created_at, updated_at) VALUES (${link2}, ${orgA}, ${patientA}, ${clientId2}, 'active', now(), now())`;
        expect.unreachable('Should have failed unique patient link');
      } catch (err) {
        expect(hasPostgresErrorCode(err) && err.code === '23505').toBe(true);
      } finally {
        await sql`DELETE FROM patient_billing_links WHERE id = ${link1}`;
        await sql`DELETE FROM clients WHERE id IN (${clientId1}, ${clientId2})`;
      }
    });
  });
});
