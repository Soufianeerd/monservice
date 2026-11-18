# Mise en ligne de MonService — guide pas à pas

Version du 18 novembre 2026. État vérifié aujourd'hui sur ton compte Neon :
- projet de production **Monservice-Europe** (`misty-field-54835523`, Francfort), branche `production` ;
- plan **Free** : historique de restauration de **6 heures**, branche `production` **non protégée** ;
- e-mails de connexion envoyés par l'expéditeur partagé de Neon (`auth@mail.myneon.app`) ;
- le projet **Monservice** (Ohio, `snowy-heart-26768144`) est l'ancien projet : aucun fichier du code ne l'utilise.

Le guide a deux parties :
- **Partie A — maintenant**, dans l'ordre, sans attendre de code de ma part.
- **Partie B — le jour de la mise en ligne**, seulement quand je t'aurai écrit « Partie B : feu vert » (il faut d'abord que je corrige les points bloquants de l'audit de solidification). Ne merge rien avant.

Règles pour toute la suite :
- Dans le **Terminal**, colle **un seul bloc gris à la fois**, appuie sur Entrée, attends que `%` revienne avant le suivant.
- Ne colle **jamais** un mot de passe, une clé ou une adresse `postgresql://…` dans une conversation.
- Si une étape ne donne pas le résultat attendu : arrête-toi et envoie-moi le numéro de l'étape et le message d'erreur, **mots de passe retirés**.

---

# PARTIE A — maintenant

## Étape 0 — Claude Code en mode « demande avant d'agir » (2 min)

**Pourquoi :** en mode automatique, Claude Code agit sans te demander. Avec Neon branché, il pourrait modifier la base de production.

1. Dans le Terminal :
   ```sh
   cd ~/Projets/monservice
   ```
   ```sh
   claude
   ```
2. Regarde la barre tout en bas. Si elle affiche `auto mode on`, appuie sur **Maj + Tab** (⇧ puis ⇥ en même temps). Le texte change à chaque appui. Arrête-toi quand **« auto mode » n'apparaît plus**.
3. Pour quitter Claude Code : tape `/exit` puis Entrée.

**Résultat attendu :** Claude Code te demande l'autorisation avant chaque action.

---

## Étape 1 — Changer le mot de passe de la base de production (10 min)

**Pourquoi :** le mot de passe administrateur de la production a été collé en clair le 17 novembre. Sur ton Mac, seul le fichier `.env.neon-production-admin.local` l'utilise. Le site, les tests et la CI utilisent d'autres comptes : rien d'autre n'est touché.

### 1.1 — Réinitialiser dans la console Neon
1. Ouvre **https://console.neon.tech** et connecte-toi.
2. Clique sur le projet **Monservice-Europe**.
3. En haut du menu de gauche, vérifie que la branche affichée est **production** (sinon clique dessus et choisis `production`).
4. Menu de gauche, section **Postgres database** → **Roles**.
5. Ligne **neondb_owner** → menu **⋯** à droite → **Reset password** → **Reset**.
6. Une fenêtre affiche le nouveau mot de passe : **ne le copie pas**, ferme-la. L'étape suivante le récupère toute seule.

