import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import postgres from 'postgres';
import { generateId } from '../../src/lib/utils/id-generator';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres';

describe('Database Integrity Constraints: organizations.profession', () => {
  let sql: postgres.Sql;

  beforeAll(() => {
    sql = postgres(DATABASE_URL);
  });

  afterAll(async () => {
    await sql.end();
  });

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
      // Clean up after successful insert
      await sql`DELETE FROM organizations WHERE id = ${id}`;
      return true; // Success
    } catch (e: any) {
      if (e.code === '23514') { // 23514 is check_violation
        return false;
      }
      throw e; // Unexpected error
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

  it('REJECT: artisan + physiotherapist', async () => {
    const result = await insertOrg('artisan', 'physiotherapist');
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
