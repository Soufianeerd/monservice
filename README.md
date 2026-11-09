# MonSERVICE — Business Operating System Multi-Vertical

**MonSERVICE** est une plateforme SaaS B2B / Business Operating System multi-verticale conçue pour les professionnels indépendants, cabinets de santé paramédicaux et artisans du bâtiment/services de terrain.

> État de référence et preuves : [`docs/database/neon-migration.md`](docs/database/neon-migration.md) (migration Supabase → Neon) et [`docs/deployment/PRODUCTION_DEPLOYMENT_RUNBOOK.md`](docs/deployment/PRODUCTION_DEPLOYMENT_RUNBOOK.md) (bascule publique). Un README ne constitue pas une preuve : seuls les rapports de validation datés le sont.

---

## 1. Architecture Technique

- **Framework Web & SSR :** Next.js 16 (App Router, Server Actions, Turbopack), React 19
- **Langage :** TypeScript strict (aucun nouveau `as any`, `as never`, `@ts-ignore`)
- **Base de données :** PostgreSQL 18 sur **Neon** — projet `Monservice-Europe` (`misty-field-54835523`), région `aws-eu-central-1` (Frankfurt)
- **ORM & schéma :** Drizzle ORM ; migrations SQL versionnées dans `drizzle/neon/` avec ledger à checksums ; 61 tables, toutes sous RLS
- **Authentification :** Neon Managed Auth (Better Auth) via `@neondatabase/auth` — route `/api/auth/[...path]`, `src/proxy.ts`, cookies serveur signés, vérification e-mail par OTP en production
- **Sécurité & multi-tenant :** session vérifiée → mapping d'identité stocké → transaction avec `SET LOCAL` → rôles restreints (`monservice_runtime`, `monservice_stripe`, `monservice_reminders` : NOSUPERUSER, NOBYPASSRLS) → politiques RLS
- **Stockage d'objets :** Neon Object Storage (API S3), buckets privés `clinical-documents` et `einvoices`, URLs signées de 1 à 60 s
- **Paiements :** Stripe, **uniquement pour les abonnements MonService** (Stripe Connect et paiement des honoraires patients retirés)
- **Communications :** Resend (e-mails métier) ; e-mails Auth via le SMTP configuré dans Neon
- **Hébergement cible :** Netlify (`monservicecrm`), non encore basculé

Supabase n'est plus une dépendance runtime. Les migrations historiques `drizzle/postgres/0000–0023` (ère Supabase) sont **fermées** et conservées pour la traçabilité uniquement.

---

## 2. Workspaces Dédiés

### 2.1 Generic Workspace
- Prestataires de services, freelances, consultants, agences.
- CRM : clients, contacts, opportunités (deals), catalogue produits/services, tâches.
- Devis et facturation conformes (numérotation chronologique séquentielle stricte).

### 2.2 Paramedical Workspace (V1 — gelée)
- Praticiens paramédicaux (kinésithérapeutes, ostéopathes, orthophonistes…).
- Cabinet : praticiens, lieux, salles, ressources ; agenda, disponibilités, liste d'attente.
- Dossier patient : épisodes de soins, consultations, observations cliniques immuables, questionnaires.
- Portail patient : rendez-vous, questionnaires, documents partagés, factures, messagerie.
- *V1 gelée et protégée contre toute régression.*
- ⚠️ **Hébergement HDS non démontré : aucune donnée de santé réelle ne doit être introduite.**

### 2.3 Field Service & BTP Workspace (Sessions 16–18)
- Chantiers et sites d'intervention, ordres de travail, assignations, comptes-rendus signés et immuables.
- Lead-to-Cash : devis par lots, métrés, multi-taux de TVA, remises, acomptes, signature, factures d'acompte et de solde.
- Équipements clients (Session 19) : parc par client et par site, garanties, numéros de série, rattachement aux interventions, historique d'entretien, maintenance préventive périodique et étiquettes QR.
- *Sessions 16 à 19B terminées. Session 20 (portail client terrain) planifiée.*

---

## 3. Démarrage local