### 1.2 — Mettre à jour le fichier de ton Mac
Dans le Terminal (pas dans Claude Code), un bloc à la fois :
```sh
cd ~/Projets/monservice
```
```sh
cp .env.neon-production-admin.local .env.neon-production-admin.local.bak
```
```sh
POOLED=$(neon connection-string production --project-id misty-field-54835523 --role-name neondb_owner --pooled)
```
```sh
DIRECT=$(neon connection-string production --project-id misty-field-54835523 --role-name neondb_owner)
```
Le bloc suivant est long : copie-le en entier, de `python3` jusqu'à la dernière ligne `PY`, puis Entrée.
```sh
python3 - "$POOLED" "$DIRECT" <<'PY'
import sys
pooled, direct = sys.argv[1], sys.argv[2]
path = ".env.neon-production-admin.local"
lines = open(path).read().split("\n")
for i, line in enumerate(lines):
    if line.startswith("DATABASE_URL="):
        lines[i] = 'DATABASE_URL="' + pooled + '"'
    elif line.startswith("DATABASE_URL_UNPOOLED="):
        lines[i] = 'DATABASE_URL_UNPOOLED="' + direct + '"'
open(path, "w").write("\n".join(lines))
print("Fichier mis a jour")
PY
```
Vérification de la connexion, en lecture seule (copie la ligne entière) :
```sh
node --input-type=module -e "import fs from 'node:fs'; import dotenv from 'dotenv'; import postgres from 'postgres'; const env = dotenv.parse(fs.readFileSync('.env.neon-production-admin.local')); for (const key of ['DATABASE_URL', 'DATABASE_URL_UNPOOLED']) { const sql = postgres(env[key], { max: 1 }); const rows = await sql.unsafe('select current_user'); console.log(key, 'OK', rows[0].current_user); await sql.end(); }"
```

**Résultat attendu :** `Fichier mis a jour`, puis deux lignes `DATABASE_URL OK neondb_owner` et `DATABASE_URL_UNPOOLED OK neondb_owner`. (N'utilise pas `npm run db:check-drift` ici : il signale normalement un écart tant que les migrations 0014 à 0020 ne sont pas appliquées, à l'étape 8.) Si c'est bon, supprime la sauvegarde (elle contient l'ancien mot de passe) :
```sh
rm .env.neon-production-admin.local.bak
```

**Si `neon: command not found` :** lance `npm i -g neon@latest`, puis reprends au début de 1.2.
**Si la vérification échoue :** remets l'ancien fichier avec `cp .env.neon-production-admin.local.bak .env.neon-production-admin.local` et envoie-moi l'erreur.

---

## Étape 2 — Neutraliser l'ancien projet de l'Ohio (3 min)

**Pourquoi :** son mot de passe a aussi été collé. Aucun fichier du code ne l'utilise.

1. **https://console.neon.tech** → projet **Monservice** (celui marqué *AWS US East 2 (Ohio)*).
2. Menu de gauche → **Roles** → ligne **neondb_owner** → **⋯** → **Reset password** → **Reset**. Ferme la fenêtre sans copier.

Optionnel, si tu es sûr de ne jamais t'en servir : **Settings** → tout en bas **Delete project**. C'est définitif ; je ne le fais pas à ta place.

---

## Étape 3 — Sauvegardes : 7 jours de retour arrière (15 min, puis 5 min avec moi)

**Pourquoi :** avec le plan gratuit, une erreur découverte plus de 6 heures après est irrécupérable.

### 3.1 — Passer au plan Launch
1. **https://console.neon.tech** → en haut à gauche, clique sur le nom de ton organisation → **Billing**.
2. **Change plan** (ou **Upgrade**) → **Launch** → ajoute ta carte → valide.

**Attention au coût :** le plan vaut pour **toute l'organisation**, donc aussi pour tes autres projets (Maddak, LaGazella, SFPAuto, myevents…), facturés à l'usage. Avant de valider, lis l'estimation sur la page Billing. Si elle te paraît trop élevée, ne valide pas et dis-le-moi : on peut mettre MonService dans une organisation à part.

### 3.2 — Régler l'historique sur 7 jours
1. Projet **Monservice-Europe** → **Settings** (menu de gauche) → **Postgres**.
2. Section **History window** : pousse le curseur jusqu'à **7 days** → **Save**.

