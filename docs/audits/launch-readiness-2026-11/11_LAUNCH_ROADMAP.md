# 11 — Stratégie et feuille de route

## Trois stratégies

| Critère | A. Trois workspaces d'un coup | B. Une verticale puis les autres | C. Pilote fermé puis ouverture |
|---|---|---|---|
| Travail restant | Le plus long : HDS, télétransmission | Moyen | Le plus court |
| Risque réglementaire | Bloquant (santé) | Faible si santé exclue | Faible |
| Support | Trois métiers à la fois, seul | Un métier | 5 à 10 utilisateurs connus |
| Valeur démontrée | Aucune mesure | Aucune mesure | Mesurée pendant le pilote |
| Acquisition | Message dilué | Message net | Réseau direct |
| Revenus | Théoriques | Différés | Différés de 4 à 6 semaines, mais fondés |
| Capacité réelle à livrer | Non | Oui | Oui |

**Recommandation : C, puis B.** Pilote fermé « Artisans de maintenance et dépannage + indépendants de services », puis ouverture payante de la verticale qui retient. A est exclu par LR-006.

Pourquoi le terrain d'abord : c'est le parcours le mieux testé, celui où l'écart avec les concurrents d'entrée de gamme est le plus net (équipements, interventions), et l'activité a déjà des contacts dans l'automobile et les services en Moselle et au Luxembourg.

## Chemin critique

Estimations pour un développeur seul, en jours ouvrés. À recalibrer après le premier lot.

### Phase 1 — Sécurisation (5 à 6 j)

| # | Tâche | Fichiers | Dépend de | Effort | Validation |
|---|---|---|---|---|---|
| 1.1 | Confirmer la CI verte sur `e4c82fc` | — | — | 0,5 | Run vert |
| 1.2 | **LR-002** Acceptation du devis par le professionnel : date, mode d'accord, pièce jointe facultative ; l'acompte, la facture et l'ordre de travail suivent | `billing/authorization.ts`, `quote.service.ts`, `quote.actions.ts`, écran du devis, migration `0019` si colonnes | — | 2 | Parcours devis-facture sans compte client |
| 1.3 | **LR-001** Fermeture des accès client aux trois niveaux | migration `0020`, `actions/auth.ts`, `proxy.ts`, `client/layout.tsx`, `RegisterForm.tsx`, `complete-profile`, fiche client, navigation | 1.2 | 2 | Tests de refus (action, SQL, routes) ; specs portails sous indicateur « version N » |
| 1.4 | **LR-003** Droits du pilote : plan effectif « Pro » pour tous tant que Stripe est coupé | `billing/plans.ts`, test E2E sans forçage dans le seed | — | 0,5 | Parcours complet sur un compte neuf |
| 1.5 | LR-016, LR-017, LR-028 : en-têtes, route de simulation, promesse de sécurité | `next.config.ts`, route simulate, `FAQ.tsx` | — | 0,5 | Tests d'en-têtes |

### Phase 2 — Stabilisation (4 à 5 j)

| # | Tâche | Effort | Validation |
|---|---|---|---|
| 2.1 | **LR-007** Invitation d'un collaborateur (e-mail, rôle, limite du plan), liste et retrait | 3 | Deux comptes dans une organisation, droits distincts, RLS |
| 2.2 | LR-010 Pages d'erreur, de chargement et « introuvable » | 0,5 | Visuel + test |
| 2.3 | LR-010 Suivi d'erreurs et sonde | 0,5 | Alerte reçue sur erreur provoquée |
| 2.4 | LR-009 Deux fonctions planifiées | 0,5 | Rappel reçu sur la validation |
| 2.5 | LR-022, LR-023 Masquer marketplace et messagerie | 0,25 | Navigation |

### Phase 4 — Préparation (3 à 5 j, en parallèle des phases 1 et 2)

