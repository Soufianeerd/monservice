-- ---------------------------------------------------------------------------
-- Migration 0001 — corrections issues de l'audit de sécurité (anomalies P0)
--
-- À appliquer sur la base PostgreSQL (Supabase) AVANT de déployer le code
-- corrigé. Idempotente : peut être rejouée sans risque.
--
-- Application :
--   psql "$DATABASE_URL" -f drizzle/postgres/0001_audit_p0_fixes.sql
-- ---------------------------------------------------------------------------

BEGIN;

-- 1. Colonnes référencées par le code mais absentes du schéma
--    (dérive constatée : le webhook Stripe et Stripe Connect écrivaient
--     dans des colonnes inexistantes)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS email                 text,
  ADD COLUMN IF NOT EXISTS currency              text DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS industry              text,
  ADD COLUMN IF NOT EXISTS stripe_account_id     text,
  ADD COLUMN IF NOT EXISTS stripe_account_status text;

-- 2. Registre d'idempotence du webhook Stripe (anomalie MS-014)
CREATE TABLE IF NOT EXISTS stripe_events (
  id           text PRIMARY KEY,   -- event.id fourni par Stripe
  type         text NOT NULL,
  processed_at text NOT NULL
);

-- 3. Index sur les colonnes de filtrage multitenant (anomalie MS-020)
--    Sans eux, chaque lecture est un parcours complet de table.
CREATE INDEX IF NOT EXISTS clients_organization_id_idx            ON clients (organization_id);
CREATE INDEX IF NOT EXISTS contacts_organization_id_idx           ON contacts (organization_id);
CREATE INDEX IF NOT EXISTS contacts_client_id_idx                 ON contacts (client_id);
CREATE INDEX IF NOT EXISTS deals_organization_id_idx              ON deals (organization_id);
CREATE INDEX IF NOT EXISTS deals_client_id_idx                    ON deals (client_id);
CREATE INDEX IF NOT EXISTS products_organization_id_idx           ON products (organization_id);
CREATE INDEX IF NOT EXISTS invoices_organization_id_idx           ON invoices (organization_id);
CREATE INDEX IF NOT EXISTS invoices_client_id_idx                 ON invoices (client_id);
CREATE INDEX IF NOT EXISTS invoice_lines_invoice_id_idx           ON invoice_lines (invoice_id);
CREATE INDEX IF NOT EXISTS tasks_organization_id_idx              ON tasks (organization_id);
CREATE INDEX IF NOT EXISTS messages_sender_id_idx                 ON messages (sender_id);
CREATE INDEX IF NOT EXISTS messages_receiver_id_idx               ON messages (receiver_id);
CREATE INDEX IF NOT EXISTS messages_request_id_idx                ON messages (request_id);
CREATE INDEX IF NOT EXISTS requests_client_id_idx                 ON requests (client_id);
CREATE INDEX IF NOT EXISTS users_organization_id_idx              ON users (organization_id);
CREATE INDEX IF NOT EXISTS message_templates_organization_id_idx  ON message_templates (organization_id);

-- 4. Unicité du numéro de facture au sein d'une organisation
--    (la numérotation par comptage pouvait produire des doublons en
--     situation de concurrence)
--    NOTE : échouera si des doublons existent déjà. Les identifier avec :
--      SELECT organization_id, number, count(*) FROM invoices
--      GROUP BY 1,2 HAVING count(*) > 1;
CREATE UNIQUE INDEX IF NOT EXISTS invoices_org_number_unique
  ON invoices (organization_id, number);

-- 5. Normalisation des adresses e-mail (comparaison insensible à la casse)
UPDATE users SET email = lower(trim(email)) WHERE email <> lower(trim(email));

COMMIT;

-- ---------------------------------------------------------------------------
-- ÉTAPES SUIVANTES — À FAIRE MANUELLEMENT, HORS DE CE FICHIER
-- ---------------------------------------------------------------------------
--
-- a) CLÉS ÉTRANGÈRES (anomalie MS-020)
--    Non incluses ici car elles échoueront tant que des lignes orphelines
--    existent. Identifier d'abord les orphelins, par exemple :
--      SELECT c.id FROM clients c
--      LEFT JOIN organizations o ON o.id = c.organization_id
--      WHERE o.id IS NULL;
--    puis appliquer, table par table :
--      ALTER TABLE clients ADD CONSTRAINT clients_organization_fk
--        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
--
-- b) ROW-LEVEL SECURITY (anomalies MS-005, MS-022) — À VÉRIFIER EN PRIORITÉ
--    La clé publique Supabase est exposée dans le bundle navigateur. Sans RLS,
--    l'API PostgREST est interrogeable directement, en contournant
--    entièrement l'application. Vérifier l'état actuel :
--      SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
--    Si `rowsecurity` est `false` sur une table contenant des données clients,
--    c'est une anomalie P0 supplémentaire à traiter immédiatement.
--
--    L'application accédant à la base via Drizzle avec le rôle propriétaire,
--    activer RLS sans politique bloque l'API publique sans casser l'app :
--      ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
--      -- (répéter pour chaque table)
--    À tester en préproduction avant la production.
