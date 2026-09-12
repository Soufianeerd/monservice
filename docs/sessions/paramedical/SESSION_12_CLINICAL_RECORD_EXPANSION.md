# Session 12 — Clinical Record Expansion: Documents, Forms, Structured Measurements & Unified Timeline

> **Note de clôture** : Les contrats et l'atomicité de stockage de cette session ont été audités, complétés et finalisés par la **Session 12B** (`SESSION_12B_CLINICAL_RECORD_EXPANSION_FINALIZATION.md`).

## 1. Résumé Exécutif

La Session 12 étend le socle clinique paramédical de **MonService** (établi en Session 11) en transformant la fondation épisodes/séances/notes en un dossier patient complet, structuré et sécurisé :
1. **Extension du Schéma Clinique & Migration Canonique Unique** :
   - Exactly 4 nouvelles tables métier créées : `clinical_documents`, `clinical_form_templates`, `clinical_form_responses`, `clinical_measurements`.
   - Migration Drizzle unique : `drizzle/postgres/0017_omniscient_spiral.sql` (journalisée à l'index 17 dans `_journal.json`).
   - Migrations antérieures `0013`, `0014`, `0015`, `0016` strictement intactes.
   - Production Supabase préservée (`0017` classifiée `CANONICAL / NOT_APPLIED`).
2. **Stockage Privé Sécurisé & Isolation des Chemins de Fichiers** :
   - Bucket Storage privé Supabase dédié : `clinical-documents` (`public = false`, limite 10 MiB / 10485760 octets, types autorisés : `application/pdf`, `image/jpeg`, `image/png`, `image/webp`).
   - Politiques RLS Storage strictes sur `storage.objects` : le praticien ne peut lire/écrire/mettre à jour que les objets dont le chemin respecte le préfixe `${organizationId}/${practitionerId}/${patientId}/...`.
   - Génération d'URL signées éphémères (durée par défaut 60s) pour le téléchargement sécurisé sans exposition d'URL publiques directes.
3. **Moteur de Questionnaires / Formulaires Structurés & Mesures Cliniques** :
   - Templates de formulaires (`clinical_form_templates`) avec schéma typé (`schema_json` en `jsonb`) supportant les champs dynamiques et archivage logique (`is_active = false`).
   - Réponses aux formulaires (`clinical_form_responses`) avec données typées (`response_data` en `jsonb`), statut brouillon/complété (`draft` / `completed`) et verrouillage d'immuabilité une fois complété.
   - Mesures structurées (`clinical_measurements`) avec support exclusif `value_numeric XOR value_text`, codes cliniques standards (ex: `pain_score`, `rom`, `weight`, etc.), unités et dates d'observation (`recorded_at`).
4. **Timeline Clinique Chronologique Unifiée** :
   - Agrégation déterministe et triée par date décroissante des 7 discriminants réels d'événements cliniques : `episode_opened`, `episode_closed`, `encounter`, `note`, `document`, `form_response`, `measurement`.
5. **Autorisation Clinique Dédiée & Cloisonnement Praticien (Owner-Only RLS)** :
   - Politiques RLS strictes garantissant qu'un praticien accède uniquement à ses propres documents, templates, réponses et mesures cliniques.
   - Les utilisateurs non rattachés (`staff_a`) et les clients obtiennent 0 ligne en lecture/écriture.
   - Suppression dure strictement interdite (`REVOKE DELETE` sur toutes les tables d'extension clinique).
6. **Machines à États et Invariants PostgreSQL Renforcés** :
   - Document : trigger `enforce_clinical_document_mutation()` bloquant toute mutation structurelle (`organization_id`, `patient_id`, `practitioner_id`, `care_episode_id`, `encounter_id`, `storage_path`, `file_name`, `mime_type`, `size_bytes`), tout en autorisant les métadonnées modifiables (`title`, `category`, `is_archived`).
   - Réponse formulaire : trigger `enforce_clinical_form_response_transition()` bloquant la régression `completed -> draft` et toute modification d'une réponse complétée.
   - Mesure clinique : trigger `enforce_clinical_measurement_insert()` vérifiant la contrainte d'exclusion `value_numeric XOR value_text` à l'insertion.
   - Clés étrangères composites strictes garantissant l'alignement `(organization_id, patient_id, practitioner_id)` entre toutes les tables.
7. **Zero Lying Cast Policy** :
   - 0 `as any`, 0 `as unknown as`, 0 `as never`, 0 `: any` sur l'ensemble du périmètre développé.

---

## 2. Architecture & Modèle de Données

### 2.1. Tables Cliniques d'Extension (`src/lib/db/schema.ts`)

```sql
-- Table clinical_documents
CREATE TABLE "clinical_documents" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "patient_id" text NOT NULL,
  "practitioner_id" text NOT NULL,
  "care_episode_id" text,
  "encounter_id" text,
  "title" text NOT NULL,
  "category" text DEFAULT 'other' NOT NULL,
  "storage_path" text NOT NULL,
  "file_name" text NOT NULL,
  "mime_type" text NOT NULL,
  "size_bytes" integer NOT NULL,
  "is_archived" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Table clinical_form_templates
CREATE TABLE "clinical_form_templates" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "practitioner_id" text NOT NULL,
  "name" text NOT NULL,
  "kind" text DEFAULT 'assessment' NOT NULL,
  "description" text,
  "schema_json" jsonb NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Table clinical_form_responses
CREATE TABLE "clinical_form_responses" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "patient_id" text NOT NULL,
  "practitioner_id" text NOT NULL,
  "template_id" text NOT NULL,
  "care_episode_id" text,
  "encounter_id" text,
  "response_data" jsonb NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Table clinical_measurements
CREATE TABLE "clinical_measurements" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "patient_id" text NOT NULL,
  "practitioner_id" text NOT NULL,
  "care_episode_id" text,
  "encounter_id" text,
  "code" text NOT NULL,
  "label" text NOT NULL,
  "value_numeric" numeric(12, 4),
  "value_text" text,
  "unit" text,
  "recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
```

### 2.2. Politiques RLS Storage (`drizzle/postgres/0017_omniscient_spiral.sql`)

```sql
-- Bucket privé (10 MiB limit, 4 MIME types)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'clinical-documents',
  'clinical-documents',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

-- RLS SELECT / INSERT / UPDATE sur storage.objects
CREATE POLICY "clinical_documents_storage_select_owner_only" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'clinical-documents'
  AND (storage.foldername(name))[1] = public.current_organization_id()
  AND (storage.foldername(name))[2] = public.current_clinical_practitioner_id()
);
```

---

## 3. Matrice des Vérifications et Résultats de Tests

- `npm run test:clinical` : 12/12 fichiers passés (93 tests)
- `npm run test:unit` : 13/13 fichiers passés (38 tests)
- `npm run test:security` : 5/5 fichiers passés (145 tests)
- `npm run typecheck` : 0 erreur (`tsc --noEmit`)
- `scripts/check-schema-contract.ts` : 46 tables conformes
- `scripts/check-custom-objects.ts` : Triggers, RLS et Storage policies conformes
- `tests/integration/clinical-record-expansion-db-constraints.integration.test.ts` : Invariants DB passés
- `tests/integration/clinical-record-expansion-rls.integration.test.ts` : Isolation RLS & Storage passée

---

## 4. Validation Zero Lying Cast

```bash
grep -R -nE "as any|as unknown as|as never|: any" \
  src/lib/clinical \
  src/lib/services/clinical-record.service.ts \
  src/lib/services/clinical-storage.service.ts \
  src/app/actions/clinical-record.actions.ts \
  src/components/clinical \
  tests/unit/clinical \
  tests/integration/clinical-record-expansion-db-constraints.integration.test.ts \
  tests/integration/clinical-record-expansion-rls.integration.test.ts
```
**Résultat** : **Exactement 0 occurrence**.

---

## 5. Traçabilité Git & CI

- **HEAD initial Session 12** : `4ac307d75f7ed94c7c34d75f1702e430aabdda42`
- **Statut Session 12** : **TERMINÉE ET VALIDÉE** (finalisée et durcie par la Session 12B)
- **Readiness Session 13** (Packs Métier Paramédicaux Spécialisés) : **OUI**
