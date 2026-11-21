# 01 — Architecture et dette technique

## Cartographie (branche `migration/neon-full` @ `e4c82fc`)

| Élément | Mesure |
|---|---|
| Fichiers suivis | 918 |
| Code `src/` | ~66 400 lignes TS/TSX |
| Pages | 108 (`(auth)` 6, `(dashboard)` 71, `client/*` 21, publiques et légales 10) |
| Routes API | 24 |
| Fichiers `'use server'` | 40 |
| Services (`src/lib/services`) | 57 fichiers |
| Tables | 57 dans `0000_structure.sql` + 2 d'identité + tables des migrations 0014–0018 |
| Migrations actives | `drizzle/neon/0000`–`0018` (0014–0018 non rejouées en production) |
| Tests | 104 fichiers unitaires/intégration, 19 specs Playwright |

Pile : Next.js 16.4.5 (App Router), React 19.2.4, TypeScript strict, Drizzle 0.45, `postgres` 3.4, Neon (PostgreSQL, Auth gérée Better Auth 1.7.18, stockage S3), Stripe 22, Resend 6, Netlify.

## Points forts

- **Une seule source d'identité** (`src/lib/auth/session.ts`) : toute action passe par `requireSession` / `requireProfessional`.
- **Client SQL à portée de sécurité** (`src/lib/db/security-context.ts`) : chaque requête s'exécute dans une transaction qui vérifie le rôle (`monservice_runtime`, sans `BYPASSRLS` ni super-utilisateur) et pose l'identité du fournisseur en variable locale.
- **Garde-fous de migration** : `db:push` neutralisé, registre à sommes de contrôle, vérifications de dérive, de contrat et d'objets personnalisés.
- **Chemin métier unique** : Server Actions vers services, pas d'API de données parallèle.

## Constats

| ID | Constat | Preuve | Correction | Priorité |
|---|---|---|---|---|
| LR-019a | Fichiers géants difficiles à faire évoluer | `scheduling.service.ts` 3 095 lignes, `clinical-record.service.ts` 2 160, `OperationDetailClient.tsx` 1 164, `devis/nouveau/page.tsx` 912 | Découper par cas d'usage lors des prochaines évolutions, pas de refonte dédiée | P3 |
| LR-019b | Alias trompeur hérité de SQLite | `schema.ts:72` `const sqliteTable = pgTable` | Renommer mécaniquement | P3 |
| LR-019c | Deux arborescences de tests et deux moteurs | `__tests__/` et `tests/` ; `jest`, `ts-jest`, `jest-environment-jsdom` installés alors que tout tourne sous Vitest | Fusionner sous `tests/`, retirer Jest | P3 |
| LR-019d | 16 contournements de typage restants | `grep "as any\|as never\|@ts-ignore"` dans `src/` | Poursuivre le travail du commit `f05c614` | P2 |
| LR-019e | 348 avertissements ESLint | `npx eslint .` | Traiter par lots, viser 0 dans `src/app/actions` | P3 |
| LR-019f | Code mort | `einvoice.service.ts` (aucun appelant), `mfa.service.ts` (lève toujours une erreur) et routes `/api/auth/mfa*`, `speakeasy`, `/api/deals/sign` (410), `src/middleware/rate-limit.ts` (jamais importé) | Brancher ou retirer ; voir LR-008, LR-013, LR-014 | P2 |
| LR-019g | Résidus | dossiers `supabase/`, `drizzle/postgres` (historique fermé, à conserver), `drizzle/manual_untracked`, `run-migrations.js`, 4 langues dans `public/locales` pour une interface monolingue | Supprimer `supabase/` et les locales inutilisées après vérification | P3 |
| LR-021 | L'authentification repose sur un SDK en version bêta | `@neondatabase/auth ^0.7.0-beta` ; l'instabilité d'un point d'accès bêta a causé 5 runs CI rouges | Figer la version exacte, suivre les notes de version, prévoir un plan de repli documenté | P2 |
| LR-026 | Un lot JavaScript client de 1,49 Mo contient le moteur PDF | `.next/static/chunks/*` (build local) : `react-pdf`, `pdfkit` | Charger le rendu PDF à la demande (`next/dynamic`) ou le générer côté serveur | P2 |
| LR-027 | Le build échoue si le secret de cookie manque, car il est lu au chargement du module | `src/lib/db/server.ts:7` → `auth/server` | Rendre la lecture paresseuse ; c'est aussi la cause des échecs de build Netlify sans variables | P2 |

## Incohérences entre workspaces

- La **limite d'équipe** (`teamMembers`) existe dans les plans, les tables RBAC existent, mais aucun écran ne crée un second utilisateur (LR-007). Les trois workspaces supposent pourtant des équipes (praticiens, techniciens assignés).
- La **marketplace** et la **messagerie** supposent des clients connectés ; elles perdent leur objet en V1 (LR-022, LR-023).
- Le calendrier du workspace terrain affiche les échéances, pas les interventions planifiées (constat du 9 novembre, non revérifié).

## Documentation contre réalité

| Document | Affirmation | Réalité |
|---|---|---|
| Description du projet (handoff) | Session 19 non démarrée, migration Neon à faire | Sessions 19, 19B et 20 livrées ; Neon en place sur la branche |
| `LANCEMENT_CHECKLIST.md` | « Code validé (CI verte) » | Vrai pour `197a3ee` ; les 5 runs suivants sont rouges |
| `LANCEMENT_CHECKLIST.md` | Ouverture avec invitation des clients au portail | Contredit par la règle V1 du 17 novembre |
| Page d'accueil | Plans à 29, 79 et 149 € | Lancement gratuit, Stripe désactivé |
| `plans.ts` (commentaire) | « source de vérité unique » des limites | Vrai, et c'est précisément ce qui bloque le lancement gratuit (LR-003) |
