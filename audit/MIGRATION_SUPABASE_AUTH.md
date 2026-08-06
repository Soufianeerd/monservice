# Migration vers Supabase Auth — journal et marche à suivre

**Date** : 6 août 2026 · **Décision** : NextAuth entièrement remplacé par Supabase Auth

---

## 1. Pourquoi c'était le bon choix

Au-delà de la cohérence d'infrastructure, cette bascule débloque **la Row-Level Security**, qui est la meilleure réponse structurelle à MS-005 (isolation multitenant) et MS-022.

Avec NextAuth, la base ne savait pas qui était l'appelant : la seule protection était le code applicatif. Avec Supabase Auth, PostgreSQL connaît `auth.uid()` et peut refuser lui-même les accès croisés. C'est une **troisième couche de défense**, indépendante du code — celle qui tient encore quand une action est oubliée.

La contrepartie est réelle : la clé publiée dans le bundle rend l'API PostgREST directement interrogeable. **Sans RLS, cette migration dégrade la sécurité au lieu de l'améliorer.** L'étape 5 de la migration SQL n'est donc pas optionnelle.

---

## 2. Ce qui a rendu la bascule peu coûteuse

L'abstraction `src/lib/auth/session.ts`, créée lors des corrections P0, a servi de point de bascule unique :

```
                     ┌─────────────────────────┐
19 fichiers d'actions│                         │  AVANT : NextAuth
8 routes API ───────►│  lib/auth/session.ts    │  APRÈS : Supabase Auth
2 layouts serveur    │  requireSession()       │
                     └─────────────────────────┘
                        seul fichier réécrit
```

**Aucun fichier d'actions n'a été modifié.** C'est exactement le bénéfice recherché quand on centralise le contrôle d'accès : le fournisseur d'identité devient un détail d'implémentation.

---

## 3. Fichiers modifiés

### Réécrits

