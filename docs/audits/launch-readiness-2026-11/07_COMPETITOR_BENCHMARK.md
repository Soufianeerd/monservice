# 07 — Concurrence

Relevés du 17 novembre 2026. **Fiabilité** : la plupart des prix viennent de comparateurs et d'articles datés, pas des grilles officielles relues une à une ; plusieurs sources se contredisent (indiqué). À revérifier sur le site de l'éditeur avant tout usage commercial. Aucun avis client ni part de marché n'est avancé ici. « Non relevé » signifie que la recherche n'a pas été faite, pas que l'information n'existe pas.

## Générique (indépendants, agences, prestataires)

| Concurrent | Cible | Prix public relevé | Facturation électronique | Force | Limite | Source |
|---|---|---|---|---|---|---|
| Axonaut | TPE/PME, tout-en-un | 29,99 € HT/utilisateur/mois (autres relevés : 34,99 et 49,99 €) ; essai 15 jours | Plateforme agréée n° 0110 | CRM + facturation + trésorerie, tarif unique | Prix par utilisateur | [1] [2] |
| Sellsy | TPE 2–10, PME | Vente + facturation : 49 / 89 / 119 € HT/utilisateur/mois en annuel ; 2 utilisateurs minimum, engagement 12 mois | Plateforme agréée | CRM profond | Plancher de 2 licences, engagement | [3] [4] |
| Pennylane | Indépendants, TPE avec expert-comptable | Indépendant : 14 / 24 / 79 €/mois ; TPE dès 49 €/mois | Plateforme agréée | Comptabilité et lien cabinet | Offres indépendant limitées à 1 utilisateur ; pas un CRM | [5] [6] |
| Indy | Indépendants | Offre gratuite ; ~28 € HT/mois (EI), dès 59 € HT (sociétés) | Plateforme agréée, incluse dans le gratuit | Gratuit réellement utilisable pour facturer | Pas de CRM ni d'équipe | [7] [8] |
| Zoho, HubSpot, Odoo | — | Non relevé | Non relevé | — | — | — |

## Terrain et BTP

| Concurrent | Cible | Prix public relevé | Force | Limite | Source |
|---|---|---|---|---|---|
| Obat | Artisans, TPE/PME du bâtiment | Micro-entreprise : 25 / 45 / 85 € HT/mois en annuel (32 / 52 / 95 € sans engagement) ; essai 14 jours | Bibliothèque de 30 000 ouvrages incluse, application mobile, signature, paiement en ligne, suivi de rentabilité ; annonce plus de 21 000 professionnels | Jugé cher pour un auto-entrepreneur | [9] [10] [11] |
| Tolteck | Artisans | 300 €/an, 228 € avec engagement annuel ; essai 30 jours | Simplicité, prix | Périmètre devis-factures | [12] |
| Organilog | Interventions et maintenance, 90 secteurs | Pro : 19 € HT/utilisateur/mois en annuel ; Premium : 59 € | Planning, application mobile, rapports, stocks | Limites ressenties quand l'entreprise grandit (comparateur) | [13] [14] |
| Alobees | BTP 5 à 100 salariés | Dès 10 €/utilisateur/mois hors services | Planning et pointage de chantier | Pas un outil de devis-factures complet | [15] [16] |
| Praxedo | PME et grands comptes | 39 à 149 $/utilisateur/mois ; offre de départ dès 24,5 €/mois selon un autre relevé | Le plus complet en interventions | Complexité, coûts de mise en œuvre | [17] [18] |
| Batappli | — | Non relevé | — | — | — |

## Paramédical (pour mémoire, verticale fermée)

| Concurrent | Prix public relevé | Remarque | Source |
|---|---|---|---|
| Doctolib Pro | Pas de barème officiel ; 135 à 149 € TTC/mois rapportés, « dès 69 € » pour les kinés selon un guide | Annuaire patient, agenda, dossier, télétransmission | [19] [20] [21] |
| Maiia | ~99 € TTC/mois par utilisateur pour l'agenda | Module de facturation distinct pour télétransmettre | [22] [23] |
| Topaze | Dès 35 € HT/mois | Télétransmission SESAM-Vitale, cotations | [24] |
| Vega | Non relevé | Plus de 50 000 auxiliaires médicaux équipés selon un comparateur ; télétransmission agréée | [25] |
| Crénolibre | Dès 29,95 € HT/mois | Agenda en ligne pour bien-être et certains paramédicaux | [26] |

Constat : pour un kiné ou un orthophoniste conventionné, le critère d'entrée est la **télétransmission SESAM-Vitale**. MonService ne l'a pas. Sans portail patient ni prise de rendez-vous en ligne en V1, il ne répond pas non plus au besoin d'acquisition de patients. La cible réaliste, le jour où la verticale ouvrira, est le praticien **non conventionné** (ostéopathe, psychologue, diététicien), sous réserve de l'hébergement certifié.

## Positionnement (prix d'entrée mensuel × profondeur métier)

