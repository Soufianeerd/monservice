# MonService — Audit de solidification (17 novembre 2026, fin de journée)

Branche auditée : `launch/v1-professional-only` @ `7f060f3` (PR #2 : périmètre V1, équipe 0019, outils de croissance 0020).
Complète l'audit de préparation du matin (`docs/audits/launch-readiness-2026-11/`), sans le répéter : seuls les constats **nouveaux ou encore ouverts** figurent ici.
Méthode : lecture du code et recherches ciblées (actions serveur, routes API, fonctions simulées, typage, PDF, e-mails, mentions légales, performances), `npm audit`. Pas de test d'intrusion actif.

## Verdict

Le socle technique tient : isolation multi-tenant en base, actions serveur toutes authentifiées, routes API protégées, 0 vulnérabilité en production (`npm audit --omit=dev`).
**Le parcours commercial de base ne tient pas encore** : un artisan ne peut ni émettre une facture créée directement, ni envoyer un devis ou une facture par e-mail, ni produire une facture conforme (SIRET, TVA, IBAN impossibles à saisir). Les e-mails et la page « Mentions légales » portent l'identité d'une société fictive.
Ces six points sont du code : environ 5 à 7 jours de développement. Ils passent avant tout le reste.

## P0 — à corriger avant tout client réel

| ID | Constat | Preuve | Conséquence | Correctif |
|---|---|---|---|---|
| S-01 | **Identité fictive de l'éditeur** : « MonService SAS, 10 rue de la Paix, RCS Paris 123 456 789, TVA FR12345678901 » s'affiche sur `/mentions-legales` et est ajoutée **en pied de chaque e-mail**, y compris les relances envoyées au nom des artisans | `src/lib/data/templates/legal/fr.json` (`site`), `src/lib/email/index.ts:78-88` | Fausses mentions légales (LCEN), e-mails trompeurs, risque de signalement en spam | Identité réelle de l'éditeur en configuration ; pied d'e-mail « envoyé via MonService pour le compte de [entreprise] » |
| S-02 | **Factures non conformes** : aucun champ pour SIREN/SIRET, forme juridique, n° de TVA, « TVA non applicable, art. 293 B du CGI », IBAN, conditions de paiement. Le PDF affiche « SIREN / TVA : N/A » et omet le code postal de l'émetteur. Les relances renvoient à des coordonnées bancaires impossibles à saisir | `OrganizationForm.tsx` (champs), colonnes `bank_details`/`payment_terms` sans écran, table `legal_entities` sans écran, `InvoicePDF.tsx:114, 307` (`zipCode` jamais rempli : la base stocke `postalCode`) | Factures refusables par les clients et sanctionnables ; argument « conforme » impossible | Section « Informations légales et bancaires » dans Organisation, reprise dans les PDF, les relances et la vitrine |
| S-03 | **Une facture créée directement reste brouillon pour toujours** (Générique, BTP) : aucun bouton pour l'émettre. Seules les factures issues d'un devis accepté sont émises | `InvoiceForm.tsx:47`, `InvoiceDetail.tsx` (aucune action d'émission) ; le paramédical a « Émettre la facture », pas les autres | Ni règlement, ni relance, ni trésorerie, ni demande d'avis sur ces factures | Action « Émettre » (verrouillage, numéro définitif, date) |
| S-04 | **Aucun envoi au client depuis l'application en V1** : « Envoyer au client » (devis) ne change que le statut ; `sendDocumentByEmailAction` n'est branché nulle part et pointe vers `/client/...` (fermé) ; l'e-mail d'opportunité pointe vers `/deals/{id}`, une page interne | `quote.service.ts:464-471`, `email.actions.ts:28-60, 100-130` | L'artisan télécharge le PDF et l'envoie lui-même ; le bouton laisse croire que le client l'a reçu | E-mail avec le PDF en pièce jointe, généré côté serveur, réponse vers l'entreprise |
| S-05 | **Page d'accueil** : tarifs 29/79/149 €/mois et promesses non livrées (paiement en ligne, signature électronique, API, utilisateurs illimités), alors que le lancement est gratuit. Les outils de croissance n'y figurent pas (LR-011, toujours ouvert) | `Pricing.tsx:5-30` | Pratique commerciale trompeuse ; conversion | Offre de lancement réelle, arguments vérifiables, comparaison « sans engagement » |
| S-06 | **Écrans RGPD remplis de données inventées** : registre des traitements, demandes d'accès (une fausse demande « Je souhaite obtenir une copie… »), consentements, violations | `PrivacyRegister.tsx:19`, `DSARManager.tsx:16`, `ConsentManager.tsx:16`, `BreachManager.tsx:17` — les API `/api/privacy/*` existent mais ne sont pas appelées | Un écran de conformité qui ment ; risque en cas de contrôle | Brancher sur les API réelles, ou masquer en V1 |

### Rappel — P0 à la charge de Soufiane (inchangés, guide `GUIDE_SOUFIANE_MISE_EN_LIGNE.md`)
Domaine d'envoi + Resend + SMTP ; plan Neon avec restauration testée ; documents juridiques ; rejeu 0014–0020 et bascule.
**Ajout :** l'application n'a **jamais été construite avec succès sur Netlify** (aucun déploiement publié, aperçus de PR en échec faute de base). Avant le merge, obtenir un déploiement d'aperçu vert sur une branche Neon synthétique, pour ne pas découvrir une incompatibilité du runtime Netlify / Next 16 le jour de l'ouverture.

## P1 — dans les deux semaines suivant le lancement pilote

| ID | Constat | Preuve | Correctif |
|---|---|---|---|
| S-07 | **Latence** : par défaut, les fonctions Netlify tournent dans l'Ohio (US East), la base Neon est à Francfort. Chaque requête traverse l'Atlantique, et la liste des factures en fait 2 par facture (N+1), chacune dans sa propre transaction | Doc Netlify (région par défaut `cmh`), `invoice.service.ts:38-46, 62` | Région des fonctions sur **Francfort** (`fra`, Cloud compute › Functions › Region) — le choix de région demande un plan payant ; regrouper les requêtes de liste |
| S-08 | **Numérotation** : le numéro de facture est attribué dès le brouillon ; un brouillon supprimé laisse un trou dans la séquence, alors que la loi exige une numérotation continue | `factures/new/page.tsx:31`, suppression autorisée en brouillon | Numéro attribué à l'émission (lié à S-03) |
| S-09 | **Pas d'avoir** : une facture émise erronée ne peut être ni corrigée ni annulée par un avoir | Aucun type « avoir » | Facture d'avoir liée à la facture d'origine |
| S-10 | **Pannes invisibles** : aucun suivi d'erreurs ni sonde de disponibilité (les pages d'erreur existent depuis ce matin) | Pas d'`instrumentation.ts`, aucun SDK | Suivi d'erreurs (Sentry ou équivalent UE) + sonde externe |
| S-11 | **Aucune limitation de débit applicative** : `rate-limit.ts` n'est importé nulle part ; s'y ajoutent désormais des points publics (page d'avis, vitrine, plan du site) | `src/middleware/rate-limit.ts` | Limiteur partagé sur inscription, dépôt d'avis, export ; vérifier les limites Neon Auth |
| S-12 | **Marketplace et Messagerie visibles** alors qu'elles supposent des comptes clients, fermés en V1 | `workspace-navigation.ts` | Masquer en V1 (LR-022/023) |
| S-13 | **`GET /api/retention/check` anonymise des documents** : une simple visite de lien par un professionnel connecté le déclenche (cookies envoyés en navigation) | `api/retention/check/route.ts:7-16` | Passer en POST avec confirmation ; la planifier côté serveur |
| S-14 | **Listes non paginées** (clients, factures, opportunités, tâches) | `*.service.ts` `findAll` | Pagination et recherche serveur |
| S-15 | **Outils de croissance non encore validés en CI** ; un envoi en échec n'est pas retenté ; modération des avis signalés uniquement par SQL | Run 44121178097 en attente ; `GROWTH_TOOLS.md` | Attendre le vert ; écran de modération ; nouvelle tentative bornée |
| S-16 | **Facturation électronique** non branchée (LR-008). Émission obligatoire pour les TPE/PME en septembre 2027 ; la réception l'est déjà pour toutes les entreprises | `einvoice.service.ts` sans appelant, PDF factice dans ce service (`:130-136`) | Partenariat avec une plateforme agréée |

## P2 — dette à résorber par lots

| ID | Constat | Preuve |
|---|---|---|
| S-17 | 12 `as never` et 3 `as any`, contraires à la règle du projet | `*.actions.ts` (client, deal, contact, task, product, message), `factures/new`, `factures/[id]/edit` |
| S-18 | 32 `alert()` et 18 `confirm()` natifs : bloquants, peu accessibles, non stylés | Composants CRM et pages de facturation |
| S-19 | Boutons « à venir » ou simulés encore visibles : Notes, Calendrier, Historique (fiche client), « PDF (Simulation) » des rapports, tutoriel vidéo | `QuickActions.tsx:102-126`, `AdvancedReports.tsx:90`, `SetupGuidePopover.tsx:80` |
| S-20 | CSP avec `unsafe-inline` et `unsafe-eval` (LR-015) | `next.config.ts:18-31` |
| S-21 | Route de simulation de paiement Stripe embarquée, bloquée seulement par `NODE_ENV` (LR-017) | `api/stripe/webhook/simulate` |
| S-22 | Dates de facture stockées en texte (`date`, `due_date`, `paid_at`) : comparaisons fragiles (contournées en SQL par `try_iso_date`) | `schema.ts` `invoices` |
| S-23 | En mode dégradé, les journaux contiennent les adresses e-mail des destinataires | `email/index.ts:67-71` |
| S-24 | Le pied légal des e-mails est ajouté après `</html>` | `email/index.ts:89` |
| S-25 | Validation TVA (VIES) simulée en développement et en test : « MOCK COMPANY INC » ; jamais testée réellement | `vat-validator.ts:66-76` |
| S-26 | Lot JavaScript client de 1,49 Mo, secret lu au chargement du module, SDK d'authentification en bêta (LR-021, 026, 027) | Audit du matin |

## Ce qui est solide (vérifié dans cet audit)
- **Actions serveur** : 36 fichiers, toutes protégées par `require*`, sauf trois publiques par construction (inscription, inscription d'un invité, dépôt d'avis par jeton).
- **Routes API** : toutes vérifient une session, un secret de tâche planifiée ou une signature Stripe ; l'ancienne signature d'opportunité répond 410.
- **Base** : nouvelles tables 0019 et 0020 en lecture seule pour le rôle d'exécution, écritures par fonctions bornées, worker de relances privé de `invoices` et `clients`. 17 + 17 scénarios SQL rejoués localement ; contrôles de contrat et d'objets verts.
- **Dépendances** : `npm audit --omit=dev` 0 vulnérabilité. Plus aucune référence Supabase dans `src` (hors un commentaire historique).
- **Tests** : 829/829 tests unitaires, `tsc` 0 erreur, ESLint 0 erreur, build de production.

## Plan proposé

| Lot | Contenu | Durée estimée |
|---|---|---|
| 1 | S-01, S-02 (identité éditeur, informations légales et bancaires, PDF conformes) | 1,5 j |
| 2 | S-03, S-08, S-04 (émettre une facture, numérotation à l'émission, envoi par e-mail avec PDF) | 2,5 j |
| 3 | S-05, S-06, S-12, S-19 (accueil, écrans RGPD, masquages, boutons fantômes) | 1 j |
| 4 | S-07, S-14 (région, requêtes groupées, pagination) | 1 j + changement de région |
| 5 | S-09, S-10, S-11, S-13 (avoirs, suivi d'erreurs, limitation, rétention) | 2,5 j |
| 6 | Dette P2, facturation électronique | Continu |

Lots 1 à 3 : environ 5 jours, à faire avant le premier client pilote.

## Limites
Pas de test d'intrusion actif, pas de mesure de charge, pas de test au lecteur d'écran. Les constats de performance reposent sur la lecture du code et la documentation Netlify. Les validations Neon et navigateur des commits `b8e1c02` et `7f060f3` sont en cours en CI.
