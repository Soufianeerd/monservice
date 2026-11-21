# 03 — Parcours utilisateurs

Méthode : lecture du code et des 19 specs Playwright, résultats du dernier run CI vert (10 novembre, 42 parcours + 2). **Aucun parcours n'a été rejoué à la main ni capturé dans cette session** : pas d'environnement applicatif avec base disponible ici. Les anomalies ci-dessous sont déduites du code et marquées comme telles.

## Parcours communs

| # | Parcours | Résultat | Anomalie |
|---|---|---|---|
| 1 | Découverte (page d'accueil) | Fonctionne | Messages incohérents avec le lancement (LR-011) |
| 2 | Inscription professionnelle | Testé (CI) | L'écran propose aussi « Je suis un particulier » (LR-001) |
| 3 | Vérification par code | Testé sur branche jetable | Non délivrable en production (LR-004) |
| 4–6 | Organisation, métier, workspace | Testé | — |
| 7–8 | Configuration, première utilisation | Guide d'accueil présent | Non mesuré : temps jusqu'au premier devis |
| 9–10 | Inviter un collaborateur, lui donner des droits | **Impossible** | LR-007 |
| 11–12 | Ajouter un client, une prestation | Testé | Plafonds gratuits : 50 clients, 20 prestations |
| 13–14 | Créer, modifier, envoyer un devis | Testé | 10 devis par mois en gratuit |
| 14 bis | Faire accepter le devis | **Bloqué en V1** | LR-002 |
| 15–16 | Planifier, suivre l'exécution | Testé (terrain) | — |
| 17–18 | Facturer, suivre le paiement | Testé | 10 factures par mois en gratuit ; pas de dépôt électronique |
| 19 | Indicateurs | Présent | Rapports avancés hors plan gratuit |
| 20–21 | Paramètres, export | Présent | — |
| 22 | Fermer le compte | Testé (unitaire) | — |
| 23 | Annuler un abonnement | Sans objet | Stripe désactivé |
| 24 | Erreurs et interruptions | **Défaut** | Aucun `error.tsx`, `not-found.tsx` ni `loading.tsx` : l'utilisateur voit la page d'erreur brute (LR-010) |

Variations (double clic, rafraîchissement, reprise après déconnexion, panne réseau) : non testées. Indices favorables dans le code : transactions avec verrou (`for update`) sur l'acceptation, contrainte d'unicité sur la signature, idempotence des webhooks.

## Générique

| Profil | Verdict | Détail |
|---|---|---|
| Développeur ou consultant seul | Utilisable après LR-002 et LR-003 | Cycle complet présent ; pas de contrat ni de suivi du temps passé trouvés |
| Agence à plusieurs | **Non utilisable** | Pas de second utilisateur (LR-007) |
| Prestataire multi-projets | Partiel | « Projets » = opportunités et tâches ; pas d'objet projet avec budget et temps |

## Paramédical (fermé)

| Profil | Verdict | Détail |
|---|---|---|
| Praticien seul | Techniquement complet | Bloqué par LR-006 ; pas de télétransmission |
| Cabinet à plusieurs, secrétaire | Structure présente | Les praticiens existent comme fiches, pas comme comptes (LR-007) |
| Salles et ressources partagées | Testé | Anti-chevauchement garanti en base |

Aucun scénario praticien ne nécessite la connexion d'un patient, à une exception : les **questionnaires** (`/client/sante/questionnaires`) sont remplis côté patient. En V1 ils doivent être saisis par le praticien.

## Terrain et BTP

| Profil | Verdict | Détail |
|---|---|---|
| Artisan seul | Utilisable après LR-002 et LR-003 | Parcours le mieux couvert par les tests |
| Plombier avec apprenti, entreprise multi-techniciens | **Non utilisable** | LR-007 |
| Plusieurs chantiers | Testé | — |

Signature du rapport d'intervention : recueillie sur l'appareil du professionnel, compatible V1. L'acceptation de fin de travaux par le portail client (Session 20) sort du périmètre.

## Canaux

| Canal | État |
|---|---|
| Web bureau | Principal, testé sous Chromium uniquement |
| Web mobile | Adaptatif ; non testé sur appareil, pas de mode hors ligne |
| API publique | Aucune (actions serveur) |
| E-mails transactionnels | Non opérationnels (LR-004) |
| Webhooks Stripe | Signés et idempotents ; inactifs |
| Notifications | Dans l'application ; pas de push ni SMS |
| Import de données | Non trouvé (pas d'import CSV de clients) — frein à la migration depuis un autre outil |
| Export | Présent |
| Administration interne (support) | Aucune console : toute intervention passe par la base |
| Journaux et supervision | Console JSON seulement (LR-010) |

## Tests à ajouter avant le pilote

1. Parcours complet avec un compte au plan réellement attribué au lancement (pas `pro` forcé).
2. Acceptation d'un devis par le professionnel, puis acompte, facture, ordre de travail.
3. Tentative d'inscription « particulier » : refus côté serveur et en base.
4. Accès direct à `/client/*`, `/invitation/portail`, `/devis/[id]/sign` : refus.
5. Invitation d'un collaborateur et isolement de ses droits.
