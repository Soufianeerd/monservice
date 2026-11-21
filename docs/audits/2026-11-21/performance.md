# MonService — Audit de performance des navigations du tableau de bord

**Date :** 21 novembre 2026 · **Périmètre :** `src/app/(dashboard)/*`, couche d'accès aux données (`src/lib/db`, `src/lib/auth`), services, bundles client, hébergement.
**Mode :** lecture seule. Aucun fichier du dépôt modifié, aucune base distante touchée. Les temps sont **modélisés** (comptage des allers-retours réseau dans le code × latence), pas mesurés en production : voir « Comment mesurer » en fin de document pour les confirmer.

---

## 0. Résumé

La lenteur ne vient pas d'un seul défaut mais de **cinq effets qui se multiplient** :

1. **Le calcul tourne aux États-Unis (Netlify, Ohio `cmh`) et la base à Francfort.** Chaque aller-retour SQL coûte ~100 ms.
2. **Chaque requête SQL isolée coûte 5 allers-retours**, pas 1 : `BEGIN` → contrôle du rôle (`pg_roles`) → `set_config(identité)` → requête → `COMMIT` (`src/lib/db/security-context.ts`). Une requête « simple » = **~500 ms**.
3. **Le pool PostgreSQL a une seule connexion** (`max: 1`, `src/lib/db/server.ts`) : les `Promise.all` sont en réalité **séquentiels**.
4. **Requêtes dupliquées et en cascade** : organisation relue 2 fois (layout + page), profil utilisateur relu 2 fois, 3 requêtes au lieu d'une pour le calendrier, 5 au lieu d'une pour les statistiques, **N+1 sur la liste des factures/devis** (2 requêtes par facture), provisionnement « cabinet de départ » rejoué à chaque visite paramédicale.
5. **Aucun `loading.tsx` ni `<Suspense>`** dans tout le tableau de bord : Next.js ne précharge rien pour les routes dynamiques et l'écran reste **figé** jusqu'à la réponse complète du serveur.

