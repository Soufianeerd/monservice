# Mise en ligne de MonService — les 5 actions de Soufiane

Ordre conseillé : 1 → 2 → 5 (en parallèle) → 3. Le point 4 est une décision, pas une tâche.
Les commandes se lancent depuis le dossier `~/Projets/monservice`, sur ton Mac.
Ne colle jamais une clé ou un mot de passe dans une conversation, un commit ou un ticket.

---

## 1. E-mails : domaine, Resend, SMTP de l'authentification (≈ 1 h + attente DNS)

Pourquoi : sans e-mail fiable, un nouvel inscrit ne reçoit pas son code de vérification et ne peut pas entrer. Le fournisseur partagé de Neon (`auth@mail.myneon.app`) est limité en débit et réservé aux essais.

1. **Acheter un domaine** (≈ 10 €/an chez OVH, Gandi, IONOS ou Cloudflare), par exemple `monservice-pro.fr`. Le site peut rester sur `monservicecrm.netlify.app`.
2. **Resend** → *Domains* → *Add Domain*. Conseil Resend : un sous-domaine dédié à l'envoi, par exemple `mail.monservice-pro.fr`. Région : Europe (Ireland) si proposée.
3. Resend affiche des enregistrements DNS (DKIM en TXT `resend._domainkey…`, SPF en TXT + MX sur `send…`, ou des CNAME pour les domaines récents). **Les recopier à l'identique** chez le registraire. Si le registraire ajoute déjà le domaine, ne coller que la partie gauche (`send`, pas `send.mail.monservice-pro.fr`).
4. Ajouter aussi un enregistrement DMARC : TXT, nom `_dmarc.mail` (ou `_dmarc`), valeur `v=DMARC1; p=none;` — améliore la délivrabilité vers Gmail et Outlook.
5. Cliquer *Verify DNS Records*. Attendre l'état **Verified** (souvent 15 min, jusqu'à 72 h).
6. **Resend** → *API Keys* → créer une clé « Sending access » limitée à ce domaine. La garder dans ton gestionnaire de mots de passe.
7. **SMTP de Neon Auth** (branche de production) — console Neon : projet `Monservice-Europe` → *Auth* → *Email provider* → *Custom SMTP*, ou en ligne de commande :
   ```sh
   neon neon-auth config email-provider update --project-id misty-field-54835523 --branch production \
     --type standard --host smtp.resend.com --port 465 --username resend \
     --password '<clé Resend>' --sender-email noreply@mail.monservice-pro.fr --sender-name MonService
   neon neon-auth config email-provider test --project-id misty-field-54835523 --branch production
   ```
8. **Preuve de réception** : sur le site (une fois en ligne, point 3) ou depuis la console Neon, créer un compte avec ta propre adresse, recevoir le code, puis tester « mot de passe oublié ». Noter date, heure et dossier de réception (boîte principale ou spam).

Variables Netlify qui en découlent (point 3) : `RESEND_API_KEY` = la clé, `EMAIL_FROM` = `MonService <noreply@mail.monservice-pro.fr>`.

---

## 2. Sauvegardes : plan Neon et exercice de restauration (≈ 30 min)

Aujourd'hui : plan gratuit, 6 heures d'historique. Une erreur découverte le lendemain est irrécupérable.

