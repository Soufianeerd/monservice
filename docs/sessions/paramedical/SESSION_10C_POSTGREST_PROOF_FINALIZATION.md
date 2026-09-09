# Session 10C — PostgREST Bypass Proof Finalization & Non-Vacuous Authenticated Integration Test

## 1. Résumé Exécutif

La Session 10C conclut définitivement la validation de la verticale de planification paramédicale (Scheduling & Lifecycle Foundation) en éliminant le faux positif (test vacuous) détecté lors de l'audit post-CI de la Session 10B :
1. **Cause Racine Identifiée & Résolue** : L'ancien test `P0: proves direct PostgREST authenticated professional UPDATE to future no_show is blocked by DB` était localisé dans `tests/integration/appointment-lifecycle-db-constraints.integration.test.ts`. Dans le pipeline CI, la gate `test:db-constraints` s'exécute *avant* le seed Supabase Auth (`seed:local`). L'authentification échouait donc silencieusement et les clauses `if (!proAClient) return;` transformaient le test en faux succès sans jamais exécuter de requête PostgREST.
2. **Découplage Propre & Non-Vacuous** :
   - Le fichier `tests/integration/appointment-lifecycle-db-constraints.integration.test.ts` est nettoyé de toute logique client/auth optionnelle pour redevenir un banc de test PostgreSQL direct, strict et déterministe.
   - Un nouveau fichier dédié `tests/integration/appointment-lifecycle-rls.integration.test.ts` est créé et rattaché au script `npm run test:rls`, qui s'exécute en CI *après* `seed:local`.
3. **Authentification Réelle & Anti-Vacuity Contract** :
   - `proAClient.auth.signInWithPassword({ email: 'pro_a@monservice.com', password: 'password123' })` est exécuté dans `beforeAll`. Toute erreur d'authentification lève une exception bloquante (`throw new Error(...)`).
   - Strictement aucun `return;` conditionnel dans le flux des tests.
4. **Preuve Réelle PostgREST (P0 Rejet No-Show Futur)** :
   - Insertion via PostgREST d'un rendez-vous futur (`starts_at = 2028-11-20T10:00:00.000Z`).
   - `proAClient.from('appointments').update({ status: 'no_show' }).eq('id', futureApptId)` retourne `error.code === '23514'` et `error.message` contenant `Cannot mark a future appointment as no_show`.
   - Vérification de l'atomicité de la ligne : relecture via PostgREST confirmant `status === 'scheduled'`, `no_show_at === null`, `cancelled_at === null`, `starts_at` inchangé.
5. **Contrôle Positif PostgREST (Succès No-Show Passé)** :
   - Insertion via PostgREST d'un rendez-vous passé (`starts_at = 2026-08-01T09:00:00.000Z`).
   - `proAClient.from('appointments').update({ status: 'no_show' }).eq('id', pastApptId)` réussit avec `error === null`.
   - Relecture confirmant `status === 'no_show'` et `no_show_at !== null`.
6. **Intégrité Stricte du Code et des Schémas** :
   - `0014_wise_the_hunter.sql` : Strictement inchangée (0 diff).
   - `0015_silly_whizzer.sql` : Strictement inchangée (0 diff).
   - Aucune migration `0016` créée.
   - `src/lib/db/schema.ts` : Strictement inchangé (0 diff).
   - Code applicatif / services : Strictement inchangé (0 diff).
   - Production Supabase : Strictement inchangée (`0013`, `0014`, `0015` restent `NOT_APPLIED`).
   - Zero Lying Cast : 0 `as any`, 0 `as unknown as`, 0 `as never`, 0 `: any`.

---

## 2. Détail Technique de la Correction