| # | Tâche | Qui | Effort |
|---|---|---|---|
| 4.1 | **LR-004** Domaine, DNS, Resend vérifié, SMTP de l'authentification, preuve de réception | Soufiane | 0,5 + délai DNS |
| 4.2 | **LR-005** Plan Neon avec restauration, exercice consigné | Soufiane | 0,5 |
| 4.3 | LR-011 Page d'accueil « accès pilote », deux secteurs, retrait des tarifs | Dev | 0,5 |
| 4.4 | Conditions générales, annexe de sous-traitance, liste des sous-traitants | Soufiane + relecture juridique | 1 à 2 |
| 4.5 | Merge de la PR, variables Netlify, rejeu 0014–0020, préflight, feu vert | Soufiane | 0,5 |
| 4.6 | Séance de test UX et accessibilité (`06`) | Dev | 0,5 |

**Total chemin critique : 12 à 16 jours**, hors délais externes.

### Phase 5 — Pilote (4 à 6 semaines)

5 à 10 professionnels recrutés directement. Critères de sortie : 60 % d'actifs en semaine 4, au moins 3 qui déclarent vouloir payer, temps « devis envoyé » mesuré, zéro incident de données.

### Phase 3 — Différenciation (pendant le pilote, selon retours)

| Candidat | Effort | Condition de lancement |
|---|---|---|
| Import CSV des clients | 1,5 j | Demandé par au moins 3 pilotes |
| Chargement à la demande du PDF, optimisations mobiles | 1 j | LCP hors seuil |
| Connexion à une plateforme agréée | 5 à 8 j | À engager avant mars 2027 |
| Bibliothèque de prestations par métier | 3 j et plus | Si les artisans du bâtiment dominent le pilote |

### Phase 6 — Ouverture payante

Stripe réactivé, grille tarifaire tranchée, essai de 14 jours, page d'accueil par métier.

### Phase 7 — Plus tard

Version N (accès clients et patients, code conservé), paramédical sous hébergement certifié, application mobile, second facteur, nouvelles verticales.

## Tarification : hypothèses à tester

Coût d'infrastructure par compte : non calculé (dépend du plan Neon choisi). Coût d'acquisition : inconnu. Les prix ci-dessous sont des hypothèses de départ, pas des recommandations fondées sur une valeur démontrée.

| Hypothèse | Structure | Repère de marché |
|---|---|---|
| H1 « Solo » | 19 à 25 € HT/mois, 1 utilisateur, tout inclus | Tolteck ~25 €, Obat 25 à 32 €, Organilog 19 € par utilisateur |
| H2 « Équipe » | 49 € HT/mois pour 3 utilisateurs, puis 12 € par utilisateur | Sellsy : 98 € minimum pour 2 ; Axonaut ~30 € par utilisateur |
| H3 « Par verticale » | Générique moins cher que Terrain | À éviter au début : complexifie le message |
| Offre fondateurs | Pilotes : gratuit pendant le pilote, puis −50 % pendant 12 mois | — |

Ne pas maintenir une offre gratuite permanente face à Indy : MonService ne peut pas la financer et elle n'attire pas la cible visée. Préférer un essai.

## Acquérir les premiers payants

1. Réseau direct : garages, artisans et prestataires déjà en contact (Moselle, Meurthe-et-Moselle, Luxembourg).
2. Installation accompagnée d'une heure : import des clients, premier devis réel ensemble.
3. Message unique : « du devis à la facture et au suivi de vos équipements, sans ressaisie ».
4. Un cas client chiffré issu du pilote avant toute publicité.

## Risques résiduels

| Risque | Parade |
|---|---|
| Développeur unique : support, incidents, développement | Pilote limité à 10 ; supervision ; documentation d'incident |
| Authentification sur SDK bêta | Version figée, tests d'authentification en CI |
| Échéance de septembre 2027 | Intégration d'une plateforme agréée planifiée au premier semestre 2027 |
| Demande d'accès client par les pilotes | Assumer la réponse « version suivante » ; consigner la demande |
| Positionnement générique trop large | Laisser le pilote décider de la verticale |
