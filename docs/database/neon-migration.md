# MonService — rapport final Supabase → Neon

État au 12 octobre 2026 : **migration technique validée et backend Neon production
préparé avec les données autorisées**. Aucune bascule du site public, aucun push,
aucun merge `main`, aucune mutation ou suppression Supabase. Session 19 reste hors périmètre.

## Git

Dépôt canonique : `https://github.com/Soufianeerd/monservice.git`.
Branche locale : `migration/neon-full`, issue de `security/core-p0-hardening`
au commit `ddc2408e840fc974343b45d88725cfa627fd0a09`.
Baseline `origin/main` : `3b62b4759ff64e18d0354cd0d3be4e510d1c72cf`.
Les trois commits Gate 1 sont toujours des ancêtres, sans réécriture :
`50788be3ff3ccba3a0ba57a080af4fe01185b253`,
`7feaf3334da2ed8f6cfcf18f5ebabb348b8a255d`, `ddc2408e840fc974343b45d88725cfa627fd0a09`.

| Commit d'implémentation/replay | Changement |
|---|---|
| `c3e382f` | chore(neon): provision EU validation and version canonical migration baseline |
| `c69515c` | chore(deps): secure Next 16 and remove obsolete Supabase packages |
| `edecae7` | feat(neon): migrate verified auth, restricted RLS and private storage runtime |
| `5eaef68` | test(neon): port multi-workspace regression and verify auth, pooling and storage boundaries |
| `800d2e9` | chore(ci): replay Neon validation on disposable synthetic branches |
| `6b2adf3` | chore(migration): add read-only source reconciliation and guarded EU import tooling |
| `d8e242d` | fix(neon): isolate compliance records and verify imported account recovery |
| `0e64e99` | chore(ci): retain sanitized evidence after successful branch cleanup |
| `292a3b9` | chore(migration): guard imports with read-only source and identity reconciliation |
| `5aaac29` | chore(deployment): guard deterministic EU production replay with complete CI evidence |
| `5279c39` | chore(production): record verified Frankfurt replay, source import and cutover runbook |

Le commit final ajoute ce rapport et les derniers artefacts de préflight. Son SHA
exact figure dans le manifeste privé du paquet de déploiement et dans le résumé
final. Aucun commit de cette migration n'a été poussé.

## Source Supabase

Source exclusivement utilisée : `leydfjctaxohovcmcgea`, PostgreSQL 17.6,
18 574 483 octets au snapshot. Cinquante-sept tables `public`, cinq lignes dans
`users`, zéro ligne dans chacune des 56 autres tables métier. Seize comptes Auth,
onze identités de provider `email`, aucun OAuth observé, aucun facteur MFA.
Les seize adresses source étaient confirmées. Les cinq profils métier correspondent
à cinq comptes Auth source. Aucun mot de passe applicatif n'est présent.
Un bucket privé `clinical-documents`, zéro objet et zéro octet.

L'inventaire privé contient schémas, colonnes, contraintes, indexes, fonctions,
triggers, policies, rôles, extensions et ledger. Le catalogue source compte
219 indexes, 278 contraintes, 18 triggers publics non internes, 61 policies publiques
et 213 fonctions publiques, dont des fonctions d'extension. Voir
[le résumé de catalogue](artifacts/catalog-summary.json).

Le CLI Supabase connecté ne possède pas le bon projet ; la connexion DB sécurisée
identifie explicitement le project ref demandé et a permis toutes les lectures.
Aucun autre projet n'a servi de source. Toutes les transactions de vérification
source sont `REPEATABLE READ READ ONLY`.

## Cible Neon et décision de région

| Élément | Valeur |
|---|---|
| Projet canonique | `Monservice-Europe` / `misty-field-54835523` |
| Région | `aws-eu-central-1`, Frankfurt |
| DB | `neondb`, PostgreSQL 18 |
| Production | `br-little-surf-b1l5wgni` |
| Validation synthétique | `br-jolly-flower-b1ptunij` |
| Modèle CI vide | `br-icy-morning-b1317ev6` |
| CLI | Neon 8.0.7, config officielle générée puis planifiée/appliquée |

