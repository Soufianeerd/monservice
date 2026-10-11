# MonService — bascule applicative vers Neon

Le backend canonique est `Monservice-Europe` / `misty-field-54835523`, Frankfurt,
PostgreSQL 18. Aucun push Git, merge `main` ou déploiement public n'a été effectué.
Le dépôt contient une configuration Netlify, sans preuve d'un site lié accessible.

## Artefacts

- [Rapport complet](../database/neon-migration.md).
- [CI isolée](../database/artifacts/ci-validation-report.json).
- [Import et rapprochement](../database/artifacts/production-import-report.json).
- [Contrôles production](../database/artifacts/production-validation-report.json).
- [Source inchangée](../database/artifacts/source-unchanged-report.json).
- [Classification du schéma](../database/artifacts/source-schema-reconciliation.json).

## Replay du backend

Ces commandes ne déploient pas l'application publique. Elles supposent une CI
complète réussie et une source toujours conforme au snapshot privé. Le script
refuse les changements de périmètre. Aucun seed synthétique ne doit viser production.

```sh
NEON_PRODUCTION_REPLAY=validated node scripts/neon/prepare-production.mjs
NEON_PRODUCTION_REPLAY=validated node scripts/neon/import-source.mjs
node scripts/neon/check-production.mjs
node scripts/neon/verify-source-unchanged.mjs
```

Le replay utilise `neon config plan` puis `apply`, les migrations immuables de
`drizzle/neon` et trois rôles restreints. L'application locale reste sur
`migration-validation`. Un second import compare les lignes et bindings présents ;
il n'écrase pas de nouvelles données. Les contrôles d'état initial Auth de
`check-production.mjs` sont destinés à l'avant-bascule, avant toute connexion réelle.

## Variables de l'hébergeur

Le fichier ignoré `.env.neon-production.local` contient les credentials runtime
préparés. Il n'est jamais une pièce jointe publique ni un artefact CI.
`.env.neon-production-admin.local` reste uniquement sur le poste d'administration.

| Variable | Usage |
|---|---|
| `DATABASE_URL` | Connexion pooled `monservice_runtime`, sans BYPASSRLS ni propriété des tables |
| `NEON_AUTH_BASE_URL` | Endpoint Managed Auth de production |
| `NEON_AUTH_COOKIE_SECRET` | Signature privée des cookies SDK, au moins 32 caractères |
| `AWS_ENDPOINT_URL_S3`, `AWS_REGION` | Endpoint Storage et région Frankfurt |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Credentials S3 serveur de production |
| `NEON_STRIPE_DATABASE_URL` | Connexion du worker Stripe restreint |
| `NEON_REMINDERS_DATABASE_URL` | Connexion du worker de rappels restreint |
| `NEXT_PUBLIC_APP_URL` | URL publique HTTPS canonique, à fournir |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Secrets existants de l'hébergeur, hors credentials de test |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Clé publique Stripe du même environnement |
| `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_BUSINESS` | Tarifs existants, si activés |
| `RESEND_API_KEY` | Emails métier ; service externe conservé |
| `CRON_SECRET` | Secret à synchroniser avec le scheduler |

Ne pas injecter `DATABASE_URL_UNPOOLED`, `NEON_ADMIN_DATABASE_URL`, `NEON_API_KEY`,
la clé CI, `E2E_AUTH_PASSWORD`, les exports source ou les variables Supabase dans
le runtime public. Aucun secret `NEXT_PUBLIC_*`. Le navigateur appelle `/api/auth`.

Neon Auth utilise un SMTP distinct des emails métier Resend. Avant ouverture
publique, configurer un expéditeur MonService vérifié et le SMTP Neon de production,
puis vérifier la réception d'OTP et de liens de reset sur une boîte consentante.
Les domaines Resend observés appartiennent à d'autres projets et restent inutilisés.
Ajouter l'URL canonique aux origines et callbacks autorisés via le contrat Neon
actuel. Localhost est désactivé sur production. Les comptes importés sont non
vérifiés et sans mot de passe : reset, confirmation OTP, puis récupération de
l'identité MonService. Aucun email de masse n'est envoyé.

## Déploiement public — confirmation finale nécessaire

1. Identifier site, compte d'hébergement et domaine. Exporter l'ancienne configuration
   privée et conserver l'identifiant du dernier déploiement Supabase.
2. Vérifier à nouveau la source. Réconcilier tout delta depuis le snapshot.
3. Définir une fenêtre de bascule et suspendre les écritures applicatives côté
   hébergeur ; aucune mutation du projet Supabase n'est nécessaire.
4. Configurer Neon runtime, URL, callbacks et SMTP. Conserver les secrets Stripe/Resend
   du site ; ne jamais installer les credentials synthétiques des tests.
5. Après approbation, pousser la branche de migration et ouvrir une PR avec CI Neon.
   Ne jamais pousser directement ni merger `main` automatiquement. Évaluer les
   triggers de déploiement avant ce push.
6. Construire Node 22 / `npm ci` / `npm run build`, puis tester un aperçu isolé.
   Netlify : runtime Next v5, aucune redirection SPA.
7. Vérifier pages publiques, réception email, ré-enrôlement d'un compte consentant,
   accès au workspace attendu et refus des autres tenants. Stripe en sandbox sur
   une cible synthétique ; configuration réelle sans paiement réel non autorisé.
8. Confirmer la bascule publique, surveiller Auth/DB/Storage et conserver Supabase.
   Aucun patient réel avant démonstration du périmètre HDS de toute la chaîne.

## Rollback

Avant ouverture des écritures Neon, restaurer le dernier déploiement Supabase et
sa configuration privée suffit : source, comptes et objets sont intacts.
Après de nouvelles écritures Neon, un simple retour vers Supabase perdrait ces
écritures. Suspendre les écritures, sauvegarder le delta Neon et organiser sa
réconciliation explicitement avant retour. Aucun backend n'est supprimé.

L'ancien identifiant DB retrouvé dans l'historique Git doit être renouvelé après
la bascule et l'identification des consommateurs source. Cette mission interdit
de changer les credentials source ou de réécrire les commits Security Gate 1 ;
aucun de ces changements n'a été effectué.

Rétention Neon observée : six heures. Une fenêtre de restauration plus longue
requiert un plan/budget adapté. [Plans Neon](https://neon.com/docs/introduction/plans),
[checklist Auth production](https://neon.com/docs/auth/production-checklist).
