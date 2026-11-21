# État de reprise — MonService (mis à jour le 22/11/2026, 2 h)

Dépôt `Soufianeerd/monservice`, branche `launch/v1-professional-only` (PR #2 non fusionnée).
Site de test : https://monservicecrm.netlify.app — base Neon de test `demo` (br-billowing-salad-b1fafmn2), séparée de la production.
Production Neon (br-little-surf-b1l5wgni) : migrations 0000–0013 seulement, aucun compte ; **0014–0025 à rejouer le jour J (Partie B du guide)**. Attention : `scripts/neon/check-production.mjs` attend 59 tables publiques — à recompter après rejeu (0024 et 0025 n'ajoutent aucune table publique : compteur et secrets 2FA sont dans le schéma `app_private`). Variable à créer en production avant 0025 : `TWO_FACTOR_ENCRYPTION_KEY` (`openssl rand -hex 32`, ne jamais la changer). Aucune migration n'a été lancée en production.

## Mise en ligne du site de test
Workflow `.github/workflows/demo.yml` (push sur `src/**`, `drizzle/neon/**` ou lancement manuel) : migre la branche `demo`, envoie les variables à Netlify (secret `NETLIFY_AUTH_TOKEN`), construit et publie. Inscription sans code e-mail sur la démo. E-mails (Resend) non branchés.

## Fait (plan du 21/11)
- Inscription : règles mot de passe une fois, 12 caractères (CNIL) vérifiés côté serveur partout (relais `/api/auth` : inscription directe refusée, reset/change contrôlés), pas d'étape profil en V1, ville + téléphone, CGU nouvel onglet, entrée directe.
- Sécurité : IP Netlify non falsifiable pour la limite de tentatives ; Neon Auth créé à la première requête (build Netlify) ; stockage via `NEON_STORAGE_*` (Lambda réserve `AWS_*`).
- Honnêteté : offre de lancement au lieu des forfaits 29/79/199 €, faux témoignage retiré.
- Univers général : métier obligatoire parmi 6 familles (`src/lib/workspaces/generic/professions.ts`, migration additive **0023**), libellé d'espace et unité de travail (dossier, projet, mission, prestation, intervention).
- Bien-être : fiche client simple (sans état civil ni sexe), taille/poids facultatifs, IMC (OMS) affiché à la saisie et sur la fiche ; formulaire patient paramédical inchangé.
- Ergonomie : fiche client Particulier/Entreprise, menus à sous-menu qui ouvrent leur page, vocabulaire neutre (devis, réalisations, « Nouvelle opportunité », accord « Nouveau chantier / Nouvelle intervention »), police Geist.
- Fluidité (suite) : listes Factures et Clients chargées côté serveur, préparation de l'agenda en une lecture sans verrou.
- Ergonomie (suite) : rendez-vous dans l'agenda généraliste/artisan (bouton + clic sur un jour, glisser limité aux rendez-vous/tâches, clic = ouvrir la fiche), avertissement avant de quitter un devis/une facture non enregistré, suppression limitée aux brouillons, plus d'alert() dans l'espace pro, gris 400 lisible (4,8:1).
- Sécurité (suite) : journal d'audit alimenté (exports, fermeture de compte, suppressions, statuts et envois de documents) ; limite de tentatives partagée en base (migration **0024**, `app_private`, fonction `auth_rate_limit_hit`) avec blocage temporaire du compte (10 essais/15 min).
- Légal : vraie politique de confidentialité, `/sous-traitants`, `/contrat-de-sous-traitance` (art. 28) — relecture juriste conseillée.
- Performance : squelettes `loading.tsx`, factures sans N+1, organisation lue une fois par requête, connexion gardée, cookie session 300 s, PDF chargé au clic, requêtes fusionnées (C5), lot de lecture `withReadScope` (C6 partiel : opérations, tâches du cabinet, amorçage agenda).

## Fait le 22/11 (nuit)
- Ergonomie : 18 `window.confirm()` → fenêtre intégrée (`askConfirm`, `components/ui/ConfirmDialog.tsx`) ; 23 modales au clavier (`ModalOverlay`, `hooks/useDialogKeyboard.ts` : focus piégé, Échap, retour du focus) ; 136 étiquettes reliées ; pages mot de passe oublié / nouveau mot de passe / vérification e-mail avec la mise en page de connexion ; **un seul formulaire de devis** (création + modification via `?id=`, bouton « Modifier » sur brouillon, l'éditeur générique ne touche plus aux devis hors paramédical — corrige une perte des lots/unités à l'enregistrement).
- Fluidité : C11 (profil + organisation transmis par le layout, plus de 3 actions au démarrage ; appel de notifications vide retiré) ; C10 devis, tâches, pipeline chargés côté serveur. C4 : variante cache par requête déjà en place.
- Sécurité : CSP à nonce par requête dans `src/proxy.ts` (`lib/security/csp.ts`), plus de 'unsafe-inline'/'unsafe-eval' pour les scripts (vérifié sur build de production : hydratation et navigation OK, 0 violation) ; **double authentification TOTP** (migration additive **0025**, secrets chiffrés dans `app_private`, preuve liée à la session Neon Auth, codes de secours, journal d'audit, page Paramètres › Sécurité, page `/verification-2fa`) — fonctions SQL testées sur PostgreSQL 16 local (refus anonyme, isolation entre comptes, pas de rejeu).
- Légal : CGU réécrites (`/conditions`) — relecture juriste avant lancement.

## Reste à faire (ordre conseillé)
1. Vérifier CI complète + recette sur da1cd6f (E2E nouveau : `e2e/two-factor.spec.ts`, compte seedé `pro_two_factor@monservice.invalid`).
2. Performance : C3 (transaction à 3 allers-retours, sensible : seulement avec test:rls vert). Décision Soufiane en attente : Netlify Pro 20 $/mois région Francfort.
3. Sécurité : notes chiffrées côté application ; faire relire CGU, confidentialité, sous-traitance par un juriste.
4. Se démarquer (`veille-ux.md`) : identité visuelle par univers, barre mobile artisans + PWA, accueil « Aujourd'hui », devis voix/photo, facture électronique.

## Tests (22/11, 2 h)
- CI Neon complète **verte sur 4aa07f5** (correctif du nettoyage audit_logs confirmé). Run sur 9e5b1dc en cours, puis da1cd6f.
- Démo : déploiements OK jusqu'à 1280524 (CSP comprise).
- Locaux sur da1cd6f : `tsc` OK, ESLint 0 erreur, Vitest 115 fichiers / 936 tests OK, build de production OK, chaîne de migrations 0000→0025 rejouée sur PostgreSQL 16.

## Tests (historique)
- Locaux (21/11 soir, commit 3997f9f) : `tsc` OK, ESLint sans erreur sur les fichiers modifiés, Vitest unitaires 104 fichiers OK.
- CI Neon : dernier vert connu f5ea7b4 (19/11). Le run sur 9593c7c a échoué sur `e2e/cabinet-ux.spec.ts` (étape profil retirée, corrigé en 3997f9f) ; run relancé.
- Recette visuelle : run lancé sur 0cc9b05.
- Démo Netlify : déploiement OK sur 0cc9b05 (migration 0023 appliquée à la branche demo).
