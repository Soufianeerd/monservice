# Outils de croissance (migration 0020)

Réponse aux arguments commerciaux des offres « tout-en-un » pour artisans
(type Plus que PRO : avis clients certifiés, relances, page vitrine,
suivi de trésorerie), intégrée au CRM et sans engagement.

Périmètre : workspaces Générique et Field Service. **Exclu pour le secteur
santé** (règles déontologiques sur la publicité et les avis, hébergement HDS) —
en base (`organization_growth_allowed`) comme dans l'interface.

## Fonctionnalités
| Écran | Ce qu'il fait |
|---|---|
| Facture › « Marquer comme réglée » | Saisie du règlement (date, virement/chèque/espèces/carte/prélèvement/autre). Jusqu'ici une facture ne passait « payée » que par le webhook Stripe, désactivé au lancement. |
| Facturation › Trésorerie | Encaissé (mois, année), à encaisser, en retard, échéances à 30 jours, 12 mois facturé/encaissé, ancienneté des créances, clients en retard, factures échues. |
| Trésorerie › Export | Journal des ventes CSV (`;`, virgule décimale, UTF-8 BOM), formules de tableur neutralisées. `/api/exports/ventes?from=&to=`, session professionnelle. |
| Paramètres › Relances et avis | Administrateur : relance des factures échues (J+7, J+15, dernier rappel J+30), relance unique des devis sans réponse (3 à 30 jours), demande d'avis après règlement (0 à 30 jours). Historique des envois. Tout est désactivé par défaut. |
| Avis clients | Note moyenne, factures réglées sans demande (« Demander un avis »), demandes en attente (retrait du lien), avis reçus : réponse publique, signalement à MonService. |
| `/laisser-un-avis?token=` | Page sans compte : note 1–5, commentaire, nom affiché pré-rempli « Prénom N. ». Lien à usage unique, 30 jours. |
| Paramètres › Vitrine publique | Adresse `/pro/<slug>`, accroche, présentation, zone et villes, prestations, site https, téléphone/e-mail affichés au choix, réalisations (30 max), publication. |
| `/pro/<slug>` | Page publique indexable : coordonnées choisies, « Demander un devis » (mailto), réalisations, avis vérifiés avec réponses, données structurées `LocalBusiness` (sans note agrégée, que Google ignore pour des avis collectés par l'entreprise). Plan du site. |

## Garanties (base de données)
- Nouvelles tables en lecture seule pour `monservice_runtime`, filtrées par organisation ; toute écriture passe par une fonction `SECURITY DEFINER` bornée.
- Un avis ne naît que d'un lien émis pour une **facture réglée** de l'organisation, vers l'adresse e-mail de son client ; une seule demande vivante par facture ; jeton stocké en SHA-256.
- Note et commentaire immuables. Le professionnel répond ou signale ; il ne masque pas. Le masquage (`hidden_at`) relève de la modération MonService, par le propriétaire de la base.
- Réglages, réponses, vitrine et réalisations : administrateur de l'organisation uniquement.
- Le worker `monservice_reminders` ne lit plus `invoices` ni `clients` : uniquement `due_automation_items()`. Chaque envoi est réservé (`claim_automation_delivery`, unicité document/type/niveau) avant de partir — ni double envoi, ni rafale si la tâche est relancée.
- Lecture publique : `public_professional_*` ne renvoient que les vitrines publiées et les champs choisis.

## Exploitation
- Tâche planifiée Netlify `netlify/functions/daily-automations.mts` (7 h UTC) → `/api/reminders/check` avec `CRON_SECRET`. Un professionnel ne peut plus déclencher d'envoi à la demande.
- Un envoi en échec n'est pas retenté automatiquement (statut « Échec » dans l'historique) : on évite les boucles d'envoi.
- E-mails envoyés au nom de l'organisation, réponse vers son adresse (Organisation › e-mail). Aucune relance ne pointe vers un espace client (fermés en V1).

## Validation
- 17 scénarios SQL sous les rôles runtime, anonyme et worker (PostgreSQL 16 local), `check-schema-contract` et `check-custom-objects` verts.
- Tests unitaires : `__tests__/unit/growth/` (trésorerie, export, jetons, validations, gabarits).
- Intégration Neon : `tests/integration/growth-tools.integration.test.ts` (dans `test:rls`).
- Navigateur : `e2e/growth-tools.spec.ts` (règlement → avis → vitrine → réponse → export).

## Non couvert (à décider)
- Photos des réalisations (stockage public d'images à ouvrir).
- Formulaire de contact sur la vitrine (nécessite une protection anti-spam) ; le bouton « Demander un devis » ouvre la messagerie du visiteur.
- Règlements partiels.
- Modération des avis signalés : aujourd'hui par requête SQL du propriétaire ; écran d'administration à prévoir.