| Navigation (utilisateur en Lorraine, fonction chaude) | Aujourd'hui | Après correctifs code (Netlify gratuit, US) | Après correctifs + calcul à Francfort |
|---|---|---|---|
| Tableau de bord → Agenda/Calendrier (CRM générique) | **~3,4 s** écran figé (jusqu'à 5-6 s à froid) | ~0,6-0,8 s, squelette affiché en < 100 ms | **~0,1-0,2 s** |
| → Agenda/Rendez-vous (paramédical) | ~5 s | ~0,8-1 s | ~0,15-0,25 s |
| → Tableau de bord (générique) | ~4,7 s | ~0,5-0,9 s | ~0,1-0,2 s |
| → Facturation/Factures (20 factures) | **~23 s** | ~0,6-1,3 s | ~0,15-0,3 s |
| → Chantiers / interventions (`/operations`) | ~2,2 s | ~0,6-0,7 s | ~0,1-0,2 s |
| → Paramètres/Profil | ~1,2 s | ~0,4 s | < 0,1 s |
| → Clients | ~1,4 s (dont « Chargement… ») | ~0,5-0,8 s | ~0,1-0,2 s |

Le **déplacement du calcul à Francfort** est le levier unitaire le plus fort (÷10 à ÷30 sur le temps serveur, sans toucher au code), mais il coûte 20 $/mois chez Netlify. Les correctifs de code gratuits ramènent déjà la plupart des navigations **sous la seconde** et rendent l'interface **réactive immédiatement** grâce aux `loading.tsx`.

---

## 1. Méthode et coûts unitaires

Hypothèses : aller-retour (RTT) fonction Netlify Ohio ↔ Neon Francfort = **100 ms** ; navigateur (Metz/Luxembourg) ↔ origine Ohio ≈ 110 ms ; navigateur ↔ Francfort ≈ 15 ms ; RTT fonction Francfort ↔ Neon Francfort ≈ 1-2 ms.

| Primitive (code actuel) | Allers-retours | Coût US |
|---|---|---|
| Requête Drizzle hors transaction explicite (`db.select…`) → proxy `unsafe` → `begin()` → `BEGIN`, `select … from pg_roles`, `set_config`, requête, `COMMIT` (`security-context.ts` l. 27-33 ; `postgres` `begin()` attend le `BEGIN` puis le `COMMIT`) | **5** | **500 ms** |
| Vérification d'identité, 1ʳᵉ requête de chaque requête HTTP : `auth.getSession()` (cookie signé) puis `select provider_session_is_active(...)` sur le client brut (`server.ts` l. 63-83) | 1 (+ appel HTTPS Neon Auth si le cookie `session_data` a > 60 s) | 100 ms (+ ~300 ms) |
| `getSessionContext()` (`session.ts`) : vérification + `select users` | 6 | 600 ms |
| `db.transaction(...)` avec k requêtes | 4 + k | — |
| Reconnexion PostgreSQL (TCP + TLS + SCRAM) quand la connexion a été fermée par `idle_timeout: 20` (plus de 20 s sans requête sur l'instance) | ~4-5 | ~450 ms |
| Démarrage à froid de la fonction Netlify (Lambda) | — | ~1-2 s (non mesuré) |

Points structurants vérifiés dans le code :

- **Pool à 1 connexion** : `DATABASE_POOL_MAX` absent ⇒ `max: 1` (`src/lib/db/server.ts` l. 45-53). `client.begin()` réserve l'unique connexion ; tout le reste attend. `Promise.all` n'apporte donc **aucun parallélisme** (ex. `dashboard.service.getProfessionalStats` : 5 requêtes « parallèles » = 25 RTT = 2,5 s).
- **Proxy (`src/proxy.ts`)** : sur Netlify, le proxy Node de Next 16 est converti en **Edge Function** (`@netlify/plugin-nextjs` 5.15.13, `dist/build/functions/edge.js`, `runtime: "nodejs"` → `createEdgeHandlers`), donc exécuté **près de l'utilisateur**, pas en Ohio. `auth.middleware()` lit le cookie signé `session_data` (TTL **60 s**, `src/lib/auth/server.ts`) : **aucun appel réseau** si le cookie a moins de 60 s ; sinon **2 appels HTTPS séquentiels** à Neon Auth (`mintSessionDataCookie` puis `fetchSessionWithCookie`, `@neondatabase/auth/dist/server-*.mjs` l. 1344-1360). Le cookie rafraîchi n'est posé que sur la **réponse** : la page rendue dans la même requête voit encore l'ancien cookie et `auth.getSession()` refait **un 3ᵉ appel** à Neon Auth depuis l'Ohio (~300 ms avec poignée de main TLS).
- **Navigation client** : le layout partagé `(dashboard)/layout.tsx` n'est **pas** ré-exécuté lors d'une navigation interne (Next ne re-rend que sous le layout commun, cf. `node_modules/next/dist/docs/01-app/02-guides/instant-navigation.md`). En revanche chaque page/layout de section rappelle `requireProfessional()` ⇒ la vérification d'identité (6 RTT) est payée **à chaque navigation**.
- **Pas de `loading.tsx`** (aucun fichier dans `src/app`) et seulement 4 `<Suspense>` hors tableau de bord. Docs Next 16 : « *Dynamic Route: prefetching is skipped, or the route is partially prefetched if `loading.tsx` is present* » et « *When navigating to a dynamic route, the client must wait for the server response before showing the result* » (`01-getting-started/04-linking-and-navigating.md` l. 87 et 170-174). Toutes les pages du tableau de bord sont dynamiques (cookies) ⇒ **aucun préchargement, aucun retour visuel au clic**.
- **Server Actions utilisées pour lire des données** dans 40 pages `'use client'` (clients, factures, devis, produits, affaires, messages, paramètres…). Docs : « *Next.js dispatches Server Actions one at a time per client… do not rely on `Promise.all`* » (`02-guides/server-actions.md` l. 26-30). Chaque action = un aller-retour navigateur ↔ Ohio + une vérification d'identité complète + ses requêtes, **en file**.

---

## 2. Comptage par navigation (code actuel)

RTT = aller-retour fonction ↔ base. « Tx » = transaction implicite de 5 RTT.

### 2.1 Tableau de bord → Agenda / Calendrier — CRM générique (`agenda/layout.tsx` + `agenda/calendrier/page.tsx`)

| Étape séquentielle | Fichier | RTT |
|---|---|---|
| Vérification session (`provider_session_is_active`) | `lib/db/server.ts` | 1 |
| `select users` (via `requireProfessional` → `getSessionContext`, `cache()` ✔) | `lib/auth/session.ts` | 5 |
| `organizationService.getById` dans le **layout** | `agenda/layout.tsx` l. 14 | 5 |
| `organizationService.getById` **à nouveau** dans la page (pas de `cache()`) | `agenda/calendrier/page.tsx` l. 31 | 5 |
| `calendarService.getEvents` : tâches, **puis** factures, **puis** affaires (3 `await` successifs, fenêtre de 3 ans) | `lib/services/calendar.service.ts` | 15 |
| **Total** | | **31 RTT ≈ 3,1 s** |

+ ~110 ms réseau navigateur ↔ Ohio + chargement de FullCalendar (82 Ko gzip) après la réponse. **≈ 3,3-3,5 s écran figé**. Ajouter +0,3 s si le cookie Neon Auth a plus de 60 s, +0,45 s si l'instance n'a pas fait de requête depuis 20 s (reconnexion), +1-2 s à froid.

### 2.2 → Agenda / Rendez-vous — paramédical

Identité 6 + organisation ×2 = 10 + **`prepareStarterPractice`** (`lib/services/practice-starter.service.ts`) : transaction avec `pg_advisory_xact_lock` + 3 `select` **même quand le cabinet est déjà configuré** = 8 RTT + `getSchedulingBootstrap` : 5 requêtes séquentielles (lieux, praticiens, affectations, salles, types) = 25 RTT. **Total ≈ 49 RTT ≈ 4,9 s.**

### 2.3 → Tableau de bord (`dashboard/page.tsx`)

| Étape | RTT |
|---|---|
| `getSessionAction()` : identité (6) **+ `userService.getUserProfile` qui relit `users`** (5) | 11 |
| `getOrganizationAction()` : `organizations` (5) | 5 |
| Générique / BTP : `getProfessionalStats` 5 requêtes « parallèles » mais sérialisées (25) + `dealService.findAll` (toutes les affaires, pour un graphique calculé en JS) (5) [+ BTP : `getFieldServiceDashboardMetrics` (5)] | 30-35 |
| Paramédical à la place : `prepareStarterPractice` (8) + `getOverview` 2 requêtes (10) | 18 |
| **Total** | **générique 46 (≈ 4,6 s), BTP 51 (≈ 5,1 s), paramédical 34 (≈ 3,4 s)** |

Recharts (110 Ko gzip) est chargé de façon synchrone par `DashboardChart`.

### 2.4 → Facturation / Factures (`facturation/layout.tsx` + `facturation/factures/page.tsx` en `'use client'`)

1. Requête RSC : layout = identité 6 + organisation 5 = **11 RTT (1,1 s)** avant tout affichage.
2. Après hydratation, `useEffect` lance `Promise.all([invoiceActions.findAllAction, clientActions.findAllAction])` → **exécutées l'une après l'autre** par le client :
   - Action factures : navigateur ↔ Ohio (110 ms) + identité 6 + `invoiceService.findAll` = 5 + **2 requêtes par facture** (`lib/services/invoice.service.ts` l. 44-52, lignes **puis** sections) ⇒ **5 + 10·N RTT**. Avec N = 20 : 211 RTT ≈ **21 s**.
   - Action clients : 110 ms + 11 RTT ≈ 1,2 s.
3. **Total ≈ 23 s pour 20 factures** (≈ 6 s pour 5 factures). Même N+1 dans `findByClient` (l. 68), dans `facturation/devis/page.tsx` (→ `findByProfessional` → `findAll`) et dans `patient-billing.service.ts` (l. 322 et 408-421).

### 2.5 → Chantiers / interventions (`operations/page.tsx`)

Identité 6 + `requireFieldServiceContext` relit `organizations` 5 + `listFieldServiceWorkOrders` 5 + liste des clients 5 (Promise.all sérialisé) = **21 RTT ≈ 2,1 s** (+ 0,1 s).

### 2.6 → Paramètres (`parametres/layout.tsx` + `parametres/profil/page.tsx`)

Layout : identité 6 + organisation 5 = **11 RTT ≈ 1,1 s** ; la page profil est un composant client sans chargement. ≈ **1,2 s**.

### 2.7 → Clients (`clients/page.tsx`, `'use client'`)

Requête RSC sans base (~0,2 s) puis action `findAllAction` : 110 ms + 11 RTT ⇒ **≈ 1,4 s** dont ~1,2 s de « Chargement… ».

### 2.8 Premier chargement du tableau de bord (hors navigation, mais il bloque la file d'actions)

`AuthProvider` (`components/auth/AuthContext.tsx`) appelle `authClient.useSession()` (HTTP vers `/api/auth`), puis **`getSessionAction` (11 RTT) puis `getOrganizationAction` (11 RTT)** ; `Header` appelle ensuite **`generateNotificationsAction`** (`app/actions/notification.ts`) qui **ne renvoie que `[]`** après une vérification d'identité (6 RTT). Ces ~3 actions (≈ 3 s) passent **avant** les actions de données de la page (file séquentielle), alors que `DashboardLayout` a déjà le contexte côté serveur.

### 2.9 Récapitulatif des défauts structurels

| Défaut | Où | Effet |
|---|---|---|
| 5 RTT par requête isolée (BEGIN/rôle/set_config/requête/COMMIT, non pipelinés) | `lib/db/security-context.ts` l. 27-33 | ×5 sur tout |
| Vérification de session = requête séparée hors transaction | `lib/db/server.ts` l. 70 | +1 RTT par requête HTTP |
| Pool `max: 1` | `lib/db/server.ts` l. 50-53 | `Promise.all` inutile |
| `idle_timeout: 20` | `lib/db/server.ts` l. 55 | reconnexion (~450 ms) après 20 s d'inactivité — cas normal entre deux clics |
| Cookie Neon Auth `sessionDataTtl: 60` | `lib/auth/server.ts` l. 10 | 2 appels Neon Auth au proxy + 1 dans la page toutes les 60 s |
| `organizationService.getById` sans `cache()`, appelé par layout **et** page | `agenda/layout.tsx`, `agenda/calendrier/page.tsx`, `facturation/layout.tsx`, `parametres/layout.tsx`, `dashboard/page.tsx` (via action), `lib/workspaces/field-service/context.ts` | +5 RTT par doublon |
| `users` relu (`getUserProfile` après `getSessionContext`) | `app/actions/session.ts` l. 9-14 | +5 RTT |
| Requêtes séquentielles fusionnables | `calendar.service.ts`, `dashboard.service.ts`, `scheduling.service.ts` (`getSchedulingBootstrap`) | +10 à +20 RTT |
| N+1 | `invoice.service.ts` l. 44 et 68, `patient-billing.service.ts` l. 322 et 408-421 | 10 RTT par facture |
| Provisionnement bloquant rejoué à chaque visite | `practice-starter.service.ts` appelé par `dashboard/page.tsx` et `agenda/calendrier/page.tsx` | +8 RTT |
| Pas de `loading.tsx` / `<Suspense>` | tout `src/app/(dashboard)` | écran figé, pas de préchargement |
| Lecture de données par Server Actions depuis `useEffect` | 40 pages `'use client'` | +1 aller-retour navigateur et +6 RTT d'identité par action, en file |
| Pages-redirections (`/agenda`, `/facturation`, `/parametres`) | `*/page.tsx` → `redirect()` | aller-retour supplémentaire si un lien y pointe |

---

## 3. Poids des bundles client

Mesuré sur le build présent dans `.next/` (build du 21/11/2026, manifestes `*_client-reference-manifest.js`, tailles gzip) :

| Élément | Taille gzip | Où il est chargé | Chargement |
|---|---|---|---|
| Socle commun à toutes les pages du tableau de bord | ~152 Ko (hors runtime React/Next) | partout | normal |
| **Recharts** | ~110 Ko (chunk `0q5vwajmlp8qt.js`) | `/dashboard`, `/agenda/statistiques`, `/deals/rapports` | **synchrone** (`components/crm/DashboardChart.tsx`, `AdvancedReports.tsx`, `agenda/statistiques/ActivityChart.tsx`) |
| **FullCalendar** | ~82 Ko (`0ymjqz9ir_xgg.js`) | `/agenda/calendrier` | **synchrone** (`components/crm/CalendarView.tsx`) |
| **@react-pdf/renderer** | **~482 Ko** (`0r-j-vtil3csp.js`, 1,46 Mo brut) | `/facturation/factures/[id]`, `/facturation/devis/[id]`, `/client/invoices/[id]`, `/client/quotes/[id]` | **synchrone** (`components/crm/InvoiceDetail.tsx` importe `PDFDownloadLink` en tête) |
| Polyfills crypto navigateur (asn1.js / bn.js) | ~127 Ko (`41m5y8vuqx8py.js`) | `/parametres/equipe`, `/avis-clients` | synchrone — un composant client importe une bibliothèque qui tire `crypto` Node (à identifier) |

Aucun `next/dynamic` ni `import()` de composant dans `src` (seul `AuthContext` importe dynamiquement `app/actions/session`). Sur une navigation client, ces chunks ne sont demandés **qu'après** réception du flux RSC : ils s'ajoutent au temps serveur (~100-300 ms sur bonne connexion, bien plus sur mobile).

---

## 4. Correctifs de code — réalisables tout de suite, hébergement gratuit inchangé

Classés par rapport gain / effort. Gains estimés **avec le calcul en Ohio** (RTT 100 ms) ; ils restent valables mais divisés par ~50 une fois le calcul à Francfort. Après chaque correctif : `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run test:security`, et pour C3/C6 **obligatoirement** `npm run test:rls` et `npm run test:neon-boundaries` sur une branche Neon de test (jamais la production).

### C1 — Supprimer les N+1 de la facturation · gain **−10 RTT par facture** (≈ −20 s pour 20 factures) · effort S · risque faible

- Fichiers : `src/lib/services/invoice.service.ts` (`findAll` l. 39-54, `findByClient` l. 56-78), `src/lib/services/patient-billing.service.ts` (l. 322, 408-421).
- Faire : 1 requête en-têtes, puis **1** requête `invoiceLines` et **1** requête `invoiceSections` avec `inArray(invoiceLines.invoiceId, ids)`, regroupement en mémoire (`Map<invoiceId, …>`), puis `mapDbInvoice`. Mieux encore pour la **liste** : ne pas charger lignes et sections du tout (InvoiceList n'affiche que des totaux) via une méthode `listHeaders(organizationId)`.
- Critère d'acceptation : nombre de requêtes de `findAll` constant (3) quel que soit N ; tests de mapping existants verts.

### C2 — `loading.tsx` dans le tableau de bord · gain perçu **~3 s → < 100 ms** avant retour visuel · effort S · risque très faible

- Créer `src/app/(dashboard)/loading.tsx` (squelette de contenu : titre + 3 blocs gris, le même que `ProtectedLayout`). D'après la doc (`03-api-reference/03-file-conventions/loading.md`), il enveloppe les **layouts imbriqués** (`agenda/layout.tsx`, `facturation/layout.tsx`, `parametres/layout.tsx`) et les pages : la barre latérale et l'en-tête restent, le contenu passe immédiatement en squelette, et le squelette est **préchargé** par les `<Link>` (préchargement partiel des routes dynamiques).
- Ajouter aussi `agenda/loading.tsx`, `facturation/loading.tsx`, `parametres/loading.tsx` (onglets conservés lors d'un changement d'onglet), et `dashboard/loading.tsx`, `operations/loading.tsx`, `clients/loading.tsx` si l'on veut un squelette spécifique.
- Le préchargement s'arrête à la première frontière `loading` sous le layout partagé : il ne déclenche **aucune** requête SQL (le layout `(dashboard)` n'est pas ré-exécuté). Ne pas mettre `prefetch={true}` sur les liens de la barre latérale tant que C3-C6 ne sont pas faits : chaque lien visible déclencherait un rendu complet (3-5 s de base chacun sur une connexion unique).
- Ne change pas le temps serveur, mais supprime la sensation « rien ne se passe ».

### C3 — Une transaction = 3 RTT au lieu de 5, et la vérification de session dans la même instruction · gain **−2 RTT par requête, −1 RTT par requête HTTP** (Agenda générique : −1,3 s) · effort M · risque moyen (sécurité : garder exactement les mêmes garanties)

- Fichiers : `src/lib/db/security-context.ts`, `src/lib/db/server.ts`.
- Faire : remplacer les deux `await` séparés (contrôle `pg_roles` puis `set_config`) et la requête hors transaction `provider_session_is_active` par **une seule instruction**, envoyée **sans attendre** avant la première requête du callback (postgres.js pipeline les requêtes émises sur la même connexion réservée) :
  ```sql
  select set_config('monservice.provider_user_id',
           case when public.provider_session_is_active($1, $2) then $1 else '' end, true) as uid,
         r.rolname, r.rolbypassrls, r.rolsuper, r.rolinherit
  from pg_roles r where r.rolname = current_user
  ```
  puis : lancer `callback(tx)`, attendre le résultat de cette instruction, **lever une erreur (⇒ ROLLBACK, aucun résultat renvoyé)** si le rôle n'est pas conforme, et seulement ensuite renvoyer le résultat du callback. L'ordre d'exécution dans PostgreSQL reste garanti (pipeline FIFO sur une connexion), donc l'identité est posée avant la requête métier.
  `verifyProvider` ne fait plus que `auth.getSession()` (signature du cookie) et renvoie `{userId, sessionId}` ; la vérification « session vivante / bannie » reste faite **en base à chaque transaction** (encore plus stricte qu'aujourd'hui, une fois par requête HTTP).
- Bilan : BEGIN (1) + [identité + requête] (1) + COMMIT (1) = 3 RTT.
- Tests : `test:rls`, `test:neon-boundaries` (révocation, réinscription, rôles), `test:security`.

### C4 — Identité + organisation en une requête, mémoïsée par requête · gain **−5 à −10 RTT par navigation** (−0,5 à −1 s) · effort S-M · risque faible

- Fichiers : `src/lib/auth/session.ts`, `agenda/layout.tsx`, `agenda/calendrier/page.tsx`, `facturation/layout.tsx`, `parametres/layout.tsx`, `dashboard/page.tsx`, `app/actions/session.ts`, `lib/workspaces/field-service/context.ts`.
- Faire : dans `getSessionContext` (déjà `cache()`), `leftJoin(organizations, eq(organizations.id, users.organizationId))` et retourner `organization: { id, name, sector, profession, country, … }`. Exposer `getOrganizationContext = cache(...)`. Remplacer **tous** les `organizationService.getById(context.organizationId)` des layouts/pages et la requête de `requireFieldServiceContext` par ce contexte. Dans `dashboard/page.tsx`, remplacer `getSessionAction()` (qui relit `users` via `getUserProfile`) par `getSessionContext()`.
- Variante minimale (10 min) : `export const getOrganizationById = cache((id: string) => organizationService.getById(id))` utilisé partout → supprime déjà le doublon layout/page.
- La politique RLS sur `organizations` autorise déjà la lecture par un membre (c'est ce que fait `getById` aujourd'hui) : pas de changement de sécurité.

### C5 — Fusionner les requêtes séquentielles · gain Agenda générique −10 RTT (−1 s), Tableau de bord −25 RTT (−2,5 s), Rendez-vous −20 RTT (−2 s) · effort S-M · risque faible

- `src/lib/services/calendar.service.ts` : une seule requête `UNION ALL` (tâches / factures / affaires) au lieu de 3 `await`. En plus, limiter la fenêtre (aujourd'hui −1 an / +2 ans) à la plage visible : `CalendarView` peut recharger via `datesSet` de FullCalendar.
- `src/lib/services/dashboard.service.ts` (`getProfessionalStats`) : **une** requête à sous-requêtes scalaires `select (select count(*) from clients where …), (select count(*) from deals where …), … , (select sum(total_ttc) …)`.
- `dashboard/page.tsx` : ne plus charger **toutes** les affaires pour le graphique ; calculer le chiffre des affaires gagnées par mois en SQL (`date_trunc('month', updated_at)`, 6 derniers mois).
- `src/lib/services/scheduling.service.ts` (`getSchedulingBootstrap`, l. 991-1089) : 5 requêtes séquentielles → `Promise.all` **dans une même `db.transaction`** (voir C6) ou 2 requêtes avec jointures.
- `operations/page.tsx` : idem (liste + clients dans une même transaction).

### C6 — Une transaction de lecture par page, requêtes pipelinées · gain : N requêtes → ~3-4 RTT au total · effort M · risque moyen

- Fichiers : nouveau helper `src/lib/db/read-scope.ts` (ex. `withReadScope(fn)` = `db.transaction(async () => fn())`), pages serveur (`dashboard`, `agenda/calendrier`, `operations`, layouts de section).
- Principe : `security-context.ts` réutilise déjà la transaction courante (AsyncLocalStorage) pour toute requête émise via `db` à l'intérieur (« *Queries issued through the global db inside a transaction reuse that connection* »). Un `Promise.all` **à l'intérieur** d'une transaction est donc **pipeliné** sur la connexion : BEGIN + [identité + k requêtes] + COMMIT ≈ 3-4 RTT quel que soit k.
- Précautions : réserver aux **lectures** ; un `db.transaction` imbriqué devient un SAVEPOINT (RTT supplémentaires) ; une erreur annule tout le lot ; ne pas garder la transaction ouverte pendant un streaming `<Suspense>` long.

### C7 — Sortir `prepareStarterPractice` du chemin de navigation · gain **−8 RTT (−0,8 s)** sur chaque visite paramédicale (tableau de bord et rendez-vous) · effort S · risque faible

- Fichiers : `src/lib/services/practice-starter.service.ts`, `dashboard/page.tsx`, `agenda/calendrier/page.tsx`, et le flux d'inscription (`complete-profile`/création d'organisation).
- Faire : l'appeler **une fois** à la création de l'organisation paramédicale ; dans les pages, garder un chemin rapide (sans verrou) intégré à la lecture existante (`exists(select 1 from practice_locations …) or exists(select 1 from appointment_types …)` dans la même transaction que le bootstrap) et ne lancer la transaction verrouillée que si les deux sont absents. Le comportement « jamais de configuration en double » est conservé par le verrou.

### C8 — Cookie de session Neon Auth : 60 s → 300 s · gain ~0,3 s à chaque navigation espacée de plus d'une minute (+ 2 appels Neon Auth évités dans le proxy) · effort XS · risque faible

- Fichier : `src/lib/auth/server.ts` → `sessionDataTtl: 300` (valeur par défaut du SDK).
- Justification sécurité : la révocation (déconnexion, bannissement, expiration) est vérifiée **en base à chaque requête** par `provider_session_is_active` (`drizzle/neon/0012_live_provider_sessions.sql`) ; le cookie ne sert qu'à éviter l'appel HTTP. Le délai de révocation effectif reste immédiat.
- Optionnel : dans `src/proxy.ts`, recopier le cookie `session_data` fraîchement émis dans les en-têtes de la **requête** transmise (`NextResponse.next({ request: { headers } })`) pour que la page n'appelle pas Neon Auth une seconde fois.

### C9 — Garder la connexion PostgreSQL ouverte · gain ~0,45 s quand plus de 20 s séparent deux clics (cas courant) · effort XS · risque faible

- Fichier : `src/lib/db/server.ts` → `idle_timeout: 300` (ou `0` + `max_lifetime: 600`). postgres.js se reconnecte seul si le pooler Neon a fermé la connexion.
- Après C3/C6 seulement : `DATABASE_POOL_MAX=3` sur Netlify permet de vrais parallélismes entre transactions indépendantes (chaque connexion supplémentaire coûte une poignée de main à la première utilisation).

### C10 — Lire les données côté serveur plutôt que par Server Actions dans `useEffect` · gain 1 aller-retour navigateur + 6 RTT par action, et fin de la file séquentielle (Factures : −1,2 s pour l'action clients seule) · effort M-L (40 pages) · risque moyen (régressions d'UI)

- Priorité : `facturation/factures/page.tsx`, `facturation/devis/page.tsx`, `facturation/produits/page.tsx`, `clients/page.tsx`, `deals/(tabs)/pipeline/page.tsx`, `agenda/taches/page.tsx`.
- Faire : `page.tsx` serveur qui charge (dans une transaction, C6) et passe `initialData` à un composant client (`InvoicesClient`), comme le fait déjà `operations/page.tsx` → `OperationsListClient`. Ces pages profitent alors de `loading.tsx` et du préchargement.
- Étape intermédiaire (rapide) : **une** action qui renvoie `{ invoices, clients }` au lieu de deux.

### C11 — Démarrage : ne plus recharger l'identité par 3 Server Actions · gain ≈ −2 à −3 s au premier affichage et file d'actions libérée · effort M · risque faible-moyen

- Fichiers : `src/components/auth/AuthContext.tsx`, `src/app/(dashboard)/layout.tsx`, `src/components/layout/Header.tsx`.
- Faire : `DashboardLayout` possède déjà `ctx` ; y joindre profil + organisation (C4) et les passer en props à un `SessionProvider` client (données d'affichage uniquement — la sécurité reste côté serveur). Supprimer l'appel `generateNotificationsAction` du `Header` tant que le module `app/actions/notification.ts` renvoie `[]`.

### C12 — Charger à la demande les bibliothèques lourdes · gain 100-300 ms par navigation concernée (beaucoup plus sur mobile ; ~480 Ko gzip sur les fiches facture/devis) · effort S · risque faible

- `components/crm/InvoiceDetail.tsx` (+ pages devis/client) : retirer l'import statique de `PDFDownloadLink`/`DocumentPDF` ; `const { pdf } = await import('@react-pdf/renderer')` au clic « Télécharger », ou `next/dynamic(() => import('./PdfDownloadButton'), { ssr: false })`.
- `components/crm/DashboardChart.tsx`, `AdvancedReports.tsx`, `agenda/statistiques/ActivityChart.tsx` : `next/dynamic(..., { ssr: false, loading: () => <ChartSkeleton/> })` (API confirmée dans `02-guides/lazy-loading.md`).
- `components/crm/CalendarView.tsx` : idem pour FullCalendar.
- `/parametres/equipe` et `/avis-clients` : trouver l'import qui tire les polyfills `crypto` (127 Ko) dans un composant client et le déplacer côté serveur.

### C13 — Petits gains

- Liens directs plutôt que pages-redirections (`/agenda` → `/agenda/calendrier`, `/facturation` → `/facturation/factures`, `/parametres` → `/parametres/profil`) partout où un `href` y pointe.
- `experimental.staleTimes.dynamic: 30` dans `next.config.ts` (doc `05-config/01-next-config-js/staleTimes.md`) : retours instantanés vers une page visitée depuis < 30 s. **À ne faire qu'après** avoir vérifié que chaque mutation appelle `revalidatePath`/`router.refresh()`, sinon des données périmées s'affichent (CRM).
- Plus tard (P2/P4) : `cacheComponents` + `partialPrefetching` (doc `02-guides/instant-navigation.md`) pour des navigations réellement instantanées. Migration lourde ici (toutes les données passent par les cookies + RLS, donc `'use cache'` serveur inapplicable ; seul `'use cache: private'` côté navigateur) et compatibilité de l'adaptateur Netlify à vérifier. Pas avant C1-C11.

### Récapitulatif code

| # | Correctif | Gain principal | Effort | Risque |
|---|---|---|---|---|
| C1 | N+1 factures/devis | −10 RTT/facture (−20 s @20) | S | faible |
| C2 | `loading.tsx` | retour visuel < 100 ms (perçu) | S | très faible |
| C3 | Transaction 3 RTT + session dans la même instruction | −2 RTT/requête, −1 RTT/HTTP | M | moyen (sécurité) |
| C4 | Identité ⋈ organisation + `cache()` | −0,5 à −1 s/navigation | S-M | faible |
| C5 | Fusion calendrier / stats / bootstrap / graphique | −1 à −2,5 s selon la page | S-M | faible |
| C6 | Transaction de lecture pipelinée par page | N requêtes → ~3-4 RTT | M | moyen |
| C7 | Provisionnement hors navigation | −0,8 s (paramédical) | S | faible |
| C8 | `sessionDataTtl` 300 s | −0,3 s (> 1 min d'intervalle) | XS | faible |
| C9 | `idle_timeout` 300 s | −0,45 s (> 20 s d'intervalle) | XS | faible |
| C10 | Données serveur au lieu d'actions `useEffect` | −0,7 à −1,2 s par action | M-L | moyen |
| C11 | Démarrage sans 3 actions | −2 à −3 s au 1ᵉʳ affichage | M | faible-moyen |
| C12 | Imports dynamiques (PDF, graphiques, calendrier) | −0,1 à −0,3 s ; −480 Ko sur fiches | S | faible |

**Ordre conseillé (1 à 2 jours de travail) :** C2 → C1 → C8 + C9 → C4 → C5 → C7 → C12 → C3 → C6 → C11 → C10.

---

## 5. Changement d'hébergement : rapprocher le calcul de la base (Francfort)

Effet : RTT fonction ↔ base 100 ms → ~1-2 ms. Même **sans** correctif, Agenda générique passe de 31 × 100 ms à 31 × ~2 ms ≈ 60 ms de base ; le navigateur en Lorraine est à ~15 ms de Francfort au lieu de ~110 ms de l'Ohio. Neon Auth (`NEON_AUTH_BASE_URL`) est probablement hébergé dans la région du projet Neon — à vérifier dans la console Neon.

| Option | Région proche de Neon Francfort | Prix 2026 vérifié | Remarques |
|---|---|---|---|
| **Netlify Pro** (rester chez Netlify) | `fra` EU (Frankfurt), choix en libre-service | **20 $/mois** (3 000 crédits, membres illimités) | Réglage disponible « *on all Pro and Enterprise plans* » ; défaut `cmh` (Ohio) ; pour un adaptateur Next.js, réglage **au niveau du projet dans l'interface** puis redéploiement. Migration la plus simple (zéro code). Les démarrages à froid Lambda restent. Sources : [Netlify — Functions configuration](https://docs.netlify.com/build/functions/configuration.md), [Netlify — pricing updates avril 2026](https://www.netlify.com/changelog/2026-04-14-pricing-updates-april-2026.md) |
| **Vercel Pro** | `fra1` | **20 $/mois par siège développeur**, 20 $ de crédit d'usage inclus | Choix de région possible (même en Hobby depuis 2022 : « *Previously, Hobby customers could only choose US East (iad1)* »). **Hobby** : la page des conditions (`vercel.com/legal/terms`) n'a pas pu être consultée ici ; la règle Vercel connue réserve Hobby à un usage personnel non commercial ⇒ pour un SaaS facturé, prévoir Pro (à confirmer). Sources : [Vercel pricing](https://vercel.com/pricing), [Vercel Hobby plan](https://vercel.com/docs/plans/hobby), [changelog région Hobby](https://vercel.com/changelog/hobby-customers-can-now-select-their-preferred-region-for-serverless) |
| **Render** (serveur Node permanent) | Francfort proposé par Render (page régions non consultable ici — à confirmer dans le tableau de bord) | Instance « < 1 CPU, 512 Mo » **7 $/mois** ; 1 CPU / 2 Go **25 $/mois** ; espace Hobby 0 $ | L'offre gratuite s'endort après inactivité → inutilisable pour un SaaS. Serveur permanent ⇒ **pas de démarrage à froid**, pool de connexions chaud (`DATABASE_POOL_MAX` 5-10). 512 Mo est juste pour `next start` ; viser 1-2 Go. Source : [Render pricing](https://render.com/pricing.md) |
| **Fly.io** | `fra` | `shared-cpu-1x` 256 Mo **2,19 $/mois** ; mémoire **6 $/Go/mois** (au 1ᵉʳ oct. 2026) ⇒ ~1 Go ≈ 6-8 $/mois | Conteneur Docker (`output: 'standalone'`), pas de démarrage à froid si `min_machines_running = 1`. Plus d'exploitation (Dockerfile, déploiements). Source : [Fly.io 2026 pricing update](https://fly.io/pricing-update/) |
| **Railway** | EU West (Amsterdam, ~8 ms de Francfort) — liste des régions non confirmée ici | Hobby **5 $/mois** (5 $ d'usage inclus) ; Pro 20 $/mois | Serveur permanent. Source : [Railway plans](https://docs.railway.com/pricing/plans.md) |
| **Scaleway Serverless Containers** | `fr-par` (Paris, ~10 ms de Francfort) — région non listée sur la page tarifs | 0,00001 €/vCPU-s et 0,000002 €/Go-s après **200 000 vCPU-s et 400 000 Go-s gratuits/mois** | Opérateur français ; démarrages à froid si `min-scale = 0`. Source : [Scaleway serverless pricing](https://www.scaleway.com/en/pricing/serverless/) |
| **Clever Cloud** | Paris | Tarifs Node.js non publiés en clair (estimateur) — **non vérifié** | Opérateur français, serveur permanent. Source : [Clever Cloud pricing](https://www.clever.cloud/pricing) |

**Recommandation hébergement :**
1. **Court terme (ce mois-ci) : Netlify Pro + région `fra`.** 20 $/mois, aucune ligne de code, gain ×10 à ×30 sur le temps serveur, rollback = remettre `cmh` et redéployer.
2. **Moyen terme, si les démarrages à froid gênent** (premier clic après quelques minutes d'inactivité) : serveur Node permanent à Francfort (Render 1-2 Go ou Fly.io `fra` 1 Go, ~7-25 $/mois) avec `DATABASE_POOL_MAX` relevé. Demande d'adapter la CI/CD, les crons (`CRON_SECRET`), les webhooks Stripe et les en-têtes de sécurité déjà gérés par Next.

### Procédure Netlify (à exécuter par toi, une étape à la fois)

1. **Vérifier le plan actuel.** Ouvre `https://app.netlify.com`, choisis ton équipe, puis menu de gauche **Billing**. Résultat attendu : « Free » (ou « Personal »).
2. **Passer en Pro.** Dans **Billing**, clique **Upgrade** sur la carte **Pro** (20 $/mois), renseigne la carte, valide. Résultat attendu : l'équipe affiche « Pro ».
3. **Changer la région des fonctions.** Ouvre le projet MonService → **Project configuration** → **Cloud compute** → **Functions** → section **Region** → bouton **Configure** → choisis **EU (Frankfurt) – fra** → **Save**.
4. **Redéployer** (obligatoire, l'ancien déploiement garde l'ancienne région) : onglet **Deploys** → menu **Trigger deploy** → option de redéploiement complet (libellé du type « Clear cache and deploy »). Attends le statut « Published ».
5. **Vérifier.** Retourne à l'écran de l'étape 3 : la région affichée doit être `fra`. Puis, depuis ton navigateur, ouvre l'Agenda, outils de développement (F12) → onglet **Réseau** → clique sur la requête de la page (`calendrier?_rsc=…`) → **Timing** : « Waiting for server response » doit passer de plusieurs secondes à quelques centaines de millisecondes.
6. **Retour arrière si besoin** : même écran (étape 3), remets **US East (Ohio) – cmh**, puis étape 4.

---

## 6. Avant / après — modèle détaillé (Agenda générique)

| Scénario | RTT base | Temps base | + réseau navigateur | + JS | Ressenti |
|---|---|---|---|---|---|
| Aujourd'hui, chaud | 31 × 100 ms | 3,1 s | +0,11 s | +0,1-0,2 s | **~3,4 s figé** |
| Aujourd'hui, cookie > 60 s et connexion fermée | 31 + reconnexion + Neon Auth | ~3,9 s | +0,11 s | +0,1-0,2 s | ~4,2 s (5-6 s à froid) |
| C2 seul | idem | idem | idem | idem | squelette < 0,1 s, contenu à ~3,4 s |
| C2 + C3 + C4 + C5 + C8 + C9 | 6 × 100 ms | 0,6 s | +0,11 s | +0,1 s | squelette < 0,1 s, contenu ~0,8 s |
| + C6 | ~4 × 100 ms | 0,4 s | +0,11 s | +0,1 s | ~0,6 s |
| Code actuel, calcul à Francfort | 31 × ~2 ms | ~0,06 s | +0,02 s | +0,1 s | ~0,2 s (+ démarrage à froid possible) |
| Correctifs + Francfort | ~4-6 × ~2 ms | ~0,01 s | +0,02 s | +0,05 s | **~0,1 s** |

---

## 7. Comment mesurer (pour confirmer les estimations)

- Ajouter temporairement un en-tête `Server-Timing` ou des `console.time` autour de `getSessionContext`, des services et de `begin()` dans `security-context.ts`, et compter les requêtes par requête HTTP (compteur dans l'AsyncLocalStorage).
- Côté Neon : console → **Monitoring** et `pg_stat_statements` (nombre d'appels de `select set_config(...)` ≈ nombre de transactions).
- Côté navigateur : onglet **Réseau**, colonne « Waiting (TTFB) » des requêtes `?_rsc=` et des POST de Server Actions (en-tête `Next-Action`).
- Vérifier aussi si l'instance Neon s'endort (scale-to-zero) : le premier clic après ~5 min d'inactivité ajoute un réveil de la base, indépendant de l'hébergement.

## 8. Limites de cet audit

- Temps modélisés, non mesurés en production (pas d'accès à la production depuis cet environnement, et consigne de ne pas toucher aux bases distantes).
- Non vérifiés en ligne : conditions d'usage commercial du plan Vercel Hobby (page `vercel.com/legal/terms` non consultable ici), liste des régions Render (`render.com/docs/regions` non consultable) et Railway, tarifs Clever Cloud.
- La région de `NEON_AUTH_BASE_URL` et le mode « pooled » de `DATABASE_URL` en production n'ont pas pu être confirmés (variables non lisibles, à juste titre).