### 3.1 Prérequis
- Node.js 22+, npm 10+
- CLI Neon `neon@8.0.7` (pour la CI locale et l'administration des branches)
- Accès au projet Neon EU (clé API limitée au projet pour la CI)

### 3.2 Installation
```bash
npm install
```

### 3.3 Base de données
Le développement se fait sur une **branche Neon synthétique** (jamais sur la production) :

- `.env.local` : runtime restreint de la branche de validation (`monservice_runtime`, connexion poolée).
- `.env.neon-admin.local` (ignoré par Git) : connexion owner non poolée, réservée aux migrations.

```bash
npm run db:migrate        # applique drizzle/neon/* (refuse toute migration modifiée)
npm run db:check-drift    # vérifie les checksums du ledger
npm run seed:local        # données synthétiques — jamais sur la production
```

`npm run db:push` est volontairement bloqué.

### 3.4 Serveur de développement
```bash
npm run dev
```
Application sur [http://localhost:3000](http://localhost:3000).

---

## 4. Variables d'environnement

Voir [`.env.example`](.env.example). Minimum runtime :

```ini
DATABASE_URL=            # login restreint monservice_runtime (pooled), jamais l'owner
NEON_AUTH_BASE_URL=
NEON_AUTH_COOKIE_SECRET=
AWS_ENDPOINT_URL_S3=     # Neon Object Storage de la branche
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
NEXT_PUBLIC_APP_URL=
```

Optionnels : `NEON_STRIPE_DATABASE_URL`, `NEON_REMINDERS_DATABASE_URL`, variables Stripe (routes en 503 si absentes), `CRON_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`.

Le build Next.js charge la configuration Auth : les variables runtime doivent être présentes au moment du build (cause de l'échec historique sur Netlify).

---

## 5. Données de test

`scripts/e2e/seed-local.ts` crée, sur une branche synthétique, des organisations et comptes isolés par verticale (`pro_generic_a@monservice.invalid`, `pro_health_a@monservice.invalid`, `pro_fs_a@monservice.invalid`, …) via Neon Managed Auth. Le mot de passe est fourni par `E2E_AUTH_PASSWORD` (généré aléatoirement à chaque run CI) ; aucun mot de passe n'est versionné.

---

## 6. Tests & qualité

```bash
# Statique
npm run typecheck
npm run lint
npm run build

# Unitaires & conformité (sans base)
npm run test:unit
npm run test:security
npm run test:compliance

# Schéma (branche Neon)
npm run db:check-drift
npm run db:check-contract
npm run db:check-custom-objects

# Intégration (écrivent des fixtures : branche synthétique uniquement)
npm run test:db-constraints
npm run test:rls
npm run test:neon-boundaries

# Navigateur
npm run test:e2e
```

**Validation de référence :** `node scripts/neon/ci-branch.mjs` rejoue l'intégralité du cycle sur une branche Neon jetable créée depuis le modèle vide (`ci-template`) : migrations, rôles, seed, contrôles de schéma, typecheck, lint, unitaires, contraintes, RLS, boundaries, build, Playwright ; puis suppression de la branche. C'est ce que fait la CI GitHub (`.github/workflows/test.yml`, secret `NEON_CI_API_KEY`).

---

## 7. Règles d'exploitation (Production Safety)

1. **Jamais de `drizzle-kit push`** : toute évolution passe par un nouveau fichier `drizzle/neon/NNNN_*.sql` (prochain : `0016`).
2. **Jamais de modification d'une migration appliquée** : `drizzle/neon/*` est protégé par checksum ; `drizzle/postgres/*` est historique et fermé.
3. **Jamais de seed, test d'intégration ou suppression sur la production** ; ne jamais réinitialiser ni supprimer une base ou une branche distante non jetable.
4. **Aucun contournement de typage** (`as any`, `as never`, `@ts-ignore`) dans le code modifié.
5. **Isolation multi-tenant et RLS** : toute nouvelle table est sous RLS avec tests anonymes et inter-tenants.
6. **Aucune donnée de santé réelle** tant que la conformité HDS de toute la chaîne n'est pas démontrée.
7. **Aucun déploiement public** sans le préflight de bascule au vert et une approbation explicite.
