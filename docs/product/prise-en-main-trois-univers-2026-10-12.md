# MonService — prise en main pratique des trois univers

Demande du 12 octobre 2026 : guider les actions et les champs jusqu’à l’enregistrement, expliquer chaque cadre du tableau de bord et proposer un exemple fictif. L’aide précédente du cabinet se limitait à quelques éléments ; le BTP et le tertiaire utilisaient encore la checklist initiale.

## Comportement livré

Le bouton **Aide de cette page** reste disponible pour chaque professionnel, même après sa prise en main initiale. Il propose deux usages : découvrir les éléments visibles, ou choisir une action dans **Tous les parcours de prise en main**.

La découverte cible les cartes annotées, boutons, liens, champs, sélecteurs et onglets réels, ainsi que les commandes de l’en-tête. Les titres seuls, champs cachés, options repliées et contrôles de l’aide sont exclus. Chaque champ reçoit une explication en français : usage, exemple, caractère facultatif ou prérequis. Les cases et choix uniques reçoivent des instructions adaptées à leur type. Les contrôles indisponibles sont expliqués sans être activés. Une recherche de patient n’est jamais traitée comme une sauvegarde.

Un parcours suit la navigation et les fenêtres de saisie. Les nouveaux champs d’une ligne de devis ou d’une option sont intégrés ; les valeurs saisies restent dans le formulaire. Les bulles restent attachées aux contrôles pendant le défilement. L’utilisateur garde chaque clic et chaque sauvegarde ; l’aide n’envoie aucun document, ne saisit aucune donnée et ne crée aucun dossier automatiquement.

Les formulaires principaux signalent la réussite seulement après leur réponse métier. Une tentative de sauvegarde ou une erreur de validation n’est pas considérée comme une création réussie. La création d’un site pendant une intervention propose **Reprendre le formulaire**, afin de continuer l’intervention après l’enregistrement du site.

## Parcours et vocabulaire

| Univers | Parcours pratiques |
| --- | --- |
| Cabinet paramédical | Coordonnées du cabinet ; lieu ; praticien ; affectations aux lieux ; horaires et absences ; type de séance ; patient ; rendez-vous ; liste d’attente ; facture patient avec lignes et catalogue ; facture rapide depuis le dossier ; prestation et tarif ; devis ; tâche |
| BTP et métiers techniques | Coordonnées de l’activité ; client ; opportunité ; intervention et création de site ; calendrier ; facture ; prestation et tarif ; devis ; tâche |
| Tertiaire et services professionnels | Coordonnées de l’activité ; client ; opportunité ; calendrier ; facture ; prestation et tarif ; devis ; tâche |

Le tableau de bord du cabinet explique le cadre À traiter, les coordonnées, Ajouter un patient, Planifier un rendez-vous, Créer une facture et Configurer les lieux et l’équipe. Les autres tableaux de bord décrivent séparément leurs indicateurs et leur graphique. Les indicateurs d’affaires gagnées et de factures réglées sont nommés selon les données réellement affichées ; un nombre de factures réglées n’est plus présenté comme un montant impayé.

Les pages complémentaires de chaque navigation bénéficient également de la découverte des contrôles visibles. Les parcours de création sont ceux listés ci-dessus ; la découverte d’un contrôle complémentaire ne prétend pas avoir réalisé ou validé une opération métier.

Limite du produit confirmée : le calendrier du BTP et du tertiaire affiche actuellement les échéances des tâches et factures ainsi que les clôtures d’opportunités. Les interventions BTP se planifient dans leur dossier ; leur projection complète dans le calendrier reste à réaliser. L’aide décrit le calendrier tel qu’il fonctionne et ne promet pas cette intégration.

## Destinataires des documents du cabinet

Les créations de devis et de factures proposent les **patients**. La recherche par nom ou prénom permet de retrouver les dossiers au-delà de la première liste. Changer la recherche réinitialise le destinataire sélectionné pour éviter de conserver une sélection invisible.

À l’enregistrement seulement, le serveur vérifie le contexte clinique actif du professionnel, recherche le patient actif dans le cabinet de la session et reprend sa liaison de facturation administrative existante. Le destinataire peut être son représentant de facturation. Aucune information clinique n’est recopiée dans le CRM. Aucun identifiant d’organisation fourni par le navigateur n’est utilisé pour cette préparation. Les tests refusent les comptes non autorisés, les patients absents du cabinet, les dossiers archivés et les objets imposant un client ou une organisation.

Le devis conserve une TVA saisie à 0 %. Les honoraires restent encaissés par le professionnel avec ses propres moyens ; Stripe concerne exclusivement l’abonnement MonService.

## Exemple fictif

L’aide propose PATIENT TEST / Martin / 01-01-1990 ou CLIENT TEST / Martin Test, puis PRESTATION TEST / 50 € / TVA 0 %. Ce sont des suggestions à saisir volontairement. Quitter avant l’enregistrement ne crée rien. Enregistrer ajoute le dossier fictif à l’activité : le guide ne prétend pas disposer d’un environnement de simulation séparé.

Les essais automatisés se déroulent sur une branche CI vide et jetable, avec des identités synthétiques. Ils ne peuplent ni la production ni le compte de démonstration de l’utilisateur.

## Validation

Validation terminée le **2026-10-12T12:13:53.139Z**. Les preuves sont complémentaires et leurs périmètres restent explicites :

- **1 215 tests backend et conformité passent** : 740 unités/conformité (86 fichiers), 263 intégration/Gate 1, 198 RLS et 14 frontières, au commit `b2c0811ff5f1d67e31565705b75821f4146ba198`. Typecheck, contrôles de schéma, build et lint passent ; lint conserve 375 avertissements, sans erreur. [Preuve backend avec historique des deux assertions navigateur alors en échec](../database/artifacts/practical-guide-backend-validation-report.json).
- Après correction des seules assertions de navigation, **38 parcours Chromium passent** : deux Auth avec vérification obligatoire puis 36 parcours, dont sept nouveaux guides pratiques. Zéro échec et zéro skip. Le replay navigateur rejoue aussi les 740 unités/conformité, les contrôles de schéma, typecheck, lint et build, mais ne prétend pas rejouer les matrices DB. [Preuve navigateur](../database/artifacts/browser-validation-report.json).
- Le commit navigateur `0230ba671396a5b8d01599405c158b6e352d7660` possède exactement le même arbre `src` que le commit backend : `6657bb1c528d32f7de9ac7e4aa776bd243a4f649`. Les changements entre ces commits portent uniquement sur les tests, leur orchestration et les preuves. Chaque branche CI et ses fichiers privés temporaires ont été supprimés.

Les nouveaux essais créent réellement un patient fictif, son rendez-vous, un devis patient à TVA 0 %, une facture patient et des prestations BTP/tertiaires ; les rechargements vérifient leur persistance. Un site créé en fenêtre reprend le formulaire de l’intervention. Les contrôles du patient sont parcourus champ par champ et la bulle cible le bouton de confirmation, pas le titre.

Les reprises ont corrigé deux fixtures d’horloge (mesure passée basée sur l’horloge PostgreSQL ; URL signée de test valable cinq secondes avant vérification de son expiration), une identité de test non rattachée à un praticien, et des assertions qui acceptaient `/new` ou `/nouveau` comme URL de détail puis rechargeaient trop tôt. Aucun garde-fou applicatif n’a été assoupli. La connexion attend l’initialisation du contexte côté client ; le helper navigateur ne rejoue qu’un HTTP 429, au maximum trois fois, et ne rejoue jamais un refus d’identité.

Aucun push, merge ni déploiement public n’est effectué par ce lot.
