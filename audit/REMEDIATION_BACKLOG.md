# Plan de remédiation — `monservice`

Séquencé par dépendances techniques, pas par gravité seule : certaines corrections critiques sont **impossibles** tant que d'autres n'ont pas été faites.

**Convention d'effort** : XS < 1 h · S ≈ 1/2 j · M ≈ 1-3 j · L ≈ 1-2 semaines

---

## Phase 0 — Immédiat (avant toute autre chose)

Ces actions ne corrigent rien : elles limitent l'exposition pendant les travaux.

| # | Action | Effort | Critère de validation |
|---|---|---|---|
| 0.1 | Ne pas rendre publique l'URL Netlify ; retirer tout déploiement accessible | XS | L'URL renvoie 404 ou est protégée par mot de passe Netlify |
| 0.2 | Vérifier que Stripe est en mode **test** uniquement ; aucune clé `sk_live` nulle part | XS | Console Stripe : aucune clé live active |
| 0.3 | **Vérifier immédiatement que la RLS est activée sur toutes les tables Supabase** (MS-022) | S | Requête PostgREST anonyme sur `users` → 401/vide |
| 0.4 | Purger `database.sqlite` et `monservice.db` des données réelles ; les retirer du dépôt | XS | `git ls-files` ne renvoie plus de fichier base |
| 0.5 | Faire tourner `NEXTAUTH_SECRET` (présent en clair dans `.env.local` et `.env.production` avec la **même valeur**) | XS | Nouvelles valeurs distinctes par environnement |

> **Point à traiter avec sérieux** : `NEXTAUTH_SECRET` est **identique** en local et en production. Un secret de développement ayant fui compromet la production. Deux valeurs distinctes, générées avec `openssl rand -base64 32`.

---

## Phase 1 — Décisions structurantes (semaine 1)

Rien d'autre ne peut avancer avant ces trois décisions.

| # | Action | Résout | Effort | Validation |
|---|---|---|---|---|
| 1.1 | **Trancher : NextAuth ou Supabase Auth.** Recommandation : NextAuth à court terme | MS-008 | M | Connexion → dashboard en 200, sans boucle |
| 1.2 | Créer `src/lib/auth/require-session.ts` (`requireSession`, `requireOrganization`, `requireProfileType`) | prérequis MS-002/004/005/006/012 | S | Tests unitaires du helper |
| 1.3 | **Trancher : SQLite de développement ou PostgreSQL partout.** Recommandation : PostgreSQL dans tous les environnements (Docker en local) | MS-011, MS-021, dérive de schéma | M | `DATABASE_URL` PostgreSQL partout ; suppression du branchement conditionnel du schéma |
| 1.4 | Corriger `proxy.ts` (liste blanche exacte + contrôle `profileType` par segment) | MS-001 | XS | Test E2E d'accès anonyme |
| 1.5 | Initialisation paresseuse de Stripe (`getStripe()`) | MS-010 | S | `next build` réussit sans variable Stripe |
| 1.6 | Normaliser les variables d'environnement + validation zod au démarrage | MS-009 | S | Démarrage en échec explicite si une variable manque |

---

## Phase 2 — Avant lancement, bloquant (semaines 2 à 4)

| # | Action | Résout | Effort | Validation |
|---|---|---|---|---|
| 2.1 | **Réécrire les ~80 server actions** : suppression de tous les paramètres `userId`/`organizationId`, appel de `requireOrganization()`, schéma zod `.strict()` sur chaque entrée | MS-002, MS-005, MS-006, MS-033 | L | Aucune action n'accepte d'identifiant de locataire ; test d'isolation vert |
| 2.2 | Supprimer `getAllUsersAction` et `getUserByEmailAction` ; projection `safeUserColumns` | MS-003 | S | Aucune réponse ne contient `password` |
| 2.3 | Sécuriser la mise à jour de profil (liste blanche, flux dédiés pour e-mail/mot de passe/plan) | MS-004 | M | Test : tentative de modification de `organizationId` → 400 |
| 2.4 | Retirer `markAsPaidAction` de la surface publique ; statut `paid` piloté uniquement par le webhook | MS-007 | M | Test : appel direct → 404/403 |
| 2.5 | Refonte de la signature : jeton unique expirant, capture IP/UA/horodatage, scellement, immutabilité | MS-007, MS-032 | M | Un devis signé ne peut plus être modifié ; preuve générée |
| 2.6 | Authentifier `/api/stripe/checkout`, `/api/stripe/connect/onboarding`, `/api/reminders/check` | MS-012, MS-013 | M | Appels anonymes → 401 |
| 2.7 | Migration : colonnes manquantes (`users.stripe_customer_id`, `organizations.stripe_account_id/status/email/currency`, `users.role` si retenu) | dérive de schéma | M | Abonnement et Connect fonctionnels de bout en bout |
| 2.8 | Migration : clés étrangères `ON DELETE`, index sur `organization_id` et colonnes de recherche, transactions sur les cascades | MS-020, MS-021 | M | Suppression en cascade atomique vérifiée |
| 2.9 | **Row-Level Security PostgreSQL** sur toutes les tables porteuses de `organization_id` | MS-005, MS-022 | M | Test : requête directe avec un mauvais claim → 0 ligne |
| 2.10 | Politique de mot de passe + limitation de débit (connexion, inscription, réinitialisation, API) | MS-017 | M | 10 tentatives échouées → verrouillage temporaire |
| 2.11 | Réinitialisation de mot de passe réelle (jeton signé à usage unique, expiration 30 min, révocation des sessions) | MS-016 | M | Parcours complet testé |
| 2.12 | Fournisseur d'e-mail réel + SPF/DKIM/DMARC + file d'attente + suivi | MS-015 | M | E-mail reçu, DMARC en `pass` |
| 2.13 | Webhook Stripe : table `stripe_events` (idempotence) + traitement de `subscription.deleted`, `subscription.updated`, `invoice.payment_failed` | MS-014 | M | Rejeu d'un événement → aucun effet dupliqué |
| 2.14 | En-têtes de sécurité dans `next.config.ts` (CSP, HSTS, nosniff, Referrer-Policy, Permissions-Policy, frame-ancestors) | MS-024 | S | securityheaders.com : note A ou supérieure |
| 2.15 | Supprimer le bloc `redirects` de `netlify.toml` | MS-023 | XS | Le rendu serveur fonctionne sur toutes les routes |
| 2.16 | Base de production PostgreSQL + sauvegardes + **restauration réelle documentée** | MS-011 | M | Compte-rendu de restauration daté et signé |
| 2.17 | CI complète : `lint` + `tsc` + `build` + `test:unit` + `test:e2e` + `npm audit` ; branches protégées | MS-028 | S | Un PR avec une erreur de lint est bloqué |
| 2.18 | Corriger les 251 erreurs ESLint (essentiellement `no-explicit-any` — largement résolues par 2.1) | MS-033 | M | `eslint .` : 0 erreur |
| 2.19 | Suite de tests d'isolation multitenant **bloquante en CI** | MS-005 | M | Voir `TEST_PLAN.md` §2 |

