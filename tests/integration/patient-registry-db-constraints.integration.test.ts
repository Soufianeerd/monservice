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

describe('Patient Registry Database Integrity Constraints', () => {
  let sql: postgres.Sql;

  const orgA = 'org-patient-test-a';
  const orgB = 'org-patient-test-b';

  beforeAll(async () => {
    sql = postgres(DATABASE_URL);
    await sql`INSERT INTO organizations (id, name, slug, created_at, updated_at) VALUES (${orgA}, 'Patient Test Org A', 'patient-test-a', now(), now()) ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO organizations (id, name, slug, created_at, updated_at) VALUES (${orgB}, 'Patient Test Org B', 'patient-test-b', now(), now()) ON CONFLICT DO NOTHING`;
  });

  afterAll(async () => {
    await sql`DELETE FROM patient_representative_links WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM patient_representatives WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM patient_profiles WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM organizations WHERE id IN (${orgA}, ${orgB})`;
    await sql.end();
  });

  it('rejects duplicate patient_profiles assignment on (id, organization_id) with SQLSTATE 23505', async () => {
    const patientId = randomUUID();
    await sql`
      INSERT INTO patient_profiles (id, organization_id, birth_name, first_birth_name, birth_date, sex)
      VALUES (${patientId}, ${orgA}, 'DUPONT', 'Alice', '1990-05-15', 'female')
    `;

    try {
      await sql`
        INSERT INTO patient_profiles (id, organization_id, birth_name, first_birth_name, birth_date, sex)
        VALUES (${patientId}, ${orgA}, 'DUPONT_BIS', 'Alice', '1990-05-15', 'female')
      `;
      expect.unreachable('Should have thrown unique constraint violation');
    } catch (error: unknown) {
      expect(hasPostgresErrorCode(error)).toBe(true);
      if (hasPostgresErrorCode(error)) {
        expect(error.code).toBe('23505');
      }
    } finally {
      await sql`DELETE FROM patient_profiles WHERE id = ${patientId}`;
    }
  });

  it('allows duplicate civil identity (same birth_name, first_birth_name, birth_date) with different IDs', async () => {
    const patient1Id = randomUUID();
    const patient2Id = randomUUID();

    // Insert patient 1
    await sql`
      INSERT INTO patient_profiles (id, organization_id, birth_name, first_birth_name, birth_date, sex)
      VALUES (${patient1Id}, ${orgA}, 'DUPONT', 'Alice', '1990-05-15', 'female')
    `;

    // Insert patient 2 with identical civil traits but distinct ID
    await sql`
      INSERT INTO patient_profiles (id, organization_id, birth_name, first_birth_name, birth_date, sex)
      VALUES (${patient2Id}, ${orgA}, 'DUPONT', 'Alice', '1990-05-15', 'female')
    `;

    const rows = await sql`
      SELECT id FROM patient_profiles 
      WHERE organization_id = ${orgA} 
        AND birth_name = 'DUPONT' 
        AND first_birth_name = 'Alice' 
        AND birth_date = '1990-05-15'
    `;

    expect(rows).toHaveLength(2);

    // Cleanup
    await sql`DELETE FROM patient_profiles WHERE id IN (${patient1Id}, ${patient2Id})`;
  });

  it('rejects duplicate patient_representative_links assignment with SQLSTATE 23505', async () => {
    const patientId = randomUUID();
    const repId = randomUUID();
    const linkId1 = randomUUID();
    const linkId2 = randomUUID();

    await sql`
      INSERT INTO patient_profiles (id, organization_id, birth_name, first_birth_name, birth_date, sex)
      VALUES (${patientId}, ${orgA}, 'MARTIN', 'Lucas', '2010-04-12', 'male')
    `;
    await sql`
      INSERT INTO patient_representatives (id, organization_id, first_name, last_name)
      VALUES (${repId}, ${orgA}, 'Claire', 'MARTIN')
    `;

    await sql`
      INSERT INTO patient_representative_links (id, organization_id, patient_id, representative_id, relationship)
      VALUES (${linkId1}, ${orgA}, ${patientId}, ${repId}, 'parent')
    `;

    try {
      await sql`
        INSERT INTO patient_representative_links (id, organization_id, patient_id, representative_id, relationship)
        VALUES (${linkId2}, ${orgA}, ${patientId}, ${repId}, 'caregiver')
      `;
      expect.unreachable('Should have thrown duplicate assignment violation');
    } catch (error: unknown) {
      expect(hasPostgresErrorCode(error)).toBe(true);
      if (hasPostgresErrorCode(error)) {
        expect(error.code).toBe('23505');
      }
    } finally {
      await sql`DELETE FROM patient_representative_links WHERE id IN (${linkId1}, ${linkId2})`;
      await sql`DELETE FROM patient_representatives WHERE id = ${repId}`;
      await sql`DELETE FROM patient_profiles WHERE id = ${patientId}`;
    }
  });

  it('rejects multiple active primary contacts for the same patient with SQLSTATE 23505', async () => {
    const patientId = randomUUID();
    const rep1Id = randomUUID();
    const rep2Id = randomUUID();
    const link1 = randomUUID();
    const link2 = randomUUID();

    await sql`
      INSERT INTO patient_profiles (id, organization_id, birth_name, first_birth_name, birth_date, sex)
      VALUES (${patientId}, ${orgA}, 'PETIT', 'Emma', '2015-08-01', 'female')
    `;
    await sql`
      INSERT INTO patient_representatives (id, organization_id, first_name, last_name)
      VALUES 
        (${rep1Id}, ${orgA}, 'Marc', 'PETIT'),
        (${rep2Id}, ${orgA}, 'Julie', 'PETIT')
    `;

    await sql`
      INSERT INTO patient_representative_links (
        id, organization_id, patient_id, representative_id, relationship, is_primary_contact, is_active
      )
      VALUES (${link1}, ${orgA}, ${patientId}, ${rep1Id}, 'parent', true, true)
    `;

    try {
      await sql`
        INSERT INTO patient_representative_links (
          id, organization_id, patient_id, representative_id, relationship, is_primary_contact, is_active
        )
        VALUES (${link2}, ${orgA}, ${patientId}, ${rep2Id}, 'parent', true, true)
      `;
      expect.unreachable('Should have thrown partial unique constraint violation');
    } catch (error: unknown) {
      expect(hasPostgresErrorCode(error)).toBe(true);
      if (hasPostgresErrorCode(error)) {
        expect(error.code).toBe('23505');
      }
    } finally {
      await sql`DELETE FROM patient_representative_links WHERE id IN (${link1}, ${link2})`;
      await sql`DELETE FROM patient_representatives WHERE id IN (${rep1Id}, ${rep2Id})`;
      await sql`DELETE FROM patient_profiles WHERE id = ${patientId}`;
    }
  });

  it('blocks cross-tenant link insertion via composite foreign keys with SQLSTATE 23503', async () => {
    const patientA = randomUUID();
    const repB = randomUUID();
    const linkId = randomUUID();

    await sql`
      INSERT INTO patient_profiles (id, organization_id, birth_name, first_birth_name, birth_date, sex)
      VALUES (${patientA}, ${orgA}, 'LEROY', 'Hugo', '2000-01-01', 'male')
    `;
    await sql`
      INSERT INTO patient_representatives (id, organization_id, first_name, last_name)
      VALUES (${repB}, ${orgB}, 'Sarah', 'LEROY')
    `;

    try {
      // Attempting to link patientA (Org A) with representative B (Org B) inside Org A
      await sql`
        INSERT INTO patient_representative_links (id, organization_id, patient_id, representative_id, relationship)
        VALUES (${linkId}, ${orgA}, ${patientA}, ${repB}, 'parent')
      `;
      expect.unreachable('Should have thrown foreign key violation');
    } catch (error: unknown) {
      expect(hasPostgresErrorCode(error)).toBe(true);
      if (hasPostgresErrorCode(error)) {
        expect(error.code).toBe('23503');
      }
    } finally {
      await sql`DELETE FROM patient_profiles WHERE id = ${patientA}`;
      await sql`DELETE FROM patient_representatives WHERE id = ${repB}`;
    }
  });

  it('rejects invalid sex value in patient_profiles with SQLSTATE 23514', async () => {
    const patientId = randomUUID();
    try {
      await sql`
        INSERT INTO patient_profiles (id, organization_id, birth_name, first_birth_name, birth_date, sex)
        VALUES (${patientId}, ${orgA}, 'TEST', 'InvalidSex', '1990-01-01', 'other_invalid_sex')
      `;
      expect.unreachable('Should have thrown check constraint violation');
    } catch (error: unknown) {
      expect(hasPostgresErrorCode(error)).toBe(true);
      if (hasPostgresErrorCode(error)) {
        expect(error.code).toBe('23514');
      }
    }
  });

  it('rejects invalid relationship in patient_representative_links with SQLSTATE 23514', async () => {
    const patientId = randomUUID();
    const repId = randomUUID();
    const linkId = randomUUID();

    await sql`
      INSERT INTO patient_profiles (id, organization_id, birth_name, first_birth_name, birth_date, sex)
      VALUES (${patientId}, ${orgA}, 'TEST', 'CheckRel', '1990-01-01', 'male')
    `;
    await sql`
      INSERT INTO patient_representatives (id, organization_id, first_name, last_name)
      VALUES (${repId}, ${orgA}, 'Jacques', 'TEST')
    `;

    try {
      await sql`
        INSERT INTO patient_representative_links (id, organization_id, patient_id, representative_id, relationship)
        VALUES (${linkId}, ${orgA}, ${patientId}, ${repId}, 'invalid_relation_code')
      `;
      expect.unreachable('Should have thrown check constraint violation');
    } catch (error: unknown) {
      expect(hasPostgresErrorCode(error)).toBe(true);
      if (hasPostgresErrorCode(error)) {
        expect(error.code).toBe('23514');
      }
    } finally {
      await sql`DELETE FROM patient_representatives WHERE id = ${repId}`;
      await sql`DELETE FROM patient_profiles WHERE id = ${patientId}`;
    }
  });
});
