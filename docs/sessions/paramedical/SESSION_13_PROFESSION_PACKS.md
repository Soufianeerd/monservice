# Session 13 — Paramedical Profession Packs

## 1. Résumé Exécutif

La Session 13 transforme le workspace paramédical générique (stabilisé lors des sessions 01 à 12B) en une expérience adaptée aux 7 professions paramédicales canoniques sans dupliquer le moteur applicatif ni altérer le schéma de base de données :

1. **Masseur-Kinésithérapeute (`physiotherapist`)**
2. **Ostéopathe (`osteopath`)**
3. **Orthophoniste (`speech_therapist`)**
4. **Pédicure-Podologue (`podiatrist`)**
5. **Ergothérapeute (`occupational_therapist`)**
6. **Psychomotricien (`psychomotor_therapist`)**
7. **Diététicien (`dietitian`)**

### Invariants Architecturaux
- **Moteur Unique & Architecture par Packs** : Aucun fork de route (`/kine/*`, `/dieteticien/*` interdits), aucun composant manager dupliqué. Le Generic Paramedical Engine consomme le pack résolu dynamiquement.
- **Autorité Serveur Stricte** : La profession, l'organisation, le praticien et le secteur sont exclusivement dérivés de la session côté serveur. Tout payload client tentant de forger `organizationId`, `practitionerId`, `profession` ou `schema` brut est ignoré ou rejeté (`INVALID_PRESET_ID`).
- **Zéro Migration DB / Zéro Nouvelle Table** : Aucune migration `0018` créée. Les migrations `0013` à `0017` demeurent strictement intactes (0 diff).
- **Persistance Supabase / PostgreSQL** : L'installation des modèles de formulaires ou des types de séance s'appuie sur les tables et services existants (`clinical_form_templates`, `appointment_types`) sous contrôle RLS et isolation multi-tenant.
- **Idempotence & Sécurité Clinique** : Les presets constituent des suggestions éditables et non des dispositifs médicaux ou protocoles obligatoires. L'installation est idempotente et prévient les doublons par double-clic.

---

## 2. Architecture & Registry des Profession Packs

### 2.1. Typage Strict (`src/lib/workspaces/paramedical/profession-packs/types.ts`)
- `ParamedicalAppointmentTypePreset` : identifiant stable, nom, description, durée en minutes, buffers avant/après, pas de créneau.
- `ParamedicalFormTemplatePreset` : identifiant stable, nom, kind (`assessment` ou `follow_up`), description, schéma conforme au validateur strict Session 12 (champs `text`, `textarea`, `number`, `boolean`, `single_choice`, `multiple_choice`, `date`, `scale`).
- `ParamedicalMeasurementPreset` : code canonique (`^[a-z0-9][a-z0-9_.-]{0,99}$`), label, type de valeur (`numeric` | `text`), unité optionnelle.
- `ParamedicalProfessionTerminology` : terminologie spécialisée (`customerSingular`, `customerPlural`, `appointmentSingular`, `appointmentPlural`, `serviceSingular`, `servicePlural`, `assessmentLabel`, `followUpLabel`, `clinicalRecordHeading`).
- `ParamedicalProfessionPack` : profession, labels, terminologie, presets de types de rendez-vous, modèles de formulaires, mesures rapides et configuration UX.

### 2.2. Registry Exhaustif & Résolution de Terminologie
- `PARAMEDICAL_PROFESSION_PACKS satisfies Record<ParamedicalProfessionCode, ParamedicalProfessionPack>` : contrainte TypeScript garantissant l'exhaustivité à la compilation.
- `getParamedicalProfessionPack(code)` : résout le pack correspondant ou renvoie `undefined` si profession nulle ou inconnue (fallback gracieux vers le workspace paramédical générique).
- `requireParamedicalProfessionPack(code)` : lève `AppError('INVALID_PROFESSION_PACK')` si le code n'est pas reconnu.
- `getParamedicalWorkspaceConfig(professionCode)` : résout `terminology: professionPack?.terminology ?? PARAMEDICAL_TERMINOLOGY`, permettant une personnalisation sémantique stricte des menus et des vues (ex. *"Séances de kinésithérapie"*, *"Consultations diététiques"*).

---

## 3. Détail des 7 Profession Packs (23 Mesures Rapides)

