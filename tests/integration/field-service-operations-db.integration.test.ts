import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import postgres from 'postgres';
import { randomUUID } from 'crypto';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres';

function hasPostgresErrorCode(error: unknown): error is { code: string; message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof Reflect.get(error, 'code') === 'string' &&
    typeof Reflect.get(error, 'message') === 'string'
  );
}

describe('Field Service Operations Database Integrity & State Machines (Session 17)', () => {
  let sql: postgres.Sql;

  const orgA = 'org-fs-db-test-a';
  const orgB = 'org-fs-db-test-b';

  const userProA = 'user-fs-db-pro-a';
  const userStaffA = 'user-fs-db-staff-a';
  const userProB = 'user-fs-db-pro-b';
  const userClientA = 'user-fs-db-client-a';

  const clientA1 = 'client-fs-db-a1';
  const clientA2 = 'client-fs-db-a2';
  const clientB1 = 'client-fs-db-b1';

  const siteA1 = 'site-fs-db-a1';
  const siteA2 = 'site-fs-db-a2';
  const siteB1 = 'site-fs-db-b1';

  beforeAll(async () => {
    sql = postgres(DATABASE_URL);

    // Clean prior runs
    await sql`SET session_replication_role = 'replica'`;
    await sql`DELETE FROM field_service_work_reports WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM field_service_work_order_assignments WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM field_service_work_order_status_history WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM field_service_work_orders WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM field_service_sites WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM clients WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM users WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM organizations WHERE id IN (${orgA}, ${orgB})`;
    await sql`SET session_replication_role = 'origin'`;

    // Setup Orgs
    await sql`
      INSERT INTO organizations (id, name, slug, sector, profession, profile_type, created_at, updated_at)
      VALUES 
        (${orgA}, 'Plumbing Solutions Org A', 'plumbing-org-a', 'field_services', 'plumber', 'professional', now(), now()),
        (${orgB}, 'Electrical Pro Org B', 'electric-org-b', 'field_services', 'electrician', 'professional', now(), now())
      ON CONFLICT (id) DO UPDATE SET sector = EXCLUDED.sector, profession = EXCLUDED.profession
    `;

    // Setup Users
    await sql`
      INSERT INTO users (id, email, organization_id, profile_type, created_at, updated_at)
      VALUES 
        (${userProA}, 'lead@plumbing-a.test', ${orgA}, 'professional', now(), now()),
        (${userStaffA}, 'tech@plumbing-a.test', ${orgA}, 'professional', now(), now()),
        (${userProB}, 'lead@electric-b.test', ${orgB}, 'professional', now(), now()),
        (${userClientA}, 'client@plumbing-a.test', ${orgA}, 'client', now(), now())
      ON CONFLICT (id) DO UPDATE SET organization_id = EXCLUDED.organization_id, profile_type = EXCLUDED.profile_type
    `;

    // Setup Clients
    await sql`
      INSERT INTO clients (id, organization_id, user_id, name, email, created_at, updated_at)
      VALUES 
        (${clientA1}, ${orgA}, ${userClientA}, 'Client A1 SARL', 'a1@client.test', now(), now()),
        (${clientA2}, ${orgA}, NULL, 'Client A2 Particulier', 'a2@client.test', now(), now()),
        (${clientB1}, ${orgB}, NULL, 'Client B1 SAS', 'b1@client.test', now(), now())
      ON CONFLICT (id) DO UPDATE SET organization_id = EXCLUDED.organization_id
    `;

    // Setup Sites
    await sql`
      INSERT INTO field_service_sites (
        id, organization_id, client_id, label, address_line1, postal_code, city, country, latitude, longitude, is_active, created_at, updated_at
      ) VALUES 
        (${siteA1}, ${orgA}, ${clientA1}, 'Chantier A1 Principal', '15 Rue de Rennes', '75006', 'Paris', 'FR', 48.8512, 2.3298, true, now(), now()),
        (${siteA2}, ${orgA}, ${clientA2}, 'Résidence A2 Secondaire', '24 Av Montaigne', '75008', 'Paris', 'FR', 48.8661, 2.3082, true, now(), now()),
        (${siteB1}, ${orgB}, ${clientB1}, 'Chantier B1 Entrepot', '10 Rue de Lyon', '69001', 'Lyon', 'FR', 45.7640, 4.8357, true, now(), now())
      ON CONFLICT (id) DO UPDATE SET organization_id = EXCLUDED.organization_id, client_id = EXCLUDED.client_id
    `;
  });

  afterAll(async () => {
    // Cleanup test data using session_replication_role to bypass deletion trigger on test records
    await sql`SET session_replication_role = 'replica'`;
    await sql`DELETE FROM field_service_work_reports WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM field_service_work_order_assignments WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM field_service_work_order_status_history WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM field_service_work_orders WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM field_service_sites WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM clients WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM users WHERE organization_id IN (${orgA}, ${orgB})`;
    await sql`DELETE FROM organizations WHERE id IN (${orgA}, ${orgB})`;
    await sql`SET session_replication_role = 'origin'`;
    await sql.end();
  });

  // ==========================================================================
  // 1. Site Constraints
  // ==========================================================================
  describe('Site Constraints', () => {
    it('rejects site with latitude out of bounds [-90, 90]', async () => {
      let err: unknown = null;
      try {
        await sql`
          INSERT INTO field_service_sites (
            id, organization_id, client_id, label, address_line1, postal_code, city, latitude
          ) VALUES (
            ${randomUUID()}, ${orgA}, ${clientA1}, 'Invalid Lat Site', '10 Rue Test', '75001', 'Paris', 95.5
          )
        `;
      } catch (e) {
        err = e;
      }
      expect(err).not.toBeNull();
      expect(hasPostgresErrorCode(err) && (err.code === '23514' || err.message.includes('chk_sites_latitude'))).toBe(true);
    });

    it('rejects site with longitude out of bounds [-180, 180]', async () => {
      let err: unknown = null;
      try {
        await sql`
          INSERT INTO field_service_sites (
            id, organization_id, client_id, label, address_line1, postal_code, city, longitude
          ) VALUES (
            ${randomUUID()}, ${orgA}, ${clientA1}, 'Invalid Lng Site', '10 Rue Test', '75001', 'Paris', 195.5
          )
        `;
      } catch (e) {
        err = e;
      }
      expect(err).not.toBeNull();
      expect(hasPostgresErrorCode(err) && (err.code === '23514' || err.message.includes('chk_sites_longitude'))).toBe(true);
    });
  });

  // ==========================================================================
  // 2. Work Order Constraints & Composite Site-Client Invariant
  // ==========================================================================
  describe('Work Order Constraints & Invariants', () => {
    it('rejects scheduled_end before scheduled_start', async () => {
      let err: unknown = null;
      try {
        await sql`
          INSERT INTO field_service_work_orders (
            id, organization_id, client_id, created_by_user_id, reference, title,
            scheduled_start, scheduled_end
          ) VALUES (
            ${randomUUID()}, ${orgA}, ${clientA1}, ${userProA}, 'WO-TEST-INVALID-DATES', 'Invalid Dates Order',
            '2026-10-10 14:00:00+00', '2026-10-10 12:00:00+00'
          )
        `;
      } catch (e) {
        err = e;
      }
      expect(err).not.toBeNull();
      expect(hasPostgresErrorCode(err) && (err.code === '23514' || err.message.includes('chk_work_orders_scheduled_dates'))).toBe(true);
    });

    it('enforces site-client matching via composite FK (cannot assign site of client A2 to work order of client A1)', async () => {
      let err: unknown = null;
      try {
        await sql`
          INSERT INTO field_service_work_orders (
            id, organization_id, client_id, site_id, created_by_user_id, reference, title
          ) VALUES (
            ${randomUUID()}, ${orgA}, ${clientA1}, ${siteA2}, ${userProA}, 'WO-MISMATCH-SITE', 'Site Mismatch Order'
          )
        `;
      } catch (e) {
        err = e;
      }
      expect(err).not.toBeNull();
      expect(hasPostgresErrorCode(err) && err.code === '23503').toBe(true);
    });

    it('rejects cross-organization site assignment (Org A work order with Org B site)', async () => {
      let err: unknown = null;
      try {
        await sql`
          INSERT INTO field_service_work_orders (
            id, organization_id, client_id, site_id, created_by_user_id, reference, title
          ) VALUES (
            ${randomUUID()}, ${orgA}, ${clientA1}, ${siteB1}, ${userProA}, 'WO-CROSS-ORG-SITE', 'Cross Org Site'
          )
        `;
      } catch (e) {
        err = e;
      }
      expect(err).not.toBeNull();
      expect(hasPostgresErrorCode(err) && err.code === '23503').toBe(true);
    });

    it('enforces cancellation reason constraint on status = cancelled', async () => {
      const orderId = randomUUID();
      await sql`
        INSERT INTO field_service_work_orders (
          id, organization_id, client_id, created_by_user_id, reference, title, status
        ) VALUES (
          ${orderId}, ${orgA}, ${clientA1}, ${userProA}, 'WO-CANC-CHK-1', 'Order to Cancel', 'draft'
        )
      `;

      // Cancel without reason code -> must fail
      let err: unknown = null;
      try {
        await sql`
          UPDATE field_service_work_orders
          SET status = 'cancelled', cancellation_reason_code = NULL
          WHERE id = ${orderId}
        `;
      } catch (e) {
        err = e;
      }
      expect(err).not.toBeNull();
      expect(hasPostgresErrorCode(err) && (err.code === '23514' || err.message.includes('chk_work_orders_cancellation_reason'))).toBe(true);

      // Cancel with valid reason code -> must succeed
      await sql`
        UPDATE field_service_work_orders
        SET status = 'cancelled', cancellation_reason_code = 'customer_request'
        WHERE id = ${orderId}
      `;
      const [cancelled] = await sql`SELECT status, cancellation_reason_code FROM field_service_work_orders WHERE id = ${orderId}`;
      expect(cancelled.status).toBe('cancelled');
      expect(cancelled.cancellation_reason_code).toBe('customer_request');
    });
  });

  // ==========================================================================
  // 3. Work Order State Machine & History Trigger
  // ==========================================================================
  describe('Work Order State Machine & History Trigger', () => {
    it('follows valid transition path and automatically populates status history', async () => {
      const orderId = randomUUID();
      
      // 1. Create in draft
      await sql`
        INSERT INTO field_service_work_orders (
          id, organization_id, client_id, created_by_user_id, reference, title, status
        ) VALUES (
          ${orderId}, ${orgA}, ${clientA1}, ${userProA}, 'WO-LIFECYCLE-1', 'Plumbing Repair', 'draft'
        )
      `;

      // 2. Transition draft -> scheduled
      await sql`
        UPDATE field_service_work_orders
        SET status = 'scheduled',
            scheduled_start = '2026-10-15 09:00:00+00',
            scheduled_end = '2026-10-15 12:00:00+00'
        WHERE id = ${orderId}
      `;

      // 3. Transition scheduled -> in_progress (sets actual_start)
      await sql`
        UPDATE field_service_work_orders
        SET status = 'in_progress'
        WHERE id = ${orderId}
      `;

      // 4. Transition in_progress -> paused
      await sql`
        UPDATE field_service_work_orders
        SET status = 'paused'
        WHERE id = ${orderId}
      `;

      // 5. Transition paused -> in_progress
      await sql`
        UPDATE field_service_work_orders
        SET status = 'in_progress'
        WHERE id = ${orderId}
      `;

      // 6. Transition in_progress -> completed (sets actual_end)
      await sql`
        UPDATE field_service_work_orders
        SET status = 'completed'
        WHERE id = ${orderId}
      `;

      const [finalOrder] = await sql`
        SELECT status, actual_start, actual_end FROM field_service_work_orders WHERE id = ${orderId}
      `;
      expect(finalOrder.status).toBe('completed');
      expect(finalOrder.actual_start).not.toBeNull();
      expect(finalOrder.actual_end).not.toBeNull();

      // Verify status history entries (1 on creation + 5 on updates)
      const history = await sql`
        SELECT from_status, to_status FROM field_service_work_order_status_history
        WHERE work_order_id = ${orderId}
        ORDER BY created_at ASC
      `;
      expect(history.length).toBe(6);
      expect(history[0]).toEqual({ from_status: null, to_status: 'draft' });
      expect(history[1]).toEqual({ from_status: 'draft', to_status: 'scheduled' });
      expect(history[2]).toEqual({ from_status: 'scheduled', to_status: 'in_progress' });
      expect(history[3]).toEqual({ from_status: 'in_progress', to_status: 'paused' });
      expect(history[4]).toEqual({ from_status: 'paused', to_status: 'in_progress' });
      expect(history[5]).toEqual({ from_status: 'in_progress', to_status: 'completed' });
    });

    it('rejects invalid state transitions (draft -> in_progress without scheduling)', async () => {
      const orderId = randomUUID();
      await sql`
        INSERT INTO field_service_work_orders (
          id, organization_id, client_id, created_by_user_id, reference, title, status
        ) VALUES (
          ${orderId}, ${orgA}, ${clientA1}, ${userProA}, 'WO-INVALID-TRANS-1', 'Invalid Trans', 'draft'
        )
      `;

      let err: unknown = null;
      try {
        await sql`
          UPDATE field_service_work_orders
          SET status = 'in_progress'
          WHERE id = ${orderId}
        `;
      } catch (e) {
        err = e;
      }
      expect(err).not.toBeNull();
      expect((err as { message: string }).message).toContain('Invalid status transition');
    });

    it('protects terminal status (cannot transition completed or cancelled work orders)', async () => {
      const completedOrderId = randomUUID();
      await sql`
        INSERT INTO field_service_work_orders (
          id, organization_id, client_id, created_by_user_id, reference, title, status, scheduled_start, scheduled_end
        ) VALUES (
          ${completedOrderId}, ${orgA}, ${clientA1}, ${userProA}, 'WO-COMPL-IMMUTABLE', 'Completed Order', 'scheduled', '2026-10-10 10:00:00+00', '2026-10-10 12:00:00+00'
        )
      `;
      await sql`UPDATE field_service_work_orders SET status = 'in_progress' WHERE id = ${completedOrderId}`;
      await sql`UPDATE field_service_work_orders SET status = 'completed' WHERE id = ${completedOrderId}`;

      // Try modifying status
      let err: unknown = null;
      try {
        await sql`
          UPDATE field_service_work_orders
          SET status = 'in_progress'
          WHERE id = ${completedOrderId}
        `;
      } catch (e) {
        err = e;
      }
      expect(err).not.toBeNull();
      expect((err as { message: string }).message).toContain('Cannot transition from terminal status');
    });
  });

  // ==========================================================================
  // 4. Assignments Invariants Trigger
  // ==========================================================================
  describe('Assignment Invariants', () => {
    it('allows assigning a professional of the same organization', async () => {
      const orderId = randomUUID();
      await sql`
        INSERT INTO field_service_work_orders (
          id, organization_id, client_id, created_by_user_id, reference, title, status
        ) VALUES (
          ${orderId}, ${orgA}, ${clientA1}, ${userProA}, 'WO-ASSIGN-TEST-1', 'Assign Test', 'draft'
        )
      `;

      const assignId = randomUUID();
      await sql`
        INSERT INTO field_service_work_order_assignments (
          id, organization_id, work_order_id, user_id, role, is_active
        ) VALUES (
          ${assignId}, ${orgA}, ${orderId}, ${userStaffA}, 'technician', true
        )
      `;

      const [assigned] = await sql`SELECT user_id, role, is_active FROM field_service_work_order_assignments WHERE id = ${assignId}`;
      expect(assigned.user_id).toBe(userStaffA);
      expect(assigned.role).toBe('technician');
      expect(assigned.is_active).toBe(true);
    });

    it('rejects assigning a user from a different organization (Org B user to Org A work order)', async () => {
      const orderId = randomUUID();
      await sql`
        INSERT INTO field_service_work_orders (
          id, organization_id, client_id, created_by_user_id, reference, title, status
        ) VALUES (
          ${orderId}, ${orgA}, ${clientA1}, ${userProA}, 'WO-ASSIGN-TEST-2', 'Assign Test 2', 'draft'
        )
      `;

      let err: unknown = null;
      try {
        await sql`
          INSERT INTO field_service_work_order_assignments (
            id, organization_id, work_order_id, user_id, role, is_active
          ) VALUES (
            ${randomUUID()}, ${orgA}, ${orderId}, ${userProB}, 'technician', true
          )
        `;
      } catch (e) {
        err = e;
      }
      expect(err).not.toBeNull();
      expect((err as { message: string }).message).toContain('Assigned user must be an active professional in the same organization');
    });

    it('rejects assigning a client profile type user', async () => {
      const orderId = randomUUID();
      await sql`
        INSERT INTO field_service_work_orders (
          id, organization_id, client_id, created_by_user_id, reference, title, status
        ) VALUES (
          ${orderId}, ${orgA}, ${clientA1}, ${userProA}, 'WO-ASSIGN-TEST-3', 'Assign Test 3', 'draft'
        )
      `;

      let err: unknown = null;
      try {
        await sql`
          INSERT INTO field_service_work_order_assignments (
            id, organization_id, work_order_id, user_id, role, is_active
          ) VALUES (
            ${randomUUID()}, ${orgA}, ${orderId}, ${userClientA}, 'technician', true
          )
        `;
      } catch (e) {
        err = e;
      }
      expect(err).not.toBeNull();
      expect((err as { message: string }).message).toContain('Assigned user must be an active professional in the same organization');
    });
  });

  // ==========================================================================
  // 5. Work Reports State Machine & Immutability
  // ==========================================================================
  describe('Work Reports State Machine & Finalized Immutability', () => {
    it('allows drafting and then finalizing a report, but strictly blocks modifications once finalized', async () => {
      const orderId = randomUUID();
      await sql`
        INSERT INTO field_service_work_orders (
          id, organization_id, client_id, created_by_user_id, reference, title, status
        ) VALUES (
          ${orderId}, ${orgA}, ${clientA1}, ${userProA}, 'WO-REPORT-TEST-1', 'Report Test', 'draft'
        )
      `;

      const reportId = randomUUID();
      await sql`
        INSERT INTO field_service_work_reports (
          id, organization_id, work_order_id, author_user_id, status, summary, work_performed
        ) VALUES (
          ${reportId}, ${orgA}, ${orderId}, ${userProA}, 'draft', 'Initial inspection', 'Replaced valve'
        )
      `;

      // Update draft report -> must succeed
      await sql`
        UPDATE field_service_work_reports
        SET summary = 'Updated inspection summary', work_performed = 'Replaced valve and pipe section'
        WHERE id = ${reportId}
      `;

      // Finalize report -> must succeed
      await sql`
        UPDATE field_service_work_reports
        SET status = 'finalized', finalized_at = now()
        WHERE id = ${reportId}
      `;

      const [finalized] = await sql`SELECT status, summary, finalized_at FROM field_service_work_reports WHERE id = ${reportId}`;
      expect(finalized.status).toBe('finalized');
      expect(finalized.summary).toBe('Updated inspection summary');
      expect(finalized.finalized_at).not.toBeNull();

      // Try updating finalized report -> must be rejected by trigger
      let errUpdate: unknown = null;
      try {
        await sql`
          UPDATE field_service_work_reports
          SET summary = 'Attempted illicit modification'
          WHERE id = ${reportId}
        `;
      } catch (e) {
        errUpdate = e;
      }
      expect(errUpdate).not.toBeNull();
      expect((errUpdate as { message: string }).message).toContain('Finalized work reports are immutable');

      // Try deleting finalized report -> must be rejected by trigger
      let errDelete: unknown = null;
      try {
        await sql`
          DELETE FROM field_service_work_reports
          WHERE id = ${reportId}
        `;
      } catch (e) {
        errDelete = e;
      }
      expect(errDelete).not.toBeNull();
      expect((errDelete as { message: string }).message).toContain('Work reports cannot be deleted');
    });
  });
});
