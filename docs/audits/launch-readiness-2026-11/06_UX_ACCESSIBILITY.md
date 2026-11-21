# 06 — Ergonomie et accessibilité

**Limite importante** : cet examen est statique (lecture du code, comptages). Aucun écran n'a été ouvert, aucune capture prise, aucun test au clavier ou au lecteur d'écran réalisé. Les 20 points ci-dessous sont des constats de code ou des risques à confirmer en séance. Aucune conclusion de conformité WCAG ou RGAA n'est possible à ce stade.

## Comptages (dans `src/`)

| Indicateur | Valeur | Lecture |
|---|---|---|
| Pages `error.tsx`, `not-found.tsx`, `loading.tsx` | 0 | Erreurs et chargements non habillés |
| Lien d'évitement « Aller au contenu » | 0 | Critère RGAA 12.7 |
| Prise en compte de `prefers-reduced-motion` | 0 | La page d'accueil anime (rotation, mise à l'échelle) |
| `outline-none` | 257, dont 208 avec anneau de focus sur la même ligne | Jusqu'à 49 éléments sans focus visible, à vérifier |
| `alert()` / `confirm()` natifs | 57 | Confirmations non stylées, peu lisibles sur mobile |
| Champs de saisie | 349 pour 175 associations `htmlFor` / `aria-label` | Heuristique : des champs sans libellé programmatique sont probables |
| Boutons | 383 pour 66 `aria-label` | Les boutons à icône seule sont à contrôler |
| `text-gray-400` / `text-gray-300` | 159 | Contraste probablement inférieur à 4,5:1 sur fond blanc |
| Zones `role="alert"`, `role="status"`, `aria-live` | 33 | Présent mais partiel |
| Lot JavaScript le plus lourd | 1,49 Mo | Pénalise le mobile sur chantier |

## Les 20 points prioritaires

Effort : S ≤ 0,5 j, M 1–2 j, L 3 j et plus.

| # | Écran ou parcours | Problème | Conséquence | Correction | Effort | Gain |
|---|---|---|---|---|---|---|
| 1 | Inscription | Choix « particulier » affiché | Des particuliers créent des comptes sans objet | Retirer l'étape (LR-001) | S | Conversion |
| 2 | Devis | Pas d'action « Devis accepté » pour le professionnel | Parcours bloqué | Bouton + date, mode d'accord, pièce jointe facultative (LR-002) | M | Adoption |
| 3 | Création en plan gratuit | Refus sec au 11ᵉ devis du mois | Abandon | Droits du pilote + message clair avant la limite (LR-003) | S | Adoption |
| 4 | Toute erreur serveur | Page d'erreur brute | Perte de confiance | `error.tsx`, `not-found.tsx` avec retour au tableau de bord | S | Confiance |
| 5 | Navigation entre pages | Aucun état de chargement | Impression de blocage sur réseau lent | `loading.tsx` et squelettes sur les listes | M | Rapidité perçue |
| 6 | Suppressions | `confirm()` natif | Erreurs de manipulation au doigt | Boîte de dialogue accessible commune | M | Fiabilité |
| 7 | Page d'accueil | Tarifs payants alors que le lancement est gratuit | Incompréhension | Bloc « Accès pilote gratuit » (LR-011) | S | Conversion |
| 8 | Page d'accueil | Secteurs « Médecins, thérapeutes » | Demandes hors périmètre | Limiter aux deux secteurs ouverts | S | Clarté |
| 9 | Nouveau devis | Écran de 912 lignes, formulaire long | Lenteur sur mobile | Étapes, enregistrement automatique du brouillon | L | Rapidité |
| 10 | Détail d'opération | Composant de 1 164 lignes, forte densité | Difficile à lire sur chantier | Onglets, actions principales en bas d'écran | L | Usage terrain |
| 11 | Factures | Moteur PDF chargé avec l'application | Premier affichage lent | Chargement à la demande (LR-026) | M | Rapidité |
| 12 | Tous formulaires | Libellés non reliés aux champs | Lecteur d'écran, saisie vocale | Composant de champ unique avec `htmlFor` | M | Accessibilité |
| 13 | Boutons à icône | Pas de nom accessible | Idem | `aria-label` systématique | S | Accessibilité |
| 14 | Focus | Contour supprimé sans remplacement | Navigation clavier | `focus-visible:ring` dans le système de composants | S | Accessibilité |
| 15 | Textes secondaires | Gris trop clair | Lisibilité en extérieur | `gray-500` minimum pour le texte | S | Lisibilité |
| 16 | Structure de page | Pas de lien d'évitement | Clavier | Lien en tête du gabarit | S | Accessibilité |
| 17 | Animations | Non désactivables | Inconfort | `motion-reduce:` sur les transitions | S | Accessibilité |
| 18 | Menu | Marketplace et messages visibles | Fonctions vides en V1 | Masquer (LR-022, LR-023) | S | Clarté |
| 19 | Paramètres | Deux chemins : `/parametres/*` et `/settings/reminders` | Recherche d'un réglage | Regrouper | S | Cohérence |
| 20 | Démarrage | Pas d'import de clients | Ressaisie complète en venant d'un autre outil | Import CSV avec aperçu | M | Adoption |

Classement par impact sur l'adoption : 2, 3, 1, 20, 4, 5. Sur la rapidité : 9, 11, 10, 5. Sur la conversion : 7, 8, 1.

## Accessibilité : obligations

À faire confirmer par un juriste : la directive européenne sur l'accessibilité (2019/882, applicable depuis le 28 juin 2025) vise des services aux consommateurs et exempte les microentreprises prestataires de services ; un logiciel de gestion vendu à des professionnels par une microentreprise est a priori hors champ. L'objectif WCAG 2.2 AA reste un objectif de qualité, pas une obligation établie ici.

## Séance de test à tenir avant le pilote (une demi-journée)

1. Clavier seul sur inscription, client, devis, facture.
2. VoiceOver sur les mêmes écrans.
3. Zoom 200 % et largeur 320 px.
4. axe DevTools sur dix écrans, résultats consignés dans `12_TEST_RESULTS.md`.
5. Téléphone Android milieu de gamme en 4G dégradée : chronométrer « nouveau devis envoyé ».
6. Deux professionnels non techniciens, tâche « créer un client et envoyer un devis », sans aide.
