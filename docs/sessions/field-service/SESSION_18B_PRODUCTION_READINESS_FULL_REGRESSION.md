# SESSION 18B — PRODUCTION READINESS & FULL REGRESSION HARDENING

## 1. Contexte & Baseline Initiale

- **Dépôt :** `https://github.com/Soufianeerd/monservice.git`
- **Branche de travail :** `main`
- **Baseline Git :** `ca7a87ba8c6df7652b4f2f8ec8a3f154f372418b` / `e917ccdb597280b3acc949ecfc8853bc40950b03`
- **Objectif de Session :** Stabilisation complète de la baseline MonSERVICE sans ajout de grosse fonctionnalité nouvelle avant la Session 19 et avant tout déploiement en production.

---

## 2. Classification des Causes Racines

| Problème / Échec initial | Classification | Cause Racine | Résolution |
| :--- | :--- | :--- | :--- |
| Champ `location` absent en DB dans `requests` | `PRODUCT_BUG` | Le formulaire et les filtres UI de la marketplace manipulaient `location`, mais le schéma Drizzle et la table SQL `requests` ne le stockaient pas. | Migration canonique `0022_marketplace_request_location.sql` ajoutant `location text NULL`. Mise à jour du schéma Drizzle, des services et Server Actions. |
| Incohérence des catégories Marketplace | `PRODUCT_BUG` | Libellés UI textuels (ex: `"Artisanat (BTP...)"`) mélangés avec les types de workspaces. | Création du module `src/lib/marketplace/categories.ts` avec types canoniques (`field_services`, `health`, `freelance`, `other`) et fonction `normalizeMarketplaceCategory()`. |
| Perte de données sur les paramètres organisation | `PRODUCT_BUG` | `industry`, `email`, et `currency` acceptés par `organizationUpdateSchema` mais rejetés/ignorés par `UPDATABLE_FIELDS` dans `organization.service.ts`. | Alignement de `UPDATABLE_FIELDS` et mapping strict des colonnes sans casts. |
| Contournement potentiel de l'acompte obligatoire | `PRODUCT_BUG` | Le client navigateur pouvait envoyer `allowUnpaidDeposit = true` pour forcer la création d'un ordre de travail sans paiement préalable de l'acompte. | Suppression de `allowUnpaidDeposit` des inputs clients. La politique d'acompte est désormais strictement validée côté serveur. |
| Route fantôme `/field-service/interventions` | `PRODUCT_BUG` | L'UI et les actions de devis redirigeaient encore vers l'ancienne route Session 16 au lieu de la route canonique Session 17 `/operations`. | Remplacement par `/operations` et `/operations/[id]` dans l'ensemble des pages et `revalidatePath()`. |
| Collision des fixtures E2E entre verticales | `FIXTURE_BUG` | L'utilisateur `pro_a@monservice.com` était réutilisé dans les tests génériques, paramédicaux et BTP. | Séparation stricte et déterministe dans `seed-local.ts` : `pro_generic_a`, `pro_health_a`, `pro_fs_a`, `client_fs_a`, etc. |
| Sélecteurs de tests Playwright obsolètes | `TEST_OUTDATED` | Tests cherchant l'ancien bouton "Répondre à cette demande" (devenu "Envoyer un devis") ou `input[name="title"]`. | Mise à jour des sélecteurs avec sélecteurs robustes `data-testid` et libellés réels. |
| Concurrence de connexion pooler dans les tests d'intégration | `INFRA_BUG` | L'exécution simultanée des 9 fichiers de tests d'intégration dépassait la limite de 15 connexions session pooler (`EMAXCONNSESSION`). | Paramétrage `postgres(DATABASE_URL, { max: 3 })` et limitation du pool par worker de test. |

---

## 3. Fixtures E2E Avant / Après

### Avant
- `pro_a@monservice.com` était partagé par les suites génériques, de santé et d'opérations.
- L'exécution de suites successives pouvait modifier l'état ou le secteur de l'organisation et causer des effets de bord.

### Après (Déterministe & Indépendant)
```text
GENERIC
  org_generic_a (sector: 'IT')
    pro_generic_a@monservice.com
    client_generic_a@monservice.com
  org_generic_b (sector: 'Consulting')
    pro_generic_b@monservice.com
    client_generic_b@monservice.com

PARAMEDICAL
  org_health_a (sector: 'health', profession: 'physiotherapist')
    pro_health_a@monservice.com
    patient_health_a@monservice.com
  org_health_b (sector: 'health', profession: 'osteopath')

FIELD SERVICE
  org_fs_a (sector: 'field_services', profession: 'plumber')
    pro_fs_a@monservice.com
    client_fs_a@monservice.com
    Chantier Résidence Bellecour (site_fs_a)
    Rénovation Plomberie (deal_fs_a)
  org_fs_b (sector: 'field_services', profession: 'electrician')
    pro_fs_b@monservice.com
```

---

## 4. Parcours Quote-to-Cash Persistant Réel (E2E)

