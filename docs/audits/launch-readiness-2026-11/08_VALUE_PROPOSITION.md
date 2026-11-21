# 08 — Valeur ajoutée

**Aucun gain n'a été mesuré.** MonService n'a pas d'utilisateur en production et aucune télémétrie d'usage. Tout ce qui suit est une estimation à hypothèses explicites, à remplacer par les mesures du pilote.

## Où MonService retire du travail

| Tâche | Avant (hypothèse d'un artisan avec tableur + outil de factures) | Avec MonService | Gain estimé | Hypothèses |
|---|---|---|---|---|
| Passer du devis accepté à l'acompte, puis à l'ordre de travail, puis à la facture de solde | Ressaisie du client et des lignes à chaque étape | Un clic par étape, lignes reprises | `n × t` où `n` = dossiers par mois et `t` = minutes de ressaisie évitées | À mesurer : `t` chronométré sur 5 dossiers pendant le pilote |
| Retrouver l'historique d'un équipement chez un client | Recherche dans les anciens devis, appels | Fiche équipement avec interventions et QR | Dépend du nombre de visites de maintenance | Pertinent pour les mainteneurs seulement |
| Planifier les visites d'entretien | Agenda et rappels manuels | Maintenance préventive | Visites oubliées évitées | Exige le planificateur (LR-009) |
| Relancer les impayés | Manuel | Relances automatiques | — | **Aujourd'hui nul** : pas de planificateur, hors plan gratuit |
| Rapport d'intervention signé | Papier, photo, ressaisie | Rapport signé sur l'appareil, rattaché à l'opération | Ressaisie évitée | — |
| Tenir le registre RGPD, répondre à une demande d'accès | Rarement fait | Intégré | Risque réduit, pas du temps | — |

## Formule de conversion (à remplir avec les mesures)

```
gain mensuel (€) = heures gagnées par mois × valeur d'une heure
```
- La **valeur d'une heure** est une valeur théorique : elle ne devient une économie réelle que si l'heure gagnée est facturée ou retire une dépense.
- **Économies directes** possibles : abonnements remplacés. Exemple à vérifier chez chaque pilote : un outil de devis-factures (25 à 50 € par mois d'après `07_COMPETITOR_BENCHMARK.md`) plus un outil d'interventions (19 € et plus par utilisateur).
- Aucun chiffre d'heures gagnées n'est avancé ici : il n'existe pas de donnée pour le fonder.

## Protocole de mesure pendant le pilote

1. Avant : chaque pilote note pendant une semaine le temps passé aux devis, factures, planification et relances.
2. Pendant : journaliser dans l'application la durée entre « devis créé » et « devis envoyé », le nombre de documents générés sans ressaisie, les relances parties.
3. Après quatre semaines : même relevé, puis entretien de 20 minutes.

## Avantages concurrentiels crédibles

### Terrain et BTP
1. **Chaîne unique** opportunité → devis par lots → acompte → ordre de travail → rapport signé → solde (testée de bout en bout).
2. **Parc d'équipements clients** avec maintenance préventive et étiquettes QR.
3. **Pas de minimum de licences** : à décider dans la grille tarifaire.
4. Limites actuelles : pas de bibliothèque de prix, pas d'application mobile, pas d'équipe.

### Générique
1. CRM, devis, factures et tâches au même endroit pour un prestataire qui fait aussi de l'intervention.
2. Conformité RGPD intégrée.
3. Avantage faible tant que la facturation électronique, l'équipe et l'import manquent.

### Paramédical (verticale fermée)
1. Dossier clinique structuré par profession, agenda avec salles et ressources.
2. Statistiques du cabinet.
3. Sans hébergement certifié ni télétransmission, ces atouts ne sont pas vendables.

## Automatisations et IA

Non recommandé avant le pilote. Trois automatisations simples ont un intérêt démontrable et un coût faible : relances de factures, rappel de visite d'entretien, duplication d'un devis. Les deux premières dépendent du planificateur. Une saisie de devis par dictée existe chez Obat ; à étudier après les retours du pilote, pas avant.
