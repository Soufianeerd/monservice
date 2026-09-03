import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import postgres from 'postgres';
import { randomUUID } from 'crypto';
import { SEED_PRACTICE_IDS, SEED_PATIENT_IDS } from '../../scripts/e2e/seed-local';

describe('Patient Registry DB Constraints Integration', () => {
  const dbUrl = process.env.DATABASE_URL;
  let sql: ReturnType<typeof postgres>;

  beforeAll(() => {
    if (dbUrl) {
      sql = postgres(dbUrl);
    }
  });

  afterAll(async () => {
    if (sql) {
      await sql.end();
    }
  });

  it('rejects duplicate patient_profiles assignment on (id, organization_id)', async () => {
    if (!sql) return;

    let threw = false;
    try {
      await sql`
        INSERT INTO patient_profiles (id, organization_id, birth_name, first_birth_name, birth_date, sex)
        VALUES (${SEED_PATIENT_IDS.patientA}, ${SEED_PRACTICE_IDS.orgA}, 'DUPONT', 'Alice', '1990-05-15', 'female')
      `;
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  it('rejects duplicate patient_representative_links assignment on (organization_id, patient_id, representative_id)', async () => {
    if (!sql) return;

    let threw = false;
    try {
      await sql`
        INSERT INTO patient_representative_links (id, organization_id, patient_id, representative_id, relationship)
        VALUES (${randomUUID()}, ${SEED_PRACTICE_IDS.orgA}, ${SEED_PATIENT_IDS.patientA}, ${SEED_PATIENT_IDS.representativeA}, 'caregiver')
      `;
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  it('rejects multiple active primary contacts for the same patient in an organization', async () => {
    if (!sql) return;

    // Create a second representative in Org A
    const rep2Id = randomUUID();
    await sql`
      INSERT INTO patient_representatives (id, organization_id, first_name, last_name)
      VALUES (${rep2Id}, ${SEED_PRACTICE_IDS.orgA}, 'Jean', 'DUPONT')
    `;

    // Attempt to insert a second active primary contact for patientA
    let threw = false;
    try {
      await sql`
        INSERT INTO patient_representative_links (
          id, organization_id, patient_id, representative_id, relationship, is_primary_contact, is_active
        )
        VALUES (
          ${randomUUID()}, ${SEED_PRACTICE_IDS.orgA}, ${SEED_PATIENT_IDS.patientA}, ${rep2Id}, 'legal_guardian', true, true
        )
      `;
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  it('blocks cross-tenant link insertion via composite foreign keys', async () => {
    if (!sql) return;

    // Attempt to link patientA (Org A) to representativeB (Org B) in Org A
    let threw = false;
    try {
      await sql`
        INSERT INTO patient_representative_links (id, organization_id, patient_id, representative_id, relationship)
        VALUES (${randomUUID()}, ${SEED_PRACTICE_IDS.orgA}, ${SEED_PATIENT_IDS.patientA}, ${SEED_PATIENT_IDS.representativeB}, 'parent')
      `;
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  it('rejects invalid sex value in patient_profiles via CHECK constraint', async () => {
    if (!sql) return;

    let threw = false;
    try {
      await sql`
        INSERT INTO patient_profiles (id, organization_id, birth_name, first_birth_name, birth_date, sex)
        VALUES (${randomUUID()}, ${SEED_PRACTICE_IDS.orgA}, 'TEST', 'InvalidSex', '1990-01-01', 'other_invalid_sex')
      `;
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  it('rejects invalid relationship in patient_representative_links via CHECK constraint', async () => {
    if (!sql) return;

    const repId = randomUUID();
    await sql`
      INSERT INTO patient_representatives (id, organization_id, first_name, last_name)
      VALUES (${repId}, ${SEED_PRACTICE_IDS.orgA}, 'Jacques', 'TEST')
    `;

    let threw = false;
    try {
      await sql`
        INSERT INTO patient_representative_links (id, organization_id, patient_id, representative_id, relationship)
        VALUES (${randomUUID()}, ${SEED_PRACTICE_IDS.orgA}, ${SEED_PATIENT_IDS.patientA}, ${repId}, 'friend_invalid')
      `;
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });
});
