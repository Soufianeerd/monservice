# MonService — Audit de préparation au lancement (17 novembre 2026)

Branche auditée : `migration/neon-full` @ `e4c82fc` (PR #1, non mergée). Règle appliquée : **aucun accès client/patient en V1**, dans les trois workspaces.

## Décision

| Périmètre | Décision | Motif principal |
|---|---|---|
| Ouverture publique aujourd'hui | **NO-GO** | 5 blocages P0 ouverts (ci-dessous) |
| Générique + Artisans/BTP | **GO PILOTE LIMITÉ** après levée des P0 | Socle technique solide, parcours métier couverts par des tests |
| Paramédical avec données réelles | **NO-GO** | Hébergement HDS non démontré ; pas de télétransmission SESAM-Vitale |

Score de maturité : **55/100** (détail et niveaux de confiance dans `13_RELEASE_CHECKLIST.md`). Le score n'annule aucun P0.

## Les blocages P0

| ID | Blocage | Preuve |
|---|---|---|
| LR-001 | Les accès client/patient sont ouverts : inscription « Je suis un particulier », 21 pages `/client/*`, invitation au portail, espace patient | `RegisterForm.tsx:333`, `src/app/client/`, `drizzle/neon/0009` (profil par défaut `client`) |
| LR-002 | Sans compte client, un devis ne peut plus être accepté : seul le destinataire (`recipient`) peut signer, et acompte, facture et ordre de travail exigent le statut `accepted` | `billing/authorization.ts:40-45`, `quote.service.ts:523, 771, 877, 1013` |
| LR-003 | Lancement « gratuit, Stripe désactivé » : tout le monde est sur le plan `free`, plafonné à 10 devis et 10 factures par mois, 50 clients, 1 utilisateur, sans voie de mise à niveau. Les tests navigateur forcent tous les comptes en `pro` : le parcours gratuit n'est jamais testé | `billing/plans.ts:49-68`, `scripts/e2e/seed-local.ts:963-970` |
| LR-004 | E-mails : aucun domaine d'envoi vérifié. Un nouvel inscrit ne reçoit pas de façon fiable son code de vérification | `docs/deployment/LANCEMENT_CHECKLIST.md` |
| LR-005 | Sauvegardes : rétention observée de 6 heures sur Neon, aucun test de restauration consigné | `docs/database/neon-migration.md:76` |

S'y ajoute l'état de la livraison : la CI est rouge depuis le 11 novembre (5 runs), la PR #1 n'est pas mergée et le site public n'a aucun build valide. Un correctif de test a été poussé pendant l'audit (`e4c82fc`), résultat CI à confirmer.

## Ce qui est solide (vérifié)

- Isolation multi-tenant en base : rôle d'exécution sans `BYPASSRLS`, identité posée par transaction, 168 politiques RLS sur 57 tables, 124 activations RLS. Dernière validation complète verte : run CI 42859109019 du 10 novembre (RLS, contraintes, 42 parcours navigateur).
- Contrôles rejoués pendant cet audit : `tsc` 0 erreur, ESLint 0 erreur (348 avertissements), **802/802 tests unitaires**, `npm audit --omit=dev` **0 vulnérabilité**.
- En-têtes de sécurité, webhooks Stripe signés et idempotents, secret CRON comparé en temps constant, stockage privé à URL signées.

## Ce qui manque pour vendre

- Pas d'invitation de collaborateur (LR-007) : agence, cabinet avec secrétaire et entreprise à plusieurs techniciens ne peuvent pas se créer sans intervention en base.
- Facturation électronique : le service existe mais n'est branché nulle part (LR-008). Les concurrents directs sont plateformes agréées.
- Pas de planificateur (relances jamais envoyées), pas de supervision d'erreurs, pas de pages d'erreur (LR-009, LR-010).
- Page d'accueil incohérente avec le lancement : tarifs payants affichés, « Médecins », « standards bancaires » (LR-011).

## Recommandation

Stratégie C puis B : **pilote fermé de 5 à 10 professionnels** (indépendants de services et artisans seuls ou à deux), gratuit pendant le pilote avec les droits du plan Pro, puis ouverture payante de la verticale qui retient le mieux. Chemin critique estimé : **12 à 16 jours de développement** plus les délais externes (domaine, DNS, plan Neon). Détail dans `11_LAUNCH_ROADMAP.md`.

## Limites de cet audit

Non exécutés dans cette session : tests d'intrusion actifs, tests RLS et contraintes en base, parcours navigateur, mesures Lighthouse, tests au lecteur d'écran, captures d'écran. Les constats correspondants reposent sur la lecture du code et sur les preuves CI du 10 novembre. Les prix concurrents proviennent de relevés publics datés, pour la plupart via des comparateurs : à revérifier sur les sites officiels avant usage commercial.
