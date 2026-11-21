# 04 — Sécurité

Référentiels utilisés comme grille de lecture : OWASP Top 10, ASVS, API Security Top 10. **Nature du travail** : revue de code et de configuration, plus les contrôles automatiques rejoués. **Aucune attaque active** n'a été lancée (pas d'instance isolée disponible dans cette session). Aucune ligne ci-dessous ne vaut « absence de faille ».

## Contrôles rejoués le 17 novembre

| Contrôle | Résultat |
|---|---|
| `npm audit --omit=dev` | 0 vulnérabilité |
| `npm audit` (avec dépendances de développement) | 24 : 22 modérées, 2 élevées (`undici`, `vite`) — outillage, pas l'exécution |
| `tsc --noEmit` | 0 erreur |
| Tests unitaires, sécurité et conformité | 802/802 |
| Secrets suivis par git | Aucun fichier `.env*` suivi hors `.env.example` |

Preuve antérieure, non rejouée : run CI 42859109019 (10 novembre) — tests RLS, contraintes, frontières des rôles Neon, 42 parcours navigateur.

## Matrice des risques

Probabilité et impact : F faible, M moyen, É élevé.

| ID | Risque | Cause et preuve | Prob. | Impact | Statut | Remédiation et test |
|---|---|---|---|---|---|---|
| LR-001 | Accès client/patient ouvert alors que la V1 l'interdit | Inscription `client` acceptée (`actions/auth.ts`), profil par défaut `client` en base (`0009`), 21 pages `/client/*`, politiques RLS accordant des lectures au profil `client`, page `/invitation/portail` publique (`proxy.ts:20`) | É | É | **Ouvert, P0** | Voir « Fermeture des accès client » ci-dessous |
| LR-013 | Pas de double authentification | `mfa.service.ts` lève toujours une erreur ; routes `/api/auth/mfa*` mortes | M | É (santé), M (autres) | Ouvert, P1 santé / P2 | Activer le second facteur de Neon Auth quand il est pris en charge, ou retirer les routes mortes ; test de connexion à deux facteurs |
| LR-014 | Pas de limitation de débit applicative | `src/middleware/rate-limit.ts` n'est importé nulle part ; la protection repose sur le fournisseur d'authentification, non vérifiée ici | M | M | Ouvert, P1 | Vérifier et documenter les limites de Neon Auth ; limiter `registerAction`, mot de passe oublié et renvoi de code ; test de rafale |
| LR-015 | CSP permissive pour les scripts | `next.config.ts` : `'unsafe-inline' 'unsafe-eval'` | F | M | Connu, P2 | CSP à nonces ; aucun `dangerouslySetInnerHTML` trouvé dans `src/`, ce qui limite l'exposition |
| LR-016 | Pages authentifiées sans `no-store` ni `noindex` | Le motif d'en-têtes couvre `dashboard, client, clients, deals, facturation, agenda, parametres, messages, patients, api` mais pas `operations`, `marketplace`, `templates`, `activity`, `search`, `settings`, `admin`, `devis`, `invitation` | M | M | Ouvert, P2 | Étendre le motif ; test d'en-têtes par route |
| LR-017 | Route de simulation de paiement embarquée en production | `/api/stripe/webhook/simulate`, non authentifiée, bloquée par `NODE_ENV === 'production'` seulement | F | É | Ouvert, P2 | Exclure la route du build de production ou exiger un secret ; test : 404 en production |
| LR-021 | Authentification sur SDK bêta | `@neondatabase/auth ^0.7.0-beta` | M | É | Accepté à documenter | Version figée, veille, test de non-régression d'authentification à chaque montée |
| LR-024 | Fermeture du secteur santé appliquée dans l'application seulement | `isSectorOpenForRegistration` ; la fonction SQL `recover_current_workspace` accepte `health` | F | M | Ouvert, P2 | Dupliquer le contrôle en base si le secteur doit rester fermé durablement |
| LR-025 | Comptes déjà importés en production de type inconnu | Rapport d'import : 57 comptes ; répartition clients / professionnels / santé non relue | M | M | À vérifier | Compter par `profile_type` et secteur, en lecture seule, avant bascule |
| LR-028 | Promesse de sécurité non démontrable | FAQ : « mêmes standards de sécurité que les applications bancaires » | É | M (juridique, image) | Ouvert, P1 | Remplacer par des faits vérifiables (hébergement UE, chiffrement en transit, cloisonnement par organisation) |
| LR-020 | Dépendances de développement vulnérables | `undici` 8.0–8.12.1, `vite` 8.2.0–8.2.2 | F | F | P3 | Mettre à jour |

## Points examinés sans constat bloquant

| Thème | Observation |
|---|---|
| IDOR / accès inter-organisations | Double barrière : services filtrés par organisation issue de la session, puis RLS en base sous un rôle sans contournement. Dernière preuve d'exécution : 10 novembre |
| Usurpation par champs du navigateur | L'identité vient de la session vérifiée ; `provision_app_user` refuse un identifiant différent du contexte vérifié (`0009`) |
| Injection SQL | Requêtes paramétrées (Drizzle, gabarits `postgres`) ; les appels `unsafe` relus utilisent des paramètres positionnels |
| CSRF | Server Actions (contrôle d'origine du framework) ; `form-action 'self'`, `frame-ancestors 'none'` |
| Webhook Stripe | Signature vérifiée, idempotence par identifiant d'événement, rôle SQL dédié |
| CRON | Secret comparé en temps constant |
| Fichiers | Stockage privé, URL signées de courte durée |
| Énumération de comptes | Message générique sur mot de passe oublié et sur échec de connexion |
| Chaîne CI | Permissions `contents: read`, clé Neon limitée au projet ; actions GitHub en Node 20 déprécié |

## Fermeture des accès client (LR-001) — proposition

Principe : couper à trois niveaux, sans supprimer le code de la version N.

1. **Base** — migration additive `0020_v1_professional_only.sql` :
   - fonction `public.client_access_enabled()` renvoyant `false` (remplaçable en version N) ;
   - `provision_app_user_internal` refuse le profil `client` tant que la fonction renvoie `false` ;
   - `accept_client_portal_invitation` refuse de même ;
   - politique restrictive sur les tables lisibles par un profil `client` : `current_profile_type() = 'professional' OR client_access_enabled()`.
2. **Serveur** — `registerAction` et `completeProfileAction` refusent `client` ; `requireProfileType('client')` et les actions des portails renvoient 403 ; `/invitation/portail` retiré des chemins publics ; `src/app/client/layout.tsx` redirige vers une page d'information.
3. **Interface** — retirer le choix « particulier », le panneau d'invitation au portail sur la fiche client, les liens marketplace et messagerie.

Dépendance obligatoire : LR-002 (acceptation du devis par le professionnel), sinon la chaîne devis-facture s'arrête.

Tests de non-régression : inscription `client` refusée par l'action et par la fonction SQL ; lecture RLS refusée pour un compte `client` existant ; 403 ou redirection sur chaque route `/client/*` ; les specs des portails passent sous un indicateur « version N » pour rester exécutables.

## Données de santé

Le cloisonnement technique (RLS par organisation et par praticien, journal d'audit, stockage privé) existe et a été testé sur données synthétiques. Il ne suffit pas : l'hébergement certifié n'est pas démontré (voir `09_COMPLIANCE.md`). Aucune donnée de santé réelle ne doit entrer dans le système.
