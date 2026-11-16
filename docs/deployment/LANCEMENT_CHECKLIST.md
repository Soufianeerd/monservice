# MonService — checklist de mise sur le marché

Décisions du 11 novembre 2026 (Soufiane) : site sur `https://monservicecrm.netlify.app`,
ouverture **Générique + Artisans/BTP**, paramédical fermé aux inscriptions, **gratuit au début** (Stripe désactivé).

Référence technique détaillée : [`PRODUCTION_DEPLOYMENT_RUNBOOK.md`](PRODUCTION_DEPLOYMENT_RUNBOOK.md).
Dernier préflight enregistré (11 octobre 2026) : 12 contrôles sur 14 au vert ; les 2 bloquants sont les e-mails.

## État
| Étape | État |
|---|---|
| Code validé (CI Neon verte, 42 parcours navigateur) | Fait — runs `fd326d2` et `197a3ee` |
| Base de production Neon (rôles restreints, RLS, stockage privé) | Prête, migrations 0000–0013 |
| Migrations 0014–0018 sur la production | **À rejouer** à la bascule (`NEON_PRODUCTION_REPLAY=validated npm run db:migrate` avec `.env.neon-production-admin.local`) |
| Variables Netlify (contexte production uniquement) | **À installer** depuis `.env.neon-production.local` |
| E-mails de connexion (code de vérification, mot de passe oublié) | **Bloquant** — fournisseur « partagé » Neon, prévu pour les essais |
| E-mails métier (invitations, devis, factures) | **Bloquant** — aucun expéditeur vérifié |
| Abonnements Stripe | Désactivés au lancement (routes en 503 sans clés) |
| Paramédical | Fermé : `NEXT_PUBLIC_CLOSED_REGISTRATION_SECTORS=health` |

## Le point bloquant : les e-mails
Rester sur `monservicecrm.netlify.app` convient pour le **site**. Les **e-mails** exigent
un domaine dont on contrôle le DNS : on ne peut pas vérifier `netlify.app` chez Resend.
Sans cela, un nouvel inscrit ne reçoit pas de façon fiable son code de vérification et
ne peut pas entrer dans l'application ; les invitations au portail ne partent pas.

À faire par Soufiane : acheter un domaine (une dizaine d'euros par an), le déclarer dans
Resend, poser les enregistrements DNS indiqués, attendre l'état « vérifié ». Ensuite :
SMTP Neon Auth (`smtp.resend.com`, port 465, utilisateur `resend`), `RESEND_API_KEY` et
`EMAIL_FROM` dans Netlify. Le site peut rester sur l'adresse Netlify ou passer sur ce domaine.

## Variables Netlify — contexte production
Obligatoires : `DATABASE_URL` (rôle `monservice_runtime`, pooled), `NEON_AUTH_BASE_URL`,
`NEON_AUTH_COOKIE_SECRET`, `AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`,
`AWS_SECRET_ACCESS_KEY`, `NEXT_PUBLIC_APP_URL=https://monservicecrm.netlify.app`,
`NEXT_PUBLIC_CLOSED_REGISTRATION_SECTORS=health`.
Workers : `NEON_STRIPE_DATABASE_URL`, `NEON_REMINDERS_DATABASE_URL`, `CRON_SECRET`.
E-mails : `RESEND_API_KEY`, `EMAIL_FROM`.
Ne pas définir `DATABASE_POOL_MAX` (1 par défaut, adapté au serverless).
Jamais dans Netlify : connexion owner/unpooled, clé API Neon, clé CI, mot de passe E2E.

## Ordre de bascule
1. Merger la PR #1 dans `main`. Netlify lance alors un build de production ; tant que
   les variables manquent il **échoue** et rien n'est publié.
2. Domaine + Resend vérifié + SMTP Neon Auth ; test de réception (code et lien de
   réinitialisation) sur une boîte de Soufiane.
3. Rejouer 0014–0018 sur la production, puis `db:check-drift`, `db:check-contract`,
   `db:check-custom-objects` en lecture seule.
4. Installer les variables Netlify (production uniquement).
5. `node scripts/neon/cutover-preflight.mjs` : doit sortir au vert.
6. **Feu vert explicite de Soufiane**, puis déclencher le déploiement.
7. Vérifications en ligne : pages publiques, inscription d'un compte réel consentant,
   création d'un client, devis, invitation au portail, refus inter-organisations.

## Retour arrière
Republier le déploiement Netlify précédent (ou dépublier le site). Les migrations
0014–0018 sont additives : l'ancien code fonctionne avec le nouveau schéma. Supabase
reste intact et inutilisé. Aucune suppression de base ni de branche.

## Hors lancement
- Paramédical avec de vrais patients : interdit avant démonstration HDS de toute la chaîne.
- Aperçus Netlify des PR : en échec tant qu'une branche Neon synthétique dédiée n'est pas configurée.
