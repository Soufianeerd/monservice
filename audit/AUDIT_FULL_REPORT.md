# Audit intégral du SaaS `monservice` — état de préparation à la production

**Rapport détaillé** — 6 août 2026 — HEAD `0dad655`

---

## Sommaire

1. [Verdict, P0 et P1](#1-verdict-p0-et-p1)
2. [Limites de l'audit](#2-limites-de-laudit)
3. [Compréhension du produit](#3-compréhension-du-produit)
4. [Architecture et cartographie](#4-architecture-et-cartographie)
5. [Inventaires](#5-inventaires)
6. [Anomalies détaillées P0](#6-anomalies-détaillées--p0)
7. [Anomalies P1 / P2 / P3](#7-anomalies-p1--p2--p3)
8. [Scores par domaine](#8-scores-par-domaine)
9. [Domaines non testés](#9-domaines-non-testés)

---

## 1. Verdict, P0 et P1

### Verdict : 🔴 **NO-GO**

12 anomalies P0 vérifiées. Une seule suffirait. Le produit n'est ni sécurisable ni exploitable en l'état, et n'est de surcroît pas fonctionnel (MS-008).

### P0 (12)

`MS-001` middleware inopérant · `MS-002` server actions sans auth · `MS-003` dump utilisateurs + hachages · `MS-004` prise de contrôle de compte · `MS-005` isolation multitenant nulle · `MS-006` identité par cookie non signé · `MS-007` fraude paiement/signature · `MS-008` auth scindée NextAuth/Supabase · `MS-009` variable Supabase incohérente · `MS-010` build Netlify cassé par Stripe · `MS-011` aucune sauvegarde · `MS-012` détournement Stripe Connect

### P1 (21)

`MS-013` → `MS-033`. Voir §7 et `AUDIT_FINDINGS.csv`.

---

## 2. Limites de l'audit

| Contrôle | Statut | Raison |
|---|---|---|
| Tests black-box (HTTP, en-têtes, TLS, redirections) | `BLOQUÉ` | Aucune URL publique fournie |
| Tests grey-box (rôles, locataires réels) | `BLOQUÉ` | Aucun compte de test fourni |
| `next build` | `BLOQUÉ` | Binaire natif `lightningcss.linux-arm64-gnu.node` absent (limite du bac à sable, pas du produit) |
| `vitest run` | `BLOQUÉ` | Binaire natif `@rolldown/binding` absent (même cause) |
| `playwright test` | `NON TESTÉ` | Nécessite un serveur applicatif démarré |
| RLS Supabase, politiques de stockage | `NON TESTÉ` | Pas d'accès au projet Supabase |
| Configuration Netlify (variables, en-têtes, domaine, TLS) | `NON TESTÉ` | Pas d'accès à la console |
| Configuration Stripe (webhooks, produits, mode live) | `NON TESTÉ` | Pas d'accès au tableau de bord |
| Performance réelle (Core Web Vitals, p95/p99) | `NON TESTÉ` | Aucun environnement déployé |
| Accessibilité WCAG 2.2 AA (clavier, lecteur d'écran) | `NON TESTÉ` | Aucun rendu accessible ; revue de code uniquement |
| Responsive / cross-browser | `NON TESTÉ` | Idem |
| Restauration de sauvegarde | `NON TESTÉ` | Aucune sauvegarde n'existe (voir MS-011) |
| `tsc --noEmit` | `VÉRIFIÉ` | 0 erreur |
| `eslint .` | `VÉRIFIÉ` | 251 erreurs, 148 avertissements |
| Inspection base SQLite locale | `VÉRIFIÉ` | 12 tables, 3 utilisateurs, dérive de schéma constatée |
| Historique Git (secrets) | `VÉRIFIÉ` | Aucun `.env` versionné |

**Aucune exploitation active n'a été menée.** Aucune donnée réelle n'a été lue, modifiée ou exfiltrée. Aucun e-mail, SMS ou paiement n'a été déclenché. Les conclusions d'exploitabilité sont des **analyses de code**, pas des démonstrations d'attaque — elles sont donc marquées `VÉRIFIÉ (statique)`.

---

## 3. Compréhension du produit

### 3.1 Problème métier

`monservice` est un **CRM SaaS pour indépendants et TPE de service**, doublé d'une **marketplace bifaciale** mettant en relation des clients particuliers/professionnels (`profileType: 'client'`) et des prestataires (`profileType: 'professional'`).

### 3.2 Personas et rôles

| Persona | `profileType` | Espace | Fonctions |
|---|---|---|---|
| Prestataire / indépendant | `professional` | `/dashboard`, `/clients`, `/deals`, `/facturation`, `/agenda`, `/marketplace` | CRM complet, devis, factures, signature, marketplace côté offre |
| Client final | `client` | `/client/*` | Demandes, devis reçus, factures, paiement, messagerie |
| Visiteur | — | `/`, `/pro/[slug]`, `/demo`, pages légales | Vitrine, profils publics |
| Administrateur | *inexistant* | — | **Aucune interface d'administration n'existe** |

> **Constat structurant** : la colonne `role` est écrite par `registerAction` (`role: 'admin'` en dur) mais **n'existe pas dans le schéma** (`src/lib/db/schema.ts`). Le RBAC repose entièrement sur `profileType`, qui n'a que deux valeurs. Il n'y a **ni rôle manager, ni support, ni comptable, ni administrateur global**. La matrice RBAC demandée est donc en grande partie vide par construction (voir `RBAC_MATRIX.csv`).

### 3.3 Modèle économique

Trois plans (`src/components/landing/Pricing.tsx`) :

| Plan | Prix | Limites annoncées |
|---|---|---|
| Free | 0 €/mois | 50 clients, 10 devis/mois, support e-mail |
| Pro | 29 €/mois | — |
| Business | 79 €/mois | — |

**Aucune de ces limites n'est implémentée.** Recherche exhaustive de `subscriptionTier` dans `src/` : 6 occurrences, toutes en **affichage** (`BillingPlans.tsx`, page facturation) ou en **écriture** (webhook). Aucune lecture en tant que garde-fou. Un compte Free a exactement les mêmes droits qu'un compte Business (**MS-019**).

### 3.4 Parcours critiques identifiés

Inscription → connexion → onboarding → création client → devis → signature → facture → paiement Stripe → relance.
Côté marketplace : publication de demande → découverte prestataire → réponse/devis → messagerie → facturation.

**État réel de ces parcours** : voir `BUSINESS_RULES_MATRIX.csv`. En résumé — connexion `CASSÉ` (MS-008), signature `NON FIABLE` (MS-007), relance `INEXISTANT` (MS-018), e-mail `SIMULÉ` (MS-015), quotas `INEXISTANT` (MS-019).

### 3.5 Opérations irréversibles

- `clientService.deleteWithCascade` : supprime contacts, deals, factures et tâches **sans transaction**. Une erreur en cours de route laisse la base incohérente (**MS-020**).
- `invoiceService.delete` : supprime une facture déjà émise — sans avoir juridique, sans conservation. Problématique au regard des obligations comptables françaises (conservation 10 ans).
- Aucune corbeille, aucun `deletedAt`, aucun undo, aucun journal d'audit.

---

## 4. Architecture et cartographie

### 4.1 Carte du système

```
                        ┌──────────────────────────────┐
   Navigateur ────────► │  Next.js 16 App Router       │
   (React 19)           │  Netlify + plugin-nextjs     │
                        └──────────────┬───────────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
   ┌────▼─────┐              ┌─────────▼─────────┐          ┌─────────▼────────┐
   │ proxy.ts │              │  Server Actions   │          │   Routes API     │
   │(middlew.)│              │      (~80)        │          │       (7)        │
   │ INOPÉRANT│              │  AUCUNE AUTH      │          │  AUTH PARTIELLE  │
   │  MS-001  │              │     MS-002        │          │  MS-012/013      │
   └──────────┘              └─────────┬─────────┘          └─────────┬────────┘
                                       │                              │
                             ┌─────────▼──────────────────────────────▼───────┐
                             │        Couche services (17 services)           │
                             │  contrôle org partiel, contournable (MS-005)   │
                             └─────────────────────┬──────────────────────────┘
                                                   │ Drizzle ORM
                             ┌─────────────────────▼──────────────────────────┐
                             │  SQLite (local)  ‖  PostgreSQL/Supabase (prod)  │
                             │  sans FK, sans index, sans RLS (MS-020/022)     │
                             └────────────────────────────────────────────────┘

   Identité :  ⚠️ DEUX systèmes concurrents et incompatibles ⚠️
     • NextAuth (Credentials + JWT)  → login, session client, middleware
     • Supabase Auth (@supabase/ssr) → layouts (dashboard, client), /api/*/sign
     → un utilisateur connecté par NextAuth n'a PAS de session Supabase (MS-008)

   Externes :  Stripe (checkout, connect, webhook) · Supabase (auth+db) · Netlify
   E-mail   :  ❌ SIMULÉ (console.log) — aucun fournisseur réel (MS-015)
   Observab.:  ❌ AUCUNE (console.log uniquement) (MS-025)
```

### 4.2 Frontières de confiance — et leur défaillance

| Frontière attendue | État réel |
|---|---|
| Navigateur → Middleware | ❌ Inopérante (MS-001) |
| Navigateur → Server Action | ❌ Inexistante — les actions sont des endpoints POST publics (MS-002) |
| Server Action → Service | ❌ Le service fait confiance au `userId`/`organizationId` transmis (MS-005/006) |
| Service → Base | ❌ Aucune RLS, aucune contrainte FK (MS-020/022) |
| Application → Stripe | ✅ Signature webhook vérifiée — **seule frontière correcte** |

> Le point le plus important de tout ce rapport tient en une phrase : **il n'existe aucun point du système où l'identité de l'appelant est établie de manière fiable avant d'accéder aux données.**

### 4.3 Dérive de schéma constatée (`VÉRIFIÉ`)

| Colonne référencée dans le code | Table | Présente dans le schéma ? |
|---|---|---|
| `role` | `users` | ❌ non — écrite par `registerAction` |
| `stripeCustomerId` | `users` | ❌ non — écrite par le webhook Stripe |
| `stripeAccountId`, `stripeAccountStatus` | `organizations` | ❌ non — écrites par `/api/stripe/connect/onboarding` |
| `email`, `currency` | `organizations` | ❌ non — lues par `stripe/index.ts` et `connect/onboarding` |
| `message_templates` | — | ✅ dans la migration PostgreSQL, ❌ **absente de la base SQLite locale** |

Conséquence : l'abonnement Stripe et Stripe Connect **ne peuvent pas fonctionner** — l'écriture porte sur des colonnes inexistantes. La fonctionnalité de modèles de messages est cassée en local.

### 4.4 Incompatibilité SQLite / PostgreSQL (`VÉRIFIÉ`)

`src/lib/db/schema.ts` bascule dynamiquement entre `sqlite-core` et `pg-core` selon `DATABASE_URL`, avec des `as any` sur chaque helper. Trois conséquences :

1. **Le schéma est évalué au moment de l'import du module**, en fonction d'une variable d'environnement — comportement différent entre build et runtime, et entre Netlify Functions et Edge.
2. `clientService.deleteWithCascade` retourne `result.changes > 0`. **`changes` n'existe pas** dans le pilote `postgres-js` → `undefined > 0` → **la suppression renvoie toujours `false` en production** alors qu'elle a réussi (**MS-021**).
3. `better-sqlite3` est déclaré dans `serverExternalPackages` et reste chargé même en mode PostgreSQL — dépendance native inutile embarquée dans les fonctions Netlify.

---

## 5. Inventaires

Fichiers détaillés : `ROUTES_MATRIX.csv`, `API_ENDPOINTS_MATRIX.csv`, `RBAC_MATRIX.csv`, `TENANT_ISOLATION_MATRIX.csv`, `DATA_PRIVACY_MATRIX.csv`, `TEST_COVERAGE_MATRIX.csv`.

### 5.1 Synthèse routes frontend (62)

| Groupe | Nombre | Protection attendue | Protection réelle |
|---|---|---|---|
| `(public)` + `(legal)` + `(demo)` + `/` | 6 | aucune | aucune ✅ |
| `(auth)` | 4 | aucune | aucune ✅ |
| `(dashboard)` | 40 | `professional` | ❌ layout Supabase inopérant (MS-008) ; middleware inopérant (MS-001) |
| `/client/*` | 11 | `client` | ❌ idem |
| `/quotes/[id]/sign` | 1 | jeton de signature | ❌ **aucune vérification de jeton** |
| `/forbidden` | 1 | — | — |

**Aucune route dynamique ne vérifie l'appartenance de la ressource au locataire de l'utilisateur.** Toutes les pages `[id]` chargent via des actions qui acceptent `organizationId` en paramètre.

### 5.2 Synthèse routes API (7)

| Route | Auth | Verdict |
|---|---|---|
| `POST /api/auth/[...nextauth]` | — | ✅ NextAuth standard |
| `POST /api/stripe/webhook` | Signature Stripe | ⚠️ signature OK, **pas d'idempotence, `subscription.deleted` ignoré** (MS-014) |
| `POST /api/stripe/checkout` | ❌ aucune | `userId` du corps de requête, non authentifié |
| `POST /api/stripe/create-payment` | ❌ aucune | IDOR sur `invoiceId` — permet d'énumérer les montants de factures |
| `POST /api/stripe/connect/onboarding` | ❌ aucune | **P0 MS-012** — lien d'onboarding Connect pour une org arbitraire |
| `POST /api/deals/sign` | Supabase Auth | ⚠️ **toujours 401** — les utilisateurs sont sur NextAuth (MS-008) |
| `POST /api/quotes/sign` | Supabase Auth | ⚠️ idem + **aucun contrôle d'appartenance** du devis (`getById` sans org) |
| `GET /api/reminders/check` | ❌ aucune | **P1 MS-013** — `organizationId` en query, sans secret de cron |

### 5.3 Server actions (~80, 19 fichiers)

Recherche `getServerSession` dans `src/app/actions/` : **2 occurrences, toutes deux dans `session.ts`**. Les 17 autres fichiers (≈78 actions) n'ont **aucun contrôle d'identité**.

Signature typique constatée :

```ts
export async function findAllAction(organizationId?: any) {
  return await clientService.findAll(organizationId);   // ← organizationId vient du client
}
```

Trois défauts cumulés dans quatre lignes : identité non vérifiée, locataire fourni par l'appelant, typage `any`.

### 5.4 Données (12 tables)

`users` · `organizations` · `clients` · `contacts` · `deals` · `products` · `invoices` · `invoice_lines` · `tasks` · `requests` · `messages` · `message_templates`

- **0 clé étrangère**, **0 index** (hors clés primaires et deux `unique`), **0 contrainte de cohérence**.
- Données personnelles : identité, e-mail, téléphone, adresse postale, données d'entreprise, **signatures manuscrites** (`invoices.signature`, `deals.signature`), **IP de signature** (colonne présente, **jamais renseignée**), montants et historique de facturation.
- Aucune politique de rétention, aucun chiffrement applicatif, aucune pseudonymisation, aucune procédure d'export ou de suppression.

---

## 6. Anomalies détaillées — P0

---

### `MS-001` — Le contrôle d'accès du middleware est entièrement inopérant

- **État** : `VÉRIFIÉ (statique)`
- **Catégorie** : sécurité / contrôle d'accès
- **Sévérité** : critique — **Priorité** : **P0** — **Confiance** : élevée
- **CVSS 4.0** : 9.3 — `CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:N/SC:N/SI:N/SA:N`
- **Environnement** : tous — **Route** : toutes — **Rôle** : anonyme — **Locataire** : tous
- **Fichier** : `src/proxy.ts` L8-L10

**Description**

```ts
const publicRoutes = ['/', '/login', '/register', '/forgot-password',
                      '/reset-password', '/pro/', '/api/stripe/webhook'];
const isPublicRoute = publicRoutes.some((route) =>
  request.nextUrl.pathname.startsWith(route)   // ← '/' préfixe TOUT chemin
);
if (!token && !isPublicRoute) return NextResponse.redirect(new URL('/login', request.url));
```

`'/'` est présent dans la liste blanche et la comparaison utilise `startsWith`. **Tout chemin commence par `/`.** `isPublicRoute` vaut donc `true` pour `/dashboard`, `/clients/42`, `/facturation/factures/7`, `/client/invoices/9` — pour absolument tout. La condition `!token && !isPublicRoute` n'est jamais vraie et la redirection n'est **jamais** exécutée.

**Résultat attendu** : un visiteur non authentifié demandant `/dashboard` est redirigé vers `/login`.
**Résultat constaté** : la requête passe le middleware sans contrôle.

**Reproduction** : requête `GET /dashboard` sans cookie de session — le middleware appelle `NextResponse.next()`.

**Preuve** : `src/proxy.ts` L8-L13, lecture directe. Vérification logique : `'/dashboard'.startsWith('/') === true`.

**Impact** — utilisateur : les pages privées ne sont plus protégées au niveau périmétrique. Métier : aucune barrière d'entrée. Sécurité : suppression complète de la première ligne de défense. **Blast radius** : l'application entière.

> **Nuance importante et honnête** : à elle seule, cette faille n'expose pas encore les *données*, car les layouts serveur (`(dashboard)/layout.tsx`, `client/layout.tsx`) tentent une seconde vérification. Mais ces layouts sont eux-mêmes cassés (MS-008) et, surtout, **les server actions ne passent pas par les layouts** (MS-002). MS-001 supprime la seule barrière qui aurait pu limiter les dégâts.

**Cause racine** : liste blanche par préfixe incluant la racine.

**Correction recommandée**

```ts
const PUBLIC_EXACT = new Set(['/', '/login', '/register', '/forgot-password', '/reset-password']);
const PUBLIC_PREFIX = ['/pro/', '/api/stripe/webhook', '/api/auth/'];
const p = request.nextUrl.pathname;
const isPublicRoute = PUBLIC_EXACT.has(p) || PUBLIC_PREFIX.some(r => p.startsWith(r));
```

Puis ajouter un contrôle de `profileType` par segment (`/dashboard*` → `professional`, `/client*` → `client`).

**Effets secondaires** : les routes non listées deviendront réellement protégées — certaines pages actuellement accessibles cesseront de l'être. C'est l'effet recherché, mais il faut re-tester chaque parcours.

**Test de non-régression** : test E2E — `GET /dashboard` sans session → 307 vers `/login` ; avec session `client` → 307 vers `/client/dashboard`.
**Critère d'acceptation** : aucune route privée n'est atteignable sans session valide.
**Effort** : XS (1 ligne + tests) — **Référentiel** : OWASP ASVS V4.1, API1:2023, CWE-284.

---

### `MS-002` — Environ 80 server actions sans aucune vérification de session

- **État** : `VÉRIFIÉ (statique)` — **Sévérité** : critique — **P0** — **Confiance** : élevée
- **CVSS 4.0** : 9.8 — `CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:H/SI:H/SA:H`
- **Fichiers** : `src/app/actions/*.ts` (17 fichiers sur 19)

**Description**

Les Server Actions Next.js sont compilées en **endpoints HTTP POST** identifiés par un Action ID, appelables par n'importe qui connaissant cet identifiant (visible dans les bundles clients). Elles ne sont **pas** protégées par les layouts serveur ni par les `redirect()` des pages — le layout ne s'exécute pas lors de l'invocation d'une action.

Comptage exécuté sur le dépôt :

```
client.actions.ts        5 actions   0 contrôle de session
contact.actions.ts       6 actions   0
deal.actions.ts          7 actions   0
invoice.actions.ts      13 actions   0
message.actions.ts       7 actions   0
request.actions.ts       8 actions   0
task.actions.ts          8 actions   0
user.actions.ts          5 actions   0
organization.actions.ts  2 actions   0
product.actions.ts       5 actions   0
… (17 fichiers)         ≈78 actions  0 contrôle
session.ts               3 actions   2 contrôles  ← seul fichier conforme
```

**Résultat attendu** : chaque action établit l'identité de l'appelant avant tout accès aux données.
**Résultat constaté** : aucune action, hors `getSessionAction`, ne consulte la session.

**Preuve** : `grep -c "getServerSession" src/app/actions/*.ts` → 0 partout sauf `session.ts` (2).

**Impact** : lecture, modification et suppression de toute donnée de toute organisation, sans compte. **Blast radius** : intégralité des données de tous les clients.

**Cause racine** : les actions ont été générées comme de simples passe-plats vers la couche service, en déplaçant la responsabilité d'authentification vers l'appelant (le composant React) — c'est-à-dire vers le client, qui est précisément la partie non fiable.

**Correction recommandée** — créer un point d'entrée unique et l'imposer :

```ts
// src/lib/auth/require-session.ts
import 'server-only';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { AppError } from '@/lib/utils/error-handler';

export async function requireSession() {
  const s = await getServerSession(authOptions);
  const u = s?.user as { id?: string; organizationId?: string; profileType?: string } | undefined;
  if (!u?.id) throw new AppError('Non authentifié', 401, 'UNAUTHENTICATED');
  return { userId: u.id, organizationId: u.organizationId, profileType: u.profileType };
}

export async function requireOrganization() {
  const ctx = await requireSession();
  if (!ctx.organizationId) throw new AppError('Aucune organisation', 403, 'NO_ORG');
  return ctx as { userId: string; organizationId: string; profileType: string };
}
```

Puis réécrire chaque action selon ce modèle :

```ts
export async function findAllAction() {                    // ← plus aucun paramètre d'identité
  const { organizationId } = await requireOrganization();
  return clientService.findAll(organizationId);
}
```

**Alternative** : un wrapper `withAuth(handler)` appliqué à toutes les actions, plus une règle ESLint interdisant l'export d'une fonction `'use server'` qui n'appelle pas `requireSession`.

**Effets secondaires** : tous les appelants côté client passent aujourd'hui `organizationId` / `userId` — chaque composant doit être mis à jour. Travail mécanique mais volumineux (~80 actions + appelants).

**Test de non-régression** : pour chaque action, un test appelant l'endpoint sans cookie → 401 ; avec une session du locataire B visant une ressource du locataire A → 403.
**Effort** : L — **Référentiel** : OWASP API1/API5:2023, ASVS V4.1/V4.2, CWE-306, CWE-862.

---

### `MS-003` — Dump complet de la base utilisateurs, hachages de mots de passe inclus

- **État** : `VÉRIFIÉ (statique)` — **Sévérité** : critique — **P0**
- **CVSS 4.0** : 8.7 — `CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:N/VA:N/SC:N/SI:N/SA:N`
- **Fichiers** : `src/app/actions/user.actions.ts` L30-L32 et L14-L16 ; `src/lib/services/user.service.ts` L64-L72

**Description**

```ts
export async function getAllUsersAction() {
  return await userService.getAllUsers();       // SELECT * FROM users — aucun filtre, aucune auth
}
export async function getUserByEmailAction(email?: any) {
  return await userService.getUserByEmail(email);
}
```

`getAllUsers()` exécute `db.select().from(users)` sans projection : l'objet renvoyé contient la colonne `password` (hachage bcrypt), l'e-mail, le nom, l'`organizationId`, le niveau d'abonnement et les dates. La valeur est sérialisée et renvoyée au client.

**Impact** — sécurité : fuite massive de données personnelles (RGPD art. 33, notification sous 72 h) et exposition des hachages, permettant une attaque hors-ligne. Métier : incident déclarable, perte de confiance, exposition contractuelle. **Blast radius** : tous les utilisateurs de la plateforme.

**Correction recommandée**
1. **Supprimer purement et simplement `getAllUsersAction`** — aucun écran ne l'utilise légitimement.
2. `getUserByEmailAction` : supprimer également ; la seule consommation légitime est `authorize()` côté serveur, qui appelle directement le service.
3. Dans `user.service.ts`, ne jamais sélectionner `*` : définir une projection explicite `safeUserColumns` excluant `password`, et réserver une méthode `getUserWithPasswordForAuth()` marquée `server-only` au provider NextAuth.

**Test de non-régression** : test unitaire asserant que la réponse de toute action utilisateur ne contient pas la clé `password`.
**Effort** : S — **Référentiel** : OWASP API3:2023 (Broken Object Property Level Authorization), CWE-200, CWE-522, RGPD art. 32/33.

---

### `MS-004` — Prise de contrôle de n'importe quel compte par affectation de masse

- **État** : `VÉRIFIÉ (statique)` — **Sévérité** : critique — **P0**
- **CVSS 4.0** : 9.4 — `CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:N/SC:H/SI:H/SA:N`
- **Fichiers** : `src/app/actions/user.actions.ts` L23-L28 ; `src/app/actions/session.ts` L20-L22 ; `src/lib/services/user.service.ts` L50-L62

**Description**

```ts
export async function updateUserProfileAction(userId?: any, updateData?: any) { … }
export async function updateUserAction(id: string, data: Partial<User>) {
  return await userService.updateUserProfile(id, data);   // aucun contrôle de session
}
```

Le service applique `set({ ...updateData })` **sans liste blanche de champs** :

```ts
const dataToUpdate = { ...updateData, updatedAt: new Date().toISOString() };
await db.update(users).set(dataToUpdate).where(eq(users.id, userId));
```

Trois conséquences cumulatives :

1. **`userId` arbitraire** → écriture sur le compte de n'importe qui.
2. **Aucun filtre de champ** → `email` (détournement du compte), `organizationId` (**rattachement à l'organisation d'une autre entreprise, donc accès à ses données**), `subscriptionTier`/`subscriptionStatus` (obtention gratuite du plan Business), `profileType` (changement d'espace).
3. **Aucune réauthentification** pour un changement sensible.

Le champ `password` n'est pas haché à cet endroit : une écriture directe stockerait une valeur non hachée, ce qui casse `verifyPassword` (déni de service sur le compte cible) — et si un attaquant y écrit un hachage bcrypt qu'il a lui-même généré, **il prend le contrôle du compte**.

**Résultat attendu** : un utilisateur ne peut modifier que son propre profil, sur un ensemble restreint de champs.
**Résultat constaté** : n'importe qui peut modifier n'importe quel champ de n'importe quel utilisateur.

**Correction recommandée**

```ts
const profileUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  onboardingCompleted: z.boolean().optional(),
  onboardingStep: z.number().int().min(0).max(10).optional(),
}).strict();                                    // .strict() rejette tout champ inconnu

export async function updateUserProfileAction(raw: unknown) {
  const { userId } = await requireSession();    // identité = session, jamais un paramètre
  const data = profileUpdateSchema.parse(raw);
  return userService.updateProfile(userId, data);
}
```

Les changements d'e-mail, de mot de passe, de plan et d'organisation doivent passer par des flux dédiés, avec réauthentification et vérification.

**Effets secondaires** : `AuthContext.updateUser` passe actuellement `Partial<User>` arbitraire — à restreindre.
**Effort** : M — **Référentiel** : OWASP API3/API6:2023, ASVS V5.1.2, CWE-915, CWE-639.

---

### `MS-005` — Isolation multitenant inexistante : le locataire est un paramètre client

- **État** : `VÉRIFIÉ (statique)` — **Sévérité** : critique — **P0**
- **CVSS 4.0** : 9.3 — `CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:H/VI:H/VA:H/SC:H/SI:H/SA:N`
- **Fichiers** : toutes les actions et tous les services acceptant `organizationId`

**Description**

Le modèle est un multitenant logique par colonne `organization_id`. Le filtrage existe bien au niveau SQL :

```ts
async findAll(organizationId: string) {
  return db.select().from(clients).where(eq(clients.organizationId, organizationId));
}
```

**Mais la valeur du filtre est fournie par l'appelant**, de bout en bout, sans jamais être confrontée à la session :

```
composant React → findAllAction(organizationId) → clientService.findAll(organizationId) → SQL
```

Un appelant qui substitue l'`organizationId` d'une autre entreprise reçoit les données de cette entreprise. C'est un BOLA (Broken Object Level Authorization) au niveau du locataire lui-même — la forme la plus grave dans un SaaS.

Les identifiants d'organisation sont des UUID v4 (`generateId`), donc non devinables par force brute — mais ils **fuient** par plusieurs canaux : la session utilisateur les contient, `getAllUsersAction` (MS-003) les renvoie tous d'un coup, et `getOrganizationAction(id)` les résout sans contrôle. La difficulté de découverte est donc nulle en pratique.

**Contrôles existants et pourquoi ils ne suffisent pas** — les méthodes d'écriture des services vérifient bien :

```ts
const user = await userService.getUserProfile(userId);
if (!user || user.organizationId !== organizationId) throw new AppError('Unauthorized', 403);
```

Ce contrôle est **correct dans son principe** mais **inefficace en pratique**, car `userId` est lui aussi un paramètre fourni par l'appelant (MS-006). L'attaquant fournit simplement le `userId` d'un membre de l'organisation cible — identifiant obtenu via MS-003.

**De plus, les méthodes de lecture n'ont aucun contrôle du tout** : `findAll`, `findById`, `getById`, `findByClient`, `findByProfessional`, `calculateTotals`, `generateNumber` acceptent l'`organizationId` sans vérification. La lecture croisée entre locataires est donc directe.

**Impact** : lecture et écriture complètes des données de toute organisation cliente : fichier clients, contacts, opportunités commerciales avec montants, devis, factures, tâches, messages. **Blast radius** : toutes les organisations.

**Correction recommandée**
1. Supprimer `organizationId` et `userId` de **toutes** les signatures d'actions ; les dériver de `requireOrganization()`.
2. Conserver le filtre SQL par `organization_id` (défense en profondeur).
3. Ajouter une troisième couche : **Row-Level Security PostgreSQL** sur toutes les tables porteuses de `organization_id`, avec un claim JWT `organization_id`.
4. Ajouter les clés étrangères manquantes pour empêcher les rattachements incohérents.

**Test de non-régression** : suite dédiée « isolation » — créer deux organisations A et B ; pour chaque ressource, tenter depuis B un accès en lecture, écriture, suppression et export sur une ressource de A → 403 systématique. Ce test doit **bloquer la CI**.
**Effort** : L — **Référentiel** : OWASP API1:2023, ASVS V4.2, CWE-639, AWS SaaS Lens (tenant isolation).

---

### `MS-006` — Identité dérivée d'un cookie non signé

- **État** : `VÉRIFIÉ (statique)` — **Sévérité** : critique — **P0**
- **CVSS 4.0** : 9.1 — **Fichiers** : 12 fichiers d'actions, motif répété

**Description**

```ts
if (!userId) {
  const cookieStore = await cookies();
  userId = cookieStore.get('session')?.value;   // cookie applicatif arbitraire
}
```

Ce motif est présent dans `client.actions.ts`, `invoice.actions.ts`, `deal.actions.ts`, `task.actions.ts`, `contact.actions.ts`, `product.actions.ts`, `message.actions.ts`, `request.actions.ts`, `user.actions.ts` et d'autres.

Le cookie `session` est un **vestige** de l'authentification maison antérieure à la migration NextAuth (commit `abcb59b feat: migrate to NextAuth.js (Phase 4)`). NextAuth utilise `next-auth.session-token`, un JWT signé — **pas** `session`. Ce cookie n'est donc plus produit par l'application, mais il est **toujours lu comme source d'identité**.

Conséquence : il suffit de définir `document.cookie = "session=<userId-cible>"` — ou d'envoyer l'en-tête `Cookie: session=<id>` — pour être traité comme cet utilisateur par toute la couche service. Le cookie n'est ni signé, ni chiffré, ni vérifié, ni expiré.

C'est ce mécanisme qui neutralise le contrôle `user.organizationId !== organizationId` décrit en MS-005.

**Correction recommandée** : supprimer les 12 occurrences du repli cookie. L'identité provient exclusivement de `requireSession()`. Ajouter une règle ESLint interdisant `cookies().get('session')`.
**Test** : test unitaire — appel d'action avec `Cookie: session=<autre-utilisateur>` → 401.
**Effort** : S (suppression mécanique) — **Référentiel** : ASVS V3.2, CWE-565 (Reliance on Cookies without Validation), CWE-807.

---

### `MS-007` — Fraude au paiement et signature électronique sans valeur

- **État** : `VÉRIFIÉ (statique)` — **Sévérité** : critique — **P0**
- **CVSS 4.0** : 8.8 — **Fichiers** : `src/app/actions/invoice.actions.ts` L28-L34 ; `src/lib/services/invoice.service.ts` L59-L79 ; `src/app/api/quotes/sign/route.ts`

**Description**

```ts
export async function markAsPaidAction(id?: any, paymentIntentId?: any) {
  return await invoiceService.markAsPaid(id, paymentIntentId);   // aucune auth, aucun contrôle org
}
export async function updateSignatureAction(id?: any, signatureData?: any) {
  return await invoiceService.updateSignature(id, signatureData);
}
```

Le service correspondant écrit directement :

```ts
async markAsPaid(id, paymentIntentId) {
  await db.update(invoices).set({ status: 'paid', paidAt: …, paymentIntentId }).where(eq(invoices.id, id));
}
```

Ni session, ni `organizationId`, ni vérification auprès de Stripe que le `paymentIntentId` existe et correspond au montant.

**Deux scénarios de fraude directs :**

1. **Facture marquée payée sans paiement.** Un client (ou n'importe qui) appelle `markAsPaidAction(<idFacture>, 'pi_fake')`. La facture passe en `paid` chez le prestataire, qui considère la créance réglée. Perte financière directe pour l'utilisateur du SaaS.
2. **Signature apposée par un tiers.** `updateSignatureAction` écrit `signature`, `signatureDate`, `signedAt` sur n'importe quel devis. Aucune vérification d'identité du signataire, **aucune capture d'IP** (la colonne `signature_ip` existe mais n'est jamais renseignée — vérifié : aucune écriture dans le code), aucun horodatage qualifié, aucun scellement du document signé, aucune piste d'audit.

**Conséquence juridique** : la fonction de signature électronique du produit ne satisfait **aucune** des exigences du règlement eIDAS, même au niveau « simple » (le lien entre le signataire et la signature n'est pas établi et l'intégrité du document n'est pas garantie). Un devis « signé » via `monservice` n'a aucune valeur probante en cas de litige. C'est un risque porté par les clients du SaaS, pas seulement par l'éditeur — donc un risque contractuel pour l'éditeur.

Note complémentaire : `/api/quotes/sign` charge le devis via `invoiceService.getById(quoteId)` — **sans filtre d'organisation** — puis appelle `updateSignature`. Même si l'authentification Supabase y était fonctionnelle, un utilisateur pourrait signer le devis d'un autre locataire.

**Correction recommandée**
- Supprimer `markAsPaidAction` de la surface publique. **Le passage au statut `paid` ne doit être déclenché que par le webhook Stripe** après vérification de la signature et du montant, avec journalisation.
- Signature : générer un jeton à usage unique, à durée limitée, lié au devis et au destinataire ; capturer IP + user-agent + horodatage serveur ; produire un fichier de preuve (hachage du PDF signé) ; rendre le devis immuable après signature ; journaliser dans un journal d'audit inaltérable.
- Ajouter l'invariant : *une facture au statut `paid` ne peut être modifiée ni supprimée*.

**Effort** : M — **Référentiel** : OWASP API5:2023, ASVS V4.3, CWE-862, eIDAS art. 25-26.

---

### `MS-008` — Authentification scindée entre NextAuth et Supabase : l'application est inutilisable

- **État** : `VÉRIFIÉ (statique)` — **Sévérité** : critique — **P0**
- **Catégorie** : architecture / disponibilité
- **Fichiers** : `src/app/(dashboard)/layout.tsx`, `src/app/client/layout.tsx`, `src/app/api/deals/sign/route.ts`, `src/app/api/quotes/sign/route.ts` vs `src/components/auth/AuthContext.tsx`, `src/app/api/auth/[...nextauth]/route.ts`, `src/proxy.ts`

**Description**

Deux systèmes d'identité coexistent et ne se connaissent pas.

| Composant | Système utilisé |
|---|---|
| `LoginForm` / `RegisterForm` / `AuthContext` | **NextAuth** (`signIn('credentials')`, `useSession`) |
| `proxy.ts` (middleware) | **NextAuth** (`getToken`) |
| `(dashboard)/layout.tsx` | **Supabase Auth** (`supabase.auth.getUser()`) |
| `client/layout.tsx` | **Supabase Auth** |
| `/api/deals/sign`, `/api/quotes/sign` | **Supabase Auth** |

Aucun code n'appelle `supabase.auth.signInWithPassword` : **aucune session Supabase n'est jamais créée**. `supabase.auth.getUser()` renvoie donc systématiquement `null`.

**Boucle de redirection démontrée par lecture du flux :**

1. L'utilisateur se connecte → NextAuth pose `next-auth.session-token` → `router.push('/dashboard')`.
2. `(dashboard)/layout.tsx` : `supabase.auth.getUser()` → `null` → `redirect('/login')`.
3. `proxy.ts` : le token NextAuth existe et le chemin est `/login` → `redirect('/dashboard')`.
4. Retour à l'étape 2. → **`ERR_TOO_MANY_REDIRECTS`**.

De plus, la vérification de rôle porte sur `user.user_metadata?.profileType`, un champ **Supabase**, alors que le `profileType` réel est stocké dans la table `users` et propagé dans le JWT NextAuth. Même avec une session Supabase valide, le contrôle de rôle serait inopérant.

**Résultat attendu** : après connexion, l'utilisateur accède à son tableau de bord.
**Résultat constaté** : boucle de redirection infinie ; l'application authentifiée est inaccessible.

**Impact** : indisponibilité totale de la partie authentifiée du produit — c'est-à-dire du produit. Les endpoints de signature renvoient un 401 permanent.

**Cause racine** : migration incomplète. L'historique montre `4ee7edf feat: authentification supabase`, puis `7c09746 revert: retour a l'auth locale en attendant de configurer supabase`, puis `abcb59b feat: migrate to NextAuth.js (Phase 4)`. Les fichiers Supabase des layouts n'ont jamais été repris lors du dernier basculement.

**Correction recommandée** — **décision d'architecture à prendre en premier**, avant toute autre correction :

**Option A (recommandée) — tout NextAuth.** Cohérent avec l'état actuel du code applicatif (login, register, middleware, session). Remplacer dans les 4 fichiers Supabase :

```ts
const { userId, profileType } = await requireSession();   // au lieu de supabase.auth.getUser()
if (profileType !== 'professional') redirect('/client/dashboard');
```

Supprimer `@supabase/ssr` et `@supabase/supabase-js` des dépendances si Supabase n'est utilisé que comme base PostgreSQL managée (usage tout à fait légitime).

**Option B — tout Supabase Auth.** Plus cohérent avec l'infrastructure (Supabase héberge déjà la base) et débloque la Row-Level Security, qui est la meilleure réponse structurelle à MS-005. Coût plus élevé : migration des utilisateurs et des hachages, réécriture de `LoginForm`, `RegisterForm`, `AuthContext`, `proxy.ts`.

> **Recommandation** : Option A pour rétablir le fonctionnement rapidement, puis évaluer une migration vers l'option B une fois les P0 traités — la RLS reste la meilleure garantie d'isolation à long terme.

**Test de non-régression** : E2E — connexion professionnelle → `/dashboard` en 200, sans redirection multiple ; connexion client → `/client/dashboard` ; croisement des espaces → `/forbidden`.
**Effort** : M — **Référentiel** : ISO 25010 (fiabilité, cohérence), ASVS V3.

---

### `MS-009` — Variable d'environnement Supabase incohérente entre environnements

- **État** : `VÉRIFIÉ (statique)` — **Sévérité** : critique — **P0**
- **Fichiers** : `src/utils/supabase/server.ts` L10, `src/utils/supabase/client.ts`, `.env.local`, `.env.production`

**Description**

| Fichier | Variable |
|---|---|
| `src/utils/supabase/server.ts` | lit `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `.env.local` | définit `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✅ |
| `.env.production` | définit `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ❌ |
| `.env.example` | mentionne **les deux**, de façon contradictoire |

En production, `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY` vaut `undefined`. L'assertion non nulle (`!`) masque le problème au typage ; à l'exécution, `createServerClient(url, undefined)` échoue. Comme cet appel est effectué dans les **layouts** `(dashboard)` et `client`, **toute page authentifiée renvoie une erreur 500** en production.

Ce défaut est masqué en local, où la variable existe — cas classique d'anomalie qui n'apparaît qu'au déploiement.

Note : la documentation Supabase récente a introduit la clé « publishable » (`sb_publishable_…`) en remplacement de la clé « anon » (JWT `eyJ…`). Les deux fichiers d'environnement utilisent donc **deux générations de clés différentes**, ce qui rend l'incohérence d'autant plus probable en production.

**Correction recommandée** : normaliser sur une seule variable dans le code, les trois fichiers d'environnement et la console Netlify. Ajouter une **validation des variables d'environnement au démarrage** :

```ts
// src/lib/env.ts
export const env = z.object({
  NEXTAUTH_SECRET: z.string().min(32),
  DATABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
}).parse(process.env);
```

Un démarrage qui échoue bruyamment vaut mieux qu'un 500 silencieux en production.

**Effort** : S — **Référentiel** : 12-Factor App (III. Config), CIS Benchmarks.

---

### `MS-010` — Le client Stripe est instancié au chargement du module et fait échouer le build

- **État** : `VÉRIFIÉ (statique)` — **Sévérité** : critique — **P0**
- **Fichiers** : `src/app/api/stripe/create-payment/route.ts` L5-L7, `src/app/api/stripe/webhook/route.ts` L6-L8, `src/lib/stripe/index.ts` L4-L6

**Description**

```ts
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2023-10-16' as any });
```

Le SDK Stripe lève une exception à la construction lorsque la clé est vide. L'instanciation étant au **niveau du module**, elle est exécutée dès que Next.js importe le fichier — c'est-à-dire pendant la phase de collecte des données de page du build. Sur Netlify, où `STRIPE_SECRET_KEY` n'est pas définie, **le build échoue**.

C'est bien la cause du problème rapporté dans le brief. La garde présente en tête du handler :

```ts
if (!process.env.STRIPE_SECRET_KEY) return new NextResponse(…, { status: 503 });
```

arrive **trop tard** : le module a déjà planté à l'import.

Le fichier `src/lib/stripe/index.ts` utilise quant à lui un repli `'sk_test_mock'`, qui évite l'exception mais introduit un défaut plus insidieux : **en production, une clé absente ne provoque plus d'erreur** — l'application appelle Stripe avec une clé factice et échoue au premier appel réseau, sans signal clair.

Trois versions d'API Stripe différentes coexistent par ailleurs (`2023-10-16` × 2, `2025-01-27.acacia`), toutes forcées via `as any`.

**Correction recommandée** — initialisation paresseuse et unique :

```ts
// src/lib/stripe/index.ts
import 'server-only';
import Stripe from 'stripe';

let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY manquante');
    _stripe = new Stripe(key, { apiVersion: '2025-01-27.acacia' });   // une seule version, sans `as any`
  }
  return _stripe;
}
```

Remplacer toutes les instanciations directes par `getStripe()` à l'intérieur des handlers.

**Effets secondaires** : aucun, hormis la nécessité de définir la clé dans Netlify avant d'activer les paiements.
**Test** : `next build` doit réussir sans aucune variable Stripe définie.
**Effort** : S — **Référentiel** : 12-Factor App, ISO 25010 (portabilité).

---

### `MS-011` — Aucune stratégie de sauvegarde, de restauration ni de persistance

- **État** : `VÉRIFIÉ (statique)` + `NON TESTÉ` (infrastructure) — **Sévérité** : critique — **P0**
- **Fichiers** : `src/lib/db/server.ts`, `.env.local`, `netlify.toml`

**Description**

`DATABASE_URL` vaut `./database.sqlite` en local. `src/lib/db/server.ts` bascule sur PostgreSQL uniquement si la chaîne commence par `postgres`. `.env.production` définit bien une URL PostgreSQL — mais **rien ne garantit que cette variable est effectivement configurée dans Netlify** (non vérifiable sans accès à la console). Si elle est absente ou mal orthographiée, l'application démarre silencieusement sur **une base SQLite créée dans le système de fichiers éphémère d'une fonction Netlify** :

- chaque instance de fonction dispose de son propre système de fichiers → **les données divergent entre instances** ;
- le système de fichiers est détruit à chaque redéploiement et au recyclage des instances → **perte totale de données, sans alerte**.

Par ailleurs, aucun élément du dépôt n'établit l'existence de :

| Élément | État |
|---|---|
| Sauvegarde automatisée | ❌ Aucune trace |
| Test de restauration | ❌ Jamais réalisé |
| RPO / RTO définis | ❌ Aucun |
| Rétention, immutabilité des sauvegardes | ❌ Aucune |
| Plan de continuité | ❌ Aucun |

Supabase fournit des sauvegardes automatiques selon le plan souscrit — mais **une sauvegarde jamais restaurée n'est pas une sauvegarde**, et le plan souscrit n'est pas vérifiable ici.

**Impact** : perte définitive des données de tous les clients, y compris des factures — données à valeur comptable et légale (conservation 10 ans en France). Un tel événement est difficilement survivable pour un jeune SaaS.

**Correction recommandée**
1. Interdire explicitement SQLite hors développement : `if (process.env.NODE_ENV === 'production' && !url.startsWith('postgres')) throw new Error(...)`.
2. Confirmer et documenter le plan Supabase et sa politique de sauvegarde (PITR si disponible).
3. **Réaliser et documenter une restauration réelle dans un projet isolé** — c'est le seul livrable qui prouve quoi que ce soit.
4. Fixer un RPO (suggéré : 24 h, 1 h avec PITR) et un RTO (suggéré : 4 h), puis les vérifier.
5. Exporter les données comptables hors du fournisseur principal (sauvegarde froide chiffrée).

**Effort** : M — **Référentiel** : Google SRE (data integrity), ISO 27001 A.12.3, NIST CSF (RC.RP).

---

### `MS-012` — Détournement de compte Stripe Connect via endpoint non authentifié

- **État** : `VÉRIFIÉ (statique)` — **Sévérité** : critique — **P0**
- **CVSS 4.0** : 8.6 — **Fichier** : `src/app/api/stripe/connect/onboarding/route.ts`

**Description**

```ts
export async function POST(req: Request) {
  const { organizationId } = await req.json();          // ← aucune authentification
  const organization = await organizationService.getById(organizationId);
  let accountId = organization.stripeAccountId;
  if (!accountId) {
    accountId = await createConnectAccount(organization.email || 'contact@example.com', organizationId);
    await organizationService.update(organizationId, { stripeAccountId: accountId, … });
  }
  const url = await createAccountLink(accountId, returnUrl, refreshUrl);
  return NextResponse.json({ url });
}
```

Trois défauts imbriqués :

1. **Aucune authentification, aucun contrôle d'appartenance.** N'importe qui envoie un `organizationId` et reçoit une **URL d'onboarding Stripe Connect** pour cette organisation. Un lien d'onboarding donne accès au flux de configuration du compte connecté — c'est-à-dire aux informations bancaires et aux paramètres de versement.
2. **`organizationService.update` n'a lui non plus aucun contrôle d'accès** — l'écriture de `stripeAccountId` sur une organisation arbitraire est donc possible.
3. **Les colonnes `stripeAccountId`, `stripeAccountStatus` et `email` n'existent pas dans la table `organizations`** (vérifié dans le schéma et dans la base SQLite). En conséquence : `organization.email` vaut `undefined` → l'adresse `contact@example.com` est utilisée pour **tous** les comptes Connect créés ; `organization.stripeAccountId` vaut toujours `undefined` → **un nouveau compte Connect est créé à chaque appel**. Un attaquant peut ainsi créer en boucle des comptes Connect sur le compte Stripe de la plateforme (pollution, risque de signalement du compte plateforme par Stripe).

**Impact** — sécurité : accès au flux de configuration financière d'un tiers. Métier : détournement potentiel de versements, suspension du compte Stripe plateforme. **Blast radius** : toutes les organisations, plus le compte Stripe de l'éditeur.

**Correction recommandée**
1. `const { organizationId } = await requireOrganization();` — jamais depuis le corps de la requête.
2. Restreindre l'action au propriétaire de l'organisation.
3. **Ajouter les colonnes manquantes** via une migration (`stripe_account_id`, `stripe_account_status`, `email`, `currency`) avant toute réactivation de la fonctionnalité.
4. Limiter le débit sur cet endpoint (une création de compte par organisation).
5. Journaliser chaque création et chaque lien généré.

**Effort** : M — **Référentiel** : OWASP API1/API5:2023, PCI DSS (périmètre plateforme), CWE-862.

---

## 7. Anomalies P1 / P2 / P3

Détail complet et champs structurés : **`AUDIT_FINDINGS.csv`** et **`AUDIT_FINDINGS.json`**. Synthèse ci-dessous.

### P1 — à corriger avant tout lancement (21)

| ID | Titre | Fichier principal | Essentiel |
|---|---|---|---|
| MS-013 | `/api/reminders/check` non authentifié | `api/reminders/check/route.ts` | `organizationId` en query, aucun secret de cron : déclenchement arbitraire + énumération |
| MS-014 | Webhook Stripe sans idempotence, `subscription.deleted` ignoré | `api/stripe/webhook/route.ts` | Un rejeu d'événement duplique les effets ; une résiliation ne retire jamais les droits payants → **fuite de revenu** |
| MS-015 | Le service d'e-mail est une simulation | `lib/email/index.ts` | `console.log` + `setTimeout(1000)`, retourne toujours `true`. Aucun e-mail n'a jamais été envoyé — ni facture, ni relance, ni réinitialisation |
| MS-016 | Réinitialisation de mot de passe factice | `(auth)/forgot-password`, `reset-password` | Lien codé en dur `?token=dummy-token`, aucun jeton, aucun appel serveur. Un utilisateur ayant perdu son mot de passe est définitivement bloqué |
| MS-017 | Aucune politique de mot de passe ni limitation de débit | `api/auth/[...nextauth]`, `validation/schemas.ts` | Aucun minimum de complexité, aucun verrouillage, aucun `rate limit` : bourrage d'identifiants trivial |
| MS-018 | `notificationService` et `reminderService` sont des classes vides | `lib/services/notification.service.ts`, `reminder.service.ts` | Méthodes renvoyant `{}`, `0`, `[]`. `NotificationCenter` et `ReminderSettings` affichent une fonctionnalité inexistante |
| MS-019 | Quotas et plans jamais appliqués | global | 50 clients / 10 devis annoncés, aucun contrôle. Le plan Free vaut le plan Business |
| MS-020 | Schéma sans FK, sans index, cascades non transactionnelles | `lib/db/schema.ts`, `client.service.ts` | Intégrité référentielle non garantie ; suppression partielle possible ; requêtes non indexées |
| MS-021 | `result.changes` incompatible PostgreSQL | `client.service.ts` L74 | En production, la suppression réussie est signalée comme un échec |
| MS-022 | Aucune Row-Level Security Supabase | infrastructure | Clé anonyme exposée au navigateur ; sans RLS, l'API PostgREST est ouverte (`NON TESTÉ` — à vérifier d'urgence) |
| MS-023 | `netlify.toml` : redirection `/*` → `/index.html` | `netlify.toml` | Redirection de type SPA incompatible avec le rendu serveur Next.js |
| MS-024 | Aucun en-tête de sécurité | `next.config.ts` | Ni CSP, ni HSTS, ni `X-Content-Type-Options`, ni `Referrer-Policy`, ni `Permissions-Policy`, ni anti-clickjacking |
| MS-025 | Aucune observabilité | global | 60+ `console.log`/`console.error`, aucun log structuré, aucune métrique, aucune trace, aucune alerte, aucun identifiant de corrélation |
| MS-026 | `requestService.findAll()` expose les demandes privées | `request.service.ts` L12 | Aucun filtre sur `visibility`, exposé via `findAllAction` non authentifiée |
| MS-027 | IDOR sur la messagerie | `message.service.ts` | `getMessagesByRequestId` et `markAsRead(ids)` sans contrôle de participation |
| MS-028 | CI sans lint, ni typecheck, ni build | `.github/workflows/test.yml` | La CI exécute uniquement `test:unit` et `test:e2e` ; 251 erreurs ESLint passent inaperçues |
| MS-029 | Test factice pour satisfaire la CI | `__tests__/unit/services/user.service.test.ts` | 7 lignes, `expect(true).toBe(true)` |
| MS-030 | Aucun export ni suppression de compte (RGPD) | global | Droits d'accès, d'effacement et de portabilité non exerçables techniquement |
| MS-031 | Aucun consentement cookies, aucun registre, aucun DPA | global | Politique de confidentialité de 19 lignes, sans base légale, sans durée de conservation, sans sous-traitants |
| MS-032 | Signature sans preuve ni horodatage | `invoice.service.ts`, schéma | `signature_ip` jamais renseigné ; aucun scellement (voir MS-007) |
| MS-033 | `any` généralisé sur toute la surface d'API | `src/app/actions/*` | 251 erreurs `no-explicit-any` ; aucune validation d'entrée sur les actions |

### P2 — à corriger rapidement (14)

`MS-034` `role: 'admin'` codé en dur à l'inscription, colonne absente du schéma · `MS-035` aucune vérification d'adresse e-mail · `MS-036` fichiers de développement à la racine (`fix_*.js` ×6, `fix_imports.py`, `test-db-auth.ts`, `src/testiii` vide, `monservice.db` versionné) · `MS-037` `database.sqlite` de 118 Ko présent dans l'arborescence de travail avec des données réelles · `MS-038` deux configurations de test concurrentes (Jest + Vitest) · `MS-039` `dashboard.actions.ts`/`dashboard.ts` et `notification.actions.ts`/`notification.ts` en doublon · `MS-040` trois versions d'API Stripe différentes · `MS-041` `AuthContext` recharge l'organisation à chaque changement de session sans cache · `MS-042` aucune pagination sur les listes (`findAll` charge tout) · `MS-043` `SearchService` charge six collections complètes en mémoire pour filtrer en JavaScript · `MS-044` aucune gestion d'état vide/erreur homogène · `MS-045` `ErrorBoundary` présent mais non branché sur les routes · `MS-046` pas de `robots.txt`, pas de `sitemap.xml`, métadonnées absentes hors racine · `MS-047` aucune internationalisation (chaînes françaises codées en dur)

### P3 — améliorations (8)

`MS-048` textes légaux squelettiques (19-21 lignes) · `MS-049` aucune page de statut ni canal d'incident · `MS-050` aucun `CHANGELOG`, aucune version affichée · `MS-051` `README` minimal, aucune documentation d'architecture à jour · `MS-052` `PROJECT_AUDIT_AND_HANDOVER.md` et `Rapport28072026.md` obsolètes et contradictoires · `MS-053` composants UI sans états `focus-visible` cohérents · `MS-054` aucun mode sombre malgré des jetons de couleur partiels · `MS-055` dépendances inutilisées (`@auth/core`, `uuid` alors que `crypto.randomUUID` est disponible)

---

## 8. Scores par domaine

Chaque score est plafonné par la gravité des anomalies du domaine. Un domaine comportant un P0 non résolu ne peut dépasser 25.

| Domaine | Score | Justification |
|---|---:|---|
| Sécurité applicative | **2** | 7 P0. Aucune frontière de confiance opérationnelle |
| Isolation multitenant | **0** | Le locataire est un paramètre client (MS-005) |
| Authentification / autorisation | **3** | Middleware inopérant, identité par cookie non signé, système d'auth scindé |
| API | **8** | 4 routes sur 7 sans authentification |
| Paiements & revenus | **12** | Signature webhook correcte, mais fraude possible, résiliation non traitée, quotas absents |
| Fiabilité / SRE | **8** | Application non fonctionnelle, aucune sauvegarde, aucun SLO |
| Observabilité | **5** | `console.log` uniquement |
| Conformité RGPD | **10** | Aucun exercice des droits, textes squelettiques, fuite de données par conception |
| Base de données | **20** | Schéma lisible mais sans FK, index, contraintes ni RLS ; dérive constatée |
| Tests | **15** | 3 tests unitaires dont 1 factice ; 4 tests E2E non exécutables ; 0 test d'autorisation |
| Qualité du code | **25** | `tsc` propre, mais 251 erreurs ESLint et `any` généralisé |
| Architecture | **22** | Découpage en couches pertinent, mais double identité et double SGBD |
| Frontend | **45** | App Router bien structuré, composants lisibles, mais logique de sécurité côté client |
| UI / cohérence visuelle | **55** | Design system embryonnaire cohérent (`components/ui`) |
| UX | **35** | Parcours pensés, mais fonctionnalités fantômes et états d'erreur absents |
| Accessibilité | **NON TESTÉ** | Ne peut être scoré sans test réel |
| Responsive | **NON TESTÉ** | Idem |
| Performance | **NON TESTÉ** | Aucun environnement déployé |
| DevOps / CI-CD | **18** | CI existante mais sans lint, typecheck ni build ; aucun environnement protégé |
| Exploitation | **5** | Aucun runbook, aucune astreinte, aucune procédure d'incident |
| Documentation | **20** | Documents présents mais obsolètes et contradictoires |
| Maturité produit | **20** | Proposition de valeur claire, exécution non aboutie |
| **GLOBAL** | **17 / 100** | |

---

## 9. Domaines non testés

Ces domaines n'ont **pas** été évalués et ne doivent pas être considérés comme conformes :

accessibilité WCAG 2.2 AA (test clavier et lecteur d'écran) · responsive et compatibilité navigateurs · Core Web Vitals et performance backend (p50/p95/p99) · tests de charge et comportement « noisy neighbor » · configuration TLS, DNS, CDN, WAF · configuration IAM Netlify et Supabase · politiques RLS et Storage Supabase · configuration Stripe (produits, webhooks, mode live) · restauration de sauvegarde · SEO technique en conditions réelles · sécurité de la chaîne d'approvisionnement (SBOM, provenance, `npm audit` non exécuté faute d'installation propre).

**Ces angles morts sont susceptibles de contenir des anomalies P0 supplémentaires** — en particulier la question de la Row-Level Security Supabase (MS-022), qui doit être vérifiée en priorité absolue : si les tables sont exposées sans RLS avec la clé anonyme publiée dans le bundle client, il s'agit d'un P0 supplémentaire immédiat.

---

*Documents associés : `AUDIT_EXECUTIVE_SUMMARY.md` · `AUDIT_FINDINGS.csv` · `AUDIT_FINDINGS.json` · `THREAT_MODEL.md` · `ARCHITECTURE_AUDIT.md` · `REMEDIATION_BACKLOG.md` · `TEST_PLAN.md` · `PRODUCTION_READINESS_CHECKLIST.md` · matrices `*.csv`*
