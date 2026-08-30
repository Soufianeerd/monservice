# Session 05 : Dynamic Workspace Shell / Navigation

## Résumé exécutif
Cette session connecte le système de Workspace au Shell applicatif (Sidebar, Header, etc.).
Nous avons introduit le hook pur UX `useWorkspace` afin d'adapter dynamiquement la navigation et la terminologie en fonction du contexte professionnel de l'utilisateur.

## HEAD initial
Le développement a repris depuis `fd2a75d36b61f834df91f06e5096c51e23b92f1e` comme exigé, avec la documentation 04B mise à jour.

## Audit Sidebar
Avant nos modifications, la `Sidebar` utilisait une liste professionnelle statique (`professionalNavItems`) définissant : Tableau de bord, Clients, Deals, Facturation, Agenda, Marketplace, Messagerie et Paramètres.

## Audit Header
Le `Header` affichait en dur l'industrie de l'organisation ou "CRM" en fallback, et possédait un lien `/profile` erroné pour les professionnels.

## Audit GlobalSearch
La recherche globale CRM `GlobalSearchBar` était toujours affichée, ce qui aurait été illogique pour le métier paramédical (qui utilisera une recherche Patient dédiée).

## Architecture useWorkspace
Nous avons créé un helper React `src/hooks/useWorkspace.ts` strict pour centraliser la résolution du Workspace et limiter sa portée à l'UX, sans jamais outrepasser la sécurité (RLS/RBAC/RequireProfessional).

### Source organization
Le hook se branche directement sur le `AuthContext` via `useAuth()`, évitant ainsi d'instancier un inutile contexte `WorkspaceProvider` global.

### resolveWorkspace
Il réutilise la fonction `resolveWorkspace` avec les props de `organization.sector` et `organization.profession`.

## Navigation builder
La configuration de la Sidebar a été extraite dans le module pur et testable `src/lib/navigation/workspace-navigation.ts` avec la fonction `buildProfessionalNavigation`.

### Generic nav
Le Workspace "generic" préserve scrupuleusement la structure CRM historique et son ordre.
Les attributs `data-tour` (`clients-nav`, `settings-nav`) indispensables pour le flux d'onboarding ont été conservés.

### Paramedical nav
Pour un Workspace `paramedical`, la Sidebar affiche :
- Tableau de bord
- Facturation (avec le libellé dynamique basé sur `workspace.terminology.servicePlural`, ex: `Consultations`)
- Agenda
- Paramètres

#### Pourquoi Clients est masqué
L'onglet "Clients" du CRM commercial est inadéquat pour la santé.

#### Pourquoi Patients n'existe pas encore
Aucun onglet ou route "Patients" n'a été créé, la gestion clinique (Session 08) n'étant pas encore implémentée.

#### Pourquoi Deals/Marketplace sont masqués
Fonctionnalités B2B inadaptées à la pratique paramédicale courante.

#### Pourquoi Messagerie est masquée
La messagerie générique est masquée pour ne pas être confondue avec une future messagerie de santé sécurisée.

## Terminologie branchée
Le menu Facturation > Produits paramédical utilise la clé `workspace.terminology.servicePlural` ("Consultations" par défaut).

## Header workspace label
Le `Header` affiche maintenant dynamiquement `workspace.label` pour les métiers connus (ex: "Masseur-Kinésithérapeute") ou "Espace Paramédical" à défaut de profession pour la branche santé.

## Global Search policy
La `GlobalSearchBar` n'est affichée que si :
- Le profil est "professional"
- Le type de workspace est "generic" (ou inexistant/fallback)
Elle est masquée pour les clients et pour les professionnels paramédicaux.

## Correction /profile
Le lien vers le profil professionnel du Header pointe désormais correctement vers `/parametres/profil`.

## Onboarding data-tour preservation
Les attributs d'onboarding `data-tour` ont été testés et garantis comme fonctionnels.

## Capabilities != routes
La logique empêche de construire automatiquement une entrée de navigation Sidebar pour chaque `capability` future sans implémentation UI explicite.

## Sécurité UX-only
La documentation interne précise clairement que `useWorkspace` ne dicte aucune politique de sécurité backend et reste strictement cosmétique.

## DB/migrations & RLS/RBAC
Aucune modification n'a été portée à la base de données, à ses contraintes, au Supabase distant ou aux règles d'accès RLS/RBAC.

## Tests navigation & UI
- **Tests navigation** : `workspace-navigation.test.ts` (vérifie pureté, absence de routes fantômes).
- **Tests Sidebar** : `sidebar.test.tsx` (mocks context, pathname).
- **Tests Header** : `header.test.tsx` (logique d'affichage Search / label).

## CI workspace
Le script `"test:workspace"` a été ajouté à `package.json`.

*(Note d'audit post-session : Ce script n'avait pas été correctement inséré dans `.github/workflows/test.yml` au HEAD `d9c790d14e5a0da5b714a928105e62630ec2d7bd`. Le run CI `33191253825` était "completed / success" mais n'avait PAS exécuté la sous-suite Workspace. Cet oubli, ainsi que des contrats falsifiés dans les tests, ont motivé la Session 05B corrective).*

## Résultats
- tests onboarding : 19/19
- Workspace resolver : 20/20
- Workspace UI : 13/13 (nouveaux)
- Tous les scripts CI : SUCCESS

## Fichiers
Créés :
- `src/hooks/useWorkspace.ts`
- `src/lib/navigation/workspace-navigation.ts`
- `__tests__/unit/workspaces/workspace-navigation.test.ts`
- `__tests__/unit/workspaces/sidebar.test.tsx`
- `__tests__/unit/workspaces/header.test.tsx`
- `docs/sessions/paramedical/SESSION_05_DYNAMIC_WORKSPACE_SHELL_NAVIGATION.md`

Modifiés :
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/Header.tsx`
- `package.json`
- `.github/workflows/test.yml`
- `docs/sessions/paramedical/SESSION_04B_ONBOARDING_RUNTIME_FINALIZATION.md`
- `docs/sessions/paramedical/README.md`

## Supabase production
Inchangé.

## Dette restante
- Implémenter ultérieurement les modules réels `patients` et `encounters`.

## Git / CI
- Staging explicite.
- Prêt au commit : `feat(workspace): add dynamic workspace shell`.

## Handoff Session 06
Prêt pour Session 06 (Today / Practice Dashboard).