| Profession Code | Libellé | Types de séance | Formulaires préconfigurés | Mesures rapides (Total : 23) |
| :--- | :--- | :--- | :--- | :--- |
| **`physiotherapist`** | Masseur-Kinésithérapeute | Bilan initial (45m), Suivi (30m) | Bilan initial kinésithérapique, Fiche de suivi de séance | `pain_score`, `range_of_motion`, `walking_distance`, `functional_score` (4) |
| **`osteopath`** | Ostéopathe | Première consultation (60m), Suivi (45m) | Première consultation ostéopathique, Suivi ostéopathique | `pain_score`, `mobility_score`, `posture_observation` (3) |
| **`speech_therapist`** | Orthophoniste | Bilan orthophonique (60m), Suivi (30m) | Bilan orthophonique initial, Suivi d'objectifs et rééducation | `goal_progress`, `session_engagement`, `phoneme_accuracy` (3) |
| **`podiatrist`** | Pédicure-Podologue | Bilan podologique (45m), Soin de pédicurie (30m) | Bilan podologique et postural initial, Suivi podologique et appareillage | `pain_score`, `mobility_score`, `comfort_rating` (3) |
| **`occupational_therapist`** | Ergothérapeute | Évaluation initiale (60m), Suivi (45m) | Évaluation ergothérapique initiale, Suivi fonctionnel et autonomie | `functional_independence_score`, `goal_progress`, `autonomy_score` (3) |
| **`psychomotor_therapist`** | Psychomotricien | Bilan psychomoteur (60m), Suivi (45m) | Bilan psychomoteur initial, Suivi de séance et médiation | `goal_progress`, `session_engagement`, `motor_score` (3) |
| **`dietitian`** | Diététicien | Première consultation (60m), Suivi (30m) | Bilan nutritionnel initial, Suivi nutritionnel et habitudes | `weight`, `height`, `bmi`, `waist_circumference` (4) |

---

## 4. Sécurité & Autorité Serveur

### 4.1. Installation des Modèles de Formulaire (`createClinicalFormTemplateFromPresetAction`)
- **Signature Minimale** : `createClinicalFormTemplateFromPresetAction(rawPresetId: unknown)` (suppression du paramètre superflu `patientId` pour minimiser la surface d'entrée, la revalidation étant gérée au niveau composant).
- **Flux d'Autorité** :
  1. `requireClinicalPractitionerContext()` extrait la session, l'organisation et le praticien authentifié.
  2. Vérification que le secteur est bien `health` et que la profession est définie.
  3. Résolution du pack via `getParamedicalProfessionPack(context.profession)`.
  4. Vérification que le `presetId` appartient strictement au pack du praticien (réponse non-énumérante `PRESET_NOT_FOUND` en cas de preset inexistant ou appartenant à un autre pack).
  5. Validation du schéma du preset via `clinicalFormTemplateInputSchema`.
  6. Idempotence : si un modèle actif avec même nom et même `kind` existe déjà pour ce praticien, l'action renvoie l'existant sans duplication.
  7. Insertion DB via `clinicalRecordService.createFormTemplate`.

### 4.2. Installation des Types de Séance (`installParamedicalAppointmentTypePresetAction`)
- **Flux d'Autorité** :
  1. `requireProfessional()` + vérification du secteur `health`.
  2. Résolution du pack associé à l'organisation.
  3. Vérification de l'appartenance du preset au pack (`PRESET_NOT_FOUND` si absent ou cross-profession).
  4. Idempotence : si un type de séance avec le même nom (normalisé) et la même durée existe déjà dans l'organisation, le type existant est réutilisé ou réactivé.
  5. Insertion DB via `schedulingService.createAppointmentType`.

### 4.3. Mesures Rapides
- Les presets de mesure ne déclenchent aucune écriture automatique. Le clic sur un preset pré-remplit uniquement les champs du formulaire client (`code`, `label`, `unit`, `valueType`). La persistance requiert la validation explicite du praticien via `createClinicalMeasurementAction`.

---

## 5. Matrice des Tests & Vérifications

| Suite de tests | Nombre de tests | Statut |
| :--- | :--- | :--- |
| `test:workspace` | 66 tests (5 fichiers) | ✅ Pass |
| `test:clinical` | 117 tests (15 fichiers) | ✅ Pass |
| `test:scheduling` | 82 tests (8 fichiers) | ✅ Pass |
| `test:dashboard` | 9 tests (2 fichiers) | ✅ Pass |
| `test:security` | 145 tests (5 fichiers) | ✅ Pass |
| `test:onboarding` | 19 tests (3 fichiers) | ✅ Pass |
| `test:patients` | 33 tests (6 fichiers) | ✅ Pass |
| `test:practice-structure` | 39 tests (5 fichiers) | ✅ Pass |
| `test:unit` | 38 tests (13 fichiers) | ✅ Pass |
| `test:compliance` | 16 tests (4 fichiers) | ✅ Pass |
| `db:check-drift` | 0 drift / 0 migration | ✅ Pass |
| `typecheck` (`tsc --noEmit`) | 0 erreur | ✅ Pass |
| `lint` (`eslint .`) | 0 erreur | ✅ Pass |
| `next build` | 84 pages générées avec succès | ✅ Pass |
| **GitHub Actions CI (`test.yml`)** | **Run ID: 34860073860** | **✅ SUCCESS** |

---

## 6. Clôture de Session

- **Statut** : Terminée
- **Code Commit SHA** : `f1b52db4075dd1371ad52fd0d8ea085e43c0e2bd`
- **Code CI Status** : `completed` / `success` (Run ID: `34860073860`)
- **Migration Invariant** : 0018 n'existe pas. Migrations 0013-0017 intactes.
- **Règle Zéro Lying Cast** : 0 `as any`, 0 `as unknown as`, 0 `@ts-ignore`.
