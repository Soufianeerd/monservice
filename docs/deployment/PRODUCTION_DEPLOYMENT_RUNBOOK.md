# MonService — bascule applicative vers Neon

Le backend canonique est `Monservice-Europe` / `misty-field-54835523`, Frankfurt,
PostgreSQL 18. Aucun push Git, merge `main` ou déploiement public n'a été effectué.
Le site Netlify **monservicecrm** est accessible en lecture seule et lié au dépôt
canonique. Site ID `dc084088-bcde-4d4f-9be5-d5aa8959650a`, URL configurée
`https://monservicecrm.netlify.app`, aucun domaine personnalisé ni déploiement
publié. Le dernier build de `main@3b62b47` échouait faute de `DATABASE_URL`.

## Artefacts

- [Rapport complet](../database/neon-migration.md).
- [CI isolée](../database/artifacts/ci-validation-report.json).
- [Import et rapprochement](../database/artifacts/production-import-report.json).
- [Contrôles production](../database/artifacts/production-validation-report.json).
- [Source inchangée](../database/artifacts/source-unchanged-report.json).
- [Parcours navigateur avec vérification obligatoire](../database/artifacts/auth-recovery-validation-report.json).
- [Préflight de bascule publique](../database/artifacts/cutover-preflight-report.json).
- [Inventaire de l'hébergeur](../database/artifacts/hosting-readiness-report.json).
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
| `NEXT_PUBLIC_APP_URL` | `https://monservicecrm.netlify.app`, préparée dans le paquet privé et autorisée dans Neon Auth |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Secrets existants de l'hébergeur, hors credentials de test |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Clé publique Stripe du même environnement |
| `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_BUSINESS` | Tarifs existants, si activés |
| `RESEND_API_KEY` | Emails métier ; service externe conservé |
| `EMAIL_FROM` | Expéditeur métier vérifié, à conserver ou définir pour MonService |
| `CRON_SECRET` | Secret à synchroniser avec le scheduler |

La seule variable actuellement observée dans Netlify est `NODE_VERSION=22.x`
(tous contextes). Aucun credential applicatif n'y est installé. Le paquet privé
reste prêt à importer après validation finale ; n'appliquer ses credentials de
production qu'au contexte **production**. Les Deploy Previews sont activées pour
les PR ; elles doivent utiliser une branche Neon synthétique distincte et leur
propre origine Auth exacte, une fois l'URL de preview connue. Aucun wildcard de
domaine ni credential production partagé avec une preview.

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

### Paramètres email prêts à appliquer après choix du domaine

Le domaine d'envoi doit appartenir à MonService ou être explicitement choisi par
son propriétaire. Aucun des domaines des autres projets n'a été réutilisé. Créer
le domaine Resend, installer ses enregistrements DNS exacts puis attendre son état
vérifié avant activation. Les credentials restent dans le stockage privé et dans
Neon/Netlify, jamais dans une commande copiée au rapport.

| Neon Auth SMTP | Valeur à préparer |
|---|---|
| Type Management API | `standard` |
| Host | `smtp.resend.com` |
| Port | `465` (TLS implicite) |
| Username | `resend` |
| Password | Clé Resend privée autorisée à envoyer pour le domaine MonService |
| Sender email | Adresse du domaine vérifié choisi, à fournir |
| Sender name | `MonService` |

Les emails métier utilisent `RESEND_API_KEY` et `EMAIL_FROM` dans le contexte
Netlify production ; les emails Auth utilisent ce SMTP dans Neon. Les paramètres
SMTP et le prérequis de domaine vérifié sont confirmés par la
[documentation Resend](https://resend.com/docs/send-with-smtp).
Valider ensuite OTP et lien reset sur une boîte consentante, sans lancement de
campagne ni email automatique aux seize comptes importés.

### Contrôle automatisé avant bascule

```sh
node scripts/neon/cutover-preflight.mjs
```

Lecture seule des configurations réelles de production et des variables privées ;
aucun email ni déploiement. Le script écrit une preuve sans credential et sort avec
le code **2** si un prérequis technique manque. Le 11 octobre, après découverte de
Netlify et préparation de son origine : SMTP Auth partagé et expéditeur métier
restent non configurés. Le contrat Management API nomme le SMTP personnalisé
`type=standard`. Même un contrôle technique vert ne remplace pas la preuve de
réception email, la réconciliation des secrets du site, la fenêtre de bascule ni
l'approbation finale du déploiement public.

Les deux parcours Auth obligatoires sont intégrés au replay CI avant les 23
parcours historiques. Ils utilisent uniquement une branche jetable et des adresses
`@monservice.invalid`, avec `require_email_verification=true`. Les codes et tokens
sont lus par le propriétaire de cette fixture, hors runtime : aucune preuve de
délivrabilité réelle n'en découle. Un replay ciblé est disponible avec
`NEON_CI_AUTH_ONLY=true node scripts/neon/ci-branch.mjs`, dans l'environnement
privé contenant la clé CI EU. La branche et ses fichiers temporaires sont supprimés.

## Déploiement public — confirmation finale nécessaire

1. Vérifier à nouveau le site Netlify identifié et exporter sa configuration privée.
   Aucun ancien déploiement publié n'existe ; conserver les commits source et le
   statut public non déployé comme référence. Choisir le domaine d'envoi MonService.
2. Vérifier à nouveau la source. Réconcilier tout delta depuis le snapshot.
3. Définir une fenêtre de bascule et suspendre les écritures applicatives côté
   hébergeur ; aucune mutation du projet Supabase n'est nécessaire.
4. Configurer Neon runtime, URL, callbacks et SMTP. Conserver les secrets Stripe/Resend
   du site s'ils ont été ajoutés depuis l'inventaire ; sinon ces intégrations
   optionnelles restent désactivées. Ne jamais installer les credentials
   synthétiques des tests dans le contexte production.
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

Avant ouverture des écritures Neon, conserver/restaurer la configuration source et
le commit source suffit pour préparer un retour : source, comptes et objets sont
intacts. Le site Netlify n'ayant jamais eu de déploiement publié, il n'existe pas
de bouton de retour vers un ancien déploiement réussi ; la référence publique
reste le site non déployé, ou une page de maintenance approuvée.
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