Le projet Ohio `snowy-heart-26768144` reste intact et inutilisé pour les données
réelles. Le choix européen a été réalisé avant import. Le dépôt est désormais
lié à production via `neon link --no-env-pull --no-config` ; `.env.local` reste
explicitement sur validation. MCP et cinq skills Neon ont été installés.
Les skills pertinents du Hub ont été réellement routés et consultés ; le dépôt
MonService a conservé l'autorité sur le produit.

La capacité observée suffit à cette source : limite logique de branche 1 GiB,
source environ 18,6 MB, seize comptes, Storage vide. Rétention observée de six heures.
Aucune troncature ni montée de plan payante. Les besoins de rétention longue et de
trafic soutenu nécessitent un budget adapté. Voir [le relevé](artifacts/capacity-report.json)
et [les plans officiels](https://neon.com/docs/introduction/plans).

## Migration PostgreSQL et différences

Quatorze migrations nouvelles, `drizzle/neon/0000` à `0013`, replayées intégralement
sur validation, CI puis production. Les migrations historiques Supabase restent
inchangées. Le checksum ledger refuse toute édition d'une migration appliquée.
Le schéma Drizzle et la DB réelle concordent sur **59/59 tables** : 57 tables
canoniques et deux tables de mapping/ré-enrôlement.

La baseline a été compilée depuis les migrations fermées canoniques 0000–0023
sur un PostgreSQL jetable. Les relations composites, contraintes CHECK/uniques,
exclusions de scheduling, indexes, allocator de numérotation, protections des
documents et historique métier ont été préservés. Le trigger Auth Supabase,
les rôles Supabase et les dépendances `storage.*` sont remplacés explicitement.
Drizzle et les Server Actions restent le chemin métier ; aucune Data API parallèle.

Différences source/repo inventoriées : `users.account_closed_at`, son trigger et
42 gardes de compte fermé sont repo-only ; une définition de
`enforce_invoice_invariants` diffère textuellement ; contraintes et indexes
canoniques n'ont aucune différence. Ledger source : 25 enregistrements contre
24 fichiers historiques, 21 checksums exacts concordants. Fichiers repo non
concordants 0018/0021/0023 et entrées source 19/20/22/24 sont documentés dans
[la réconciliation](artifacts/source-schema-reconciliation.json).
La baseline canonique a été retenue, avec zéro document financier source affecté.

Production observée : **223 indexes, 68 triggers publics non internes,
204 policies et 252 fonctions publiques**. Les fonctions d'extension sont incluses
dans ce dernier chiffre. Les gardes supplémentaires expliquent les triggers/policies
ajoutés. Les **722 contraintes** incluent 436 contraintes NOT NULL désormais
représentées dans le catalogue PostgreSQL 18, 131 FK, 88 CHECK, 58 PK, 6 uniques
et 3 exclusions. Aucune contrainte non validée. `btree_gist` 1.8 est présent ;
`plpgsql` et le UUID natif PostgreSQL suffisent aux autres besoins utilisés.
Les extensions Supabase non utilisées ne sont pas copiées aveuglément.

## Données et rapprochement

**57/57 tables : count source = count target**. `users` : 5 → 5 ; chaque autre
 table métier : 0 → 0. Chaque champ source des cinq lignes a été comparé exactement,
y compris ID, email, profil, ancien organization ID, abonnement, statut,
onboarding et timestamps. `account_closed_at` est ajouté avec valeur NULL.
Zéro donnée clinique, audit, financière ou séquence métier à transférer ; leurs
comptages restent zéro. Aucun total monétaire ni compteur n'a été fabriqué.

Les cinq profils source référencent des organisations absentes de la source.
Les anciens IDs sont conservés lors de l'import. Après vérification et choix
explicite, un professionnel importé peut créer uniquement son propre nouvel
espace privé. Aucun espace fantôme partagé ni droit professionnel n'est inventé
pour les deux clients. Le parcours client reste un compte client ; un rattachement
réel nécessite la procédure métier autorisée.

L'import est transactionnel pour les profils et bindings, contrôlé et reprenable
pour Auth. Il refuse une source avec nouvelles tables/lignes métier ou objets
Storage sans réévaluation du périmètre et du HDS. Voir
[les 57 comptes et hashes de sauvegarde](artifacts/production-import-report.json).
La source a été revérifiée après import : [preuve d'intégrité](artifacts/source-unchanged-report.json).

## Identité et comptes existants

`public.users.id` est l'identifiant métier stable. `user_identities` sépare provider
et application. État initial de production : **5 bindings source Supabase,
5 allowlists de ré-enrôlement, 0 binding Neon revendiqué**. Les seize comptes
Neon sont précréés par l'API de gestion officielle, sans mot de passe transféré,
sans session transférée et avec email non vérifié.

Le compte Neon doit vérifier son email auprès du provider ; seule cette preuve
réelle permet de revendiquer le binding autorisé. Aucun email/ID fourni par le
navigateur ne suffit. Les cinq mappings Neon seront créés lors du ré-enrôlement
réel, sans réécrire les relations métier. Les onze comptes source sans profil
applicatif suivent un onboarding sans récupération de privilèges inexistants.

Le test réservé reproduit une création par l'API de gestion, l'absence de mot de
passe, le refus du linking non vérifié, OTP réel, récupération de l'ancien ID/profil,
nouveau workspace propre, reset réel et connexion avec le nouveau mot de passe.
Aucune connexion aux comptes réels n'a été effectuée à leur place.

## Auth et boundary Next.js

Neon Managed Better Auth remplace l'intégration Auth Supabase. SDK Next officiel,
route `/api/auth/[...path]`, `src/proxy.ts`, cookies serveur signés et client SDK
sur `/api/auth`. Guides Next 16 installés consultés avant modification.
`requireSession`, `requireProfessional`, contextes paramédicaux et Field Service
restent les abstractions applicatives.

Signup, login positif/négatif, logout, sessions, OTP, callbacks sûrs, provisionnement,
reset avec vrai token, refus du replay et refus de l'ancien mot de passe sont
validés sur une cible synthétique. Le test OTP utilise une adresse réservée et
le hash de verification de ce seul fixture via le owner de test pour récupérer
le code ; il n'a pas simulé le flag `emailVerified`. **La réception dans une vraie
boîte email n'est pas certifiée.** Le runtime ne dispose pas de cette capacité owner.

Production exige la vérification email, utilise OTP et refuse localhost. Les origines
et callbacks publics exacts, SMTP MonService et preuve de livraison restent à
configurer avec le domaine/hébergeur. MFA n'est pas proposé par cette intégration ;
l'ancienne UI trompeuse a été retirée, aucun faux MFA conservé.

## RLS et connexions

Session Neon vérifiée → provider ID → mapping applicatif stocké → transaction DB
→ `SET LOCAL` → tenant/profil stockés → rôle restreint → policies RLS.
Aucun tenant/profil arbitraire n'est pris du navigateur. La session signée mise en
cache par le SDK est en outre confrontée à la session Managed Auth exacte et active
via une fonction SQL minimale : un logout réel invalide immédiatement les requêtes.

**59/59 tables publiques sous RLS.** Rôles `monservice_runtime`,
`monservice_stripe`, `monservice_reminders` : NOSUPERUSER, NOBYPASSRLS, NOINHERIT,
zéro table possédée, aucun héritage `neon_superuser`. Owner et connexion unpooled
restent dans un fichier admin privé. Les workers Stripe et rappels sont des
capacités serveur séparées, installées seulement après signature webhook ou secret
CRON vérifiés. Leur projection exclut les données cliniques inutiles.

Tests : 198 RLS, 263 contraintes/intégration et 14 boundaries supplémentaires.
Identités concurrentes/anon, pool réutilisé, rollback et savepoints ne partagent
pas les settings. Comptes fermés, tenant étranger et utilisateurs sans relation
sont refusés. Les quatre tables de conformité historiquement sans RLS ont été
protégées par 0013, avec lectures personnelles/professionnelles et écritures de
sujet contrôlées. Les tables de référence globales sont en lecture seule pour
les comptes actifs ; les autres capacités restent default-deny selon leurs grants.

## Storage

Deux buckets production privés : `clinical-documents`, `einvoices`.
Source : 0 objet / 0 octet ; cible : 0 objet / 0 octet. Aucune copie nécessaire,
aucune suppression source. Les tests S3 réels valident bytes, refus d'écrasement
et expiration ; les tests domaine couvrent acteur autorisé, même tenant sans
relation, tenant étranger et compte fermé.

Chaque URL est précédée de session, identité, tenant et autorisation de ressource.
Paths e-invoice : organization + document ID + composant aléatoire. Upload sans
upsert. Les documents cliniques exigent une ligne metadata autorisée et active.
TTL signé de 1 à 60 secondes. Une URL déjà émise reste valable jusqu'à expiration ;
fermer le compte empêche les nouvelles URLs, sans révoquer une ancienne URL S3.

## Suppression du runtime Supabase

`@supabase/supabase-js`, `@supabase/ssr`, anciens utilitaires et middleware supprimés.
Aucun import SDK Supabase applicatif ni variable Supabase dans le runtime local.
Le CSP ne permet plus les endpoints Supabase. La DB, Auth et Storage du produit
utilisent Neon ; Stripe et Resend restent externes.

Classification des occurrences restantes :

| Occurrence | Classification |
|---|---|
| Exports privés et scripts de lecture source/reconciliation | MIGRATION_ONLY |
| Migrations fermées, anciens rapports archivés | MIGRATION_ONLY / TEST_REFERENCE |
| Provider `supabase` dans bindings hérités | MIGRATION_ONLY, donnée de provenance |
| URLs fictives historiques dans mocks et assertions d'absence | TEST_REFERENCE |
| `@supabase/auth-js` transitif dans le lockfile du SDK Neon | STILL_REQUIRED_TEMPORARILY par le SDK officiel ; aucun appel au backend Supabase |
| Imports/config/env applicatifs Supabase | REMOVE, effectué |

## CI et validations

Une branche par run depuis **le modèle vide immuable**, jamais depuis production
après import. Création → config Auth/Storage → 14 migrations → rôles → seed managed
Auth + mapping + données synthétiques → contrôles DB → tests → build → Playwright
→ suppression et suppression des fichiers privés. Expiration à 24 h en fallback.

La clé CI est limitée au projet EU et installée dans `NEON_CI_API_KEY` sur GitHub ;
accès à l'ancien projet Ohio refusé. Les workflows utilisent Node 22, Neon 8.0.7,
un worker navigateur et une concurrence globale sérialisée. Le pipeline entier
identique au workflow a été exécuté localement avec cette clé, puis nettoyé.
**Les nouveaux workflows ne sont pas encore publiés ni exécutés sur GitHub** :
aucun push n'était autorisé. [Preuve CI et checksums](artifacts/ci-validation-report.json).

| Vérification complète, rejouée le 12 octobre | Résultat |
|---|---|
| Unitaires et conformité | 715/715, 84 fichiers |
| Contraintes / intégration / Gate 1 | 263/263, 12 fichiers |
| RLS | 198/198, 11 fichiers |
| Auth / pool / workers / Storage / conformité complémentaires | 14/14, 3 fichiers |
| Typecheck | PASS |
| Lint | 0 erreur, 379 avertissements existants |
| Build Next.js production | PASS |
| Playwright sur build production | 31/31 : 2 parcours Auth stricts + 23 historiques + 6 UX cabinet, 0 failed, 0 skipped |
| Branche CI et fichiers privés temporaires | Supprimés |

Le 11 octobre : replay production et contrôles essentiels **read-only** réussis ;
aucun test destructif ou seed sur production. [Preuve production](artifacts/production-validation-report.json).

Après demande de poursuite, deux parcours navigateur supplémentaires ont été
validés avec la vérification email **obligatoire**, sur une nouvelle branche CI
isolée et un build production. Inscription client : login refusé avant OTP,
code erroné refusé, ID conservé après confirmation/rechargement, redirection externe
refusée et accès protégé refusé après déconnexion. Professionnel importé : compte
sans mot de passe, reset via formulaire, login refusé avant confirmation, claim du
même ID/profil, création de son seul workspace absent, récupération idempotente
et réutilisation du lien reset refusée. [Preuve ciblée](artifacts/auth-recovery-validation-report.json).

Ces essais ont corrigé le traitement des exceptions du SDK Neon dans les formulaires
OTP/reset : un code ou token invalide est distingué d'une indisponibilité ; les
formulaires reset et demande de lien libèrent leur état de chargement après erreur.
Le SDK normalise `INVALID_TOKEN` en `bad_jwt`, ce qui est traité explicitement.
La récupération suit également la redirection réelle `/reset-password/:token`
du provider, vers le formulaire applicatif. Les codes/tokens ne proviennent pas d'une boîte réelle mais d'une fixture réservée,
accessible au seul propriétaire de la branche synthétique. Délivrabilité toujours
à prouver avant ouverture publique. La CI exécute ces deux parcours séparément,
puis rétablit sa politique synthétique pour les 23 parcours historiques et les six parcours UX du cabinet.

Le replay complet du 11 octobre validait le commit `96543ea`, depuis un arbre propre,
sur une nouvelle branche jetable supprimée après succès. L'échec de connexion
Auth d'une fixture sur le premier replay n'a pas été reproduit lors du contrôle
ciblé ni du replay final ; le diagnostic conserve désormais HTTP status/code,
sans corps de réponse. Aucun bypass, skip d'acceptance ou suppression d'assertion.

## Security Gate 1 et autres findings

| Identifiant | Invariant vérifié sur Neon | État |
|---|---|---|
| MS-N01 | Accept/reject/sign réservés au destinataire autorisé | PASS |
| MS-N02 | Lecture client limitée aux documents et projections autorisés | PASS |
| MS-N03 | Mutation arbitraire de statut client interdite | PASS |
| MS-N04 | Export organisation soumis à permission explicite | PASS |
| MS-N05 | Fermeture personnelle préserve assets et références d'organisation | PASS |
| MS-N06 | Profil, tenant et identités structurelles non mutables arbitrairement | PASS |

Les 101 scénarios Gate 1 sont inclus dans les 263 tests d'intégration. Findings de
migration également traités : RLS des tables de conformité, isolation des workers,
validation de session vivante, linking/provisionnement vérifié, paths Storage sans
collision et UI MFA retirée. Next a été mis à niveau de 16.2.11 à **16.4.0** dans
un commit distinct ; packages/lockfile ont été audités et le produit retesté.

Audit npm courant : **0 vulnérabilité runtime**, 28 dans la chaîne de développement
(23 moderate, 5 high, 0 critical). Les high proviennent de la chaîne glob/ESLint Next ;
les autres concernent notamment les outils de test/génération. Les suggestions
`audit fix --force` rétrogradant ESLint Next 14 ou Drizzle Kit ne sont pas appliquées.
[Préflight sécurité](artifacts/security-preflight-report.json).

L'identifiant DB source codé en dur dans `scripts/audit-prod.ts` a été supprimé du
code courant. L'historique Git est conservé conformément à la mission ; rotation
source à organiser après bascule et identification des consommateurs. Aucun secret
actuel détecté dans les fichiers suivis lors du préflight ; aucun dump/credential
n'est commité. Aucun compte réel fermé, supprimé ou utilisé pour les tests.

Un contrôle complémentaire en lecture seule a confirmé que **zéro des seize IDs
Auth de production** est présent dans la branche CI du replay du 11 octobre.
Une première requête de diagnostic a échoué avec `22P02` et affiché des IDs Auth
techniques dans son erreur, sans adresse email, mot de passe, token ni clé. Ces IDs
ne sont pas repris dans les artefacts versionnés. La comparaison corrigée se fait
localement en mémoire ; les erreurs ne sortent que leur type/code et les résultats
ne contiennent que les compteurs. Aucune mutation liée à ce diagnostic.

## Correction UX du cabinet du 12 octobre

La demande produit a précisé le français comme unique langue source et Stripe
comme moyen de règlement des seuls abonnements MonService. Les coordonnées du
cabinet, les lieux/praticiens, les factures patients et le forfait logiciel sont
maintenant distingués dans l’interface. Stripe Connect et le paiement Stripe
des honoraires patients sont retirés ; les anciens accès restent authentifiés
et ne créent plus de comptes ou de sessions de paiement. Le portail d’abonnement
utilise exclusivement le customer ID serveur du professionnel connecté.

Le champ de mot de passe du profil est remplacé par le parcours Neon de confirmation
par lien e-mail ; le nom est réellement enregistré et les erreurs ne sont plus
masquées. L’aide du cabinet suit les pages et met les contrôles en évidence.
Thème clair/sombre persisté, filtres patients clarifiés, prérequis d’agenda expliqués,
professions sans débordement et commandes d’horaires adaptatives. Aucun changement
SQL, aucun compte utilisateur réel modifié, aucun appel Stripe réel ou envoi manuel
d’e-mail de sécurité. [Rapport UX et limites](../product/ux-cabinet-2026-10-12.md).

Le dernier replay complet valide le code au commit `c130453cca49d071672fc5d75355cce171abab54`.
Deux problèmes de fixtures ont aussi été corrigés : attente bornée des HTTP 429,
et restauration de la classification des seules organisations synthétiques avant
le navigateur, après les tests DB qui les changent volontairement. Aucun contrôle
n’a été supprimé ou ignoré. Les validations précédentes ne constituaient pas une
validation de la clarté UX ; les nouveaux tests vérifient les parcours exposés.

## Régression produit et E2E

Generic/Core : Auth, onboarding, CRM clients/contacts/deals/products/tasks,
devis/factures, paiements et permissions privacy couverts par unités, intégration
et parcours navigateur. Paramédical : praticiens, patients/représentants,
agenda/exclusions, épisodes/notes/documents, portail, questionnaires, facturation
et messagerie validés avec des fixtures synthétiques. Field Service : site,
lead/devis, acompte, work order, assignments, rapport finalisé et facture finale.

Les **31 scénarios navigateur** préservent les 23 parcours précédemment portés
et ajoutent les deux parcours Auth avec vérification obligatoire et six parcours UX du cabinet. Desktop et mobile réels Chromium, login client/pro,
isolation tenant, marketplace/localisation, portail patient, praticien et workflow
Field complet. Le quote-to-cash signe un vrai webhook de test traité par la route
Stripe de production ; montant/idempotence et état DB sont vérifiés. Aucun paiement
réel ni appel réseau Stripe simulant un paiement réel n'est exécuté. Les premiers
runs échoués ont été diagnostiqués/corrigés ; seul le replay final complet vert
sert de preuve d'acceptance, sans skip de setup ni assertion supprimée.

## Sauvegarde et rollback

Assets privés hors Git : `~/.local/share/monservice-migration/2026-10-09/`,
dossier 0700, fichiers 0600. Dump public de 329 532 octets, inventaire complet,
export minimal Auth sans hash/password/session et cinq profils. Quatre SHA-256
figurent dans le rapport d'import. Supabase, ses comptes, données et bucket sont
intacts ; une fenêtre de rollback et le delta éventuel après ouverture des écritures
Neon doivent être gérés selon [le runbook](../deployment/PRODUCTION_DEPLOYMENT_RUNBOOK.md).

## Conformité et blocages restants

Aucune vraie donnée clinique/patient/document santé n'était présente dans la source ;
l'import autorisé contient uniquement profils et identités générales. Le workspace
paramédical fonctionne techniquement sur les données synthétiques. **HDS non démontré
pour la chaîne complète : NO-GO pour introduire de vraies données de santé.**
Aucun sous-ensemble clinique existant n'a été transféré ou retenu artificiellement.

Le chantier de **bascule publique** reste à finaliser : domaine MonService vérifié
et SMTP Auth à fournir/configurer puis réception email à prouver. Deux domaines Resend vérifiés
observés appartiennent à d'autres projets et n'ont pas été réutilisés. Les paramètres
Stripe/Resend/scheduler restent optionnels tant que leurs credentials ne sont pas
configurés ; aucun credential de ces services n'a été observé sur le site Netlify.

L'hébergeur a été retrouvé dans la session navigateur existante : **Netlify /
monservicecrm**, site ID `dc084088-bcde-4d4f-9be5-d5aa8959650a`, dépôt exact
`Soufianeerd/monservice`, URL `https://monservicecrm.netlify.app`. Aucun domaine
personnalisé ni déploiement publié. Dernier build `main@3b62b47` échoué faute de
`DATABASE_URL`, lors de la collecte des données de page. Seul `NODE_VERSION=22.x`
est installé, tous contextes. Builds actifs, branche production `main`, branch
deploys limités à production, previews activées pour les PR. Aucune modification
Netlify, aucun trigger lancé. [Inventaire hébergeur](artifacts/hosting-readiness-report.json).

L'URL observée a été inscrite uniquement dans le runtime privé préparé et ajoutée
à la allowlist Neon Auth de production, puis relue. Localhost reste désactivé.
Le paquet cible explicitement le site identifié, avec credentials production
réservés au contexte production. Les previews nécessitent une branche synthétique
et une origine exacte distinctes ; les credentials production ne doivent pas y
être partagés. Aucun déploiement public sans approbation finale.

Le [préflight automatisé de bascule](artifacts/cutover-preflight-report.json)
lit les configurations Neon réelles sans mutation et confirme les deux blocages
techniques encore présents : SMTP Auth personnalisé et expéditeur métier.
L'URL et l'origine Netlify sont désormais vérifiées. Il vérifie aussi les connexions runtime/workers de production,
les buckets privés, l'absence de credentials administrateur/source dans le runtime,
les cookies et la politique Auth. Un code de sortie 2 exprime le NO-GO ; aucun
contournement ni bascule automatique. La source et l'état importé de production
ont été recontrôlés en lecture seule le 11 octobre, sans changement.

Le paquet de sources et le runtime restreint sont préparés localement dans
`~/.local/share/monservice-migration/2026-10-09/deployment/`. Il contient archive de
HEAD, manifeste SHA-256 et `runtime.env` privé ; aucun owner, secret CI ou export
source. Aucun de ces fichiers privés n'est destiné au Git ou au rapport public.
La confirmation de bascule est la dernière étape, après identification de ces
paramètres et vérification d'un aperçu. Aucun push/merge/public deploy automatique.

## GO / NO-GO

| Périmètre | Verdict |
|---|---|
| Migration technique Neon : DB, Auth, Storage, RLS, Gate 1, seeds, CI, produit, build, E2E | **GO** |
| Backend Neon production préparé et import autorisé rapproché | **GO** |
| Runtime applicatif public Neon | **NO-GO tant que domaine d'envoi/SMTP, réception email, variables Netlify et approbation de bascule manquent** |
| Production paramédicale avec vraies données de santé | **NO-GO — BLOCKED_PENDING_HDS** |

Contrats officiels consultés : [CLI Neon](https://neon.com/docs/cli),
[Auth Next.js](https://neon.com/docs/auth/quick-start/nextjs-api-only),
[migration Auth Supabase](https://neon.com/docs/auth/migrate/from-supabase),
[configuration Neon](https://neon.com/docs/cli/config),
[checklist Auth production](https://neon.com/docs/auth/production-checklist).