1. Console Neon → *Billing* → passer au plan **Launch** (sans minimum mensuel, facturé à l'usage). Il permet jusqu'à **7 jours** d'historique ; le plan Scale va jusqu'à 30 jours.
2. Projet → *Settings* → *Instant restore / History window* → régler sur **7 jours**. Coût : environ 0,20 $ par Go de modifications conservées par mois — quelques centimes au démarrage.
3. Dans *Branches* → *production* → *Protect* : protéger la branche contre la suppression et la réinitialisation.
4. **Exercice sans risque** (à consigner) : créer une branche **à partir d'un instant passé** de `production` (par exemple il y a 24 h), nommée `restore-test-AAAAMMJJ`. Vérifier qu'on y retrouve les données (compter les organisations et les factures). Noter la durée de l'opération, puis supprimer cette branche de test. **Ne jamais utiliser « Restore » directement sur `production` pour un exercice.**
5. Écrire le compte rendu en trois lignes dans `docs/deployment/` (date, instant restauré, durée, résultat).

---

## 3. Bascule en production (≈ 1 h 30, dans cet ordre)

> La PR #2 (`launch/v1-professional-only`) contient tout le travail de la PR #1 plus les ajouts du 17 novembre. **On merge la PR #2 seule**, puis on ferme la PR #1.
> Le merge dans `main` déclenche le déploiement Netlify : il doit être **la dernière étape**.

1. **Récupérer la branche** : `git fetch && git checkout launch/v1-professional-only && npm ci`.
2. **CI verte** sur la PR #2 : vérifier sur GitHub que le dernier run « CI Neon » est vert.
3. **Rejouer les migrations 0014 à 0020 sur la production** (additives : rien n'est supprimé) :
   ```sh
   NEON_ADMIN_ENV_FILE=.env.neon-production-admin.local NEON_PRODUCTION_REPLAY=validated npm run db:migrate
   NEON_ADMIN_ENV_FILE=.env.neon-production-admin.local npm run db:check-drift
   ```
   Puis les deux contrôles de schéma, en lecture seule :
   ```sh
   set -a; . ./.env.neon-production-admin.local; set +a
   DATABASE_URL="$DATABASE_URL_UNPOOLED" npm run db:check-contract
   DATABASE_URL="$DATABASE_URL_UNPOOLED" npm run db:check-custom-objects
   ```
   Les trois doivent afficher ✅. Sinon : s'arrêter et m'envoyer le message d'erreur (sans les secrets).
4. **Variables Netlify** — *Site configuration* → *Environment variables* → contexte **Production uniquement** :
   - depuis `.env.neon-production.local` : `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`, `AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `NEON_STRIPE_DATABASE_URL`, `NEON_REMINDERS_DATABASE_URL`, `CRON_SECRET` ;
   - `NEXT_PUBLIC_APP_URL=https://monservicecrm.netlify.app` ;
   - `RESEND_API_KEY`, `EMAIL_FROM` (point 1) ;
   - `LAUNCH_INCLUDED_PLAN=pro` ;
   - `NEXT_PUBLIC_CLOSED_REGISTRATION_SECTORS=health` (voir point 4) ;
   - **ne pas définir** : `CLIENT_ACCESS_ENABLED`, `DATABASE_POOL_MAX`, toute variable `STRIPE_*` (abonnements désactivés au lancement), et jamais la connexion propriétaire, la clé API Neon ou le mot de passe E2E.
5. **Préflight** : `node scripts/neon/cutover-preflight.mjs` → doit sortir sans erreur (code 0).
6. **Feu vert** : merger la PR #2 dans `main` sur GitHub (bouton *Merge*), puis fermer la PR #1. Netlify construit et publie (5 à 10 min).
7. **Vérifications en ligne** (15 min) :
   - page d'accueil et pages légales s'affichent ;
   - inscription d'un compte professionnel avec ta vraie adresse, code reçu (preuve du point 1) ;
   - création d'un client, d'un devis, « Le client a accepté », facture ;
   - Paramètres → Équipe : inviter une deuxième adresse à toi, accepter, puis la retirer ;
   - sur la facture : « Marquer comme réglée », puis « Demander un avis au client » vers une de tes adresses ; déposer l'avis ; publier la vitrine (Paramètres → Vitrine publique) et vérifier qu'il s'y affiche ;
   - avec un deuxième compte d'une autre entreprise : il ne voit pas les clients du premier.

**Retour arrière** : Netlify → *Deploys* → dépublier (ou republier une page de maintenance). Les migrations étant additives, rien n'est à défaire en base.

---

## 4. Paramédical : la décision

Le code est prêt, mais des **données de santé réelles** (dossiers, rendez-vous de patients, notes cliniques) doivent être hébergées par un **hébergeur certifié HDS**, sur toute la chaîne : base, authentification, fichiers, application, sauvegardes. Neon, Netlify et Resend ne le sont pas pour cet usage. Une simple prise de rendez-vous chez un kiné est déjà une donnée de santé.

| Option | Conséquence |
|---|---|
| **A. Garder fermé** (recommandé au lancement) | `NEXT_PUBLIC_CLOSED_REGISTRATION_SECTORS=health`. Aucun risque. Générique + BTP ouverts. |
| B. Démonstration seulement | Ouvrir à quelques praticiens **avec données fictives**, contrat écrit l'interdisant. Utile pour des retours, aucun usage réel. |
| C. Ouverture réelle | Migrer base, fichiers, application et authentification vers un hébergeur certifié HDS (OVHcloud, Scaleway, Clever Cloud, Outscale…), signer le contrat HDS, faire une analyse d'impact (AIPD). Plusieurs semaines de travail, à planifier après le lancement. |

Ouvrir le secteur = retirer `health` de la variable. **Ne le fais pas sans l'option C.**

---

## 5. Documents juridiques (≈ 1 à 2 jours, relecture conseillée)

Nécessaires avant d'ouvrir à des professionnels, même gratuitement :

1. **Conditions générales d'utilisation (CGU)** : objet, accès gratuit au lancement et conditions de passage au payant, responsabilités, disponibilité, résiliation, export des données, droit applicable.
2. **Annexe de sous-traitance RGPD (DPA, article 28)** : MonService traite les données des clients de tes clients pour leur compte. Objet, durée, nature des données, mesures de sécurité, sous-traitants ultérieurs, notification de violation sous 72 h, restitution et suppression en fin de contrat.
3. **Liste des sous-traitants ultérieurs** (page publique) :

| Sous-traitant | Rôle | Localisation des données |
|---|---|---|
| Neon (Databricks) | Base de données, authentification, fichiers | Francfort (UE) |
| Netlify | Hébergement de l'application | États-Unis / réseau mondial — à préciser dans leur DPA |
| Resend | Envoi des e-mails | Selon la région choisie |
| Stripe | Abonnements (quand activés) | UE / États-Unis |

   Pour chacun : accepter leur DPA en ligne (Netlify, Resend, Neon, Stripe en proposent un) et vérifier les clauses de transfert hors UE.
4. Mettre à jour les pages existantes `/conditions`, `/confidentialite`, `/mentions-legales` (éditeur : ton nom, SIRET, adresse ; hébergeurs réels).

Je peux rédiger les brouillons des quatre documents à partir du fonctionnement réel de l'application ; une relecture par un juriste ou un avocat reste recommandée avant publication.
