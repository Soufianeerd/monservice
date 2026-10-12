# MonService — correction de la prise en main du cabinet

Demande du 12 octobre 2026 : améliorer l’interface du praticien, garder la charte, fournir une aide contextuelle, distinguer les honoraires patients de l’abonnement MonService et utiliser uniquement le français. Les six captures et la vidéo de 3 min 48 s ont été examinées (neuf vues de la vidéo réparties sur son déroulement).

## Causes confirmées

- Le cookie NEXT_LOCALE changeait la langue déclarée du document tandis que de nombreux écrans restaient codés en français. Chrome traduisait alors du français déclaré allemand vers le français ; sa traduction automatique conservait aussi l’ancienne langue sur l’onglet ouvert.
- Les paramètres du profil transmettaient e-mail/mot de passe à un schéma serveur qui n’autorise que le nom et les états d’onboarding. AuthContext absorbait l’échec, permettant un faux message de réussite.
- Le guide était une checklist limitée et disparaissait après l’onboarding, sans expliquer les pages parcourues.
- Les disponibilités permettaient d’ouvrir des formulaires sans praticien ni lieu associé. Le calendrier proposait aussi une nouvelle séance avant la configuration nécessaire.
- Organisation/Cabinet et Facturation/Facturation employaient les mêmes termes pour des fonctions différentes. Les factures patients proposaient un paiement Stripe contraire au modèle précisé par le propriétaire.
- La grille d’inscription plaçait les professions longues dans des colonnes trop étroites.

## Résultat livré

- Français canonique pour les textes et lang=fr, anciens cookies corrigés ; sélecteur et alternates de langues retirés. La traduction Chrome reste disponible à l’initiative de l’utilisateur. L’onglet personnel a été remis sur l’original, sans modifier sa préférence générale de traduction des autres sites.
- Navigation : Patients ; Factures patients (Factures, Devis, Prestations et tarifs) ; Agenda (Rendez-vous, Horaires et absences, Types de séances, Liste d’attente, Tâches) ; Paramètres (Mon compte, Coordonnées du cabinet, Lieux et équipe, Abonnement MonService, Confidentialité/RGPD, Notifications).
- Raccourcis du tableau de bord orientés vers l’action, avec explications et accès à la configuration initiale. Onglets adaptatifs sans débordement horizontal de la page.
- Aide propre à chaque page du cabinet, réouvrable après la fin de l’onboarding ; visite avec cible mise en évidence, déplacement au défilement, navigation précédent/suivant, fermeture clavier et retour du focus. Elle ne force aucune navigation ni modification métier.
- Filtres patients : statut appliqué immédiatement, nom/prénom/date appliqués par Rechercher, erreur visible, réponses périmées ignorées.
- Horaires : instructions pour le cabinet vide ou sans association praticien/lieu, lieux filtrés selon le praticien, commandes impossibles désactivées. Calendrier : prérequis expliqués, bouton de réservation désactivé avant configuration.
- Réglages personnels séparés des coordonnées professionnelles. Nom réellement enregistré, e-mail d’identité en lecture seule, erreurs propagées. Changement du mot de passe : demande de lien à l’e-mail de la session Neon, confirmation par possession du lien, nouveau mot de passe et confirmation sur le parcours reset-password existant. Aucun mot de passe applicatif ni ancien mot de passe stocké en base métier.
- Site web et identifiant TVA/SIRET retirés du formulaire général : ces champs affichés auparavant n’étaient pas persistés par le contrat actuel. Code postal relié au champ réellement persisté. Aucun changement de schéma ni suppression de données.
- Stripe Connect retiré de l’interface et ancien endpoint authentifié retiré (410). Paiement Stripe des factures patients retiré de toutes les interfaces ; ancien endpoint conserve les contrôles d’accès mais ne crée aucune session Stripe (410). Les honoraires sont encaissés directement par le professionnel. Les données historiques et les contrôles Gate 1 sont conservés.
- Abonnement MonService clairement nommé, forfaits en français, boutons désactivés si non configurés. Ancien bouton factice remplacé par un portail utilisant uniquement le customer ID de la session serveur, avec retour fixé côté serveur. Aucun appel Stripe réel ni changement de compte externe lors de ce lot.
- Choix clair/sombre explicite, persisté dans un cookie et rendu côté serveur. Surfaces, champs et textes adaptés ; palette violette conservée.

## Validation et limites

Les tests ciblés couvrent la navigation, les filtres, les états vides, l’aide, le profil, les erreurs fournisseur et l’autorité serveur du portail. Six nouveaux parcours Playwright vérifient aussi le français malgré l’ancien cookie, la persistance du thème, l’aide entre pages, l’enregistrement effectif du profil synthétique, les réglages du cabinet, le mobile et le débordement des professions, sans créer de compte à la fin du parcours d’inscription.

Validation complète Neon sur branche synthétique jetable : en cours. Les résultats définitifs et le commit testé seront enregistrés après le replay.

La livraison des e-mails de sécurité dans une vraie boîte et l’activation Stripe en production restent à valider avec la configuration de production prévue dans le runbook. Les tests de sécurité Auth existants valident les jetons et le parcours fournisseur avec des identités synthétiques ; ils ne prouvent pas la réception réelle des e-mails. L’utilisateur n’a subi aucun changement de mot de passe, d’abonnement ou de données patient. Aucun push, merge ou déploiement public.
