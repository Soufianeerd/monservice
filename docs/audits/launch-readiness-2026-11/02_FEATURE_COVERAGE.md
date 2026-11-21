# 02 — Fonctionnalités : état réel

Légende : **V** vérifié (preuve d'exécution) · **C** présent dans le code, non rejoué dans cet audit · **D** présent avec défaut · **A** absent · **H** hors périmètre V1.

« Vérifié » renvoie au run CI 42859109019 du 10 novembre (dernier vert) ou aux contrôles rejoués le 17 novembre (802 tests unitaires). Les fonctions ajoutées après le 10 novembre n'ont pas de run vert.

## Socle commun

| Fonction | État | Preuve / remarque |
|---|---|---|
| Inscription professionnelle, vérification par code, connexion, mot de passe oublié | V (technique) / D (exploitation) | Parcours `auth.spec`, `auth-recovery.spec`. E-mails non délivrables en production (LR-004) |
| Création d'organisation, choix du secteur, attribution du workspace | V | `registerAction`, tests onboarding et workspaces |
| Fermeture d'un secteur aux inscriptions | C | `registration/options.ts` ; contrôle applicatif seulement (LR-024) |
| Invitation d'un collaborateur, gestion d'équipe | **A** | Aucune action ni écran (LR-007) |
| Rôles et permissions | C | `rbac.service.ts`, `rbac.spec` ; sans utilisateurs multiples, peu exercé en réel |
| Double authentification | **A** | `mfa.service.ts` lève une erreur (LR-013) |
| Clients et contacts | V | `client.spec`, tests unitaires |
| Opportunités, pipeline, rapports | C | Rapports avancés réservés aux plans payants |
| Produits et prestations | V | Plafond de 20 en plan gratuit |
| Devis : création, envoi, révision | V | `field-service-quote-to-cash.spec` |
| Devis : acceptation | **D** | Possible uniquement par un compte client (LR-002) |
| Factures, acomptes, solde, numérotation | V | Contraintes en base + parcours ; dépend de l'acceptation |
| PDF de facture | C | Rendu côté client, lot de 1,49 Mo (LR-026) |
| Facturation électronique (Factur-X, UBL, dépôt sur plateforme agréée) | **A** en pratique | `einvoice.service.ts` sans appelant (LR-008) |
| Paiement en ligne des factures | H | Retiré le 12 octobre ; Stripe sert aux abonnements seulement |
| Abonnements Stripe | C, désactivé | Routes en 503 sans clés |
| Agenda, tâches | C | — |
| Relances automatiques | **D** | Code présent, aucun planificateur configuré (LR-009) ; réservé aux plans payants |
| Modèles de messages | D | `message-template.actions.ts:21` : méthode non implémentée |
| Messagerie | H en V1 | Suppose un client connecté (LR-023) |
| Marketplace (demandes de particuliers) | H en V1 | Suppose des clients connectés (LR-022) |
| Page publique du professionnel `/pro/[slug]` | C | Page vitrine, pas un espace client : conservable |
| Recherche globale, journal d'activité | C | — |
| RGPD : registre, consentements, demandes d'accès, rétention, violation | V | Tests de conformité + RLS 0013 |
| Export des données | C | `/api/retention/export`, `/parametres/donnees` |
| Fermeture de compte | V (unitaire) | `account-lifecycle` |
| Journal d'audit et export | C | `/admin/audit-logs` |

## Workspace Paramédical (inscriptions fermées)

| Fonction | État | Remarque |
|---|---|---|
| Structure du cabinet (lieux, praticiens, salles, ressources) | V | — |
| Dossiers patients, représentants | V | — |
| Agenda, disponibilités, types de séance, liste d'attente | V | Contraintes anti-chevauchement testées en base |
| Dossier clinique, formulaires, packs par profession | V | — |
| Statistiques du cabinet | C | Commit `30f6b8a` du 12 novembre, pas de run vert depuis |
| Espace patient (`/client/sante/*`) | **H** | À fermer (LR-001) |
| Télétransmission SESAM-Vitale, cotation NGAP, tiers payant | **A** | Indispensable aux professions conventionnées (kinés, orthophonistes) |
| Hébergement certifié HDS | **A** | LR-006 |

## Workspace Terrain et BTP

| Fonction | État | Remarque |
|---|---|---|
| Sites, chantiers, ordres de travail, assignations | V | Parcours `field-service-operations-journey` |
| Devis par lots, métrés, TVA multiple, acomptes, solde | V | Parcours devis-facture en 10 étapes |
| Rapports d'intervention signés | V | — |
| Équipements clients, maintenance préventive, étiquettes QR | V | Sessions 19 et 19B |
| Portail client terrain (`/client/interventions`, `/client/equipements`) | **H** | À fermer (LR-001) |
| Bibliothèque d'ouvrages et de prix | **A** | Standard chez Obat et Tolteck |
| Application mobile, mode hors ligne | **A** | Web adaptatif seulement |
| Situations de travaux, retenue de garantie, attestations de TVA réduite | Non trouvé | À confirmer par test fonctionnel |
| Assignation à plusieurs techniciens | D | Exige des utilisateurs de l'organisation, impossibles à créer (LR-007) |

## Synthèse

Le cœur « client → devis → facture » et le métier terrain sont développés et testés. Trois manques rendent ce cœur inutilisable tel quel en V1 : l'acceptation des devis sans compte client, les plafonds du plan gratuit et l'absence d'équipe.
