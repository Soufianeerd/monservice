import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import postgres from 'postgres';
import { randomUUID } from 'crypto';

const dbUrl = process.env.DATABASE_URL!;
// Utilisation du superuser pour setup
const sqlAdmin = postgres(dbUrl);

// RLS connection simulateur via set_config
const sqlTenantA = postgres(dbUrl, {
  onnotice: () => {},
  transform: {
    undefined: null
  },
  fetch_types: false,
  prepare: false
});

const sqlTenantB = postgres(dbUrl, {
  onnotice: () => {},
  transform: {
    undefined: null
  },
  fetch_types: false,
  prepare: false
});

describe('Practice Structure RLS & Tenant Isolation', () => {
  const orgA = 'org-rls-prac-A';
  const orgB = 'org-rls-prac-B';
  const userA = randomUUID();
  const locationA = randomUUID();

  beforeAll(async () => {
    // 1. Setup base
    await sqlAdmin`INSERT INTO organizations (id, name, slug) VALUES (${orgA}, 'Org A', 'orga-prac-rls') ON CONFLICT DO NOTHING`;
    await sqlAdmin`INSERT INTO organizations (id, name, slug) VALUES (${orgB}, 'Org B', 'orgb-prac-rls') ON CONFLICT DO NOTHING`;

    await sqlAdmin`INSERT INTO users (id, email, profile_type, organization_id, created_at, updated_at) 
                   VALUES (${userA}, 'proa-prac@test.com', 'professional', ${orgA}, now(), now()) ON CONFLICT DO NOTHING`;
  });

  afterAll(async () => {
    await sqlAdmin`DELETE FROM users WHERE id = ${userA}`;
    await sqlAdmin`DELETE FROM organizations WHERE id IN (${orgA}, ${orgB})`;
    await sqlAdmin.end();
    await sqlTenantA.end();
    await sqlTenantB.end();
  });

  const withTenantA = async <T>(cb: () => Promise<T>) => {
    return sqlTenantA.begin(async (tx) => {
      await tx`SET LOCAL ROLE authenticated`;
      await tx`SELECT set_config('app.current_organization_id', ${orgA}, true)`;
      return cb();
    });
  };

  const withTenantB = async <T>(cb: () => Promise<T>) => {
    return sqlTenantB.begin(async (tx) => {
      await tx`SET LOCAL ROLE authenticated`;
      await tx`SELECT set_config('app.current_organization_id', ${orgB}, true)`;
      return cb();
    });
  };

  it('Tenant A should be able to insert and select a practice location', async () => {
    await withTenantA(async () => {
      await sqlTenantA`
        INSERT INTO practice_locations (id, organization_id, name, timezone)
        VALUES (${locationA}, ${orgA}, 'Cabinet Principal A', 'Europe/Paris')
      `;
      
      const locs = await sqlTenantA`SELECT * FROM practice_locations WHERE id = ${locationA}`;
      expect(locs.length).toBe(1);
    });
  });

  it('Tenant B should NOT see Tenant A location', async () => {
    await withTenantB(async () => {
      const locs = await sqlTenantB`SELECT * FROM practice_locations WHERE id = ${locationA}`;
      expect(locs.length).toBe(0);
    });
  });

  it('Tenant A cannot insert location for Tenant B', async () => {
    await expect(withTenantA(async () => {
      await sqlTenantA`
        INSERT INTO practice_locations (id, organization_id, name, timezone)
        VALUES (${randomUUID()}, ${orgB}, 'Hacked Cabinet', 'Europe/Paris')
      `;
    })).rejects.toThrow(/new row violates row-level security policy for table "practice_locations"/);
  });

  it('Tenant A can insert a practitioner for their org', async () => {
    const pracId = randomUUID();
    await withTenantA(async () => {
      await sqlTenantA`
        INSERT INTO practice_practitioners (id, organization_id, display_name, profession, user_id)
        VALUES (${pracId}, ${orgA}, 'Dr. House', 'physiotherapist', ${userA})
      `;
      const pracs = await sqlTenantA`SELECT * FROM practice_practitioners WHERE id = ${pracId}`;
      expect(pracs.length).toBe(1);
    });
  });

  it('Tenant B cannot modify Tenant A location', async () => {
    await withTenantB(async () => {
      const res = await sqlTenantB`
        UPDATE practice_locations SET name = 'Hacked' WHERE id = ${locationA}
      `;
      expect(res.count).toBe(0);
    });
  });

  it('Anonymous cannot insert or select', async () => {
    await expect(sqlAdmin.begin(async (tx) => {
      await tx`SET LOCAL ROLE anon`;
      await tx`SELECT * FROM practice_locations`;
    })).rejects.toThrow(/permission denied for table practice_locations/);
  });
});
