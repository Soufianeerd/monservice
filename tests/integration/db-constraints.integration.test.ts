import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import postgres from 'postgres';
import { randomUUID } from 'crypto';

const dbUrl = process.env.DATABASE_URL!;
const sqlAdmin = postgres(dbUrl);

describe('Practice Structure DB Constraints', () => {
  const orgA = 'org-c-prac-A';

  beforeAll(async () => {
    await sqlAdmin`INSERT INTO organizations (id, name, slug) VALUES (${orgA}, 'Org A', 'orga-c-prac') ON CONFLICT DO NOTHING`;
  });

  afterAll(async () => {
    await sqlAdmin`DELETE FROM organizations WHERE id = ${orgA}`;
    await sqlAdmin.end();
  });

  it('Cannot insert practitioner with invalid profession', async () => {
    await expect(sqlAdmin`
      INSERT INTO practice_practitioners (id, organization_id, display_name, profession)
      VALUES (${randomUUID()}, ${orgA}, 'Dr. Invalid', 'plumber')
    `).rejects.toThrow(/violates check constraint "practice_practitioners_profession_check"/);
  });

  it('Allows valid paramedical profession', async () => {
    const pId = randomUUID();
    await sqlAdmin`
      INSERT INTO practice_practitioners (id, organization_id, display_name, profession)
      VALUES (${pId}, ${orgA}, 'Dr. Valid', 'osteopath')
    `;
    const res = await sqlAdmin`SELECT * FROM practice_practitioners WHERE id = ${pId}`;
    expect(res.length).toBe(1);
    
    // cleanup
    await sqlAdmin`DELETE FROM practice_practitioners WHERE id = ${pId}`;
  });

  it('Cannot have two primary locations for the same org', async () => {
    const loc1 = randomUUID();
    const loc2 = randomUUID();

    await sqlAdmin`
      INSERT INTO practice_locations (id, organization_id, name, timezone, is_primary)
      VALUES (${loc1}, ${orgA}, 'Loc 1', 'Europe/Paris', true)
    `;

    await expect(sqlAdmin`
      INSERT INTO practice_locations (id, organization_id, name, timezone, is_primary)
      VALUES (${loc2}, ${orgA}, 'Loc 2', 'Europe/Paris', true)
    `).rejects.toThrow(/duplicate key value violates unique constraint "practice_locations_primary_active_idx"/);

    await sqlAdmin`DELETE FROM practice_locations WHERE id = ${loc1}`;
  });
});