Le nouveau test `e2e/field-service-quote-to-cash.spec.ts` exécute l'intégralité du cycle avec double validation DOM et persistance SQL :
1. **Création du devis par `pro_fs_a` :** Sélection client, site, deal, Lot 1 (canalisation avec quantité décimale `12.5` m, TVA 5,5 %), Lot 2 (chaudière TVA 10 % + vannes TVA 20 % avec remise de 10 %), acompte obligatoire de 30 %.
2. **Vérification DB Devis :** Contrôle des lignes, des lots et de `deposit_amount`.
3. **Envoi au client :** Statut passe à `sent` (UI + DB).
4. **Signature électronique par `client_fs_a` :** Connexion client, ouverture `/client/quotes/[id]`, signature sur canvas HTML5 (`/devis/[id]/sign`), statut passe à `accepted` avec horodatage et signature stockés.
5. **Génération facture d'acompte :** `pro_fs_a` génère la facture d'acompte depuis le devis accepté.
6. **Simulation Paiement Stripe :** Appel de l'endpoint sécurisé de simulation `/api/stripe/webhook/simulate`, validation de la mise à jour de la facture d'acompte à l'état `paid`.
7. **Création Ordre de Travail :** Depuis le devis, redirection vers `/operations/[workOrderId]`, vérification des liaisons client, site et sourceQuote.
8. **Facturation Finale du Solde :** Conversion du devis en facture finale, déduction automatique de l'acompte payé (`prepaidAmount`), calcul exact du solde dû (`amountDue = totalTTC - prepaidAmount`), rechargement du navigateur et vérification DB.

---

## 5. Base de Données & Migration 0022

- **Fichier de migration :** `drizzle/postgres/0022_marketplace_request_location.sql`
- **Contenu :**
  ```sql
  ALTER TABLE "requests" ADD COLUMN "location" text;
  ```
- **Snapshot :** `drizzle/postgres/meta/0022_snapshot.json`
- **Journal :** Enregistré dans `_journal.json` sous le tag `0022_marketplace_request_location`.
- **Inventaire :** Documenté dans `drizzle/MIGRATION_INVENTORY.md`.
- **Conformité :** `npm run db:check-drift` (0 dérive) et `npm run db:check-contract` (57/57 tables conformes).

---

## 6. Audit des Casts de Type (Zero Lying Casts)

- Audit exécuté sur l'ensemble des fichiers modifiés :
  ```bash
  git diff --name-only origin/main | xargs grep -En "as any|as never|as unknown as|@ts-ignore"
  ```
- Résultat : **0 cast menteur** dans tous les fichiers touchés par la Session 18B (seul un commentaire historique dans `schema.ts` mentionne le terme).

---

## 7. Documentation Opérationnelle & Déploiement

- [`README.md`](../../../README.md) : Entièrement réécrit pour refléter le Business Operating System MonSERVICE.
- [`docs/deployment/PRODUCTION_DEPLOYMENT_RUNBOOK.md`](../../deployment/PRODUCTION_DEPLOYMENT_RUNBOOK.md) : Variables obligatoires/optionnelles sans secrets, scopes Netlify (Build vs Functions).
- [`docs/deployment/PRODUCTION_SCHEMA_RECONCILIATION.md`](../../deployment/PRODUCTION_SCHEMA_RECONCILIATION.md) : Audit en lecture seule de la base Supabase distante (57 tables, 34 triggers, 61 politiques RLS).
- [`netlify.toml`](../../../netlify.toml) : Configuration moderne pour Netlify Next Runtime v5 sans SPA rewrite.

---

## 8. Statut des Intégrations Externes

| Intégration | État Réel | Détails |
| :--- | :--- | :--- |
| **Stripe Checkout & Billing** | Implémenté | Connecté à Stripe API via `STRIPE_SECRET_KEY` |
| **Stripe Webhooks** | Implémenté | Signature vérifiée sur `/api/stripe/webhook` |
| **Simulation Webhook (Test)** | Implémenté (Dev/Test) | `/api/stripe/webhook/simulate` (verrouillé par 403 en production) |
| **Resend Emailing** | Implémenté | Transactionnel opérationnel si `RESEND_API_KEY` présent |
| **Supabase Storage** | Implémenté | Bucket privé `clinical-documents` sécurisé par RLS |
| **Factur-X / UBL XML** | Implémenté | Génération syntaxique conforme des flux e-invoicing |
| **PDP / Peppol Transmission** | **Simulé / Placeholder** | Logs de transmission dans la console. Non raccordé à une PDP agréée ou point d'accès certifié Peppol. |
| **Tâches CRON** | Implémenté (Endpoints) | Endpoints protégés par `CRON_SECRET`, nécessitent un planificateur externe (ex: GitHub Actions / Netlify Scheduled). |

---

## 9. Limites Restantes & Transition

- **Session 19 (Customer Assets & Equipment Tracking) :** Strictement **NON DÉMARRÉE**.
- **Accréditation PDP :** La transmission réglementaire directe vers le portail public ou PDP partenaires nécessitera un accord opérateur lors d'une session dédiée d'intégration EDI.
- **Validation Finale :** Baseline 18B durcie et prête pour le déploiement de staging/production.
