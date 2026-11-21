# Veille concurrentielle UI/UX — MonService

**Date :** 21 novembre 2026
**Périmètre :** logiciels utilisés par les indépendants français dans les trois univers de MonService (prestataires généralistes, métiers du terrain / BTP, santé et bien-être), avec quelques références internationales.
**Méthode :** recherche web (sources 2026 en priorité : comparatifs, pages tarifs, avis Trustpilot/Capterra cités par ces comparatifs), puis lecture du code MonService en lecture seule (`src/app/(auth)/register`, `src/components/auth/RegisterForm.tsx`, `src/app/page.tsx`, `src/components/landing/*`, `src/components/layout/*`, `src/app/(dashboard)/dashboard/page.tsx`, `src/components/dashboard/*`, `src/app/globals.css`, `src/app/layout.tsx`, `src/components/ui/Button.tsx`).
**Limites :** je n'ai pas créé de compte chez les concurrents. Les parcours d'inscription décrits viennent de tests publiés par des comparateurs ou des pages d'aide. Ce qui n'a pas pu être vérifié est indiqué « non vérifié ». Les prix sont HT sauf mention contraire et peuvent avoir changé.

---

## 0. Synthèse en 6 points

1. **Le prix n'est plus un argument.** La facturation de base est gratuite chez Abby, Tiime, Henrri et Costructor (offre Starter). La gratuité de lancement de MonService ne le distingue donc pas. La différence doit venir de l'expérience : la vitesse jusqu'au premier devis, le mobile et un vrai métier par univers.
2. **Dans le BTP, le devis par IA (voix, texte, photo) est devenu standard en 2026.** Obat, Costructor et une vague de nouveaux entrants (Chantiq, Ona Devis, VocalDevis, Chantier Vocal, Artibot) promettent un devis en 2 minutes, voire en quelques secondes. MonService n'a rien d'équivalent.
3. **Le mobile est la règle chez les artisans.** Il faut une application native ou une PWA complète, avec idéalement un mode hors ligne (Tolteck). MonService n'a ni PWA, ni barre de navigation basse, ni bouton d'action flottant.
4. **Le délai avant le premier résultat utile (TTFV) décide de l'activation.** En moyenne, seuls 37,5 % des inscrits B2B SaaS sont activés. Le parcours d'inscription actuel compte 3 écrans, mais il remplit trop de champs avant le premier résultat et arrive sur un tableau de bord vide (pour l'univers généraliste).
5. **L'identité visuelle de MonService est générique.** Il reprend l'indigo par défaut de Tailwind, une icône lucide « Hexagon » en guise de logo, et la police Geist est chargée puis écrasée par Arial. La barre latérale sombre ne ressemble pas à la page d'accueil claire. Pour se démarquer, il faut un système de design assumé, avec une couleur d'accent par univers.
6. **La conformité à la facture électronique est un argument marketing majeur.** Depuis le 1er septembre 2026, toutes les entreprises doivent recevoir des factures électroniques. L'émission devient obligatoire pour les PME et micro-entreprises le 1er septembre 2027. Abby, Tiime, Sellsy et Costructor l'affichent en page d'accueil. MonService génère des formats UBL et Factur-X (`src/lib/services/einvoice.service.ts`), mais n'en parle pas sur sa page d'accueil. Aucune connexion à une plateforme agréée n'a été repérée.

---

## 1. Tableau concurrentiel

### 1.1 Métiers du terrain / BTP (France)

| Outil | Positionnement | Prix 2026 | Onboarding (ce qui est documenté) | Forces UX | Faiblesses citées |
|---|---|---|---|---|---|
| **Obat** | Leader des logiciels de devis et factures pour le BTP. Revendique 21 000 entreprises clientes [1][2] | Micro-entrepreneur : 25 à 85 €/mois en annuel (32 à 95 € en mensuel). Société : 39 à 109 €/mois en annuel (49 à 129 € en mensuel). Essai de 14 jours [2] | Demande l'activité à l'inscription [2]. Nombre d'étapes exact non vérifié | Assistant vocal pour rédiger les devis, IA qui part d'une dictée, d'un texte, d'une **photo ou d'un PDF** [3]. Bibliothèque de plus de 30 000 libellés et intégration Batichiffrage. Application mobile et tablette dans toutes les offres [2]. Interface jugée claire, avec des devis faisables entre deux chantiers [3] | Prix au-dessus du marché [2]. Notes : 4,9/5 sur Google (environ 2 800 avis), 4,5/5 sur Trustpilot [2] |
| **Costructor** | Logiciel BTP « boosté à l'IA », de l'artisan seul jusqu'aux entreprises de 100 salariés [4][5] | Starter gratuit. Pro à 15 €/mois (12,50 € en annuel), Business+ à 30 €, Premium à 60 €. Crédits IA de 150, 750 et 2 250 par mois selon l'offre [5] | **Saisie automatique de l'entreprise et des mentions légales via les données INSEE, en 1 clic.** On choisit les fonctionnalités qui nous intéressent. Inscription en quelques minutes [5] | Devis par IA en dictée ou en texte dès l'offre Pro. Avec Premium, un assistant **conversationnel pilote tout le compte**, à l'oral ou à l'écrit [5]. Toutes les fonctionnalités sont dans l'application mobile iOS et Android [5]. Avis : simplicité, pas besoin d'un « bac+5 en informatique » [6] | Pas de mode hors ligne. Planning et équipe seulement à partir de Business+ [5]. Trustpilot 4,1 [6] |
| **Tolteck** | Devis et factures pour les artisans du bâtiment, « en 5 minutes » [7] | 25 €/mois sans engagement ou 19 €/mois en annuel [8] | Création de compte gratuite. Étapes non vérifiées | **Fonctionne avec ou sans réseau** (hors ligne), sur Mac, PC, tablette et smartphone. Bibliothèque d'ouvrages, facture électronique [7] | Peu d'IA mise en avant (aucune mention sur la page d'accueil) [7]. La page affiche un compteur « 0 artisans », signe d'un site vieillissant [7] |
| **Batappli** | Éditeur historique (depuis 1999), du devis jusqu'au chantier [9] | Devis à 39 €/mois, Artisan à 79 €/mois, Entreprise plus cher. Formules annuelles de 429 à 869 €/an [9][10] | Non vérifié | Couverture fonctionnelle étendue, Batichiffrage | Image de logiciel ancien. Prix d'entrée élevé (avis non vérifiés en détail) |
| **Nouveaux entrants IA** (Chantiq, Ona Devis, VocalDevis, Chantier Vocal, Artibot) | Devis IA à partir de la voix, y compris par **vocal WhatsApp** | Essais gratuits, parfois sans carte bancaire. Ona : 2 mois d'essai [11] | Inscription minimale, l'objectif étant le premier devis | On dicte le chantier, l'IA propose les lignes, la TVA et un PDF « en 2 min » (Chantiq). VocalDevis promet un PDF en 12 secondes à partir d'un vocal WhatsApp. Prise de cotes dictée (Artibot) [11] | Produits jeunes, avec un périmètre étroit (devis seulement) |

### 1.2 Prestataires généralistes, freelances, TPE (France)

| Outil | Positionnement | Prix 2026 | Onboarding | Forces UX | Faiblesses |
|---|---|---|---|---|---|
| **Abby** | Facturation et comptabilité pour les indépendants. Revendique plus de 150 000 utilisateurs [12] | Facturation illimitée et facture électronique **gratuites**, puis à partir de 9 €/mois [12] | Non vérifié en détail | Application mobile iOS et Android (plus de 100 000 téléchargements). Identité forte : mascotte, typographie manuscrite, rose. **« Facturation électronique conforme 2026 (plateforme agréée) » en page d'accueil** [12]. Note de 4,8 [12] | Plainte isolée sur Trustpilot à propos d'une offre de création d'entreprise payante [13] |
| **Tiime** | Facturation et compte pro **100 % gratuits** [14] | Offre gratuite (Tiime Invoice) avec facturation illimitée et conforme à la réforme 2026. Essai de 2 mois pour l'offre payante [14] | Non vérifié | Application mobile et argument de conformité 2026 [14] | Non vérifié |
| **Henrri** | Facturation gratuite et illimitée [15] | Gratuit, payant à partir de 19 €/mois [16] | Non vérifié | Gratuit sans publicité | Interface jugée plus fonctionnelle qu'esthétique [15]. Ni application mobile ni statut de plateforme agréée selon Sellsy [17] |
| **Freebe** | Gestion pour freelances | À partir de 12,50 €/mois [16] | Non vérifié | Spécialisation freelance | Non vérifié |
| **Sellsy** | Suite modulaire (CRM, facturation, trésorerie) pour TPE et PME, plus de 65 000 entreprises, **plateforme agréée par la DGFiP** [17] | À partir de 29 à 47 €/mois selon les sources. Module facturation de 39 à 79 €/utilisateur [16][15]. Essai de 15 jours [17] | Non vérifié | Modularité : on commence par la facturation, puis on ajoute des modules [17] | Prix par utilisateur |
| **Axonaut** | ERP/CRM tout-en-un pour TPE [18] | 69,99 €/mois pour le premier utilisateur, puis 14,99 € par utilisateur [18]. Essai de 15 jours [17] | Non vérifié | Couverture très large (CRM, ventes, achats) [18] | Prix d'entrée élevé. Certains avis Capterra jugent la gestion des achats insuffisante [18] |
| Pennylane | Comptabilité pour TPE et PME | Non vérifié | Non vérifié | Non vérifié | Non vérifié |

### 1.3 Santé et bien-être (France et international)

| Outil | Positionnement | Prix 2026 | Onboarding | Forces UX | Faiblesses |
|---|---|---|---|---|---|
| **Doctolib Pro** | Agenda, visibilité et téléconsultation. Plus de 500 000 soignants [19] | Kiné : 69 € TTC/mois. Ostéopathe, psychologue, diététicien, podologue, sage-femme : **version gratuite, puis 139 €/mois** [19]. Téléconsultation à environ 79 €/mois en plus selon un syndicat [20] | **Parcours assisté par un conseiller** : formulaire de contact, appel, paramétrage de l'agenda, import de la patientèle, formation, mise en ligne de la fiche [19] | Notoriété auprès des patients, rendez-vous 24h/24, **rappels SMS et e-mail**, application mobile Pro [19] | Coût élevé pour un petit cabinet, **hausses de prix successives**, support contesté, dépendance à un acteur dominant [19] |
| **Perfactive** | Gestion complète du cabinet (agenda, réservation, dossier, facturation, téléconsultation) [21] | De 19 à 29 € TTC/mois, sans engagement [21][22] | Non vérifié | **Depuis l'agenda, un clic crée une facture pré-remplie** (patient, date, prix). Devis avec signature électronique, acomptes [21] | Non vérifié |
| **Fresha** | Réservation et marketplace pour salons, spas et masseurs | **Fin du modèle gratuit**. 14,95 $ par membre de l'équipe et par mois, plus une commission de 20 % sur le premier rendez-vous d'un nouveau client issu de la marketplace (6 $ minimum). Essai de 7 jours. Les sources ne s'accordent pas sur la date de fin de la gratuité (2025 ou juillet 2026) [23][24] | Essai de 7 jours [24] | Marketplace qui apporte des clients, application | Coût total qui grimpe vite. Contre-offres qui misent sur un prix fixe [24] |
| **Planity** | Réservation beauté et bien-être | Non vérifié | Non vérifié | Notoriété grand public | **Augmentations de prix** dénoncées dans les avis et les groupes de professionnels [25] |
| Maiia, Weblib, Kiné+, Simplébo, SimplyBook | — | Non vérifié | Non vérifié | Non vérifié | Non vérifié |

### 1.4 Références internationales (métiers du terrain)

| Outil | Positionnement | Prix 2026 | Onboarding | Forces UX | Faiblesses |
|---|---|---|---|---|---|
| **Jobber** | Logiciel de gestion d'interventions pour petites équipes | Core 49 $/mois (1 utilisateur), Connect 129 $ (jusqu'à 5), Grow 249 $ (jusqu'à 15). Essai de 14 jours [26] | La plupart des entreprises sont opérationnelles **en une journée**. L'aide en ligne découpe le paramétrage en modules de 5 à 10 minutes [26][27] | **Application mobile jugée la meilleure de sa catégorie** (4,5+ sur les stores) : planning, itinéraire, pointage, formulaires, photos, encaissement et facture depuis le terrain [26]. Fiche client avec historique complet sous forme de frise [26] | Marketing et reporting basiques, offre Core restrictive, gros écarts de prix entre les offres [26] |
| **Housecall Pro** | Gestion pour les métiers de la maison (chauffage, plomberie, électricité) | 59, 149 et 299 $/mois en annuel. Essai de 14 jours **sans carte bancaire** [28] | Opérationnel en quelques jours [29] | **Suite d'agents IA** : CSR AI répond aux appels 24h/24 et prend les rendez-vous, plus des agents Analyst, Coach et Marketing [28]. Paiement versé le jour même. Devis « bon / mieux / meilleur » avec photos et financement, qui augmenterait le panier de 15 à 25 % [29] | Application Android notée 3,2. Options payantes qui alourdissent la facture de 30 à 50 %. Relances commerciales insistantes [28][29] |
| ServiceTitan | Grandes entreprises de services | Non vérifié | Non vérifié | — | Complexité et prix cités par comparaison [28] |

---

## 2. Tendances UI/UX 2026 qui comptent dans cette niche

1. **Le devis génératif multimodal (voix, texte, photo, PDF) devient le cœur du produit BTP.** Obat accepte une dictée, une description, une photo ou un PDF [3]. Costructor intègre l'IA dès 15 €/mois [5]. Une dizaine d'entrants n'existent que pour ça [11]. On promet désormais un devis en moins de 2 minutes.
2. **L'assistant conversationnel remplace une partie de la navigation.** Costructor Premium pilote le compte par la conversation [5]. Housecall Pro répond aux appels et prend des rendez-vous à la place de l'artisan [28]. Concrètement, une **barre de commande ou de saisie libre** (« Facture Dupont 450 € plomberie ») devient un raccourci principal.
3. **Une application complète, et pas une version allégée.** Les avis valorisent le fait de pouvoir tout faire sur l'application [4][5]. Le mode hors ligne différencie Tolteck [7]. Jobber doit une bonne partie de sa réputation à son application [26].
4. **Les données d'entreprise se remplissent toutes seules.** Grâce au SIRET et à l'INSEE, on n'a plus à taper ses mentions légales (Costructor [5]).
5. **La conformité à la facture électronique est mise en avant dans l'interface.** On voit des badges « plateforme agréée » et « conforme 2026 » en page d'accueil (Abby [12], Tiime [14], Sellsy [17]). Le calendrier : réception obligatoire pour toutes les entreprises au 1er septembre 2026, émission obligatoire pour les PME et micro-entreprises au 1er septembre 2027 [30][31].
6. **Une course au gratuit sur la facturation, et un rejet des hausses de prix.** Abby, Tiime, Henrri et Costructor ont une offre gratuite [12][14][15][5]. Doctolib, Planity et Fresha sont critiqués pour leurs augmentations [19][25][24]. Un **prix lisible et stable** fait partie de l'expérience promise.
7. **Le TTFV, ou délai avant la première valeur, devient l'indicateur clé de l'onboarding.** L'activation moyenne en B2B SaaS est de 37,5 % [32]. Un onboarding assisté par IA réduirait le temps d'activation de 25 à 40 % [33].
8. **Le flux opérationnel passe avant le tableau de bord.** Les écrans d'accueil évoluent vers « Aujourd'hui » plutôt que vers des graphiques : la facture se crée en un clic depuis l'agenda (Perfactive [21]), et l'application de terrain est organisée autour de la journée de l'intervenant (Jobber [26]).
9. **L'accessibilité devient une exigence d'achat.** L'European Accessibility Act s'applique depuis le 28 juin 2025. Les micro-entreprises de services en sont exemptées, mais les clients plus gros l'exigent souvent [34][35]. Pour un public d'artisans sur le terrain, cela veut dire contraste élevé, grandes zones de toucher et erreurs explicites.

---

## 3. Écarts concrets de MonService face aux meilleurs, classés par impact

Chaque constat est tiré du code.

### P0 — impact direct sur l'inscription et l'activation

| # | Écart | Constat dans le code | Référence concurrente | Impact |
|---|---|---|---|---|
| 1 | **Pas de « premier résultat » guidé après l'inscription** | `RegisterForm` redirige vers `/dashboard`. Pour l'univers généraliste, `dashboard/page.tsx` affiche un titre, des indicateurs et un graphique des « affaires gagnées » : **tout est à zéro pour un nouveau compte**, sans action principale. L'univers terrain propose bien deux raccourcis (« Nouvelle intervention » et « Nouveau devis » dans `FieldServiceDashboard.tsx`), mais sans accompagnement | Devis en 2 min (Chantiq, Obat) ; Jobber opérationnel en un jour | Très fort, sur l'activation |
| 2 | **Inscription lourde et sans saisie automatique** | Étape 1 : nom, e-mail, mot de passe **et confirmation du mot de passe**. Étape 3 : secteur, métier, nom de l'entreprise, ville **obligatoire**, téléphone. Étape 4 : CGU. Pas de connexion Google ou Apple, pas de recherche par SIRET (le SIRET est renvoyé à plus tard, ligne 437). Les erreurs s'affichent dans des **toasts** au lieu d'apparaître sous le champ concerné | Costructor : saisie INSEE en 1 clic [5] | Fort |
| 3 | **Aucune aide IA à la saisie des devis** | Rien d'équivalent dans le code parcouru | Obat, Costructor, plus de 5 nouveaux entrants [3][5][11] | Fort sur la conversion des artisans (c'est l'argument n°1 de la concurrence) |
| 4 | **Le mobile n'est pas pensé pour le terrain** | `Sidebar.tsx` est un tiroir sur mobile : il n'y a **ni barre de navigation basse, ni bouton d'action flottant, ni PWA** (aucun manifest dans `public/` ni `app/manifest.ts`). Les tables passent en défilement horizontal (`Table.tsx`). Point positif : `Button` impose bien une hauteur de 44 px sur mobile | Jobber, Costructor (application complète), Tolteck (hors ligne) | Fort sur la rétention des artisans |

### P1 — impact sur la perception, la confiance et la rétention

| # | Écart | Constat | Impact |
|---|---|---|---|
| 5 | **Identité générique et incohérente** | La palette `primary` reprend l'indigo Tailwind par défaut (`globals.css`). Le « logo » est l'icône lucide `Hexagon`. **La police Geist est chargée dans `layout.tsx` mais `body { font-family: Arial }` l'écrase** (bug). La barre latérale `bg-gray-900` contraste avec la page d'accueil blanche. Le titre de l'onglet est « MonService - CRM SaaS » | Fort sur la mémorisation et la sensation de produit « premium » |
| 6 | **Page d'accueil générique, sans page par univers** | Le hero dit « Gérez vos clients, devis, factures et rendez-vous » pour tout le monde. `Sectors.tsx` se limite à quatre cartes. La `TrustBar` affiche des promesses génériques. Ni démonstration vidéo, ni témoignage, ni page dédiée aux artisans ou aux praticiens | Fort sur la conversion des visiteurs |
| 7 | **La conformité 2026 n'est pas mise en avant** | `einvoice.service.ts` génère UBL et Factur-X, mais la page d'accueil n'en dit rien. Pas de branchement à une plateforme agréée repéré, **à vérifier**. La réception est obligatoire depuis septembre 2026 | Fort, car c'est une inquiétude actuelle des clients cibles |
| 8 | **Le mode sombre repose sur des surcharges `!important`** | `globals.css` réécrit les classes utilitaires (`.bg-white`, `.text-gray-500`…) et force la couleur des champs avec `!important`. C'est fragile et ça complique toute refonte | Moyen (dette de design) |
| 9 | **Rappels de rendez-vous par e-mail seulement** | `appointment-reminder.service.ts` envoie des e-mails (24 h et 2 h avant). Pas de SMS | Doctolib et les outils de réservation utilisent les SMS [19] | Moyen à fort pour l'univers santé |
| 10 | **Pas de commande rapide ni de création globale** | Le header propose une `GlobalSearchBar` sur grand écran seulement. Pas de bouton « + Créer » global ni de raccourci ⌘K | Moyen |

### P2 — finitions

- Accessibilité : contrastes corrigés au cas par cas avec `!important` (`button.text-gray-400`). Le focus global est correct. Les erreurs de formulaire passent par des toasts, sans `aria-describedby`.
- La validation des étapes d'inscription ne dit pas quel champ pose problème.
- La page d'accueil enchaîne les animations (`hover:scale-105`, `rotate-1`) sans respecter `prefers-reduced-motion`.

---

## 4. Direction de design proposée

### 4.1 Principe : « l'outil de l'atelier »

Un produit **chaleureux, net et utilitaire**. On évite à la fois l'esthétique SaaS violette générique et le look ERP des années 2010. Il faut se sentir dans un bon outil de travail : lisible en plein soleil, avec des gros boutons, des chiffres bien alignés, et une couleur forte par métier. Trois mots-clés : **direct** (une action principale par écran), **rassurant** (montants, statuts et conformité toujours visibles) et **personnel** (le vocabulaire et l'accent changent selon l'univers).

### 4.2 Couleurs (tokens Tailwind 4, à placer dans `@theme` de `globals.css`)

- **Neutres chauds** à la place du gris froid : utiliser l'échelle `stone`. Fond de l'application `#FAFAF9`, surfaces `#FFFFFF`, texte principal `#1C1917`, texte secondaire `#57534E` (contraste supérieur à 7:1 sur blanc).
- **Marque** : un bleu encre profond `#1E3A5F` pour la navigation et les titres. Il vieillit bien et inspire confiance pour la facturation. Ne plus l'utiliser en dégradé.
- **Accent par univers**, piloté par un attribut `data-universe` sur `<html>` ou sur le shell :
  - Terrain / BTP : orange chantier. Remplissage `#EA580C`, texte et icônes sur blanc `#C2410C` (contraste ≥ 4,5:1).
  - Santé et bien-être : sauge / teal. Remplissage `#0F766E`, fond doux `#F0FDFA`.
  - Conseil / généraliste : indigo, en conservant l'existant (`#4F46E5`) pour limiter la migration.
- **Couleurs sémantiques**, indépendantes de l'accent : succès `#15803D`, alerte `#B45309`, danger `#B91C1C`, info `#1D4ED8`. Chaque statut de document (brouillon, envoyé, accepté, payé, en retard) a toujours la même couleur, une icône et un libellé : **jamais la couleur seule**.
- **Tokens sémantiques** (`--color-surface`, `--color-ink`, `--color-ink-muted`, `--color-line`, `--color-accent`, `--color-accent-ink`) redéfinis sous `html[data-theme="dark"]`. Le mode sombre passe ainsi par les variables, et on **supprime progressivement les surcharges `!important`**.

### 4.3 Typographie

- **Corriger le bug d'abord** : retirer `font-family: Arial` du `body` dans `globals.css`, pour que `--font-sans` (Geist) s'applique enfin.
- Interface : **Geist Sans**, déjà chargée, donc aucun coût. Taille de base de **16 px sur mobile** et 14 à 15 px pour les tables denses sur ordinateur. Graisses limitées à 400, 500, 600 et 700.
- Montants, numéros de pièces et dates : `font-variant-numeric: tabular-nums` (classe `tabular-nums`) partout. Les montants s'alignent à droite.
- Page d'accueil : une police de titre avec du caractère, par exemple Bricolage Grotesque ou Instrument Sans, uniquement pour les H1 et H2 marketing. Elle reste hors de l'application.
- Échelle typographique : 12, 14, 16, 18, 22, 28, 36, 48. Interlignage 1,5 pour le texte, 1,15 pour les titres.

### 4.4 Formes, densité, mouvement

- Rayons : boutons et champs à 10 px, cartes à 14 px, feuilles du bas (bottom sheets) à 20 px.
- Zones tactiles : au moins **48 px** sur mobile pour le shell terrain (au-delà des 44 px actuels).
- Ombres très légères. On sépare plutôt par des bordures `--color-line`.
- Mouvement : de 150 à 200 ms, sans effet d'échelle au survol. On encadre toutes les animations par `@media (prefers-reduced-motion: reduce)`.
- Logo : remplacer l'icône lucide par un monogramme propre, par exemple un « M » construit sur une grille, déclinable dans les trois accents.

### 4.5 Écrans à refaire en premier (ordre recommandé)

1. **Inscription et onboarding**, en 3 étapes (détail au §4.6). Fichiers : `src/components/auth/RegisterForm.tsx` et `src/components/auth/AuthLayout.tsx`.
2. **Accueil « Aujourd'hui »**, le même modèle pour les trois univers (il généralise ce que fait déjà `ParamedicalPracticeDashboard`). Dans l'ordre :
   - une salutation et la date ;
   - un bloc « À faire maintenant » : devis à relancer, factures en retard, rendez-vous ou interventions du jour ;
   - trois actions rapides propres à l'univers ;
   - une liste de progression de démarrage tant qu'elle n'est pas terminée (« Ajoutez votre logo », « Envoyez votre premier devis »…) ;
   - les indicateurs et graphiques, **en bas**, et seulement s'il y a des données.

   L'état vide du graphique doit être remplacé par une invitation à agir. Fichiers : `src/app/(dashboard)/dashboard/page.tsx`, `src/components/dashboard/*` et `src/components/crm/DashboardStats.tsx`.
3. **Shell mobile** (cf. §4.7). Fichiers : `src/components/layout/DashboardShell.tsx`, `Sidebar.tsx` et `Header.tsx`, plus un nouveau composant `MobileTabBar`.
4. **Éditeur de devis et facture, en mobile d'abord** :
   - lignes sous forme de cartes empilées sur mobile, avec la quantité, le prix unitaire et la TVA éditables dans une feuille du bas ;
   - total collant en bas ;
   - aperçu du PDF à tout moment ;
   - bibliothèque de lignes par métier ;
   - envoi par e-mail, SMS ou WhatsApp via `navigator.share`.

   Ensuite, en deuxième temps, un champ « Décrivez le chantier » (texte, puis dictée vocale via l'API Web Speech ou un service de transcription) qui génère un brouillon de lignes. **L'utilisateur relit et valide toujours avant l'envoi.**
5. **Vue publique du devis et de la facture pour le client final** : aux couleurs du professionnel, avec acceptation et signature à l'écran et paiement Stripe. C'est la vitrine de MonService auprès des clients des clients.
6. **Pages d'atterrissage par univers** (`/artisans`, `/praticiens`, `/independants`). Chacune a son hero, ses captures d'écran du vrai produit dans le bon accent, et un bandeau « Facture électronique 2026 » (avec une formulation exacte une fois la plateforme agréée confirmée). Fichiers : `src/components/landing/*`.

### 4.6 Onboarding en 3 étapes maximum, premier résultat en moins de 2 minutes

**Objectif mesurable :** l'utilisateur atteint l'événement d'activation en moins de 120 secondes après le clic sur « Créer mon espace » (médiane). Il faut journaliser deux horodatages : le début de l'inscription et l'événement d'activation.

| Étape | Contenu | Durée cible |
|---|---|---|
| **1. Votre métier** | Trois grandes tuiles d'univers (Terrain, Santé et bien-être, Conseil et services). Ensuite, une recherche de métier avec des **puces des métiers les plus courants** (Plombier, Électricien, Ostéopathe, Kiné, Coach…). Pas de saisie libre au départ. Commencer par le métier engage l'utilisateur et permet de personnaliser toute la suite (vocabulaire, accent, bibliothèque de lignes) | 15 s |
| **2. Votre entreprise** | Un seul champ : « SIRET ou nom de l'entreprise ». Il interroge l'API publique Recherche d'entreprises (`recherche-entreprises.api.gouv.fr`, gratuite, **conditions d'usage à vérifier**) et remplit la raison sociale, l'adresse, la forme juridique et le n° de TVA. Un lien « Je n'ai pas encore de SIRET » permet de saisir le nom seul. La ville est déduite de l'adresse. Le téléphone passe après l'activation | 25 s |
| **3. Votre accès** | E-mail et **un seul** champ de mot de passe, avec un bouton afficher/masquer et une jauge de force en direct (pas de champ de confirmation). Option « Continuer avec Google » à évaluer (impact sur Supabase Auth et la future migration). La case CGU est en ligne. Les erreurs s'affichent **sous le champ** (`aria-invalid` et `aria-describedby`), pas dans un toast. La vérification d'e-mail ne bloque pas : on garde la connexion automatique actuelle et on affiche un bandeau « Confirmez votre e-mail » | 30 s |

**Arrivée dans l'espace, directement sur le premier résultat (sans passer par le tableau de bord) :**
- **Terrain** : on ouvre « Votre premier devis », prérempli avec un client exemple et trois lignes typiques du métier choisi, le tout au nom et à l'adresse de l'entreprise de l'étape 2. Un bouton « Voir le PDF » affiche le document à l'en-tête de l'entreprise. **Événement d'activation : génération du PDF.** Le client exemple est clairement étiqueté et supprimable.
- **Santé et bien-être** : agenda déjà prêt (le code fait déjà `prepareStarterPractice`). Une info-bulle propose « Ajoutez votre premier rendez-vous », puis « Facturez cette séance en 1 clic » directement depuis le rendez-vous, sur le modèle de Perfactive. **Activation : premier rendez-vous créé ou première note d'honoraires générée.**
- **Conseil** : « Votre première facture », préremplie avec un client exemple. **Activation : génération du PDF.**

Tout le reste (logo, IBAN, mentions complémentaires, équipe) part dans une **liste de démarrage** de 4 à 5 éléments sur l'accueil, avec une barre de progression. Il réutilise `OnboardingProgress.tsx` et `SetupGuidePopover.tsx`, qui existent déjà.

### 4.7 Mobile d'abord pour les artisans

- **Barre de navigation basse**, visible sous `md`, avec 4 onglets et un bouton central :
  - Terrain : Aujourd'hui · Chantiers · **(+)** · Devis et factures · Clients
  - Santé : Aujourd'hui · Agenda · **(+)** · Séances et factures · Patients
  - Conseil : Aujourd'hui · Affaires · **(+)** · Factures · Clients

  Le **(+)** ouvre une feuille du bas : Nouveau devis, Nouvelle facture, Nouveau client, Rendez-vous ou intervention, **Photo de chantier**. On garde le tiroir latéral pour « Plus » et Paramètres.
- **PWA installable** : `src/app/manifest.ts` avec nom, icônes et `theme_color` selon l'univers, et un service worker pour le shell. Ensuite, des **brouillons de devis hors ligne** (IndexedDB, synchronisés au retour du réseau), car c'est un vrai argument face à Costructor, qui n'en a pas.
- Saisie : champs numériques avec `inputmode="decimal"`, photo avec `accept="image/*" capture="environment"`, signature à l'écran, boutons d'appel et d'itinéraire (`tel:` et lien de navigation) sur les cartes chantier.
- Lisibilité en extérieur : texte de 16 px minimum, contraste au moins AA (AAA visé pour le texte courant), aucune information portée par la couleur seule.
- Gestes à une main : actions principales en bas de l'écran, confirmation par feuille du bas plutôt que par fenêtre modale centrée.

### 4.8 Ordinateur : vitesse pour les utilisateurs réguliers

- Palette de commande **⌘K / Ctrl+K** : recherche globale et créations (« nouveau devis pour… »). Elle peut ensuite accueillir une saisie en langage naturel interprétée par l'IA.
- Bouton « + Créer » persistant dans le header.
- Barre latérale claire (surface blanche, accent sur l'élément actif) pour s'aligner sur la page d'accueil, au lieu de `bg-gray-900`.

### 4.9 Indicateurs à suivre après la refonte

- Délai avant le premier résultat (médiane et 75e centile), avec une cible sous 120 s.
- Taux d'activation à J0 et à J7, par univers.
- Taux d'abandon par étape d'inscription.
- Part des sessions sur mobile, et part des devis créés sur mobile (univers terrain).
- Rétention : au moins 2 documents envoyés en semaine 2.

---

## 5. Sources

1. Obat, page d'accueil — https://www.obat.fr/
2. Tool Advisor, « Notre avis sur Obat » (mis à jour en octobre 2026) — https://tool-advisor.fr/logiciel-facturation/comparatif/obat/
3. Obat, « Devis vocal IA » — https://www.obat.fr/devis-factures/devis-vocal-ia/
4. Costructor, page d'accueil — https://costructor.co/
5. independant.io, « Avis Costructor 2026 » (mis à jour en novembre 2026) — https://independant.io/avis/costructor/
6. Trustpilot, Costructor — https://fr.trustpilot.com/review/costructor.co
7. Tolteck, page d'accueil — https://www.tolteck.com/
8. independant.io, « Avis Tolteck 2026 » — https://independant.io/avis/tolteck/
9. Batappli, tarifs — https://www.batappli.fr/tarifs et https://www.batappli.fr/
10. Appvizer, Batappli — https://www.appvizer.fr/construction/btp/batappli
11. Nouveaux entrants du devis IA : Chantiq https://chantiq.app/fonctionnalites/devis-ia · Ona Devis https://www.onadevis.fr/ · VocalDevis https://vocaldevis.com/ · Chantier Vocal https://play.google.com/store/apps/details?id=fr.chantiervocal.app · Artibot https://artibot.pro/
12. Abby, page d'accueil et tarifs — https://abby.fr/ · https://abby.fr/tarifs
13. Trustpilot, Abby — https://fr.trustpilot.com/review/abby.fr
14. independant.io, « Avis Tiime 2026 » — https://independant.io/avis/tiime/ · https://www.tiime.fr/
15. Leptidigital, « Système de facturation électronique certifié : les 12 meilleurs logiciels » — https://www.leptidigital.fr/gestion-entreprise/systemes-facturation-electronique-certifie-84499/
16. Tool Advisor, « Les 18 meilleurs logiciels de facturation en 2026 » — https://tool-advisor.fr/logiciel-facturation/comparatif/
17. Sellsy, « Les 11 meilleurs logiciels de facturation en 2026 » (source partiale, éditeur concurrent) — https://go.sellsy.com/blog/meilleurs-logiciels-facturation
18. Finance Héros, « Avis Axonaut » — https://finance-heros.fr/avis-axonaut/ · Capterra Axonaut https://www.capterra.fr/software/178036/axonaut
19. Lonasante, « Doctolib Pro : prix, avis et fonctionnalités (2026) » — https://www.lonasante.com/doctolib/
20. Syndicat Avenir Spé, « Numérique en santé » — https://syndicatavenirspe.fr/vie-professionnelle/numerique-en-sante
21. Perfactive, page d'accueil — https://perfactive.fr/
22. Lonasante, « Perfactive » — https://www.lonasante.com/perfactive/ · Merci Solange https://merci-solange.com/alternative-perfactive
23. Fresha, tarifs — https://www.fresha.com/pricing
24. hey.booked, « Fresha pricing in 2026 » (source partiale, concurrent) — https://heybooked.com/blogs/fresha-pricing?lang=en · bbook https://bbook.app/fresha-pricing-and-fees/
25. Trustpilot, Planity — https://fr.trustpilot.com/review/www.planity.com
26. OWNR OPS, « Jobber Review 2026 » — https://www.ownrops.com/reviews/jobber
27. Jobber, centre d'aide, « First steps: Basic account set up » — https://help.getjobber.com/en/articles/first-steps-basic-account-set-up/
28. Contractor Tool Stack, « Housecall Pro Review 2026 » — https://contractortoolstack.com/software/housecall-pro/
29. Driive, « Is Housecall Pro worth it » (source partiale, concurrent) — https://getdriive.com/blog/is-housecall-pro-worth-it
30. Service-Public.fr, « Facturation électronique : c'est pour bientôt » — https://entreprendre.service-public.gouv.fr/actualites/A15683
31. impots.gouv.fr, « À partir de quand suis-je concerné par la réforme ? » — https://www.impots.gouv.fr/professionnel/questions/partir-de-quand-suis-je-concerne-par-la-reforme-de-la-facturation
32. Digital Applied, « Time to Value: The 2026 SaaS Onboarding Metrics Framework » (s'appuie sur le benchmark Userpilot, 62 entreprises) — https://www.digitalapplied.com/blog/customer-onboarding-time-to-value-2026-saas-metrics-framework
33. SaaSMag, « Time-to-Value: Why Onboarding Is the New SaaS Retention Battleground in 2026 » — https://www.saasmag.com/time-to-value-saas-onboarding-retention-2026/
34. Karl Groves, « The European Accessibility Act and B2B Software » — https://karlgroves.com/the-european-accessibility-act-and-b2b-software-what-internal-platforms-must-comply-with/
35. Accessibility.Works, « SaaS EAA Compliance » — https://www.accessibility.works/blog/saas-eaa-compliance-european-accessibility-act-en-301-549-requirements/

*Les citations font moins de 15 mots ; le reste est paraphrasé. Les sources signalées « partiales » viennent d'éditeurs concurrents et doivent être pondérées.*
