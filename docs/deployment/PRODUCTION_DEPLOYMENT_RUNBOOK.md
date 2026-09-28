# Production Deployment Runbook — MonSERVICE

## 1. Vue d'ensemble

Ce document définit les prérequis, configurations et procédures d'exploitation pour le déploiement de **MonSERVICE** sur les plateformes cibles :
- **Hébergement Frontend & SSR :** Netlify (Next.js 16 App Router)
- **Base de données & Auth :** Supabase (PostgreSQL 15+, RLS, GoTrue Auth, Storage)

---

## 2. Variables d'Environnement Production (Sans Secrets)

### 2.1 Variables Fondamentales Obligatoires (Build & Runtime)

| Variable | Scope Netlify | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | Build, Functions / Runtime | URL de connexion PostgreSQL directe ou transaction pooler (pgBouncer / Supavisor). Utilisée par Drizzle ORM. |
| `NEXT_PUBLIC_SUPABASE_URL` | Build, Functions / Runtime | URL de l'instance Supabase (ex: `https://<ref>.supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Build, Functions / Runtime | Clé API publique (anon) Supabase pour le client navigateur et sessions auth. |
| `NEXT_PUBLIC_APP_URL` | Build, Functions / Runtime | URL canonique de production de l'application (ex: `https://monservice.fr`). |

### 2.2 Variables Selon Fonctionnalités (Services Métier)

| Variable | Scope Netlify | Usage / Condition |
| :--- | :--- | :--- |
| `SUPABASE_SERVICE_ROLE_KEY` | Functions / Runtime uniquement | Clé d'administration Supabase (bypasses RLS). Requise pour l'administration des utilisateurs et scripts serveurs de maintenance. **JAMAIS exposée au client**. |
| `STRIPE_SECRET_KEY` | Functions / Runtime uniquement | Clé d'API secrète Stripe pour les abonnements et paiements connectés. |
| `STRIPE_WEBHOOK_SECRET` | Functions / Runtime uniquement | Secret de signature du webhook Stripe (`/api/stripe/webhook`). |
| `STRIPE_PRICE_STARTER` | Build, Functions / Runtime | ID du tarif Stripe pour le plan Starter. |
| `STRIPE_PRICE_PRO` | Build, Functions / Runtime | ID du tarif Stripe pour le plan Pro. |
| `STRIPE_PRICE_BUSINESS` | Build, Functions / Runtime | ID du tarif Stripe pour le plan Business. |
| `RESEND_API_KEY` | Functions / Runtime uniquement | Clé API d'envoi d'e-mails transactionnels (invitations, notifications devis). |
| `EMAIL_FROM` | Functions / Runtime | Adresse d'expédition des e-mails (ex: `MonSERVICE <notifications@monservice.fr>`). |
| `CRON_SECRET` | Functions / Runtime uniquement | Jeton d'authentification pour les routes API déclenchées par CRON (rappels, archivage RGPD). |

> [!CAUTION]
> **RÈGLE DE SÉCURITÉ ABSOLUE :**
> - Ne jamais injecter de variables contenant `SECRET` ou `SERVICE_ROLE` dans des variables préfixées par `NEXT_PUBLIC_`.
> - Vérifier que le scope Netlify des secrets est strictement restreint à **Runtime / Functions**.

---

## 3. Configuration Netlify

- **Plateforme :** Netlify Runtime v5 pour Next.js (`@netlify/plugin-nextjs`).
- **Commande de build :** `npm run build`
- **Répertoire de publication :** Géré automatiquement par le plugin runtime (ne pas forcer `.next` ni ajouter de redirection SPA type `/* -> /index.html`).
- **Version Node :** `NODE_VERSION=22`

---

## 4. Procédure de Déploiement

### Étape 1 : Pré-déploiement Base de Données
1. Vérifier la conformité du schéma via `npm run db:check-contract` et `npm run db:check-drift`.
2. Consulter `docs/deployment/PRODUCTION_SCHEMA_RECONCILIATION.md`.
3. Appliquer les migrations fermées jusqu'à `0022_marketplace_request_location.sql` sur l'instance Supabase PROD via l'outil de migration CI/CD.

### Étape 2 : Déploiement Applicatif Netlify
1. Configurer les variables d'environnement dans le tableau de bord Netlify.
2. Déclencher le build de production à partir de la branche `main` validée par la CI.
3. Vérifier les logs de build : compilation Next.js sans erreurs de routes dynamiques.

### Étape 3 : Post-déploiement & Healthchecks
1. Vérifier l'accès à la page d'accueil `/`.
2. Vérifier la page de connexion `/login`.
3. Tester une authentification professionnelle et la redirection vers `/dashboard`.
4. Tester le webhook Stripe de test et les notifications Resend en staging.