---

## Phase 3 — 30 jours

| # | Action | Résout | Effort |
|---|---|---|---|
| 3.1 | Implémenter les quotas et droits par plan (compteurs d'usage + blocage) | MS-019 | M |
| 3.2 | Implémenter réellement `notificationService` et `reminderService`, ou retirer l'interface correspondante | MS-018 | M |
| 3.3 | Corriger les IDOR messagerie et marketplace | MS-026, MS-027 | S |
| 3.4 | Export et suppression de compte RGPD (purge + anonymisation des données comptables) | MS-030 | M |
| 3.5 | Vérification d'adresse e-mail à l'inscription | MS-035 | M |
| 3.6 | Journalisation structurée + identifiants de corrélation + agrégation | MS-025 | M |
| 3.7 | Journal d'audit applicatif (accès, modifications sensibles, actions administratives) | MS-007, MS-025 | M |
| 3.8 | Pagination serveur sur toutes les listes | MS-042 | M |
| 3.9 | Nettoyage : fichiers `fix_*`, `src/testiii`, doublons d'actions, Jest, dépendances inutilisées | MS-036, MS-038, MS-039, MS-055 | S |

---

## Phase 4 — 60 jours

| # | Action | Résout | Effort |
|---|---|---|---|
| 4.1 | Métriques, traces OpenTelemetry, tableaux de bord, alertes avec propriétaire | MS-025 | L |
| 4.2 | SLI/SLO sur les parcours critiques + budgets d'erreur | — | M |
| 4.3 | Recherche SQL full-text indexée | MS-043 | M |
| 4.4 | Modèle de rôles complet (manager, admin d'organisation, support) + invitations | MS-034 | L |
| 4.5 | Documentation RGPD : registre, DPA sous-traitants, bandeau de consentement, textes légaux rédigés | MS-031, MS-048 | M |
| 4.6 | Audit d'accessibilité WCAG 2.2 AA réel (clavier + lecteur d'écran) et corrections | MS-053 | L |
| 4.7 | Tests de charge et de comportement « noisy neighbor » en environnement isolé | — | M |

---

## Phase 5 — 90 jours et amélioration continue

Runbooks et procédure d'incident · page de statut publique · SBOM et provenance des builds (SLSA) · déploiements progressifs et rollback testé · revue de sécurité trimestrielle · test de restauration trimestriel · pentest externe avant ouverture commerciale · métriques DORA.

---

## Graphe de dépendances (chemin critique)

```
1.1 (choix auth) ──┬──► 1.2 (requireSession) ──┬──► 2.1 (réécriture actions) ──┬──► 2.19 (tests isolation)
                   │                            ├──► 2.2 / 2.3 / 2.4 / 2.6      │
                   └──► 1.4 (proxy.ts)          └──► 3.1 / 3.3                  │
                                                                                 │
1.3 (choix SGBD) ──┬──► 2.7 (colonnes manquantes) ──► 2.13 (webhook) ──────────┘
                   ├──► 2.8 (FK + index) ──► 2.9 (RLS)
                   └──► 2.16 (sauvegardes + restauration)

1.5 (Stripe paresseux) + 1.6 (env) ──► déploiement possible ──► 2.14 / 2.15
```

**Chemin critique : 1.1 → 1.2 → 2.1.** Tant que 2.1 n'est pas terminé, aucune donnée client ne peut être considérée comme protégée, quelles que soient les autres corrections.

---

## Estimation globale

| Phase | Charge (1 développeur expérimenté) |
|---|---|
| Phase 0 | 0,5 jour |
| Phase 1 | 4 à 6 jours |
| Phase 2 | 15 à 22 jours |
| Phase 3 | 10 à 14 jours |
| Phase 4 | 15 à 20 jours |
| **Avant mise en production (0→2)** | **20 à 29 jours ouvrés** |
| **Produit commercialisable sereinement (0→4)** | **45 à 63 jours ouvrés** |

Ces estimations supposent une bonne connaissance du code. Elles n'incluent ni le pentest externe, ni la rédaction juridique, ni la refonte UX.
