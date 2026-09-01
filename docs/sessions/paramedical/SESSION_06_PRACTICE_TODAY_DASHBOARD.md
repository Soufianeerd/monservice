# Session 06 : Practice / Today Dashboard

## Résumé exécutif
Cette session introduit le premier véritable écran métier du Workspace paramédical : le tableau de bord "Aujourd'hui".
Conformément aux instructions, aucune entité clinique n'a été créée. Le dashboard se base uniquement sur les données existantes (les Tâches) afin d'offrir une vue utile, réelle, sobre et évolutive sans inventer de concepts métiers ni de statistiques vides (comme les patients ou les rendez-vous).

## HEAD initial
`878d25ba8102219407c700fa408a8891605504d0`

## Audit
- Le Dashboard CRM initial (generic) appelait `getProfessionalStatsAction` et `getDealsAction`, récupérant des statistiques commerciales, deals en cours et factures.
- Le calendrier existant agrège actuellement factures, deals et tâches ; il ne représente donc pas un vrai planning de soins.
- Il n'y a pas encore de table `patients`, `appointments`, `encounters`, ou `care_episodes`.
- La résolution du Workspace côté serveur permet un aiguillage robuste des requêtes.

## Branching Workspace Côté Serveur
- La page `src/app/(dashboard)/dashboard/page.tsx` résout désormais le Workspace via `resolveWorkspace` avec les propriétés `sector`, `profession` et `country` de l'organisation connectée.
- **Paramedical Workspace :**
  - Appelle `getPracticeDashboardAction`.
  - Rend le `ParamedicalPracticeDashboard`.
  - Empêche strictement l'exécution des appels CRM `getProfessionalStatsAction` et `getDealsAction`.
- **Generic Workspace :**
  - Continue d'appeler les requêtes CRM.
  - Rend l'UI historique complète.

## Practice Dashboard
- **Données :** Basé sur la table `tasks`. 
- **Tâches ouvertes :** Statut différent de `completed` et `cancelled`.
- **Tri :** Top 5 tâches ouvertes basées sur l'échéance (priorité haute en cas d'égalité).
- **Service dédié :** `practiceDashboardService` garanti de limiter toutes les requêtes au `organizationId` pour respecter le tenant scope.
- **Interface :**
  - En-tête "Aujourd'hui" avec le nom de l'organisation et le label de la profession.
  - Résumé des tâches (si vide : Empty State de félicitations).
  - Liens rapides vers les modules existants (Agenda, Tâches, Facturation, Organisation).
  - Absence stricte de références à `Patients`, `Deals`, `Clients` ou `Rendez-vous`.

## Dette Technique Consciente (Documentée)
- Le lien vers "Nouvelle tâche" (ex. `/agenda/taches/new`) redirige vers `/tasks`, ce qui est une ancienne dette technique CRM. Nous n'exposons pas ce flux dans les Quick Links pour éviter cette boucle cassée en attendant la refonte.

## Validation CI et Sécurité
- Tests unitaires complets écrits pour valider le rendu du composant et le branchement du Server Component.
- La CI a été mise à jour avec une nouvelle étape bloquante `Run Dashboard Unit Tests` dans `.github/workflows/test.yml`.
- Aucune migration de base de données n'a été ajoutée. La structure et la RLS restent inchangées.
- Validation des suites `workspace`, `onboarding` et de tous les tests globaux (security, unit, compliance, lint, typecheck, build).

## État Final de la Session 06
- **Commit Session 06 :** `2ab2c64e91d7170eaa74b7978c84e596996f7360`
- **Run CI :** `33528475307`
- **Status :** `completed`
- **Conclusion :** `success`

## Audit Post-Session (Motivant 06B)
Bien que l'architecture métier et le flux soient corrects, un audit post-session a révélé plusieurs écarts de contrat (traités dans la **Session 06B**) :
- Un cast `as any` a été réintroduit en production pour fabriquer une fausse organisation de secours.
- Les tests ont utilisé des mocks `as any` et réintroduit un faux Workspace paramédical, violant les règles durcies en 05B.
- Les assertions de data-tours (`toBeDefined`) étaient vacues (le résultat `null` du `querySelector` les passait).
- Les mocks pour les appels au Server Component manquaient de typage strict.
- La récupération des tâches chargeait toutes les lignes en mémoire (non scalable) plutôt que d'utiliser `count` et `LIMIT 5` en DB.

## Readiness Session 07
Les bases du tableau de bord étant posées sans inventer de données, la structure est prête. **Cependant, la Session 07 est bloquée jusqu'à la finalisation stricte des contrats et des tests lors de la Session 06B.**