### 2.1. Nouveau Test RLS Dédié (`tests/integration/appointment-lifecycle-rls.integration.test.ts`)
```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import postgres from 'postgres';
import { SEED_SCHEDULING_IDS, SEED_PATIENT_IDS, SEED_PRACTICE_IDS } from '../../scripts/e2e/seed-local';
import { randomUUID } from 'crypto';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'dummy';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres';

const PRO_A_EMAIL = 'pro_a@monservice.com';
const PASSWORD = 'password123';

describe('Appointment Lifecycle RLS & PostgREST Invariants (Session 10C)', () => {
  let sql: postgres.Sql;
  let proAClient: SupabaseClient;
  let proAUserId: string;
  const createdAppointmentIds: string[] = [];

  beforeAll(async () => {
    sql = postgres(DATABASE_URL);

    proAClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });

    const { data: authData, error: authError } = await proAClient.auth.signInWithPassword({
      email: PRO_A_EMAIL,
      password: PASSWORD,
    });

    if (authError || !authData?.user) {
      throw new Error(`Failed to login Pro A: ${authError?.message || 'No user returned'}`);
    }

    proAUserId = authData.user.id;
  });

  afterAll(async () => {
    if (createdAppointmentIds.length > 0) {
      await sql`DELETE FROM appointments WHERE id = ANY(${createdAppointmentIds})`;
    }
    await sql.end();
  });

  it('P0: direct PostgREST authenticated professional cannot mark a future appointment no_show', async () => {
    const futureApptId = randomUUID();
    createdAppointmentIds.push(futureApptId);

    const futureStartsAt = '2028-11-20T10:00:00.000Z';
    const futureEndsAt = '2028-11-20T10:30:00.000Z';

    const { error: insertError } = await proAClient
      .from('appointments')
      .insert({
        id: futureApptId,
        organization_id: SEED_PRACTICE_IDS.orgA,
        patient_id: SEED_PATIENT_IDS.patientA,
        practitioner_id: SEED_PRACTICE_IDS.practitionerA,
        appointment_type_id: SEED_SCHEDULING_IDS.appointmentTypeA,
        location_id: SEED_PRACTICE_IDS.locationA,
        room_id: null,
        created_by_user_id: proAUserId,
        starts_at: futureStartsAt,
        ends_at: futureEndsAt,
        occupancy_starts_at: futureStartsAt,
        occupancy_ends_at: futureEndsAt,
        timezone: 'Europe/Paris',
        status: 'scheduled',
      });

    expect(insertError).toBeNull();

    const { error: updateError } = await proAClient
      .from('appointments')
      .update({ status: 'no_show' })
      .eq('id', futureApptId);

    expect(updateError).not.toBeNull();
    expect(updateError?.code).toBe('23514');
    expect(updateError?.message).toContain('Cannot mark a future appointment as no_show');

    const { data: rows, error: selectError } = await proAClient
      .from('appointments')
      .select('id, status, no_show_at, cancelled_at, cancellation_reason_code, starts_at')
      .eq('id', futureApptId);

    expect(selectError).toBeNull();
    expect(rows).toHaveLength(1);
    expect(rows?.[0]?.status).toBe('scheduled');
    expect(rows?.[0]?.no_show_at).toBeNull();
    expect(rows?.[0]?.cancelled_at).toBeNull();
    expect(rows?.[0]?.cancellation_reason_code).toBeNull();
    expect(new Date(rows?.[0]?.starts_at).toISOString()).toBe(new Date(futureStartsAt).toISOString());
  });

  it('authenticated professional can mark a past appointment no_show through PostgREST', async () => {
    const pastApptId = randomUUID();
    createdAppointmentIds.push(pastApptId);

    const pastStartsAt = '2026-08-01T09:00:00.000Z';
    const pastEndsAt = '2026-08-01T09:30:00.000Z';

    const { error: insertError } = await proAClient
      .from('appointments')
      .insert({
        id: pastApptId,
        organization_id: SEED_PRACTICE_IDS.orgA,
        patient_id: SEED_PATIENT_IDS.patientA,
        practitioner_id: SEED_PRACTICE_IDS.practitionerA,
        appointment_type_id: SEED_SCHEDULING_IDS.appointmentTypeA,
        location_id: SEED_PRACTICE_IDS.locationA,
        room_id: null,
        created_by_user_id: proAUserId,
        starts_at: pastStartsAt,
        ends_at: pastEndsAt,
        occupancy_starts_at: pastStartsAt,
        occupancy_ends_at: pastEndsAt,
        timezone: 'Europe/Paris',
        status: 'scheduled',
      });

    expect(insertError).toBeNull();

    const { error: updateError } = await proAClient
      .from('appointments')
      .update({ status: 'no_show' })
      .eq('id', pastApptId);

    expect(updateError).toBeNull();

    const { data: rows, error: selectError } = await proAClient
      .from('appointments')
      .select('id, status, no_show_at, cancelled_at, cancellation_reason_code')
      .eq('id', pastApptId);

    expect(selectError).toBeNull();
    expect(rows).toHaveLength(1);
    expect(rows?.[0]?.status).toBe('no_show');
    expect(rows?.[0]?.no_show_at).not.toBeNull();
    expect(rows?.[0]?.cancelled_at).toBeNull();
    expect(rows?.[0]?.cancellation_reason_code).toBeNull();
  });
});
```

