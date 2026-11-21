-- 0022 — Identité légale et coordonnées bancaires de l'entreprise (S-02).
--
-- Une facture française doit porter le SIRET, la forme juridique, le numéro
-- de TVA ou la mention « TVA non applicable, art. 293 B du CGI », et les
-- conditions de paiement. Ces informations n'avaient aucune colonne : le PDF
-- affichait « SIREN / TVA : N/A ». Migration additive : colonnes facultatives,
-- aucune donnée existante modifiée. Les droits UPDATE de monservice_runtime
-- sur la table couvrent les nouvelles colonnes ; la politique
-- organizations_owner_update reste l'unique garde.

ALTER TABLE public.organizations
  ADD COLUMN legal_form text,
  ADD COLUMN siret text,
  ADD COLUMN vat_number text,
  ADD COLUMN vat_exempt boolean NOT NULL DEFAULT false,
  ADD COLUMN iban text,
  ADD COLUMN bic text;

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_siret_format CHECK (siret IS NULL OR siret ~ '^[0-9]{14}$'),
  ADD CONSTRAINT organizations_iban_format CHECK (iban IS NULL OR iban ~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$'),
  ADD CONSTRAINT organizations_bic_format CHECK (bic IS NULL OR bic ~ '^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$'),
  ADD CONSTRAINT organizations_legal_form_length CHECK (legal_form IS NULL OR char_length(legal_form) <= 80),
  ADD CONSTRAINT organizations_vat_number_format CHECK (vat_number IS NULL OR vat_number ~ '^[A-Z]{2}[A-Z0-9]{2,13}$');