```
Profondeur métier
  forte │  Praxedo            Obat
        │  Organilog          Topaze / Vega
        │                     Doctolib
        │        MonService (terrain)
        │  Sellsy   Axonaut
        │        MonService (générique)
 faible │  Indy    Pennylane   Tolteck
        └──────────────────────────────── Prix d'entrée
           0 €        25–50 €        100 € et plus
```
Placement indicatif, fondé sur les fonctions listées dans `02_FEATURE_COVERAGE.md`.

## Ce que les concurrents ont et que MonService n'a pas

| Manque | Verticale | Valeur | Voir |
|---|---|---|---|
| Statut de plateforme agréée ou connexion à une plateforme | Toutes | Très forte dès septembre 2027, argument dès aujourd'hui | LR-008 |
| Comptes d'équipe | Toutes | Forte | LR-007 |
| Bibliothèque d'ouvrages et de prix | BTP | Forte | — |
| Application mobile, hors ligne | Terrain | Forte | — |
| Paiement en ligne des factures | Générique, BTP | Moyenne | Retiré en octobre |
| Synchronisation bancaire, comptabilité | Générique | Moyenne | Hors périmètre |
| Import de données | Toutes | Forte au démarrage | UX n° 20 |
| Télétransmission | Paramédical conventionné | Bloquante | — |

## Ce que MonService a déjà

- Un seul outil pour le commercial (opportunités), le devis, l'intervention, l'équipement installé et la facture. Obat et Tolteck s'arrêtent au devis-facture-chantier ; Organilog et Praxedo partent de l'intervention.
- Suivi des équipements clients avec maintenance préventive et étiquettes QR.
- Pas de minimum de licences ni d'engagement (à condition de le décider).
- Registre RGPD, demandes d'accès et rétention intégrés.

## Pourquoi payer MonService plutôt que l'outil actuel ?

| Verticale | Réponse honnête aujourd'hui | Ce qu'il faut pour convaincre |
|---|---|---|
| Générique | Pas convaincant face à Indy gratuit et agréé, ou à Axonaut à 30 € | Connexion à une plateforme agréée, équipe, import ; viser le prestataire qui fait aussi des interventions |
| Terrain et BTP | Convaincant pour un **dépanneur ou mainteneur** (plombier-chauffagiste, climaticien, électricien de maintenance) qui suit des équipements et des visites : ni Obat ni Tolteck ne couvrent ce suivi, et Praxedo est surdimensionné | Acceptation du devis par le professionnel, équipe, usage mobile fluide |
| Paramédical | Non | Hébergement certifié, puis prise de rendez-vous (version N) |

## Sources

1. comparatif-facture-electronique.fr, Sellsy vs Axonaut, mis à jour le 13 août 2026 — https://www.comparatif-facture-electronique.fr/sellsy-vs-axonaut/
2. comparepdp.com, avis Axonaut 2026 — https://comparepdp.com/articles/axonaut-avis
3. comparatif-facture-electronique.fr, Sellsy, 13 août 2026 — https://www.comparatif-facture-electronique.fr/sellsy-facturation-electronique-avis/
4. Sellsy, page tarifs — https://go.sellsy.com/tarifs
5. finance-heros.fr, Pennylane — https://finance-heros.fr/?p=51683
6. Pennylane, page tarifs — https://www.pennylane.com/fr/tarifs
7. freelance-solution.fr, avis Indy (sources mai 2026) — https://www.freelance-solution.fr/?p=2761
8. Indy, offre partenaire — https://indy.fr/partenaire/vorwerk
9. finance-heros.fr, Obat — https://finance-heros.fr/?p=87577
10. independant.io, avis Obat, 2 juin 2026 — https://independant.io/avis/obat/
11. Obat, site officiel — https://www.obat.fr/devis-factures/
12. independant.io, Tolteck, août 2026 — https://independant.io/code-promo/tolteck/
13. clubic.com, Organilog — https://www.clubic.com/telecharger-fiche440448-organilog.html
14. lafabriquedunet.fr, alternatives à Organilog — https://www.lafabriquedunet.fr/logiciels/alternatives/alternative-organilog
15. capterra.fr, Alobees — https://www.capterra.fr/software/1029479/alobees
16. Alobees, page tarifs — https://www.alobees.com/en/prices
17. costbench.com, Praxedo, août 2026 — https://www.costbench.com/software/field-service-management/praxedo/
18. getapp.fr, Praxedo — https://www.getapp.fr/software/104041/praxedo
19. pabau.com, tarif Doctolib, 15 octobre 2026 — https://pabau.com/fr/blog/doctolib-tarif/
20. meetergo.com, alternatives à Doctolib Pro — https://meetergo.com/fr/blog/alternative-doctolib-pro
21. indy.fr, comparatif logiciels kiné — https://www.indy.fr/guide/logiciel-kine-comparatif/
22. pabau.com, tarif Maiia, 15 octobre 2026 — https://pabau.com/fr/blog/maiia-tarif/
23. pabau.com, alternatives à Maiia Kiné, 30 octobre 2026 — https://pabau.com/fr/blog/alternatives-maiia-kin/
24. lafabriquedunet.fr, Topaze — https://www.lafabriquedunet.fr/logiciel/topaze
25. lonasante.com, logiciels orthoptiste — https://www.lonasante.com/?p=20058
26. pabau.com, alternatives à Doctolib — https://pabau.com/fr/blog/alternative-doctolib/