### 3.3 — Protéger la branche de production
1. Projet **Monservice-Europe** → **Branches** (menu de gauche).
2. Ligne **production** → **⋯** → **Set as protected** (si l'option apparaît) → confirme.

### 3.4 — Exercice de restauration
Écris-moi : **« fais l'exercice de restauration »**. Avec le connecteur Neon, je crée une copie de la production telle qu'elle était quelques heures plus tôt, je vérifie que les données y sont, je note la durée dans le dossier du projet, puis je te demande l'autorisation de supprimer cette copie. Je ne touche pas à la branche `production`.

---

## Étape 4 — E-mails : domaine, Resend, e-mails de connexion (1 h + attente DNS)

**Pourquoi :** aujourd'hui, le code de vérification d'un nouvel inscrit part d'une adresse partagée et limitée : beaucoup n'arriveront pas.

### 4.1 — Acheter un domaine (si tu n'en as pas déjà un)
1. **https://www.ovhcloud.com/fr/domains/** (ou ton registraire habituel).
2. Cherche le nom voulu (exemple : `monservice-pro.fr`) et achète-le (environ 10 € par an).
3. Chez OVH, ouvre la gestion du domaine : **Web Cloud** → **Noms de domaine** → ton domaine → onglet **Zone DNS**. Garde cet onglet ouvert.

Dans la suite, remplace partout `monservice-pro.fr` par ton vrai domaine.

### 4.2 — Déclarer le domaine chez Resend
1. **https://resend.com** → crée un compte ou connecte-toi.
2. Menu de gauche **Domains** → **Add Domain**.
3. Nom : `mail.monservice-pro.fr`. Région : **EU (Ireland)** si proposée. Valide.
4. Resend affiche une liste d'enregistrements (colonnes *Type*, *Name*, *Value*). Laisse cette page ouverte.
5. Dans l'onglet OVH **Zone DNS** → **Ajouter une entrée**, recopie chaque ligne de Resend, une par une :
   - même **Type** (TXT, MX ou CNAME) ;
   - **Sous-domaine** : seulement la partie *Name* de Resend, **sans** `.monservice-pro.fr` à la fin ;
   - **Cible / Valeur** : la valeur exacte ;
   - pour un MX : la priorité indiquée (souvent 10).
6. Ajoute encore : Type **TXT**, sous-domaine `_dmarc.mail`, valeur `v=DMARC1; p=none;`.
7. Sur Resend → **Verify DNS Records**. Attends le statut **Verified** (souvent 15 minutes, parfois jusqu'à 48 heures). Pendant ce temps, fais l'étape 5 et 6, puis reviens ici.

### 4.3 — Créer la clé d'envoi
1. Resend → **API Keys** → **Create API Key**.
2. Nom : `monservice-production`. Permission : **Sending access**. Domain : `mail.monservice-pro.fr`.
3. Copie la clé (elle commence par `re_`) dans ton **gestionnaire de mots de passe**. Elle ne sera plus affichée.

### 4.4 — Brancher les e-mails de connexion sur Resend
Dans le Terminal. D'abord, saisie masquée de la clé (rien ne s'affiche quand tu colles, c'est normal ; appuie sur Entrée) :
```sh
read -s "RESEND_KEY?Colle la cle Resend puis Entree : "
```
Puis (remplace `mail.monservice-pro.fr` par ton domaine) :
```sh
neon neon-auth config email-provider update --project-id misty-field-54835523 --branch production --type standard --host smtp.resend.com --port 465 --username resend --password "$RESEND_KEY" --sender-email noreply@mail.monservice-pro.fr --sender-name MonService
```
Puis l'e-mail de test (remplace par ton adresse) :
```sh
neon neon-auth config email-provider test --project-id misty-field-54835523 --branch production --recipient-email ton.adresse@gmail.com
```
Enfin :
```sh
unset RESEND_KEY
```

**Résultat attendu :** tu reçois l'e-mail de test. Note la date, l'heure, et s'il est arrivé en boîte principale ou en spam : c'est la preuve demandée.
**Si la commande `update` échoue avec une erreur de domaine :** le domaine n'est pas encore *Verified* chez Resend ; attends et recommence.

---

## Étape 5 — Les informations légales (10 min)

**Pourquoi :** les mentions légales et le pied de chaque e-mail affichent aujourd'hui une société fictive (« MonService SAS »). Je corrige le code, mais il me faut tes vraies informations.

Envoie-moi dans un message, **uniquement** :
- le nom de l'entreprise tel qu'au répertoire SIRENE (micro-entreprise : « Soufiane El Rhadi EI », ou ton nom commercial) ;
- le numéro SIRET ;
- l'adresse professionnelle déclarée ;
- l'adresse e-mail de contact publique ;
- le statut TVA : « TVA non applicable, art. 293 B du CGI » ou ton numéro de TVA ;
- le domaine choisi à l'étape 4.

Aucune donnée bancaire. Avec ces informations, je rédige aussi les brouillons des conditions générales, de l'annexe de sous-traitance RGPD et de la liste des sous-traitants. Une relecture par un juriste reste conseillée.

---

## Étape 6 — Vérifier que Netlify sait construire le site (10 min)

**Pourquoi :** l'application n'a jamais été construite avec succès sur Netlify. Il faut le savoir avant le jour J.

1. **https://app.netlify.com** → connecte-toi → clique sur le projet **monservicecrm**.
2. Onglet **Deploys**.
3. Cherche une ligne **Deploy Preview #2** (la PR #2) et clique dessus.
4. Statut **Published** : envoie-moi « aperçu OK ».
5. Statut **Failed** : clique sur **Deploy log**, descends tout en bas, sélectionne les **40 dernières lignes**, copie-les et envoie-les-moi (retire tout ce qui ressemble à une clé).
6. Aucune ligne « Deploy Preview #2 » : envoie-moi une capture d'écran de la page **Deploys**.

---

# PARTIE B — le jour de la mise en ligne

**Uniquement après mon message « Partie B : feu vert ».**

## Étape 7 — Récupérer la version validée (3 min)
```sh
cd ~/Projets/monservice
```
```sh
git fetch
```
```sh
git checkout launch/v1-professional-only
```
```sh
git pull
```
```sh
npm ci
```

## Étape 8 — Mettre la base de production à jour (15 min)
Ces migrations ajoutent des tables et des fonctions ; elles ne suppriment rien.
```sh
NEON_ADMIN_ENV_FILE=.env.neon-production-admin.local NEON_PRODUCTION_REPLAY=validated npm run db:migrate
```
```sh
NEON_ADMIN_ENV_FILE=.env.neon-production-admin.local npm run db:check-drift
```
Puis les deux contrôles de schéma, en lecture seule :
```sh
set -a; . ./.env.neon-production-admin.local; set +a
```
```sh
DATABASE_URL="$DATABASE_URL_UNPOOLED" npm run db:check-contract
```
```sh
DATABASE_URL="$DATABASE_URL_UNPOOLED" npm run db:check-custom-objects
```
**Résultat attendu :** les trois contrôles affichent ✅. Sinon : stop, envoie-moi la sortie. Ferme ensuite cette fenêtre du Terminal (elle contient le mot de passe administrateur en mémoire) et ouvre-en une nouvelle.

## Étape 9 — Variables d'environnement (25 min)

### 9.1 — Compléter le fichier de production de ton Mac
Le contrôle final lit `.env.neon-production.local` : il faut y ajouter la clé Resend, l'expéditeur et le secret des tâches planifiées.
```sh
cd ~/Projets/monservice
```
```sh
read -s "RESEND_KEY?Colle la cle Resend puis Entree : "
```
Remplace `mail.monservice-pro.fr` par ton domaine :
```sh
printf '\nRESEND_API_KEY="%s"\nEMAIL_FROM="MonService <noreply@mail.monservice-pro.fr>"\nCRON_SECRET="%s"\nLAUNCH_INCLUDED_PLAN="pro"\nNEXT_PUBLIC_CLOSED_REGISTRATION_SECTORS="health"\n' "$RESEND_KEY" "$(openssl rand -hex 32)" >> .env.neon-production.local
```
```sh
unset RESEND_KEY
```

### 9.2 — Recopier les variables dans Netlify
1. Affiche les valeurs :
   ```sh
   cat .env.neon-production.local
   ```
2. **https://app.netlify.com** → projet **monservicecrm** → **Project configuration** → **Environment variables** → **Add a variable** → **Add a single variable**.
3. Pour **chaque ligne** du fichier affiché, sauf `NEON_BRANCH` et `NEON_BRANCH_ID` : *Key* = le nom avant `=`, *Value* = la valeur **sans les guillemets**, *Deploy contexts* = **Production** seulement → **Create variable**.
4. Vérifie que ces noms sont tous présents dans Netlify : `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_JWKS_URL`, `NEON_AUTH_COOKIE_SECRET`, `AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `NEON_STRIPE_DATABASE_URL`, `NEON_REMINDERS_DATABASE_URL`, `NEXT_PUBLIC_APP_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET`, `LAUNCH_INCLUDED_PLAN`, `NEXT_PUBLIC_CLOSED_REGISTRATION_SECTORS`.

**Ne crée jamais dans Netlify :** `CLIENT_ACCESS_ENABLED`, `DATABASE_POOL_MAX`, une variable `STRIPE_…`, ni rien qui vienne de `.env.neon-production-admin.local`.

### 9.3 — Région des fonctions (vitesse)
Netlify → projet **monservicecrm** → **Project configuration** → **Cloud compute** → **Functions** → **Region** → **Configure** → **EU (Frankfurt)** → **Save**. Si Netlify demande de changer d'offre, ne paie pas : dis-le-moi d'abord.

## Étape 10 — Contrôle final, ouverture, vérifications (30 min)
1. Contrôle avant bascule, en lecture seule :
   ```sh
   node scripts/neon/cutover-preflight.mjs
   ```
   Attendu : se termine sans erreur. Sinon : stop, envoie-moi la sortie.
2. Ouverture : **https://github.com/Soufianeerd/monservice/pull/2** → bouton vert **Merge pull request** → **Confirm merge**. Puis **https://github.com/Soufianeerd/monservice/pull/1** → **Close pull request**.
3. Netlify construit le site (5 à 10 min) : onglet **Deploys**, attends **Published** sur la ligne *Production*.
4. Vérifications sur **https://monservicecrm.netlify.app** :
   - [ ] l'accueil et les mentions légales s'affichent avec tes vraies informations ;
   - [ ] inscription d'un compte professionnel avec ton adresse : le code arrive ;
   - [ ] création d'un client, d'un devis, « Le client a accepté », facture ;
   - [ ] sur la facture : « Marquer comme réglée », puis « Demander un avis au client » vers une autre de tes adresses ; dépose l'avis depuis cette adresse ;
   - [ ] Paramètres → Vitrine publique : publie, ouvre la vitrine, l'avis y apparaît ;
   - [ ] Paramètres → Équipe : invite une deuxième adresse à toi, accepte, retire-la ;
   - [ ] avec un compte d'une autre entreprise : il ne voit pas les clients du premier.
5. Envoie-moi la liste cochée.

**Problème grave après l'ouverture :** Netlify → **Deploys** → clique sur le déploiement précédent → **Publish deploy**. La base n'a rien à défaire : les migrations n'ont rien supprimé.

---

## Décision qui t'appartient : le paramédical
Par défaut il reste **fermé** (`NEXT_PUBLIC_CLOSED_REGISTRATION_SECTORS=health`). L'ouvrir avec de vrais patients exige un hébergement certifié HDS sur toute la chaîne (base, fichiers, application, e-mails) : plusieurs semaines de travail, à planifier après le lancement. Ne retire pas `health` sans en avoir parlé avec moi.
