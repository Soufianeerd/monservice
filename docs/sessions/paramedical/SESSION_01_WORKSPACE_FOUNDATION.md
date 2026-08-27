# Session 01 — Workspace Foundation

## 1. Résumé exécutif
Mise en place de la fondation logicielle (mécanisme de Workspaces) permettant à MonSERVICE de charger dynamiquement une configuration métier ("paramédical", "generic", etc.) basée sur les informations de l'organisation. L'objectif est de préparer le terrain pour le Practice Operating System paramédical sans casser l'existant.

## 2. Contexte général MonSERVICE
MonSERVICE est une plateforme SaaS core qui sert de base pour divers métiers (artisanat, services, paramédical). Le projet vise à proposer une expérience utilisateur sur mesure pour chaque secteur sans pour autant scinder le code en plusieurs applications.

## 3. État du projet avant la session
Le projet possédait une table `organizations` dans PostgreSQL contenant les colonnes `sector` et `profileType`, mais aucune logique frontend/backend permettant d'adapter la terminologie, les capacités ou l'interface selon le type de métier ou de secteur.

## 4. Objectifs exacts de cette session
- Créer l'architecture de configuration de Workspace (`src/lib/workspaces/`).
- Introduire des types TS pour modéliser des métiers, des terminologies et des capacités (`capabilities`).
- Créer un resolveur de configuration pur et testable (`resolveWorkspace`).
- Mettre en place un espace de configuration pour les professions paramédicales.
- Garder le système entièrement rétrocompatible et ne rien casser côté fonctionnel.

## 5. Audit réalisé avant modification
- `src/lib/db/schema.ts` : La table `organizations` a une colonne `sector`. Pas de colonne `profession` pour l'instant, d'où la nécessité de gérer proprement les données partielles ou manquantes.
- `README.md` et `AGENTS.md` : Lecture des conventions en place (Next.js config, base PG).

## 6. Architecture retenue
L'architecture de `src/lib/workspaces/` a été mise en place avec :
- `types.ts` : Définit les types fondamentaux (`WorkspaceType`, `WorkspaceConfig`, `WorkspaceTerminology`, `WorkspaceCapability`).
- `resolver.ts` : Contient la fonction pure `resolveWorkspace` qui prend le contexte de l'organisation (`sector`, `profession`) et retourne la bonne configuration.
- `generic/config.ts` : Contient la configuration de repli par défaut pour les utilisateurs non liés à la santé.
- `paramedical/config.ts`, `paramedical/professions.ts`, `paramedical/capabilities.ts`, `paramedical/terminology.ts` : Définissent la terminologie et les caractéristiques des professions paramédicales.

## 7. Décisions prises
- **Choix du fallback** : Toute donnée inconnue ou manquante bascule par sécurité sur la configuration `generic`.
- **Mécanisme typé de professions** : Les professions paramédicales (`physiotherapist`, `osteopath`, etc.) sont typées littéralement dans `ParamedicalProfessionCode` pour éviter l'éparpillement de strings magiques.
- **Séparation de la terminologie** : Isoler la terminologie dans un objet distinct pour préparer la traduction de l'UI (Sidebar, etc.) sans modifier React aujourd'hui.

## 8. Fichiers créés
- `src/lib/workspaces/types.ts` : Types de base pour l'architecture.
- `src/lib/workspaces/resolver.ts` : Logique de résolution du workspace.
- `src/lib/workspaces/index.ts` : Point d'entrée pour les exports du module workspaces.
- `src/lib/workspaces/generic/config.ts` : Config générique fallback.
- `src/lib/workspaces/paramedical/config.ts` : Générateur de config paramédicale.
- `src/lib/workspaces/paramedical/professions.ts` : Base de données des professions paramédicales supportées.
- `src/lib/workspaces/paramedical/capabilities.ts` : Liste des features/capacités paramédicales (ex: `patients`, `clinicalRecords`).
- `src/lib/workspaces/paramedical/terminology.ts` : Dictionnaire de termes (ex: "Patient", "Consultation").
- `__tests__/unit/workspaces/resolver.test.ts` : Tests unitaires.
- `docs/sessions/paramedical/README.md` : Index de documentation.
- `docs/sessions/paramedical/SESSION_01_WORKSPACE_FOUNDATION.md` : La présente documentation.

