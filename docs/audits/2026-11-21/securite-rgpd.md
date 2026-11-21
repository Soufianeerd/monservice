# MonService — Audit sécurité & protection des données (RGPD, santé, authentification)

**Date :** 21 novembre 2026
**Périmètre :** dépôt `/home/claude/monservice` (lecture seule) + veille réglementaire 2025-2026.
**Méthode :** lecture du code (aucune exécution contre une base distante, aucune modification du dépôt). Un point est noté « implémenté » seulement si le code le montre. Ce qui dépend d'une configuration hors dépôt (console Neon Auth, variables Netlify, contrats) est noté « non vérifiable dans le code ».

> Ce document est un audit technique. Il ne remplace pas un avis juridique. Les points HDS, transferts hors UE et qualification des données « bien-être » doivent être validés par un juriste ou un DPO.

---

## 1. Référentiel d'exigences (avec sources)

### 1.1 Authentification et mots de passe

| # | Exigence | Source |
|---|---|---|
| A1 | **CNIL, délibération 2022-100 du 21 juillet 2022.** Cas « mot de passe seul » : entropie ≥ 80 bits, soit **12 caractères minimum avec majuscules, minuscules, chiffres et caractères spéciaux** (liste d'au moins 37 spéciaux), **ou 14 caractères minimum avec majuscules, minuscules et chiffres sans spécial obligatoire**, ou **phrase de passe d'au moins 7 mots**. Cas « avec restriction d'accès » : entropie ≥ 50 bits plus un mécanisme de restriction (temporisation, nombre maximal d'essais dans un délai, captcha, **blocage après 10 échecs** avec mécanisme de déblocage). Stockage par fonction non réversible et salée (**scrypt ou Argon2**). Plus de renouvellement imposé, sauf pour les comptes à privilèges. | [CNIL, recommandations mots de passe](https://cnil.fr/fr/mots-de-passe-recommandations-pour-maitriser-sa-securite) · [Délibération 2022-100 (PDF)](https://Cnil.fr/sites/cnil/files/atoms/files/deliberation-2022-100-du-21-juillet-2022_recommandation-aux-mots-de-passe.pdf) |
| A2 | **CNIL, recommandation sur l'authentification multifacteur (version adoptée le 20 mars 2025).** La MFA est recommandée pour les traitements de **données sensibles (art. 9 RGPD), par exemple les données de santé**, pour les opérations à risque et pour l'administration. Facteurs à privilégier : connaissance + possession (TOTP, jeton). L'OTP par SMS reste supérieur au mot de passe seul mais est « déconseillé par les autorités compétentes ». | [CNIL, recommandation MFA (PDF)](https://cnil.fr/sites/cnil/files/2025-05/recommandation_relative_a_l_authentification_multifacteur.pdf) |
| A3 | **ANSSI, « Recommandations relatives à l'authentification multifacteur et aux mots de passe » (publié le 7 octobre 2021, toujours en vigueur).** R1 privilégier la MFA ; R8 ne pas utiliser le SMS ; R9 conserver l'historique des authentifications ; R10 limiter dans le temps le nombre de tentatives ; R12 limiter la durée de session ; R14 ne pas renseigner la cause de l'échec ; R21 longueur minimale ; R22 pas de longueur maximale contraignante ; R24 pas d'expiration par défaut ; R26 révoquer en cas de compromission ; R27 contrôler la robustesse à la création ; R28-R29 sel long et fonction de dérivation *memory-hard* ; R31 permettre le coffre-fort de mots de passe. | [ANSSI, page du guide](https://messervices.cyber.gouv.fr/guides/recommandations-relatives-lauthentification-multifacteur-et-aux-mots-de-passe) · [PDF](https://messervices.cyber.gouv.fr/documents-guides/anssi-guide-authentification_multifacteur_et_mots_de_passe.pdf) |
| A4 | **NIST SP 800-63B-4 (finale).** Mot de passe seul facteur : **15 caractères minimum** ; mot de passe intégré à une MFA : 8 minimum ; longueur maximale acceptée ≥ 64 ; **pas de règles de composition** ; **comparaison à une liste de mots de passe courants ou compromis** ; pas de changement périodique, mais changement forcé en cas de compromission ; autoriser gestionnaires de mots de passe, autoremplissage et collage ; proposer l'affichage du mot de passe ; **au plus 100 échecs consécutifs** par authentifiant. | [NIST SP 800-63B-4, Authenticators](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/) |
| A5 | **OWASP ASVS 5.0.0, V6.2.** 6.2.1 : au moins 8 caractères, **15 fortement recommandés**. Le chapitre V6 couvre aussi la vérification contre les mots de passe compromis, l'absence de règles de composition, l'anti-automatisation et la MFA ; V7 couvre les sessions ; V8 le contrôle d'accès. | [ASVS 5.0 V6 (GitHub)](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x15-V6-Authentication.md) · [ASVS 5.0.0 (PDF)](https://raw.githubusercontent.com/OWASP/ASVS/v5.0.0/5.0/OWASP_Application_Security_Verification_Standard_5.0.0_en.pdf) |
| A6 | **Contrôle des mots de passe compromis (HIBP Pwned Passwords).** API `https://api.pwnedpasswords.com/range/{5 premiers caractères du SHA-1}` (k-anonymat : le mot de passe ne quitte jamais le serveur, seul un préfixe de 5 caractères hexadécimaux est envoyé). Pas de clé API, pas de limite de débit, en-tête `Add-Padding: true` pour masquer la taille des réponses. | [HIBP API v3](https://haveibeenpwned.com/API/v3) |

**Note de cohérence.** NIST et ASVS déconseillent les règles de composition ; la CNIL en fait l'une de ses options (12 caractères + 4 types). Pour un produit français, c'est la CNIL qui sert de référence de conformité. La politique du §3 respecte la CNIL tout en se rapprochant de NIST : elle accepte plusieurs formes de mots de passe conformes, ajoute la liste noire et la MFA.

### 1.2 RGPD pour un SaaS sous-traitant

MonService est **responsable de traitement** pour les comptes de ses clients professionnels (inscription, facturation de l'abonnement). Il est **sous-traitant (art. 28)** pour les données que ces professionnels saisissent sur leurs propres clients et patients.

| # | Exigence | Source |
|---|---|---|
| G1 | Art. 28 : contrat de sous-traitance (DPA) avec chaque client. Il fixe l'objet, la durée, la nature, les finalités, les catégories de données et de personnes, l'instruction documentée, la confidentialité, la sécurité, l'autorisation et la liste des sous-traitants ultérieurs, l'assistance pour les droits et les violations, ainsi que la suppression ou la restitution en fin de contrat. | [RGPD, EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/oj) |
| G2 | Art. 30.2 : registre des activités de traitement effectuées pour le compte des clients (en plus du registre art. 30.1 en tant que responsable de traitement). | idem |
| G3 | Art. 32 : sécurité adaptée au risque (pseudonymisation et chiffrement, confidentialité et intégrité, résilience, restauration, tests réguliers). | idem |
| G4 | Art. 33 : le responsable de traitement notifie la CNIL **sous 72 h** ; le sous-traitant notifie son client **dans les meilleurs délais** après avoir pris connaissance d'une violation. Art. 34 : information des personnes en cas de risque élevé. | idem |
| G5 | Art. 12 à 22 : droits des personnes (information art. 13/14, accès, rectification, effacement, limitation, portabilité, opposition). Art. 17.3.b : la conservation imposée par une obligation légale (factures, par exemple) limite le droit à l'effacement. | idem |
| G6 | Art. 9 : données de santé = catégorie particulière. Art. 35 : une **analyse d'impact (AIPD)** est requise pour un traitement à grande échelle de données de santé. | idem |
| G7 | Chapitre V (art. 44 à 49) : transferts hors UE. Netlify exécute les fonctions serveur **aux États-Unis** (région par défaut us-east-2 ; la région se choisit par fonction, selon le plan). Le code serveur traite donc en clair, aux États-Unis, toutes les données lues dans Neon (Francfort), y compris les données cliniques, et cela constitue un transfert. Base légale possible : la décision d'adéquation **EU-US Data Privacy Framework (2023/1795)**. Le Tribunal de l'UE l'a validée le 3 septembre 2025 (affaire Latombe, T-553/23) ; le **pourvoi C-703/25 P** devant la CJUE, formé le 31 octobre 2025, est **toujours pendant**, sans date d'audience annoncée à mi-2026 (Microsoft admis comme intervenant le 4 juin 2026). Le DPF reste donc valable en novembre 2026, avec une incertitude juridique. **Netlify, Inc.** est certifié DPF (statut actif). **Resend** est actif, avec une re-certification en cours d'examen. **Stripe, LLC** est actif. | [WilmerHale, 1er déc. 2025](https://www.wilmerhale.com/en/insights/blogs/wilmerhale-privacy-and-cybersecurity-law/20251201-european-court-of-justice-to-review-challenge-to-eu-us-data-privacy-framework) · [DataGuidance, 17 juin 2026](https://www.dataguidance.com/news/eu-cjeu-admits-microsoft-intervener-appeal-concerning) · [Liste DPF : Netlify](https://www.dataprivacyframework.gov/participant/6208) · [Resend](https://www.dataprivacyframework.gov/participant/8907) · [Stripe](https://www.dataprivacyframework.gov/participant/10014) · [Netlify, région des fonctions](https://docs.netlify.com/build/functions/configuration/) · [DPA Netlify](https://www.netlify.com/pdf/netlify-dpa.pdf) |

### 1.3 Données de santé : HDS (CSP, art. L.1111-8)

| # | Exigence | Source |
|---|---|---|
| H1 | La certification HDS est obligatoire pour **toute entité qui héberge des données de santé recueillies lors d'activités de prévention, de diagnostic, de soins ou de suivi social et médico-social, pour le compte du patient ou des professionnels et organismes à l'origine de ces données**. Les deux conditions sont cumulatives. Chaque professionnel doit apprécier au cas par cas si les données proviennent d'une telle activité, et « tout projet de SI » doit se poser la question pour chacune de ses fonctionnalités. (FAQ ANS mise à jour le 22 septembre 2026.) | [ANS, champ d'application HDS](https://esante.gouv.fr/faq/quel-est-le-champ-dapplication-de-la-legislation-relative-lhebergement-de-donnees-de-sante-caractere-personnel) · [ANS, certification HDS](https://esante.gouv.fr/produits-services/hds) |
| H2 | Référentiel HDS v2 : obligatoire pour toute nouvelle certification depuis le 16 novembre 2024, mise en conformité des hébergeurs déjà certifiés au plus tard en mai 2026. Il impose une **localisation des données dans l'EEE** et un encadrement des accès depuis un pays tiers (la v2.1 considère l'accès à distance depuis un pays tiers comme un transfert). | [LSTI](https://www.lsti-certification.fr/fr-FR/Actualites/Certification-HDS) · [Squire Patton Boggs](https://larevue.squirepattonboggs.com/certification-des-hebergeurs-de-donnees-de-sante-hds-date-limite-pour-la-mise-en-conformite-selon-le-nouveau-referentiel.html) · [BYCYB, HDS v2.1](https://bycyb.com/blog/news/hds-v2-1-ce-qui-change-pour-les-hebergeurs-de-donnees-de-sante/) |

**Application aux professions présentes dans le code** (`src/lib/workspaces/paramedical/professions.ts`, migration `0021`) :

| Profession | Analyse (à faire valider par un juriste) |
|---|---|
| Masseur-kinésithérapeute, orthophoniste, pédicure-podologue, ergothérapeute, psychomotricien, diététicien | Professions de santé réglementées (CSP, 4e partie). Les notes et bilans relèvent des soins : **HDS requis**. |
| Psychologue | Ce n'est pas une profession de santé au sens du CSP, mais les notes de suivi sont des données de santé (art. 4.15 et art. 9 RGPD) recueillies dans une activité de prévention ou de soins psychologiques. Lecture prudente : **HDS requis**. |
| Ostéopathe | Usage du titre encadré ; l'activité relève des soins. Lecture prudente : **HDS requis**. |
| Coach sportif et bien-être, nutritionniste (non diététicien), massage bien-être | Il ne s'agit pas d'activités de soins au sens du CSP : HDS a priori **non obligatoire**. Mais toute information révélant l'état de santé (pathologie, traitement, grossesse, troubles alimentaires…) reste une **donnée de santé au sens de l'art. 9 RGPD** : base légale (consentement explicite), AIPD, sécurité renforcée, MFA recommandée par la CNIL. Le produit ne doit pas laisser ces praticiens saisir des diagnostics sans cadre. |

### 1.4 Autres cadres

| # | Exigence | Statut en novembre 2026 | Source |
|---|---|---|---|
| N1 | **NIS2.** En France, la transposition passe par le projet de loi « Résilience ». Débat en séance à l'Assemblée à partir du 9 novembre 2026, vote final prévu le 17 novembre 2026, puis commission mixte paritaire, promulgation et décrets. Le seuil d'application commence aux entreprises moyennes (≥ 50 salariés ou > 10 M€ de CA) dans les secteurs visés (fournisseurs de cloud et services gérés inclus). Une micro-entreprise n'est en principe **pas concernée directement**, mais elle le devient indirectement via ses clients soumis (clauses de sécurité de la chaîne d'approvisionnement). | Loi non promulguée (dernière information datée du 15 novembre 2026) | [NIS2Have, suivi FR](https://nis2have.eu/news/frankreich-loi-resilience-nis2-2026) · [Themio, PME](https://www.themio.ai/en/blog/nis2-compliance-sme-2026) |
| C1 | **Cyber Resilience Act.** Obligations de signalement (vulnérabilités activement exploitées, incidents graves) applicables depuis le **11 septembre 2026** ; exigences essentielles et marquage CE au **11 décembre 2027**. Un SaaS pur est en principe hors champ (sauf composant de traitement à distance d'un produit). Ce serait différent si MonService distribuait une application installable (mobile ou bureau). | En vigueur (signalement) | [Commission européenne, CRA](https://digital-strategy.ec.europa.eu/fr/policies/cyber-resilience-act) |
| F1 | **Facturation électronique.** Réception obligatoire pour toutes les entreprises depuis le **1er septembre 2026** ; émission et e-reporting pour les PME et micro-entreprises au **1er septembre 2027**, via une plateforme agréée. Pour MonService, cela signifie : intégrité des factures émises (pas de modification après émission), connexion à une plateforme agréée ou rôle de « solution compatible », nouvelles mentions obligatoires. | En vigueur / 2027 | [Service-public, actualité](https://entreprendre.service-public.gouv.fr/actualites/A15683) · [economie.gouv.fr](https://www.economie.gouv.fr/tout-savoir-sur-la-facturation-electronique-pour-les-entreprises) · [Guide DGFiP (PDF)](https://www.impots.gouv.fr/sites/default/files/media/1_metier/2_professionnel/EV/2_gestion/290_facturation_electronique/guide_pratique_facturation_electronique.pdf) |
| F2 | **Conservation des factures** : 6 ans (LPF art. L.102 B), 10 ans pour les pièces comptables (C. com. art. L.123-22). C'est une limite à l'effacement RGPD (art. 17.3.b) : la fermeture d'un compte ne doit jamais supprimer les factures. | En vigueur | [RHC, rappel des textes](https://www.rhcingenierie.com/guides/reception-factures-septembre-2026-micro-entreprise/) |

---

## 2. Écarts constatés dans le code (classés P0 → P2)

Légende effort : **S** ≤ 1 j · **M** 2-5 j · **L** > 1 semaine.

### P0 — à traiter avant toute ouverture commerciale élargie

| # | Exigence | État actuel (preuves) | Risque | Correctif | Effort |
|---|---|---|---|---|---|
| P0-1 | Politique de mot de passe appliquée **côté serveur sur tous les chemins** (A1, A4, A5) | La règle « 12 caractères + 4 types » (`passwordSchema`, `src/lib/validation/schemas.ts:194-210`) est vérifiée seulement dans `registerAction` (`src/app/actions/auth.ts:19`) et `registerInvitedMemberAction` (`src/app/actions/team.actions.ts:117`). Or **le gestionnaire Neon Auth est exposé en entier** : `src/app/api/auth/[...path]/route.ts` relaie GET, POST, PUT, DELETE et PATCH, et `/api/` est public dans `src/proxy.ts:31`. Un `POST /api/auth/sign-up/email` direct (ou un appel direct à `NEON_AUTH_BASE_URL/sign-up/email`, comme le fait `scripts/e2e/seed-local.ts:162`) crée un compte avec la seule règle de Neon Auth (Better Auth : 8 caractères par défaut, valeur réelle non vérifiable dans le code). Ce compte peut ensuite se provisionner via `/complete-profile` après vérification de l'e-mail. **Réinitialisation** (`src/app/(auth)/reset-password/page.tsx:22`) : seule la longueur ≥ 12 est contrôlée, **côté navigateur uniquement**, puis `authClient.resetPassword` est appelé directement. | Comptes à mot de passe faible, non-conformité CNIL démontrable, sur un produit qui vise des données de santé | 1) Dans la console Neon Auth, régler la longueur minimale à 12 et la maximale à 128 (si le réglage existe ; sinon le documenter). 2) Dans le relais `[...path]`, refuser (404) `POST sign-up/*` et `reset-password` venant du navigateur. Faire passer inscription et réinitialisation par des Server Actions qui appliquent `passwordSchema` et la liste noire, puis appellent `auth.*` côté serveur. 3) Tests de sécurité : un appel direct au relais avec un mot de passe faible doit renvoyer 4xx. | M |
| P0-2 | Limitation des tentatives et blocage (A1 « blocage après 10 échecs », A3 R10, A4 ≤ 100) | `src/middleware/rate-limit.ts` : un `Map` **en mémoire**, par instance serverless (le commentaire de la l. 6-11 le reconnaît), sans persistance ni partage entre instances Netlify. L'IP est lue depuis le **premier élément de `x-forwarded-for`**, que le client peut forger (l. 30-35), alors que `src/lib/utils/request-info.ts:13` utilise déjà `x-nf-client-connection-ip`. Les règles ne portent que sur les chemins `/api/auth/*` : **`registerAction` (Server Action postée sur `/register`) n'est pas limitée**. Aucun compteur **par compte** et aucun verrouillage temporaire dans le code ; la protection de Neon Auth est non vérifiable. `RATE_LIMIT_DISABLED=true` désactive tout (l. 85). | Force brute et bourrage d'identifiants sur des comptes contenant des données de santé ; inscriptions massives | Limiteur persistant (table Postgres `auth_attempts` sous un rôle dédié, ou Redis/Upstash) avec deux clés : IP (`x-nf-client-connection-ip`) **et** e-mail normalisé. Délai exponentiel dès 5 échecs, verrouillage de 15 min après 10 échecs en 1 h avec e-mail d'alerte et lien de déblocage, captcha (Turnstile) à partir de 5 échecs. Couvrir la Server Action d'inscription, la réinitialisation et le renvoi d'OTP. Contrôle au démarrage : refuser de démarrer si `RATE_LIMIT_DISABLED` est actif en production. | M |
| P0-3 | Données de santé : HDS (H1/H2) et fermeture garantie du secteur santé | Le README (l. 40, 150) et `docs/audits/launch-readiness-2026-11/09_COMPLIANCE.md` (LR-006) reconnaissent que l'HDS n'est **pas démontré**. La fermeture du secteur repose sur la variable `NEXT_PUBLIC_CLOSED_REGISTRATION_SECTORS` (`src/lib/registration/options.ts:24-46`), **ouverte par défaut** : si la variable est absente, `closedRegistrationSectors()` renvoie `[]` et le secteur `health` est ouvert. La décision du 19 novembre 2026 (migration `0021`) a ajouté psychologues, coachs, nutritionnistes et massage bien-être. Les notes cliniques sont stockées **en clair** (`clinical_notes.content text`, `drizzle/neon/0000_structure.sql:376-389` ; aucun `pgcrypto` ni `createCipheriv` dans `src/`). Les fonctions Netlify qui les lisent tournent aux États-Unis. | Hébergement de données de santé sans HDS : infraction (CSP L.1111-8) et manquement à l'art. 32 ; transfert hors EEE incompatible avec HDS v2 | 1) **Fermer par défaut** : le secteur `health` doit être fermé sauf `HEALTH_SECTOR_ENABLED=true` côté serveur (variable non `NEXT_PUBLIC`). 2) Tant que l'HDS n'est pas en place, bloquer côté serveur la création de notes et documents cliniques (« aucune donnée de santé réelle »). 3) Décision du propriétaire (§4). | S (fermeture) / L (HDS) |
| P0-4 | Information des personnes et contrat de sous-traitance (G1, G5) | **Politique de confidentialité** : une seule phrase (`src/lib/data/templates/legal/fr.json`, clé `privacy`, rendue par `src/app/(legal)/confidentialite/page.tsx`). Il manque : identité du responsable, finalités et bases légales, destinataires, **sous-traitants et transferts hors UE**, durées, droits et contact, droit de réclamation auprès de la CNIL. **CGV** : 5 phrases génériques (`terms`). **Aucun DPA (art. 28) ni liste des sous-traitants ultérieurs** dans le code ou les pages. **Mentions légales** (`src/app/(legal)/mentions-legales/page.tsx`, `src/lib/legal/publisher.ts`) : l'éditeur est lu depuis les variables d'environnement (correct, et la page signale les champs manquants), mais seul Netlify est cité comme hébergeur ; **Neon (base de données, Francfort)**, le stockage objet, Resend et Stripe n'apparaissent pas. | Manquement aux art. 13 et 28, impossibilité pour les clients professionnels d'être eux-mêmes conformes, risque commercial et contractuel | Rédiger avec un juriste : politique de confidentialité complète (rôle double responsable/sous-traitant), CGU/CGV, **DPA annexé aux CGV** (acceptation à l'inscription, version horodatée), page « Sous-traitants » (Netlify, Neon, stockage objet, Resend, Stripe, avec pays et garanties de transfert), mentions légales listant tous les hébergeurs. | M |
| P0-5 | MFA pour les comptes qui traitent des données de santé (A2, A3 R1) | `src/lib/services/mfa.service.ts` : toutes les méthodes lèvent « MFA is unavailable ». `src/app/(dashboard)/parametres/securite/page.tsx` affiche « L'authentification à deux facteurs n'est pas encore disponible ». Le SDK `@neondatabase/auth@0.7.0-beta` n'enregistre pas `twoFactorClient` (`supportedBetterAuthClientPlugins`, `node_modules/@neondatabase/auth/dist/adapter-core-*.mjs:662-670` : jwt, admin, organization, emailOTP, magicLink, phoneNumber, anonymousToken). Les routes `/api/auth/mfa` et `/api/auth/mfa/verify` sont mortes, et `speakeasy` (non maintenu) reste une dépendance. | Bloquant pour le secteur santé selon la CNIL ; P1 pour les autres secteurs | Voir §3.7 : TOTP applicatif (« step-up » lié à la session Neon) ou passage à Better Auth auto-hébergé avec le plugin `twoFactor`. MFA obligatoire pour le secteur santé et les administrateurs d'organisation, proposée à tous. Supprimer les routes mortes et `speakeasy`. | M-L |

### P1 — à traiter dans le trimestre

| # | Exigence | État actuel (preuves) | Risque | Correctif | Effort |
|---|---|---|---|---|---|
| P1-1 | Journal d'audit (A3 R9, art. 32, traçabilité des accès aux données de santé) | La table `audit_logs` existe avec sa RLS (`drizzle/neon/0013_compliance_rls.sql:3,13-15`) et `AuditService.log` existe (`src/lib/services/audit.service.ts`), mais **aucun appel à `log()`** dans `src/` : seules les routes de lecture `api/admin/audit` l'utilisent. Les 16 « audits » sont des `console.info('[audit] …')` envoyés dans les journaux Netlify (États-Unis, durée de conservation non maîtrisée). Les connexions, échecs, réinitialisations, exports et consultations de dossiers cliniques ne sont pas tracés en base. | Impossible de détecter un accès abusif ou de documenter une violation (art. 33) | Écrire dans `audit_logs` (en ajout seul, sans UPDATE ni DELETE pour le rôle runtime) : connexion réussie ou échouée, réinitialisation, changement d'e-mail, export, fermeture de compte, lecture et écriture de `clinical_*`, changement de rôle. Durée de conservation : 6 à 12 mois. Pseudonymiser l'IP au-delà de 6 mois. | M |
| P1-2 | Effacement complet et cohérent (G5) | `close_current_account` (`drizzle/neon/0004_runtime_boundaries.sql:44-52`) anonymise `users` et supprime `user_roles`, mais **conserve l'identité Neon Auth** (e-mail, empreinte du mot de passe, sessions), ce que l'écran annonce lui-même (`gdpr.actions.ts:23-24` : « identité conservée, accès applicatif bloqué »). `auth.signOut()` ne révoque que la session courante. L'organisation et toutes les données de ses clients sont conservées sans durée définie. | Droit à l'effacement non respecté ; données orphelines | Supprimer l'utilisateur Neon Auth (API admin) et révoquer toutes ses sessions. Politique de rétention écrite : factures 10 ans (art. 17.3.b), données CRM supprimées 30 à 90 jours après la résiliation, avec export proposé avant. Tâche planifiée de purge. | M |
| P1-3 | Portabilité et accès complets | `exportPersonal` exclut les données cliniques et organisationnelles (`account-privacy.service.ts:23`). `exportOrganization` exclut rendez-vous, patients, notes, documents, chantiers et messages. | Export incomplet : le professionnel ne peut ni répondre à ses propres patients (art. 15/20) ni changer d'outil (art. 28.3.g) | Étendre l'export d'organisation à toutes les tables tenantées (JSON + CSV + pièces jointes en ZIP via `jszip`), sous la permission `privacy:export`, avec une entrée dans le journal d'audit. | M |
| P1-4 | Chiffrement applicatif des notes sensibles (G3) | `clinical_notes.content`, `clinical_form_responses` et les messages patients sont en clair en base. Le chiffrement au repos de Neon (disque) ne protège pas contre une fuite de dump, de branche ou de sauvegarde. | Exposition totale en cas de fuite d'identifiants base ou de branche Neon | Chiffrement d'enveloppe AES-256-GCM côté application (une clé de données par organisation, protégée par une clé maîtresse hors base, en KMS européen), avec rotation possible. Accepter la perte de la recherche plein texte sur ces champs. À faire avant l'ouverture santé. | L |
| P1-5 | Transferts hors UE (G7) documentés | Netlify (fonctions aux États-Unis), Resend (e-mails, États-Unis), Stripe : aucune analyse d'impact des transferts (TIA) ni mention dans la politique de confidentialité. `netlify/functions/daily-automations.mts` ne fixe pas de région. Le code ne permet pas de savoir où se trouve le stockage objet Neon (`src/lib/storage/neon-object-store.ts`). | Manquement aux art. 44 et suivants si le DPF tombe (C-703/25 P) | Documenter le DPF et les SCC de secours ; voir la décision §4.2 sur la région des fonctions. | S (documentation) |
| P1-6 | Registre art. 30, AIPD, procédure de violation (G2, G4, G6) | `audit/DATA_PRIVACY_MATRIX.csv` existe, mais aucun registre art. 30.2 ni AIPD n'a été trouvé (le document `09_COMPLIANCE.md` le constate aussi). La route `api/privacy/breach` permet à un professionnel de déclarer une violation, mais il n'existe pas de procédure de MonService vers ses clients (délai, modèle, contacts). | Non-conformité documentaire | Registre art. 30.1 et 30.2, AIPD santé, procédure écrite « violation » (détection, qualification, notification aux clients en moins de 24 h, aide aux 72 h CNIL). | M |
| P1-7 | Saisie du mot de passe : `autocomplete` et cohérence (A4, A3 R31) | Inscription : `autoComplete="new-password"` présent (`RegisterForm.tsx`), connexion : `current-password` présent (`LoginForm.tsx`). **Absent** : `InvitedMemberRegisterForm.tsx:64-79` (aucun `autoComplete` ; texte « Min. 8 caractères », faux puisque le serveur exige 12) et `reset-password/page.tsx:62-75` (pas de `autoComplete`, pas de `PasswordField`, pas d'affichage des règles). `forgot-password` : pas de `autoComplete="email"`. | Les gestionnaires de mots de passe ne proposent pas de mot de passe fort ; message trompeur | Utiliser `PasswordField` avec `showRequirements` et `autoComplete="new-password"` partout ; corriger le texte. | S |
| P1-8 | CSP stricte | `next.config.ts:16-31` : `script-src 'unsafe-inline' 'unsafe-eval'` (un TODO P1 est noté). Les autres en-têtes sont présents (HSTS preload, `nosniff`, `DENY`, `Referrer-Policy`, `Permissions-Policy`, `no-store` sur les espaces authentifiés). | La CSP ne protège pas contre le XSS | CSP à base de nonces dans `proxy.ts`, `strict-dynamic`, retrait de `unsafe-eval` en production ; vérifier avec `curl -I` sur le site déployé que Netlify applique bien ces en-têtes aux assets. | M |

### P2 — amélioration continue

| # | Sujet | État / preuve | Correctif | Effort |
|---|---|---|---|---|
| P2-1 | Gestion des sessions (A3 R12, ASVS V7) | Cookie et durée de session gérés par Neon Auth (non vérifiable dans le code ; `sessionDataTtl: 60` dans `src/lib/auth/server.ts:13` = cache de 60 s). Pas de liste des sessions ni de bouton « déconnecter les autres appareils ». | Afficher les sessions actives, révoquer toutes les sessions après une réinitialisation de mot de passe, durée absolue de 12 h pour le secteur santé, délai d'inactivité de 30 min. | M |
| P2-2 | Changement de mot de passe dans l'application | Seulement par lien e-mail (`parametres/profil/page.tsx:36-57`). | Ajouter un changement direct avec ressaisie du mot de passe actuel et e-mail de notification. | S |
| P2-3 | Notifications de sécurité | Aucune notification de nouvelle connexion ou de changement de mot de passe. | E-mails Resend sur ces événements. | S |
| P2-4 | Divulgation des vulnérabilités (CRA en anticipation) | Pas de `/.well-known/security.txt`. | Ajouter `security.txt` et une procédure de traitement des signalements. | S |
| P2-5 | Valeur codée en dur | `completeProfileAction` passe `password: 'RecoveryValidation1!'` pour réutiliser le schéma (`auth.ts:62`). | Schéma dédié sans mot de passe. | S |
| P2-6 | Intégrité et archivage des factures (F1, F2) | Rétention présente (`retention.service.ts`, `/parametres/retention`), conformité à la réforme non auditée ici. | Contrôler l'immuabilité des factures émises (triggers), l'archivage 10 ans indépendant de la fermeture de compte et la feuille de route vers une plateforme agréée pour septembre 2027. | M |
| P2-7 | NIS2 / CRA | Non applicable directement aujourd'hui. | Surveiller la promulgation de la loi Résilience ; préparer un PAS (plan d'assurance sécurité) pour les clients soumis. | S |

### Points positifs constatés (dans le code)

- Message de connexion générique contre l'énumération de comptes (`AuthContext.tsx:76-80`), comme la réponse de « mot de passe oublié ».
- Vérification de l'e-mail par OTP (`verify-email/page.tsx`, `autoComplete="one-time-code"`), obligatoire avant le provisionnement (`completeProfileAction`).
- RLS : tous les tables de domaine créées dans `drizzle/neon/*.sql` ont `ENABLE ROW LEVEL SECURITY` (vérifié en croisant `CREATE TABLE` et `ENABLE ROW LEVEL SECURITY`). Rôles runtime `NOBYPASSRLS` (`0001_identity.sql:4`, `0007_restricted_workers.sql:3-4`), politiques `RESTRICTIVE` `account_active_required`, fonctions `SECURITY DEFINER` avec `search_path` figé et `REVOKE … FROM PUBLIC`. **Point à vérifier :** `reminder_worker_claim` / `reminder_worker_complete` (`0007:32-33`) utilisent `WITH CHECK(true)` pour le rôle `monservice_reminders`, ce qui est acceptable seulement si ce rôle n'a aucun autre accès en écriture.
- Liens de téléchargement des documents cliniques limités à 60 s (`neon-object-store.ts:29-31`).
- Mots de passe hachés par le fournisseur (Better Auth utilise scrypt par défaut, conforme à la CNIL ; **à confirmer pour Neon Auth managé**).
- En-têtes de sécurité présents, avec `X-Robots-Tag` et `no-store` sur les espaces privés.
- La page de mentions légales n'invente plus d'éditeur fictif.

---

## 3. Politique de mot de passe à implémenter

Objectif : **conforme à la CNIL 2022-100 (cas « mot de passe seul »)**, alignée autant que possible sur NIST 800-63B-4, l'ASVS 5.0 et l'ANSSI, et **appliquée côté serveur sur chaque chemin**.

### 3.1 Règles d'acceptation (serveur, source unique `src/lib/validation/password-policy.ts`)

Un mot de passe est accepté s'il respecte **l'une** des trois formes CNIL (A1) :

| Forme | Règle | Référence |
|---|---|---|
| F1 | ≥ 12 caractères avec minuscule, majuscule, chiffre et caractère spécial | CNIL option 1 (règle actuelle, conservée) |
| F2 | ≥ 14 caractères avec minuscule, majuscule et chiffre, sans spécial obligatoire | CNIL option 2 |
| F3 | Phrase de passe d'au moins 7 mots (séparés par des espaces ou des tirets), ≥ 20 caractères | CNIL option 3 ; rejoint NIST (≥ 15, pas de composition) |

Et dans **tous** les cas :

1. **Longueur maximale 128** (supérieure aux 64 exigés par NIST) ; tous les caractères Unicode imprimables et l'espace sont acceptés ; normalisation NFKC avant hachage et avant contrôle ; aucune troncature silencieuse.
2. **Liste noire locale** : mots de passe courants (top 10 000 à 100 000, liste embarquée), et **mots du contexte** refusés : partie locale de l'e-mail, nom, nom de l'organisation, « monservice », ainsi que les suites (`azerty`, `123456`…) et les répétitions (≥ 4 caractères identiques).
3. **Mots de passe compromis (HIBP, k-anonymat)** : SHA-1 en majuscules ; envoi des 5 premiers caractères à `https://api.pwnedpasswords.com/range/{prefix}` avec `Add-Padding: true` ; refus si le suffixe apparaît avec un compteur > 0. Délai d'attente de 2 s. **En cas d'indisponibilité, ne pas bloquer l'inscription** (dégradé : liste locale seule), écrire un événement dans le journal d'audit et relancer la vérification à la connexion suivante. L'appel est fait côté serveur seulement, et le mot de passe n'est jamais journalisé.
4. **Pas d'expiration périodique** (CNIL, ANSSI R24, NIST), sauf pour les comptes à privilèges internes (administrateurs MonService) : expiration à 1 an (CNIL, ANSSI R25).
5. **Changement forcé** si le mot de passe apparaît dans HIBP lors d'une vérification à la connexion (NIST, ANSSI R26) : la session est limitée à l'écran de changement.
6. **Nouveau mot de passe différent de l'actuel** ; pas d'historique au-delà (inutile selon NIST).

Ces mêmes règles s'appliquent à : `registerAction`, `registerInvitedMemberAction`, la réinitialisation (nouvelle Server Action), le changement de mot de passe (à créer), et sont doublées par le minimum Neon Auth (≥ 12) comme filet de sécurité. **Les routes `POST /api/auth/sign-up/*` et `/api/auth/reset-password` du relais sont fermées au navigateur** (P0-1).

### 3.2 Indicateur de force (client, à titre indicatif)

- `@zxcvbn-ts/core` avec les dictionnaires `language-common` et `language-fr`, chargé en différé sur les seuls écrans de mot de passe. Les mots du contexte (e-mail, nom, organisation) sont passés en `userInputs`.
- Affichage : jauge de 4 niveaux et liste des règles cochées en direct (`PasswordField` `showRequirements`, déjà en place). Ajouter une ligne « N'apparaît dans aucune fuite connue » après validation serveur.
- Score bloquant **côté serveur** : `zxcvbn score < 3` refusé même si F1/F2/F3 est respectée (exemple : `Motdepasse2024!` passe F1 mais pas le score). Le serveur reste l'autorité ; le client ne fait que guider.

### 3.3 Champs de formulaire

- Création, réinitialisation, invitation, changement : `type="password"`, `autoComplete="new-password"`, `name="password"`, `minLength={12}`, `maxLength={128}`, `autoCapitalize="none"`, `autoCorrect="off"`, `spellCheck={false}` ; bouton « afficher » (NIST) ; **collage autorisé** (NIST, ANSSI R31). Confirmation avec `autoComplete="new-password"`.
- Connexion : `autoComplete="current-password"` (en place) et `autoComplete="username"` ou `email` sur l'identifiant.
- Mot de passe oublié : `autoComplete="email"`.
- Le texte d'aide est généré à partir de la même constante que le serveur (fin du « 8 caractères » de l'invitation).

### 3.4 Limitation des tentatives et verrouillage (A1 cas 2, A3 R10, A4)

| Déclencheur | Clé | Action |
|---|---|---|
| Connexion | e-mail normalisé | Délai progressif à partir du 5e échec (1 s, 2 s, 4 s… plafonné à 30 s) ; **verrouillage de 15 min au 10e échec en 1 h** (CNIL), e-mail au titulaire avec lien de déblocage à usage unique ; plafond absolu de 100 échecs consécutifs avant réinitialisation obligatoire (NIST). |
| Connexion | IP (`x-nf-client-connection-ip`) | 20 essais / 15 min, puis captcha (Turnstile) ; 100 / h, puis 429. |
| Inscription (Server Action) | IP | 5 / h. |
| Mot de passe oublié, renvoi d'OTP | e-mail et IP | 3 / h par e-mail, 10 / h par IP ; réponse identique dans tous les cas. |
| OTP / TOTP | compte | 5 essais, puis nouveau code obligatoire ; 10 échecs, puis verrouillage de 15 min. |

Stockage persistant partagé entre instances (table Postgres sous un rôle restreint, ou Redis). Message d'échec identique, que le compte existe ou non (ANSSI R14, déjà en place). Chaque échec et chaque verrouillage est écrit dans `audit_logs`.

### 3.5 Stockage

Hachage par le fournisseur (scrypt dans Better Auth). **À confirmer par écrit auprès de Neon** : algorithme, paramètres, sel par utilisateur (CNIL, ANSSI R28-R29). Si Better Auth est auto-hébergé : Argon2id (m = 19 MiB, t = 2, p = 1, selon les recommandations OWASP) ou scrypt (N = 2^17, r = 8, p = 1).

### 3.6 Sessions

Cookies `HttpOnly`, `Secure`, `SameSite=Lax` (à vérifier sur la réponse réelle de Neon Auth). Durée absolue de 7 jours (12 h pour le secteur santé), délai d'inactivité de 30 min pour le secteur santé, **révocation de toutes les sessions après réinitialisation ou changement de mot de passe et après fermeture du compte**.

### 3.7 MFA (A2, A3 R1-R2, R8)

- **Facteur cible : TOTP** (RFC 6238, 30 s, 6 chiffres, secret de 160 bits **chiffré en base**), avec 10 codes de secours à usage unique hachés. Passkeys/WebAuthn en phase 2. **Pas de SMS** (ANSSI R8 ; la CNIL le déconseille).
- **Obligatoire** : comptes du secteur santé dès l'ouverture, rôles owner/admin d'organisation, administrateurs internes MonService. **Proposée** à tous les autres comptes.
- **Mise en œuvre** (le SDK Neon Auth 0.7.0-beta n'expose pas `twoFactor`) :
  - Option A, rapide : « step-up » applicatif. Après la connexion Neon Auth, le proxy vérifie un drapeau `mfa_verified` lié à l'identifiant de session Neon (table `mfa_sessions`), et l'absence de ce drapeau redirige vers `/mfa`. Bibliothèque `otplib` (maintenue) à la place de `speakeasy`.
  - Option B, cible : Better Auth auto-hébergé avec le plugin `twoFactor` officiel (TOTP, codes de secours, appareils de confiance).
- Le réglage MFA (activation, désactivation, régénération des codes) exige la ressaisie du mot de passe et déclenche un e-mail de notification.
- Le second facteur lève l'obligation de longueur selon NIST (8 avec MFA), mais **on garde 12 minimum** pour rester conforme à la CNIL quand la MFA n'est pas encore active.

### 3.8 Tests à ajouter (`__tests__/unit/security`)

`POST /api/auth/sign-up/email` direct → 404 ; réinitialisation avec `Password1!` → refus ; mot de passe présent dans HIBP (simulé) → refus ; e-mail inclus dans le mot de passe → refus ; 11e échec → 423 ; en-tête `x-forwarded-for` falsifié sans effet sur le limiteur ; HIBP indisponible → inscription acceptée et événement journalisé.

---

## 4. Décisions à prendre par le propriétaire

1. **Ouverture du secteur santé et hébergement HDS** (P0-3). Trois options :
   - (a) **Rester fermé** à toute donnée de santé (ni paramédical ni psychologues) jusqu'à ce que la chaîne soit certifiée. Recommandé à court terme, avec fermeture par défaut dans le code.
   - (b) **Migrer vers une chaîne HDS** : base, stockage, sauvegardes **et calcul** chez un hébergeur certifié HDS v2 dans l'EEE (par exemple un PaaS ou IaaS certifié HDS en France). Neon et Netlify ne sont pas connus comme certifiés HDS ; c'est à leur demander par écrit, à défaut de preuve. Il faut alors sortir le code qui touche aux données cliniques des fonctions Netlify situées aux États-Unis.
   - (c) **Ouvrir uniquement le « bien-être non médical »** (coach, massage bien-être), sans module clinique : pas de notes de santé, avertissement à la saisie, consentement explicite, AIPD. Le coût juridique reste à valider : la frontière est floue.
2. **Région d'exécution du code serveur.** Garder Netlify États-Unis (transfert sous DPF, avec un risque lié au pourvoi C-703/25 P), passer les fonctions en région UE (`eu-central-1` Francfort, ce qui dépend du plan Netlify, souvent Enterprise), ou changer d'hébergeur pour un PaaS européen. Pour le secteur santé, une exécution dans l'EEE est de fait nécessaire (HDS v2). Pour les autres secteurs, le DPF suffit aujourd'hui, à condition de le documenter.
3. **Fournisseur d'authentification et MFA.** Rester sur Neon Auth (bêta, sans MFA native : step-up applicatif) ou passer à Better Auth auto-hébergé (MFA native, maîtrise du hachage, des sessions et de la politique de mot de passe côté serveur). Vérifier aussi où Neon Auth stocke les identités (région, et société américaine : CLOUD Act).
4. **Durées de conservation** après résiliation : données CRM et cliniques (par exemple 30 ou 90 jours, puis suppression), journaux d'audit (6 ou 12 mois), factures (10 ans, archivées à part). À inscrire dans les CGV, le DPA et la politique de confidentialité.
5. **Documents juridiques** : qui les rédige (avocat ou DPO externe) ; acceptation du DPA intégrée à l'inscription (case distincte et version horodatée) ; contact RGPD (adresse dédiée) ; désignation d'un DPO (non obligatoire en sous-traitance sauf traitement à grande échelle de données de santé, ce qui renvoie au point 1).
6. **Chiffrement applicatif des notes** : choix du KMS (européen) et acceptation de la perte de recherche sur les champs chiffrés.
7. **Facturation électronique 2027** : MonService se connecte-t-il à une plateforme agréée (et laquelle), ou se limite-t-il au rôle d'outil de préparation ?
8. **MFA obligatoire ou facultative** hors secteur santé (impact sur l'inscription et l'adoption).

---

## Annexe : fichiers examinés

`src/app/(auth)/**`, `src/components/auth/{LoginForm,RegisterForm,InvitedMemberRegisterForm,PasswordField,AuthContext}.tsx`, `src/lib/auth/{server,client,session,provisioning}.ts`, `src/app/api/auth/[...path]/route.ts`, `src/app/api/auth/mfa/**`, `src/lib/services/{mfa,audit,account-privacy,legal}.service.ts`, `src/lib/validation/{schemas,team.schemas}.ts`, `src/proxy.ts`, `src/middleware/rate-limit.ts`, `src/app/actions/{auth,gdpr.actions,team.actions}.ts`, `src/app/(dashboard)/parametres/{donnees,securite,profil,retention}/page.tsx`, `src/app/(legal)/**`, `src/lib/legal/publisher.ts`, `src/lib/data/templates/legal/fr.json`, `src/lib/registration/options.ts`, `next.config.ts`, `netlify.toml`, `netlify/functions/daily-automations.mts`, `drizzle/neon/0000-0022*.sql` (structure, RLS, rôles), `node_modules/@neondatabase/auth` (liste des plugins pris en charge).
