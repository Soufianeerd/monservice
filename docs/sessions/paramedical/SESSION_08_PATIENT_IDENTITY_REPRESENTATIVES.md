# SESSION 08 — PATIENT IDENTITY REGISTRY & REPRESENTATIVES

## 1. Résumé Exécutif & Traçabilité Git
- **HEAD initial au démarrage de Session 08** : `12d52d5492522d56731f8f4ac9edb51c18635f21`
- **Commits Session 08 / 08B** :
  - `1cab1264f7187bfd47e74fa7e2b01b2cfee2d53f` : `feat(patients): implement patient identity registry and representatives (Session 08)`
  - `723062c8c1e16208830a72cef9ff8710f4ceb418` : `fix(tests): make patient-registry-db-constraints test self-contained with isolated org fixtures`
  - `fb3bb3355590d1a631d3326621acfc0e6cdf20f3` : `fix(patients): finalize patient registry contracts (Session 08B)`
- **Run GitHub Actions final validé 08B** : `33898749793` (status: `completed`, conclusion: `success`)
- **Migration DB** : `drizzle/postgres/0013_aspiring_daimon_hellstrom.sql` (aucune migration `0014` créée).
- **Statut** : **Validée / Complète**.

---

## 2. Décisions d'Architecture & Périmètre Métier

### Patients ≠ Clients CRM
- La table `clients` du CRM Generic n'est ni réutilisée, ni modifiée, ni renommée.
- `patient_profiles` constitue un modèle autonome, étanche, propre au Workspace Paramédical.
- Aucun champ `billing_client_id` ou `crm_client_id` n'est introduit dans cette session.

### Périmètre Administratif Strict
- **Identité administrative civile** : `birth_name`, `first_birth_name`, `birth_first_names`, `used_name`, `used_first_name`, `birth_date`, `sex`, `birth_place`, `birth_place_code`, `birth_country`.
- **Coordonnées** : `email`, `phone`, `address`, `city`, `postal_code`, `country`.
- **Représentants & Contacts** : `patient_representatives` (entité réutilisable de contact) et `patient_representative_links` (relation $N \times M$ avec qualification fine).

### Exclusions Strictes
- **Zéro données cliniques** : Aucun champ de diagnostic, antécédent, note clinique, traitement, symptôme, prescription ou mesure.
- **Zéro INS / NIR** : Aucun matricule INS, NIR, NIA, statut INS ou jeton INSi. MonSERVICE ne formule aucune revendication de qualification INS dans cette session.

---

## 3. Schéma PostgreSQL & Migration 0013

### Tables créées
1. `patient_profiles` (21 colonnes)
2. `patient_representatives` (13 colonnes)
3. `patient_representative_links` (12 colonnes)

### Intégrité Référentielle & Contraintes
- **CHECK constraints** :
  - `patient_profiles_sex_check` : `sex IN ('female', 'male', 'indeterminate', 'unknown')` (SQLSTATE `23514`).
  - `patient_rep_links_relationship_check` : `relationship IN ('parent', 'legal_guardian', 'spouse_partner', 'adult_child', 'sibling', 'caregiver', 'other')` (SQLSTATE `23514`).
- **Composite Unique Indexes (cibles de FKs composites)** :
  - `patient_profiles_org_id_unique` : `UNIQUE (id, organization_id)`
  - `patient_representatives_org_id_unique` : `UNIQUE (id, organization_id)`
- **Composite Foreign Keys** :
  - `patient_rep_links_patient_fk` : `(patient_id, organization_id) -> patient_profiles(id, organization_id)` (SQLSTATE `23503`).
  - `patient_rep_links_representative_fk` : `(representative_id, organization_id) -> patient_representatives(id, organization_id)` (SQLSTATE `23503`).
- **Unicité d'assignation** :
  - `patient_rep_links_assignment_unique` : `UNIQUE (organization_id, patient_id, representative_id)` (SQLSTATE `23505`).
- **Contact Principal Unique Actif** :
  - Index partiel : `patient_rep_links_primary_active_idx` ON `(organization_id, patient_id) WHERE is_primary_contact = true AND is_active = true` (SQLSTATE `23505`).
- **Homonymie / Identité Civile Partagée** :
  - Aucun index unique sur `(birth_name, first_birth_name, birth_date)`. Deux patients distincts peuvent légitimement partager les mêmes traits d'état civil.

---

## 4. Sécurité RLS & Privilèges

### RLS Policies
Toutes les tables Patient possèdent RLS activée avec une politique stricte d'isolation tenant + profil professionnel :
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