## 9. Fichiers modifiés
Aucun fichier préexistant n'a été modifié pour garantir un niveau de risque 0 sur le fonctionnement actuel.

## 10. Fichiers supprimés
Aucun fichier supprimé.

## 11. Base de données
- Migration : aucune
- Schema DB modifié : non
- Supabase modifié : non
- New Query exécutée : non

## 12. Backend
Aucun changement sur les services ou API routes Backend.

## 13. Frontend
Aucun changement sur les composants React (Sidebar, Dashboard...).

## 14. Sécurité
Le `resolveWorkspace` est une fonction purement utilitaire pour paramétrer l'UX et la terminologie du Frontend. **Ce n'est PAS un mécanisme d'autorisation (RBAC).** L'accès aux données doit continuer à être vérifié par le backend / RLS (Row Level Security).

## 15. Tests ajoutés
- Résolution avec aucun contexte (null/undefined) retourne `generic`.
- Résolution avec un secteur non lié à la santé retourne `generic`.
- Résolution avec `sector: 'health'` retourne config `paramedical`.
- Résolution avec `sector: 'health'` et profession `physiotherapist` retourne label spécifique.
- Résolution avec `sector: 'health'` et profession `osteopath` retourne label spécifique.
- Résolution avec profession inconnue `unknown_profession` fallback sans crash.

## 16. Tests exécutés
Commande : `npm run typecheck`
Résultat : Succès
Durée : ~4s
Erreurs : Aucune

Commande : `npm run lint`
Résultat : Succès (avec des warnings existants non liés à mon code)
Durée : ~10s
Erreurs : Aucune

Commande : `npx vitest run __tests__/unit/workspaces/resolver.test.ts`
Résultat : Succès (7/7 tests passés)
Durée : ~2.37s
Erreurs : Aucune

## 17. Bugs rencontrés
Aucun.

## 18. Bugs corrigés
N/A

## 19. Dette technique restante
N/A. Le code ajouté est entièrement neuf, typé et testé.

## 20. Risques de régression
Le risque est quasi nul car aucun code existant n'est modifié, la solution introduite est purement additive et ne sera appelée que par les prochaines sessions.

## 21. Points volontairement NON traités
- Modification du schéma DB pour inclure formellement la `profession` (réservé pour la session 2).
- Connexion du Workspace resolver à la Sidebar et aux formulaires d'inscription Santé.
- Onboarding, Navigation, Dashboard santé, Gestion des patients et dossiers cliniques.

## 22. État fonctionnel à la fin de la session
Le produit est dans le même état fonctionnel qu'au début de la session, mais dispose maintenant de la logique `resolveWorkspace` utilisable partout dans l'app.

## 23. Vérifications manuelles réalisées
Validation de la compilation TS (`tsc --noEmit`), exécution du linter (`eslint .`) et des tests unitaires (`vitest`).

## 24. Recommandation pour la Session 02
La Session 02 devra probablement traiter la persistance du workspace et de la profession dans l'organisation. Cela inclura potentiellement l'ajout du champ `profession` au schéma DB de la table `organizations` et sa gestion lors de l'onboarding / création d'organisation.

## 25. Fichiers importants à transmettre au prochain agent
- `src/lib/workspaces/types.ts`
- `src/lib/workspaces/resolver.ts`
- `src/lib/db/schema.ts` (pour l'étape d'ajout en base)

## 26. État Git
- Branche actuelle : `main`
- Message de commit prévu : `feat(workspace): add paramedical workspace foundation`
- Push : Sera effectué

## 27. Synthèse autonome pour le prochain agent IA
Cette session a mis en place la structure `src/lib/workspaces/` (types, configs, professions paramédicales, capacités et terminologie). Le point d'entrée est la fonction `resolveWorkspace(context)` dans `resolver.ts` qui prend un `OrganizationContext` (sector, profession) et retourne un objet typé `WorkspaceConfig`. 
Actuellement, tout est prêt côté pure TypeScript (avec 100% de passage des tests vitest et strict TS), mais ce module n'est pas encore branché dans l'UI ou dans la base de données. 
Votre tâche probable sera d'ajouter la colonne `profession` dans la table `organizations` (dans `schema.ts`) et de l'injecter au chargement du contexte utilisateur pour brancher le resolver à l'UI/Sidebar sans casser les autres professions (generic fallback).
