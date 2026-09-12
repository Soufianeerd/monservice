# Session 12B — Clinical Record Expansion Finalization

## 1. Résumé Exécutif & Root Causes

L'audit GitHub post-CI de la Session 12 a identifié plusieurs écarts contractuels critiques qui ont été résolus de manière exhaustive dans cette Session 12B :

1. **Autorité Unique du `documentId` (Single Document ID Authority)** :
   - *Problème identifié* : L'action générait un UUID pour le chemin Storage (`storagePath`), puis le service de métadonnées générait un UUID distinct pour la clé primaire `clinical_documents.id`.
   - *Correction* : Un `documentId` unique est généré côté serveur au début de l'orchestration dans `uploadClinicalDocumentAction` et transmis explicitement à `createClinicalDocumentMetadata`. Le 4e segment du `storagePath` (`${orgId}/${practitionerId}/${patientId}/${documentId}/${filename}`) est rigoureusement identique à `clinical_documents.id`.

2. **Compensation Transactionnelle Storage (Storage Orphan Rollback)** :
   - *Problème identifié* : En cas d'échec de l'insertion DB des métadonnées après un upload Storage réussi, le fichier restait orphelin dans le bucket.
   - *Correction* : Implémentation d'une compensation interne sécurisée (`removeFileAfterFailedMetadataWrite`). Si l'insertion DB échoue, l'objet uploadé est immédiatement supprimé via l'API Storage avec droits d'administration serveur.
   - *Sécurité* : Aucune permission `DELETE` utilisateur n'est accordée sur Supabase Storage, aucun bouton de suppression n'est exposé, et aucune donnée clinique n'est loggée en cas d'erreur.

3. **Cohérence Composite Care Episode / Encounter (DB & Service Levels)** :
   - *Problème identifié* : Lorsqu'un document, une réponse de formulaire ou une mesure référençait à la fois un `care_episode_id` et un `encounter_id`, rien ne garantissait au niveau base ou service que la séance appartienne effectivement à cet épisode de soin.
   - *Correction DB* : Ajout d'un index composite `UNIQUE` sur `clinical_encounters(id, organization_id, care_episode_id, patient_id, practitioner_id)` et de 3 clés étrangères composites sur `clinical_documents`, `clinical_form_responses` et `clinical_measurements` dans la migration `0017_omniscient_spiral.sql`.
   - *Correction Service* : Helper centralisé `validateClinicalContextLinks(...)` vérifiant la cohérence et levant `CLINICAL_CONTEXT_MISMATCH` (`AppError`) en cas de divergence.

4. **Authentification Non-Vacueuse & Matrice RLS / Storage Exhaustive** :
   - *Problème identifié* : Présence potentielle de chemins d'échappement silencieux dans les tests d'intégration RLS.
   - *Correction* : Introduction du helper `signInOrThrow` validant obligatoirement les sessions de `pro_a`, `pro_b`, `client_a` et `staff_a`. Matrice d'isolation RLS et Storage testée exhaustivement sur les 4 tables et le bucket `clinical-documents` (upload positif, génération URL signée, téléchargement HTTP réel, isolation inter-praticiens, rejet total staff/client/anon).

5. **Migration Unique 0017 & Snapshot Drizzle** :
   - Aucun fichier `0018` créé.
   - La migration `0017_omniscient_spiral.sql` a été corrigée et consolidée sur place (`CANONICAL / NOT_APPLIED`).
   - Le snapshot `0017_snapshot.json` et le journal `_journal.json` sont parfaitement alignés avec `schema.ts`.

---

## 2. Détail des Correctifs Techniques

### 2.1. Invariants de Base de Données (Migration 0017)

```sql
-- Cible unique composite sur clinical_encounters
CREATE UNIQUE INDEX "clinical_encounters_id_org_episode_patient_practitioner_unique"
ON "clinical_encounters" ("id", "organization_id", "care_episode_id", "patient_id", "practitioner_id");

-- FK composite de cohérence épisode / séance sur clinical_documents
ALTER TABLE "clinical_documents"
ADD CONSTRAINT "clinical_documents_encounter_episode_fk"
FOREIGN KEY ("encounter_id", "organization_id", "care_episode_id", "patient_id", "practitioner_id")
REFERENCES "public"."clinical_encounters"("id", "organization_id", "care_episode_id", "patient_id", "practitioner_id");

-- FK composite de cohérence épisode / séance sur clinical_form_responses
ALTER TABLE "clinical_form_responses"
ADD CONSTRAINT "clinical_form_responses_encounter_episode_fk"
FOREIGN KEY ("encounter_id", "organization_id", "care_episode_id", "patient_id", "practitioner_id")
REFERENCES "public"."clinical_encounters"("id", "organization_id", "care_episode_id", "patient_id", "practitioner_id");

-- FK composite de cohérence épisode / séance sur clinical_measurements
ALTER TABLE "clinical_measurements"
ADD CONSTRAINT "clinical_measurements_encounter_episode_fk"
FOREIGN KEY ("encounter_id", "organization_id", "care_episode_id", "patient_id", "practitioner_id")
REFERENCES "public"."clinical_encounters"("id", "organization_id", "care_episode_id", "patient_id", "practitioner_id");
```

