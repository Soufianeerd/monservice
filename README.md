# MonSERVICE — Business Operating System Multi-Vertical

**MonSERVICE** est une plateforme SaaS B2B / Business Operating System multi-verticale conçue pour les professionnels indépendants, cabinets de santé paramédicaux et artisans du bâtiment/services de terrain.

---

## 1. Architecture Technique

- **Framework Web & SSR :** Next.js 16 (App Router, Server Actions, Turbopack)
- **Langage :** TypeScript (mode strict, typage contractuel fort, 0 lying cast toléré)
- **Base de Données :** PostgreSQL 15+ géré via Supabase
- **ORM & Schéma :** Drizzle ORM avec migrations versionnées et vérification de dérive (`drift-check`)
- **Sécurité & Multi-Tenant :** Row Level Security (RLS) PostgreSQL, GoTrue Supabase Auth, rôles RBAC
- **Stockage d'Objets :** Supabase Storage (bucket sécurisé `clinical-documents`)
- **Paiements & Facturation :** Stripe (Abonnements, Stripe Connect, Webhooks certifiés)
- **Communications :** Resend (E-mails transactionnels)

---

## 2. Workspaces Dédiés

MonSERVICE propose des espaces de travail configurés dynamiquement selon le secteur et la profession de l'organisation :

### 2.1 Generic Workspace
- Adapté aux prestataires de services, freelances, consultants, agences.
- CRM complet : gestion des clients, opportunités d'affaires (deals), catalogue de produits/services.
- Devis et facturation standard conforme (numérotation chronologique séquentielle stricte).

### 2.2 Paramedical Workspace (V1 — Frozen)
- Conçu spécifiquement pour les praticiens de santé paramédicaux (kinésithérapeutes, ostéopathes, orthophonistes, etc.).
- Gestion de cabinet : praticiens, salles de consultation, ressources techniques.
- Dossier patient électronique (DPE) : épisodes de soins, consultations, observations cliniques immuables, formulaires d'évaluation.
- Portail patient dédié : accès aux rendez-vous, questionnaires, documents de santé partagés.
- *Statut produit : V1 gelée et protégée contre toute régression.*

### 2.3 Field Service & BTP Workspace (Sessions 16–18)
- Conçu pour les artisans, plombiers, électriciens, techniciens de maintenance et entreprises de rénovation/bâtiment.
- Gestion des chantiers et sites d'intervention avec coordonnées géographiques et consignes d'accès.
- Ordres de travail (Work Orders) : planification, assignation d'intervenants, cycle de statuts strict, comptes-rendus d'intervention signés et immuables.
- Moteur de chiffrage professionnel Lead-to-Cash : devis structurés par lots/tranches, métrés et unités décimales, gestion multi-taux de TVA (5,5 %, 10 %, 20 %), remises et acomptes à la commande, signature électronique légale, génération de factures d'acompte et facturation du solde avec déduction automatique des acomptes payés.
- *Statut produit : Sessions 16 à 18 complétées et durcies. Session 19 (Customer Assets & Equipment Tracking) non démarrée.*

---

## 3. Configuration & Démarrage Local

### 3.1 Prérequis
- Node.js version 22+
- npm 10+
- Supabase CLI (`brew install supabase/tap/supabase` ou binaire officiel)
- Docker (pour exécuter l'émulateur Supabase en local)

### 3.2 Installation des dépendances
```bash
npm install
```

### 3.3 Supabase Local & Base de Données
```bash
# Démarrer les conteneurs Supabase locaux
supabase start

# Appliquer l'ensemble des migrations fermées (0000 à 0022)
npm run db:migrate

# Injecter les jeux de données déterministes multi-verticales
npm run seed:local
```

### 3.4 Lancement du serveur de développement
```bash
npm run dev
```
Accéder à l'application sur [http://localhost:3000](http://localhost:3000).

---

## 4. Variables d'Environnement

Un fichier `.env.local` doit être configuré à la racine du projet. Consultez le guide complet dans [`docs/deployment/PRODUCTION_DEPLOYMENT_RUNBOOK.md`](docs/deployment/PRODUCTION_DEPLOYMENT_RUNBOOK.md).

Variables minimales :
```ini
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 5. Jeux de Données E2E (Comptes Déterministes)

Le seed local configure des organisations et utilisateurs distincts et isolés pour chaque verticale :

| Verticale | Organisation | Professionnel (Login) | Client / Patient (Login) | Mot de passe |
| :--- | :--- | :--- | :--- | :--- |
| **Generic** | Entreprise Générique A | `pro_generic_a@monservice.com` | `client_generic_a@monservice.com` | `password123` |
| **Paramedical** | Cabinet Santé A | `pro_health_a@monservice.com` | `patient_health_a@monservice.com` | `password123` |
| **Field Service** | Plomberie Chauffage Service | `pro_fs_a@monservice.com` | `client_fs_a@monservice.com` | `password123` |
| **Field Service B**| Électricité Générale B | `pro_fs_b@monservice.com` | — | `password123` |

---

## 6. Suites de Tests & Qualité

```bash
# Contrôles de qualité statique
npm run lint
npm run typecheck
npm run build

# Intégrité du schéma PostgreSQL
npm run db:check-drift        # Vérifie 0 dérive entre schema.ts et snapshots
npm run db:check-contract     # Vérifie 100% de concordance des 57 tables DB
npm run db:check-custom-objects # Vérifie les fonctions, triggers et RLS

# Tests unitaires et d'intégration
npm run test:unit
npm run test:security
npm run test:db-constraints

# Tests End-to-End Playwright
npm run test:e2e:quote-to-cash # Cycle Lead-to-Cash persistant
npm run test:e2e:field-service  # Parcours opérations Field Service
npm run test:e2e               # Full régression multi-verticale
```

---

## 7. Règles d'Exploitation & Interdictions Absolues (Production Safety)

1. **JAMAIS de `drizzle-kit push` sur une base distante ou de production :** Toutes les évolutions de structure doivent transiter par un fichier SQL horodaté et versionné dans `drizzle/postgres/`.
2. **JAMAIS de `supabase db reset` sur une base distante :** Cette commande est réservée au développement local conteneurisé.
3. **NE JAMAIS modifier les migrations fermées (`0000` à `0021`) :** Toute correction ou extension ultérieure nécessite une nouvelle migration incrémentale (ex: `0022_marketplace_request_location.sql`).
4. **0 Casts Lying (`as any`, `as never`, `@ts-ignore`) :** Le typage TypeScript doit être rigoureusement respecté sur l'ensemble des fichiers modifiés.