### Privilèges SQL
- `REVOKE ALL PRIVILEGES ON TABLE "patient_profiles", "patient_representatives", "patient_representative_links" FROM PUBLIC, anon, authenticated;`
- `GRANT SELECT, INSERT, UPDATE ON TABLE "patient_profiles", "patient_representatives", "patient_representative_links" TO authenticated;`
- Aucun privilège `DELETE` accordé (archivage logique `is_active = false`).
- `anon` ne possède aucun privilège SQL (rejet immédiat code `42501`).

---

## 5. Couche Métier & Invariants Endpoints Actifs

### Service (`src/lib/services/patient-registry.service.ts`)
- **`linkRepresentative`** :
  - Vérifie que le patient existe dans le tenant ET `isActive === true`.
  - Vérifie que le représentant existe dans le tenant ET `isActive === true`.
  - En cas de lien existant inactif, réactivation autorisée si et seulement si les deux extrémités sont actives.
- **`createRepresentativeAndLink`** :
  - Vérifie que le patient cible existe dans le tenant ET `isActive === true`.
  - Transaction atomique : création du représentant + création du lien.
- **`setRepresentativeLinkActive`** :
  - En cas de réactivation (`isActive = true`), vérifie impérativement que le patient ET le représentant cibles sont actifs.
  - En cas d'archivage (`isActive = false`), opération exécutée sans blocage.
- **Transaction Contact Principal** :
  - Lorsqu'un lien actif devient contact principal, tous les autres liens actifs du même patient perdent automatiquement ce flag de manière atomique.

### Validation (`src/lib/patients/validation.ts`)
- Dates de naissance de calendrier réel (exclusion des dates impossibles comme le 30 février et des dates futures).
- Filtre `patientListFiltersSchema.birthDate` : validation stricte du calendrier réel `YYYY-MM-DD` et normalisation des chaînes vides en `null`.

### Server Actions (`src/app/actions/patient-registry.actions.ts`)
- Double barrière de protection : `requireProfessional()` et vérification `workspace.type === 'paramedical'`.
- Revalidations ciblées du cache Next.js (`/patients`, `/patients/[id]`).

---

## 6. Interface Utilisateur & Navigation

- `/patients` : Registre paginé avec recherche multi-critères (nom, prénom, date de naissance, statut actif/archivé) et pagination PostgreSQL.
- `/patients/new` : Formulaire de création administrative civile avec validation synchrone.
- `/patients/[id]` : Vue détaillée, modification d'identité, gestion des représentants, qualifications des rôles et bascules de statut.
- Intégration Sidebar paramédicale (`/patients`) et Quick Link sur le Practice Dashboard.

---

## 7. Cadre RGPD & Traitement des Données

- **Nature du Registre** : Le registre des patients est traité dans le cadre de l'activité professionnelle de santé et paramédicale du cabinet (responsable de traitement pour sa patientèle).
- **Séparation Compte Utilisateur / Registre Cabinet** :
  - `exportMyDataAction()` exporte les données personnelles rattachées au compte de l'utilisateur connecté.
  - `deleteMyAccountAction()` supprime le compte utilisateur sans détruire les dossiers administratifs de la structure.
- **Cycle de Vie & Rétention** : La politique complète de conservation, droits des personnes concernées, durées légales sectorielles et archivage pérenne sera formellement cadrée lors de la session dédiée à la Compliance.

---

## 8. Suites de Tests & Vérifications CI

- **`tests/unit/patients/`** :
  - `patient-registry.service.test.ts` : tests des invariants d'extrémités actives (rejet si patient ou représentant archivé, réactivation conditionnelle).
  - `validation.test.ts` : validation civile, formats de date, filtre de recherche `birthDate`.
  - `actions.test.ts` : protection d'accès, permissions et guards.
  - `patient-page.test.tsx`, `patient-new-page.test.tsx`, `patient-detail-page.test.tsx` : rendu UI et interactions.
- **`tests/integration/`** :
  - `patient-registry-db-constraints.integration.test.ts` : unicité composite, FK composite cross-tenant (`23503`), index partiel contact principal (`23505`), CHECK constraints (`23514`), et preuve d'autorisation de duplication d'identité civile. Typage strict zéro-any.
  - `patient-registry-rls.integration.test.ts` : tests réels avec Supabase Auth (Pro A, Pro B, Client A, Anon) couvrant SELECT, UPDATE et INSERT sur les 3 tables avec intégrité vérifiée.
- **Zero-Cast Grep** : 0 occurrence de `as any`, `as unknown as`, `as never`, `: any` sur l'ensemble du code de production et de test du périmètre Patient.

---

## 9. Readiness Session 09
- **Statut** : **OUI**
- Les fondations d'identité administrative et de représentants du registre Patient sont closes, étanches et validées.