### 2.2. Service & Actions d'Extension Clinique

- `src/lib/services/clinical-storage.service.ts` :
  - `removeFileAfterFailedMetadataWrite(storagePath)` : compensation interne via client admin `SUPABASE_SERVICE_ROLE_KEY`.
- `src/lib/services/clinical-record.service.ts` :
  - `validateClinicalContextLinks(organizationId, patientId, practitionerId, careEpisodeId, encounterId)` : validation stricte de l'appartenance `encounter.careEpisodeId === careEpisodeId`.
- `src/app/actions/clinical-record.actions.ts` :
  - `uploadClinicalDocumentAction` : génération de `documentId = randomUUID()`, construction de `storagePath`, upload Storage, insertion DB `createClinicalDocumentMetadata({ id: documentId, ... })`, et bloc `catch` exécutant `removeFileAfterFailedMetadataWrite` avant re-throw.

---

## 3. Matrice de Sécurité & RLS

| Acteur | `clinical_documents` | `clinical_form_templates` | `clinical_form_responses` | `clinical_measurements` | Storage `clinical-documents` |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Pro A (Owner Org A)** | SELECT, INSERT, UPDATE (métadonnées) | SELECT, INSERT, UPDATE | SELECT, INSERT, UPDATE (drafts) | SELECT, INSERT (pas d'UPDATE) | Upload, Signed URL, Read |
| **Pro B (Owner Org B)** | Isolé de Org A | Isolé de Org A | Isolé de Org A | Isolé de Org A | Isolé de Org A |
| **Cross-Tenant Pro A -> Org B** | 0 ligne / Rejet | 0 ligne / Rejet | 0 ligne / Rejet | 0 ligne / Rejet | Rejet / 403 |
| **Client A (Patient)** | 0 ligne / Rejet | 0 ligne / Rejet | 0 ligne / Rejet | 0 ligne / Rejet | Rejet / 403 |
| **Staff A (Non lié praticien)** | 0 ligne / Rejet | 0 ligne / Rejet | 0 ligne / Rejet | 0 ligne / Rejet | Rejet / 403 |
| **Anon (Non authentifié)** | 0 ligne / Rejet | 0 ligne / Rejet | 0 ligne / Rejet | 0 ligne / Rejet | Rejet / 403 |

---

## 4. Matrice des Tests & Résultats

- `npm run test:clinical` : **12/12 fichiers passés (93 tests)**
  - Tests unitaires d'orchestration `uploadClinicalDocumentAction` (égalité documentId, rollback Storage).
  - Tests unitaires du service clinique (`validateClinicalContextLinks`, erreur `CLINICAL_CONTEXT_MISMATCH`).
- `npm run test:unit` : **13/13 fichiers passés (38 tests)**
- `npm run test:security` : **5/5 fichiers passés (145 tests)**
- `npm run test:db-constraints` : Invariants d'intégrité DB vérifiés (rejet SQLSTATE 23503 sur mismatch épisode/séance pour les 3 tables).
- `npm run test:rls` : Matrice RLS non-vacueuse validée avec `signInOrThrow`.
- `npm run db:check-drift` : **0 drift**.
- `npm run typecheck` : **0 erreur**.
- `npm run lint` : **0 warning bloquant**.
- Zero Lying Cast Policy : **0 `as any`**, **0 `as unknown as`**, **0 `: any`**.

---

## 5. Traçabilité Git & CI

- **HEAD initial Session 12B** : `d4d9d6b44541c47ba5618cd40425b0e24bad4624`
- **Commits Réalisés** :
  - `c172782` : `fix(clinical): finalize record expansion integrity and storage atomicity`
  - `8ee901f` : `fix(clinical): synchronize 0017 schema snapshot and eliminate drift`
  - `1c57278` : `test(clinical): use storage api for cleanup in rls integration test`
- **CI Run ID Code & Tests** : `34722540138`
  - **Head SHA** : `1c57278`
  - **Status** : `completed`
  - **Conclusion** : `success`
- **Statut Session 12B** : **TERMINÉE ET VALIDÉE**
- **Readiness Session 13** (Profession Packs Spécialisés) : **OUI**