| Fichier | Changement |
|---|---|
| `src/lib/auth/session.ts` | Implémentation sur `supabase.auth.getUser()` + lecture du profil dans `public.users`, mémoïsée par requête via `cache()` |
| `src/proxy.ts` | Rafraîchit la session Supabase à chaque requête (sans quoi le jeton expire au bout d'une heure) + barrière périmétrique |
| `src/utils/supabase/{server,client,middleware}.ts` | Pattern officiel `@supabase/ssr`, clé `publishable` |
| `src/components/auth/AuthContext.tsx` | `signInWithPassword` / `signOut` / `onAuthStateChange` |
| `src/components/auth/LoginForm.tsx` | Utilise `signIn` du contexte + `callbackUrl` |
| `src/components/auth/RegisterForm.tsx` | Gère le cas « confirmation d'e-mail requise » |
| `src/app/actions/auth.ts` | `signUp` Supabase + création du profil applicatif |
| `src/app/actions/session.ts` | `getOrganizationAction()` n'accepte plus d'identifiant |
| `src/app/(auth)/forgot-password/page.tsx` | **Réinitialisation réelle** — MS-016 corrigée |
| `src/app/(auth)/reset-password/page.tsx` | `updateUser({ password })` après échange du code |
| `src/lib/services/user.service.ts` | `createProfile()` remplace `createUser()` ; `getUserForAuth()` supprimée |
| `src/lib/env.ts` | Variables Supabase obligatoires, `NEXTAUTH_*` retirées |

### Créés

- `src/app/auth/callback/route.ts` — échange du code contre une session, avec protection anti-open-redirect
- `drizzle/postgres/0002_supabase_auth_migration.sql` — import des comptes, déclencheur, **RLS**
- `__tests__/unit/security/supabase-auth.test.ts` — 8 tests structurels

### Supprimés

- `src/app/api/auth/[...nextauth]/` · `src/lib/auth/options.ts` · `.env.production`
- Dépendances `next-auth` et `@auth/core`

---

## 4. Marche à suivre — dans cet ordre

### Étape 1 — Compléter `.env.local`

Une seule variable manque : `DATABASE_URL`. La clé `publishable` ne permet pas la connexion directe à PostgreSQL dont Drizzle a besoin.

> Supabase → **Project Settings → Database → Connection string → URI**, puis remplacer `[YOUR-PASSWORD]`.

Utilisez la **connexion directe (port 5432)** en développement : le pooler en mode transaction (6543) peut poser problème avec les transactions explicites de `deleteWithCascade`.

### Étape 2 — Réinstaller les dépendances

```bash
rm -rf node_modules package-lock.json && npm install
```

`next-auth`, `@auth/core` et `better-sqlite3` ont été retirés.

### Étape 3 — Appliquer les migrations, dans l'ordre

```bash
psql "$DATABASE_URL" -f drizzle/postgres/0001_audit_p0_fixes.sql
psql "$DATABASE_URL" -f drizzle/postgres/0002_supabase_auth_migration.sql
```

**Faites une sauvegarde avant** (Supabase → Database → Backups), et lisez l'en-tête de `0002` : elle touche à `auth.users` et active la RLS.

Vos 3 comptes existants sont importés avec leurs hachages bcrypt : **les mots de passe actuels continuent de fonctionner**. Sauf `admin@monservice.com`, dont le mot de passe est `NULL` — il ne pouvait déjà pas se connecter et n'est pas importé.

### Étape 4 — Configurer Supabase (tableau de bord)

| Section | Réglage |
|---|---|
| Authentication → Providers → Email | **Désactiver « Confirm email » en développement** (sinon l'inscription bloque sans SMTP) ; l'activer en production |
| Authentication → Providers → Email | Longueur minimale : **12** (cohérent avec `registerSchema`) |
| Authentication → URL Configuration | Site URL + `http://localhost:3000/**` dans les Redirect URLs |
| Authentication → Emails | SMTP réel — le SMTP par défaut ne convient pas à la production |

### Étape 5 — Vérifier

```bash
npm run typecheck
npm run test:security
npm run build
npm run dev
```

### Étape 6 — **Le test qui compte** : étanchéité de la RLS

Depuis un navigateur, **sans être connecté** :

```
https://leydfjctaxohovcmcgea.supabase.co/rest/v1/clients?select=*&apikey=sb_publishable_JmVhCzJkbwHYXm75BTeRxQ__uRjdMtS
```

**Résultat attendu : un tableau vide `[]`.**

Si des données clients apparaissent, la RLS n'est pas effective : **arrêtez tout**, c'est une fuite de données ouverte à quiconque lit le bundle JavaScript. Répétez le test pour `users`, `invoices`, `deals`, `messages`.

### Étape 7 — Parcours manuels

1. Connexion avec un compte existant (le mot de passe doit fonctionner)
2. Inscription d'un nouveau professionnel → dashboard, **sans boucle de redirection**
3. Inscription d'un client → `/client/dashboard` ; `/dashboard` renvoie vers `/dashboard`… puis le layout redirige vers `/client/dashboard`
4. Mot de passe oublié → e-mail reçu → lien → nouveau mot de passe → connexion
5. Déconnexion → `/clients` redirige vers `/login`
6. **Deux comptes de deux organisations** : vérifier qu'aucune donnée ne fuit

---

## 5. Vérifications déjà effectuées

| Contrôle | Résultat |
|---|---|
| `tsc --noEmit` | ✅ 0 erreur |
| `eslint .` | 90 erreurs (inchangé — `any` dans les services, P1) |
| Traces de NextAuth dans le code | ✅ aucune (hors commentaires historiques) |
| `supabase.auth.getUser()` hors du socle | ✅ 0 fichier |
| Fichiers d'actions avec contrôle de session | ✅ 18 / 18 |
| Routes API authentifiées | ✅ 8 / 8 |
| Clé `ANON_KEY` résiduelle | ✅ aucune |
| Réinitialisation factice `dummy-token` | ✅ supprimée |

---

## 6. Points de vigilance

**Le middleware ne connaît plus le `profileType`.** Avec NextAuth, il vivait dans le JWT ; il est maintenant dans `public.users`, inaccessible depuis le middleware (Edge, sans connexion à la base). Le cloisonnement client/professionnel est donc assuré par les **layouts serveur**, qui redirigent correctement. Conséquence visible : un client qui saisit `/dashboard` subit deux redirections au lieu d'une. Fonctionnellement correct, légèrement moins direct.

> Optimisation possible (P2) : un *Custom Access Token Hook* Supabase qui injecte `profile_type` et `organization_id` dans le JWT. Le middleware pourrait alors trancher seul, et les politiques RLS liraient l'organisation depuis le jeton plutôt que via une sous-requête.

**Une requête base par appel de `getSessionContext()`.** Mémoïsée par requête via `cache()` de React, donc une seule fois par requête HTTP même avec plusieurs actions. Acceptable, mais c'est un aller-retour de plus qu'avec un JWT auto-porteur — même remarque que ci-dessus.

**Risque de compte orphelin à l'inscription.** Si `signUp` réussit mais que la création du profil échoue, le compte existe dans `auth.users` sans profil applicatif. Supprimer ce compte exige la clé `service_role`, que je n'ai volontairement pas utilisée. Le cas est journalisé (`[auth] COMPTE ORPHELIN`) et le déclencheur `handle_new_auth_user` sert de filet. À surveiller en production.

**`db.transaction()` et le pooler.** Inchangé depuis la note précédente : à tester en priorité si vous utilisez le port 6543.

---

## 7. Où en est-on du verdict

Le **NO-GO reste valable**, mais deux points ont bougé favorablement :

- **MS-016** (réinitialisation de mot de passe) : ✅ corrigée — elle est désormais réelle.
- **MS-022** (RLS) : ⚠️ **outillée mais non appliquée**. Le SQL est écrit ; il reste à l'exécuter et à vérifier l'étanchéité (étape 6). Tant que ce n'est pas fait, cette migration a **augmenté** la surface d'attaque, puisqu'une clé d'accès à la base est maintenant publiée dans le bundle.

Restent ouverts : sauvegardes et restauration testée (MS-011), e-mails transactionnels applicatifs (MS-015), notifications et relances (MS-018), quotas (MS-019), observabilité (MS-025), RGPD technique (MS-030/031), 90 erreurs de lint (MS-033), accessibilité et performance non testées.

---

## 8. Une remarque, puisqu'elle est importante

Vous m'avez transmis vos identifiants Supabase deux fois. La clé `publishable` est **publique par conception** — elle est faite pour figurer dans le bundle, il n'y a pas de problème à la partager.

Mais gardez cette distinction en tête : la clé `service_role` (Project Settings → API), elle, contourne toute la RLS et équivaut à un accès administrateur complet à votre base. **Elle ne doit jamais quitter votre serveur**, ni être collée dans une conversation, ni figurer dans une variable `NEXT_PUBLIC_*`. Je ne l'ai pas demandée et n'en ai pas eu besoin.