### 2.2. Configuration `package.json`
Le script `test:rls` intègre le nouveau fichier de test :
```json
"test:rls": "vitest run __tests__/integration/rls.integration.test.ts __tests__/integration/practice-structure-rls.integration.test.ts tests/integration/patient-registry-rls.integration.test.ts tests/integration/scheduling-rls.integration.test.ts tests/integration/waitlist-rls.integration.test.ts tests/integration/appointment-lifecycle-rls.integration.test.ts"
```

---

## 3. Matrice des Vérifications et Résultats de Tests

- `npm run test:scheduling` : 8/8 fichiers passés (82 tests)
- `npm run test:workspace` : 4/4 fichiers passés (33 tests)
- `npm run test:patients` : 6/6 fichiers passés (33 tests)
- `npm run test:practice-structure` : 5/5 fichiers passés (39 tests)
- `npm run test:dashboard` : 2/2 fichiers passés (8 tests)
- `npm run test:onboarding` : 3/3 fichiers passés (19 tests)
- `npm run test:security` : 5/5 fichiers passés (142 tests)
- `npm run test:unit` : 13/13 fichiers passés (38 tests)
- `npm run test:compliance` : 4/4 fichiers passés (16 tests)
- `npm run typecheck` : 0 erreur
- `npm run lint` : 0 erreur
- `npm run build` : Next.js 16.2.11 Turbopack build réussi (84 routes)
- `npm run test:e2e:compliance` : Passé (Playwright Chromium)

---

## 4. Validation Zero Lying Cast

```bash
grep -R -nE "as any|as unknown as|as never|: any" \
  tests/integration/appointment-lifecycle-rls.integration.test.ts \
  tests/integration/appointment-lifecycle-db-constraints.integration.test.ts
```
**Résultat** : **Exactement 0 occurrence**.

---

## 5. Traçabilité Git & CI

- **HEAD initial Session 10C** : `71956792c786a49ad5ee86e379e44a41ac0fab69`
- **Commit Code & Test** : `8fc9d6fde9ad923c7c1f71549ebf80af599e3fbc` (`fix(scheduling): make PostgREST lifecycle proof non-vacuous`)
- **CI Run ID Code & Test** : `34415863260`
  - **Status** : `completed`
  - **Conclusion** : `success`
  - **RLS Gate Execution** : `tests/integration/appointment-lifecycle-rls.integration.test.ts` (2 tests passed)

---

## 6. Statut & Clôture Définitive

- **Statut Session 10 / 10B / 10C** : **TERMINÉE ET VALIDÉE**
- **Readiness Session 11** : **OUI** (socle de cycle de vie des rendez-vous et liste d'attente certifié étanche).
