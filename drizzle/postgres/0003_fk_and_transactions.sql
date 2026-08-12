-- ===========================================================================
-- Migration 0003 — Clés étrangères, index, et transactions
--
-- PRÉREQUIS : 0001 et 0002 appliqués.
-- ===========================================================================

BEGIN;

-- Suppression des contraintes FK si elles existent déjà (idempotence)
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_organization_fk;
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_organization_fk;
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_client_fk;
ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_organization_fk;
ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_client_fk;
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_organization_fk;
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_client_fk;
ALTER TABLE invoice_lines DROP CONSTRAINT IF EXISTS invoice_lines_invoice_fk;
ALTER TABLE invoice_lines DROP CONSTRAINT IF EXISTS invoice_lines_product_fk;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_organization_fk;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_org_fk;
ALTER TABLE message_templates DROP CONSTRAINT IF EXISTS message_templates_org_fk;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_org_fk;
ALTER TABLE requests DROP CONSTRAINT IF EXISTS requests_client_fk;

-- Ajout des clés étrangères en cascade
ALTER TABLE clients
  ADD CONSTRAINT clients_organization_fk
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE contacts
  ADD CONSTRAINT contacts_organization_fk FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  ADD CONSTRAINT contacts_client_fk FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

ALTER TABLE deals
  ADD CONSTRAINT deals_organization_fk FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  ADD CONSTRAINT deals_client_fk FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

ALTER TABLE invoices
  ADD CONSTRAINT invoices_organization_fk FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  ADD CONSTRAINT invoices_client_fk FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

ALTER TABLE invoice_lines
  ADD CONSTRAINT invoice_lines_invoice_fk FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  ADD CONSTRAINT invoice_lines_product_fk FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;

ALTER TABLE tasks
  ADD CONSTRAINT tasks_organization_fk FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE messages
  ADD CONSTRAINT messages_org_fk FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE message_templates
  ADD CONSTRAINT message_templates_org_fk FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE products
  ADD CONSTRAINT products_org_fk FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE requests
  ADD CONSTRAINT requests_client_fk FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE;

COMMIT;
