import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import postgres from 'postgres';
import { randomUUID } from 'crypto';
import { generateId } from '../../src/lib/utils/id-generator';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres';

describe('Database Integrity Constraints', () => {
  let sql: postgres.Sql;

  const orgA = 'org-db-test-a';
  const orgB = 'org-db-test-b';

  beforeAll(async () => {
    sql = postgres(DATABASE_URL);
    await sql`INSERT INTO organizations (id, name, slug) VALUES (${orgA}, 'DB Test Org A', 'db-test-a') ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO organizations (id, name, slug) VALUES (${orgB}, 'DB Test Org B', 'db-test-b') ON CONFLICT DO NOTHING`;
  });

  afterAll(async () => {
    await sql`DELETE FROM organizations WHERE id IN (${orgA}, ${orgB})`;
    await sql.end();
  });

  describe('organizations.profession constraint', () => {
    const insertOrg = async (sector: string | null, profession: string | null) => {
      const id = generateId();
      try {
        await sql`
          INSERT INTO organizations (
            id, name, sector, profession, created_at, updated_at
          ) VALUES (
            ${id}, 'Test Org', ${sector}, ${profession}, now(), now()
          )
        `;
        await sql`DELETE FROM organizations WHERE id = ${id}`;
        return true;
      } catch (e: any) {
        if (e.code === '23514') {
          return false;
        }
        throw e;
      }
    };

    it('ACCEPT: health + physiotherapist', async () => {
      const result = await insertOrg('health', 'physiotherapist');
      expect(result).toBe(true);
    });

    it('ACCEPT: health + osteopath', async () => {
      const result = await insertOrg('health', 'osteopath');
      expect(result).toBe(true);
    });

    it('ACCEPT: health + NULL', async () => {
      const result = await insertOrg('health', null);
      expect(result).toBe(true);
    });

    it('ACCEPT: artisan + NULL', async () => {
      const result = await insertOrg('artisan', null);
      expect(result).toBe(true);
    });

    it('ACCEPT: NULL sector + NULL profession', async () => {
      const result = await insertOrg(null, null);
      expect(result).toBe(true);
    });

    it('REJECT: artisan + physiotherapist', async () => {
      const result = await insertOrg('artisan', 'physiotherapist');
      expect(result).toBe(false);
    });

    it('REJECT: NULL sector + physiotherapist', async () => {
      const result = await insertOrg(null, 'physiotherapist');
      expect(result).toBe(false);
    });

    it('REJECT: health + doctor (not in list)', async () => {
      const result = await insertOrg('health', 'doctor');
      expect(result).toBe(false);
    });

    it('REJECT: health + random', async () => {
      const result = await insertOrg('health', 'random');
      expect(result).toBe(false);
    });

    it('REJECT: health + empty string', async () => {
      const result = await insertOrg('health', '');
      expect(result).toBe(false);
    });
  });

  describe('Practice Structure Constraints & Composite Foreign Keys', () => {
    it('Profession check: valid accepted, unknown rejected with SQLSTATE 23514', async () => {
      const validId = randomUUID();
      await sql`
        INSERT INTO practice_practitioners (id, organization_id, display_name, profession)
        VALUES (${validId}, ${orgA}, 'Dr. Valid Physio', 'physiotherapist')
      `;
      const rows = await sql`SELECT id FROM practice_practitioners WHERE id = ${validId}`;
      expect(rows).toHaveLength(1);
      await sql`DELETE FROM practice_practitioners WHERE id = ${validId}`;

      const invalidId = randomUUID();
      try {
        await sql`
          INSERT INTO practice_practitioners (id, organization_id, display_name, profession)
          VALUES (${invalidId}, ${orgA}, 'Dr. Invalid', 'unknown_profession')
        `;
        expect.unreachable('Should have thrown check violation');
      } catch (err: any) {
        expect(err.code).toBe('23514');
      }
    });

    it('Primary location partial unique index: 2 active primary locations in same org -> 23505', async () => {
      const loc1 = randomUUID();
      const loc2 = randomUUID();

      await sql`
        INSERT INTO practice_locations (id, organization_id, name, timezone, is_primary, is_active)
        VALUES (${loc1}, ${orgA}, 'Location 1', 'Europe/Paris', true, true)
      `;

      try {
        await sql`
          INSERT INTO practice_locations (id, organization_id, name, timezone, is_primary, is_active)
          VALUES (${loc2}, ${orgA}, 'Location 2', 'Europe/Paris', true, true)
        `;
        expect.unreachable('Should have thrown unique constraint violation');
      } catch (err: any) {
        expect(err.code).toBe('23505');
      } finally {
        await sql`DELETE FROM practice_locations WHERE id = ${loc1}`;
      }
    });

    it('Room composite FK: cross-tenant location (Room Org A, Location Org B) -> 23503', async () => {
      const locB = randomUUID();
      await sql`
        INSERT INTO practice_locations (id, organization_id, name, timezone, is_primary, is_active)
        VALUES (${locB}, ${orgB}, 'Location B', 'Europe/Paris', true, true)
      `;

      const roomA = randomUUID();
      try {
        await sql`
          INSERT INTO practice_rooms (id, organization_id, location_id, name)
          VALUES (${roomA}, ${orgA}, ${locB}, 'Cross Tenant Room')
        `;
        expect.unreachable('Should have thrown FK violation');
      } catch (err: any) {
        expect(err.code).toBe('23503');
      } finally {
        await sql`DELETE FROM practice_locations WHERE id = ${locB}`;
      }
    });

    it('Resource composite FK: Room mismatch (Resource Org A, Location A, Room from Location B) -> 23503', async () => {
      const locA = randomUUID();
      const locB = randomUUID();
      await sql`
        INSERT INTO practice_locations (id, organization_id, name, timezone, is_primary, is_active)
        VALUES (${locA}, ${orgA}, 'Location A', 'Europe/Paris', true, true),
               (${locB}, ${orgA}, 'Location B', 'Europe/Paris', false, true)
      `;

      const roomB = randomUUID();
      await sql`
        INSERT INTO practice_rooms (id, organization_id, location_id, name)
        VALUES (${roomB}, ${orgA}, ${locB}, 'Room in Loc B')
      `;

      const resA = randomUUID();
      try {
        // Resource points to location A, but room B belongs to location B -> composite FK (room_id, location_id, organization_id) must reject
        await sql`
          INSERT INTO practice_resources (id, organization_id, location_id, room_id, name)
          VALUES (${resA}, ${orgA}, ${locA}, ${roomB}, 'Mismatch Resource')
        `;
        expect.unreachable('Should have thrown FK violation for room mismatch');
      } catch (err: any) {
        expect(err.code).toBe('23503');
      } finally {
        await sql`DELETE FROM practice_rooms WHERE id = ${roomB}`;
        await sql`DELETE FROM practice_locations WHERE id IN (${locA}, ${locB})`;
      }
    });

    it('PractitionerLocation composite FK: cross-tenant assignment (Practitioner A, Location B) -> 23503', async () => {
      const pracA = randomUUID();
      await sql`
        INSERT INTO practice_practitioners (id, organization_id, display_name, profession)
        VALUES (${pracA}, ${orgA}, 'Dr. A', 'osteopath')
      `;

      const locB = randomUUID();
      await sql`
        INSERT INTO practice_locations (id, organization_id, name, timezone, is_primary, is_active)
        VALUES (${locB}, ${orgB}, 'Loc B', 'Europe/Paris', true, true)
      `;

      const assignId = randomUUID();
      try {
        await sql`
          INSERT INTO practitioner_locations (id, organization_id, practitioner_id, location_id)
          VALUES (${assignId}, ${orgA}, ${pracA}, ${locB})
        `;
        expect.unreachable('Should have thrown FK violation');
      } catch (err: any) {
        expect(err.code).toBe('23503');
      } finally {
        await sql`DELETE FROM practice_practitioners WHERE id = ${pracA}`;
        await sql`DELETE FROM practice_locations WHERE id = ${locB}`;
      }
    });

    it('Duplicate assignment constraint: same practitioner + location twice in org -> 23505', async () => {
      const locA = randomUUID();
      await sql`
        INSERT INTO practice_locations (id, organization_id, name, timezone, is_primary, is_active)
        VALUES (${locA}, ${orgA}, 'Location A', 'Europe/Paris', true, true)
      `;

      const pracA = randomUUID();
      await sql`
        INSERT INTO practice_practitioners (id, organization_id, display_name, profession)
        VALUES (${pracA}, ${orgA}, 'Dr. A', 'speech_therapist')
      `;

      const assign1 = randomUUID();
      const assign2 = randomUUID();

      await sql`
        INSERT INTO practitioner_locations (id, organization_id, practitioner_id, location_id, is_primary, is_active)
        VALUES (${assign1}, ${orgA}, ${pracA}, ${locA}, false, true)
      `;

      try {
        await sql`
          INSERT INTO practitioner_locations (id, organization_id, practitioner_id, location_id, is_primary, is_active)
          VALUES (${assign2}, ${orgA}, ${pracA}, ${locA}, false, true)
        `;
        expect.unreachable('Should have thrown duplicate assignment unique violation');
      } catch (err: any) {
        expect(err.code).toBe('23505');
      } finally {
        await sql`DELETE FROM practitioner_locations WHERE id = ${assign1}`;
        await sql`DELETE FROM practice_practitioners WHERE id = ${pracA}`;
        await sql`DELETE FROM practice_locations WHERE id = ${locA}`;
      }
    });

    it('Practitioner primary location constraint: 2 active primary locations for same practitioner -> 23505', async () => {
      const loc1 = randomUUID();
      const loc2 = randomUUID();
      await sql`
        INSERT INTO practice_locations (id, organization_id, name, timezone, is_primary, is_active)
        VALUES (${loc1}, ${orgA}, 'Location 1', 'Europe/Paris', true, true),
               (${loc2}, ${orgA}, 'Location 2', 'Europe/Paris', false, true)
      `;

      const pracA = randomUUID();
      await sql`
        INSERT INTO practice_practitioners (id, organization_id, display_name, profession)
        VALUES (${pracA}, ${orgA}, 'Dr. A', 'dietitian')
      `;

      const assign1 = randomUUID();
      const assign2 = randomUUID();

      await sql`
        INSERT INTO practitioner_locations (id, organization_id, practitioner_id, location_id, is_primary, is_active)
        VALUES (${assign1}, ${orgA}, ${pracA}, ${loc1}, true, true)
      `;

      try {
        await sql`
          INSERT INTO practitioner_locations (id, organization_id, practitioner_id, location_id, is_primary, is_active)
          VALUES (${assign2}, ${orgA}, ${pracA}, ${loc2}, true, true)
        `;
        expect.unreachable('Should have thrown unique constraint violation on primary active location');
      } catch (err: any) {
        expect(err.code).toBe('23505');
      } finally {
        await sql`DELETE FROM practitioner_locations WHERE id = ${assign1}`;
        await sql`DELETE FROM practice_practitioners WHERE id = ${pracA}`;
        await sql`DELETE FROM practice_locations WHERE id IN (${loc1}, ${loc2})`;
      }
    });
  });
});
