# SESSION 08 — PATIENT IDENTITY REGISTRY & REPRESENTATIVES

## 1. Objectif & Contexte Métier
La **Session 08** implémente le premier registre Patient du Workspace Paramédical de MonSERVICE.
Elle fournit la fondation d'identité administrative et de gestion des contacts/représentants légaux, strictement isolée par organisation et réservée aux utilisateurs professionnels paramédicaux.

### Périmètre Strict
- **Identité administrative civile** : Nom de naissance, premier prénom, tous les prénoms de naissance, nom d'usage, prénom d'usage, date de naissance, sexe administratif, lieu et code commune de naissance, pays de naissance.
- **Coordonnées** : Adresse postale, ville, code postal, pays de résidence, téléphone, email.
- **Représentants & Contacts** : Entité réutilisable de contact (parents, tuteurs légaux, conjoints, enfants majeurs, fratrie, aidants, autres) et table de liaison `patient_representative_links` avec qualification fine des rôles (représentant légal, contact principal, contact d'urgence, facturation, statut actif/archivé).
- **Zéro données cliniques** : Aucune donnée médicale, diagnostic, note clinique, symptôme, prescription ou traitement n'a été introduit.
- **Zéro INS / NIR** : Aucun numéro de sécurité sociale, NIR, NIA, matricule INS ou jeton INSi. MonSERVICE ne revendique aucune qualification INS dans cette session.

---

## 2. Modèle de Données & Schéma PostgreSQL

### Tables créées (Migration 0013)
1. `patient_profiles` : Dossier administratif patient.
2. `patient_representatives` : Contacts et représentants réutilisables.
3. `patient_representative_links` : Liens $N \times M$ entre un patient et un représentant au sein d'une même organisation.

### Contraintes & Intégrité Référentielle
- **CHECK Constraints** :
  - `patient_profiles_sex_check` : `sex IN ('female', 'male', 'indeterminate', 'unknown')`
  - `patient_rep_links_relationship_check` : `relationship IN ('parent', 'legal_guardian', 'spouse_partner', 'adult_child', 'sibling', 'caregiver', 'other')`
- **Composite Unique Indexes (cibles de FKs composites)** :
  - `patient_profiles_org_id_unique` : `UNIQUE (id, organization_id)`
  - `patient_representatives_org_id_unique` : `UNIQUE (id, organization_id)`
- **Composite Foreign Keys** :
  - `patient_representative_links(patient_id, organization_id) -> patient_profiles(id, organization_id)`
  - `patient_representative_links(representative_id, organization_id) -> patient_representatives(id, organization_id)`
- **Unicité d'assignation** :
  - `patient_rep_links_assignment_unique` : `UNIQUE (organization_id, patient_id, representative_id)`
- **Contact Principal Unique Actif** :
  - Index partiel : `patient_rep_links_primary_active_idx` ON `(organization_id, patient_id) WHERE is_primary_contact = true AND is_active = true`.

---

## 3. Sécurité RLS & Privilèges SQL

### RLS Policies
Toutes les tables du registre patient possèdent RLS activée avec une politique stricte d'isolation tenant + profil professionnel :
```sql
CREATE POLICY "patient_profiles_tenant_isolation" ON "patient_profiles"
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  organization_id = public.current_organization_id()
  AND EXISTS (
    SELECT 1 FROM public.users caller
    WHERE caller.id = auth.uid()::text
      AND caller.organization_id = public.current_organization_id()
      AND caller.profile_type = 'professional'
  )
)
WITH CHECK (
  organization_id = public.current_organization_id()
  AND EXISTS (
    SELECT 1 FROM public.users caller
    WHERE caller.id = auth.uid()::text
      AND caller.organization_id = public.current_organization_id()
      AND caller.profile_type = 'professional'
  )
);
```

### Privilèges
- `REVOKE ALL PRIVILEGES ON TABLE "patient_profiles", "patient_representatives", "patient_representative_links" FROM PUBLIC, anon, authenticated;`
- `GRANT SELECT, INSERT, UPDATE ON TABLE "patient_profiles", "patient_representatives", "patient_representative_links" TO authenticated;`
- Aucun privilège `DELETE` accordé : archivage logique exclusif (`is_active = false`).
- `anon` ne possède aucun privilège (code 42501 garanti).

---

## 4. Architecture Applicative & Zero-Cast

- **DTO & Types** (`src/lib/patients/types.ts`) : Typage strict sans aucun `any`.
- **Validation Zod** (`src/lib/patients/validation.ts`) : Contrôles sur les formats de date de naissance de calendrier réel (exclusion des dates impossibles et futures), validation emails et normalisation des chaînes vides en `null`.
- **Service Métier** (`src/lib/services/patient-registry.service.ts`) : Pagination native PostgreSQL (limit/offset/count), filtres insensibles à la casse `ilike`, gestion transactionnelle du basculement de contact principal.
- **Server Actions** (`src/app/actions/patient-registry.actions.ts`) : Protection stricte via `requireProfessional()` et vérification `workspace.type === 'paramedical'`. Revalidation ciblée du cache Next.js.
- **Zéro Cast** : Vérifié par grep — aucun `as any`, `as unknown as`, `as never`, ni `: any` dans tout le périmètre de production patient.

---

## 5. Gestion RGPD & Dette Documentée
- **Données Personnelles des Patients** : Les données de santé et dossiers patients appartiennent légalement à la structure professionnelle (responsable de traitement pour ses patients).
- **Export & Suppression de compte personnel** :
  - `exportMyDataAction()` exporte les données personnelles de l'utilisateur connecté et n'inclut pas l'intégralité du registre patient du cabinet.
  - `deleteMyAccountAction()` supprime le compte utilisateur sans hard-delete des dossiers patients du cabinet (obligation légale de conservation des dossiers de soins).
  - Cette distinction d'architecture est expressément documentée comme conforme aux exigences de séparation des données utilisateur vs données du registre patient.

---

## 6. Validation & Tests

- **Unit Tests** :
  - `tests/unit/patients/validation.test.ts` (14 tests)
  - `tests/unit/patients/actions.test.ts` (5 tests)
  - `tests/unit/patients/patient-page.test.tsx` (3 tests)
  - `tests/unit/patients/patient-new-page.test.tsx` (1 test)
  - `tests/unit/patients/patient-detail-page.test.tsx` (2 tests)
- **Integration Tests** :
  - `tests/integration/patient-registry-rls.integration.test.ts`
  - `tests/integration/patient-registry-db-constraints.integration.test.ts`
- **Contrats & CI** :
  - `scripts/check-schema-drift.ts` validé (0 drift).
  - `scripts/check-schema-contract.ts` enrichi (CHECK constraints, composite FKs, index critiques).
  - `scripts/check-custom-objects.ts` enrichi (GRANTS, RLS, sémantique exacte des policies).
  - `.github/workflows/test.yml` intègre le step bloquant `Run Patient Registry Unit Tests`.
