# MonService — Audit UX, ergonomie et accessibilité

**Date :** 21 novembre 2026
**Périmètre :** landing, inscription et authentification, onboarding, coque du tableau de bord et navigation des 4 univers (généraliste, artisan, paramédical, bien-être), clients et patients, devis, factures, agenda, chantiers, paramètres, vitrine publique.
**Méthode :** lecture du code (`/home/claude/monservice`, commit `1b3278f`), relecture des 146 captures de la recette automatique du 19 novembre (`/home/claude/rec6/captures`, 1440 × 900) et des captures envoyées par le propriétaire (inscription, 21 novembre). Aucun fichier du dépôt n’a été modifié.

> **Point d’attention.** Le dépôt contient des **modifications non commitées** sur l’inscription (`RegisterForm.tsx`, `PasswordField.tsx`, `InvitedMemberRegisterForm.tsx`, `register/page.tsx`, `validation/schemas.ts`). Elles corrigent une partie des problèmes signalés. Pour chaque point, la colonne « Statut » distingue : la version testée par le propriétaire (commitée), ce que corrige le travail en cours (non commité, non vérifié en navigateur) et ce qui reste à faire.

**Légende.** Sévérité : **P0** bloquant ou destructeur de confiance (abandon probable dans les 10 premières minutes) · **P1** majeur · **P2** important · **P3** mineur. Effort : **S** ≤ ½ jour · **M** 1 à 3 jours · **L** plus de 3 jours.

---

## 1. Problèmes signalés par le propriétaire

| # | Page / fichier | Problème | Impact | Statut | Correctif restant | Effort |
|---|---|---|---|---|---|---|
| O1 | `src/components/auth/RegisterForm.tsx`, `PasswordField.tsx` | Règles du mot de passe écrites deux fois (placeholder « 8 caractères min, 1 maj… » + texte d’aide « Min. 8 caractères dont… »). | Bruit, impression d’amateurisme dès le premier écran. | **Corrigé dans le travail en cours** : placeholder supprimé, liste de règles cochée en direct (`showRequirements`). | 1) La règle passe de 8 à **12 caractères** dans le même lot (`schemas.ts`) : le mot de passe que le propriétaire a saisi (10 caractères) sera refusé ; le message doit l’expliquer sans toast. 2) `reset-password/page.tsx` garde son propre champ (« 12 caractères min » dans le label, pas de liste) : réutiliser `PasswordField showRequirements`. 3) Ajouter `passwordrules="minlength: 12; required: lower; required: upper; required: digit; required: special;"` pour que Safari/iOS génère un mot de passe conforme. | S |
| O2 | `RegisterForm.tsx` (étape 1), `PasswordField.tsx` | Le navigateur propose le mot de passe enregistré ; sur la capture, Chrome propose même une **adresse postale** (« Soufiane El Rhadi – Gérer les adresses… ») dans « Confirmer le mot de passe » affiché en clair. | Cause : aucun attribut `autocomplete` dans la version commitée ; quand l’œil bascule le champ en `type="text"`, Chrome le traite comme un champ d’identité. Risque de mauvais remplissage, confusion. | **Corrigé en partie** : `autocomplete="name"`, `"email"`, `"new-password"` ajoutés. | 1) **Supprimer le champ de confirmation** (un seul champ + bouton afficher, pratique GOV.UK/NN/g) : moins de saisie et plus de champ texte détourné par l’auto-remplissage. 2) Tester Chrome, Safari macOS/iOS, Firefox, Android/Gboard après correctif. | S |
| O3 | `RegisterForm.tsx` étape 2 | Étape « Profil » inutile : une seule carte « Je suis un professionnel ». | Une étape et un clic gaspillés ; « Profil » sous-entend des comptes particuliers que la V1 interdit. | **Corrigé dans le travail en cours** : étape sautée si `clientRegistrationOpen` est faux, stepper à 3 étapes. | Supprimer aussi le sélecteur « Profil » de `complete-profile/page.tsx` (affiché si `clientRegistrationOpen`) et le code mort client tant que la V1 est « pros uniquement ». | S |
| O4 | `RegisterForm.tsx` étape 4 | La dernière étape ne collecte rien (récapitulatif + case CGU) ; l’espace ne peut pas être personnalisé. | Le pro arrive sur un tableau de bord générique, à zéro, sans prestations ni mentions légales ; il doit tout chercher dans Paramètres. | **Partiel** : ville (obligatoire) et téléphone (facultatif) ajoutés à l’étape Activité. La dernière étape reste un récapitulatif. | Appliquer la **spécification du §3** : 2 écrans, statut juridique et métier unique, récapitulatif supprimé, liste « Configurer mon espace » à l’arrivée, données légales demandées au moment du premier devis. | M |
| O5 | `RegisterForm.tsx` + `src/components/auth/AuthLayout.tsx` | Clic sur CGU/confidentialité puis Retour : retour à l’étape 1, formulaire vidé. | Perte de toute la saisie : premier motif d’abandon. | **Partiel** : les deux liens de la case à cocher s’ouvrent dans un nouvel onglet. | **Il reste trois façons de perdre la saisie :** 1) le pied de `AuthLayout` affiche « En continuant, vous acceptez nos Conditions d’utilisation… » avec des `<Link>` **dans le même onglet**, sur l’inscription comme sur la connexion ; 2) le bouton Retour du navigateur quitte `/register` (les étapes ne sont pas dans l’historique) ; 3) un rafraîchissement ou un webview (Gmail, Instagram, mode standalone iOS qui ignore `target=_blank`) vide tout. Il faut : brouillon en `sessionStorage` (sans le mot de passe), étape dans l’URL (`?etape=2` + `history.pushState`), suppression des liens du pied d’`AuthLayout` sur `/register`, CGU dans une modale accessible ou un nouvel onglet signalé par une icône. | M |
| O6 | `RegisterForm.tsx` `handleSubmit`, `verify-email/page.tsx` | Après création du compte, l’utilisateur n’entre pas directement dans son espace. | Il doit retaper ses identifiants juste après les avoir choisis. | **Partiel** : connexion automatique puis `window.location.assign('/dashboard')` quand aucune confirmation n’est demandée. | Si la confirmation d’adresse est exigée (`requiresEmailConfirmation`), on va sur `/verify-email` puis, après le code, sur **`/login`** (l. 25 : `window.location.href = '/login'`). Il faut connecter automatiquement après vérification (option d’auto-connexion de Neon Auth/Better Auth ou `signIn` avec les identifiants encore en mémoire) puis rediriger vers `/dashboard?bienvenue=1`. Mettre le code à 6 chiffres **dans le parcours d’inscription** (étape 3 conditionnelle), envoyé automatiquement, renvoi possible après 30 s. | M |
| O7 | Toute la coque (`src/app/(dashboard)/**`, `AuthContext.tsx`, `Sidebar.tsx`, `Header.tsx`, `src/proxy.ts`) | Navigation lente. | Chaque clic semble ne rien faire, puis « Chargement… » ; donne l’impression d’un logiciel instable. Les captures de recette montrent « Chargement… » ou un squelette sur `/clients`, `/facturation/factures`, `/facturation/devis`, une facture et le devis santé (013, 016, 017, 008, 074). Sur la 015, la barre latérale est vide et l’en-tête affiche « Mon Organisation · CRM ». | **Non traité.** | Causes cumulées, mesurables dans le code : 1) **aucun `loading.tsx`** dans `(dashboard)` : rien ne change à l’écran pendant le rendu serveur ; 2) **41 pages sur 75 sont client** et chargent leurs données dans un `useEffect` après le JavaScript (cascade) ; 3) pile par navigation : `proxy.ts` (`auth.middleware`, appel à Neon Auth) → layout `getSessionContext` → layout facturation `requireProfessional` + organisation → server actions de la page, **exécutées en série** par Next ; 4) `AuthProvider` recharge profil et organisation côté client sur **toutes** les pages, landing et vitrine comprises ; la barre latérale reste vide tant que l’espace de travail n’est pas chargé ; 5) les entrées « Facturation », « Agenda », « Paramètres », « Chantiers » ne naviguent pas : il faut un second clic (voir P0-6). Correctifs : `loading.tsx` avec squelettes par rubrique ; pages de liste en composants serveur ; transmettre session et espace du layout serveur au client (supprimer le second chargement) ; préchargement des liens ; vérifier région Neon/Netlify et démarrages à froid. | L |

---

## 2. Autres problèmes, classés par sévérité

### P0 — Bloquants ou destructeurs de confiance

| # | Page / fichier | Problème | Impact pour l’utilisateur | Correctif proposé | Effort |
|---|---|---|---|---|---|
| P0-1 | `src/app/(dashboard)/parametres/facturation/page.tsx`, `src/components/settings/BillingPlans.tsx` | « Abonnement MonService » affiche trois forfaits à **29 €, 79 €, 199 €/mois** avec des limites (« Jusqu’à 10 devis/mois ») et « La souscription à un forfait est actuellement indisponible dans cet environnement ». La landing promet « 0 € pendant le lancement, toutes les fonctionnalités incluses ». | Le pro se croit piégé (« ce sera payant et limité »). Phrase technique (« environnement »). | Pendant le lancement, ne pas afficher `BillingPlans` ; afficher une carte « Offre de lancement : gratuite, toutes fonctionnalités, vous serez prévenu avant tout changement ». | S |
| P0-2 | `src/components/auth/AuthLayout.tsx:66-75` | Témoignage inventé (« Marie D., Consultante indépendante ») sur les pages d’inscription et de connexion. | Pratique commerciale trompeuse (faux avis, art. L121-4 du Code de la consommation) ; détruit la confiance si on le découvre. Le dépôt a déjà retiré les identités inventées ailleurs (commit `37b359b`). | Supprimer le témoignage ; le remplacer par des faits vérifiables (« Gratuit pendant le lancement · Données hébergées dans l’UE · Export à tout moment »). | S |
| P0-3 | `src/components/crm/ClientForm.tsx` (généraliste et artisan) | Fiche client uniquement B2B : « Nom de l’entreprise * », « Email générique », « Téléphone standard », « Secteur d’activité », bloc « Contact principal ». Aucun mode particulier. | Un plombier, un électricien ou un coach travaille surtout pour des particuliers : il doit inventer un « nom d’entreprise » pour M. Dupont. Blocage dès la première action utile. | Interrupteur **Particulier / Professionnel** en tête : Particulier = civilité facultative, prénom, nom*, téléphone (`tel`), e-mail, adresse du chantier ; Professionnel = raison sociale*, SIRET facultatif, contact. Libellés « E-mail », « Téléphone ». `autocomplete="off"` (ce sont les données d’un tiers). | M |
| P0-4 | `src/app/(dashboard)/patients/new` (univers bien-être : coach, nutritionniste, massage bien-être) | Le coach crée un client avec l’écran **« Nouveau dossier patient »** : fil d’Ariane « Patients », « Identité civile de naissance », date de naissance* et sexe administratif* obligatoires, lieu de naissance, code INSEE (capture 144). | Formulaire absurde pour un client de coaching ; contraire à la minimisation des données (RGPD art. 5.1.c) ; abandon probable. | Pour les professions bien-être seulement (sans toucher au gel V1 du kiné) : formulaire court (prénom, nom, téléphone, e-mail, objectif facultatif), titre « Nouveau client », pas de date de naissance obligatoire. **Arbitrage du propriétaire requis** : la page patients est dans le périmètre gelé. | M |
| P0-5 | `src/app/(dashboard)/agenda/calendrier/page.tsx:65-75`, `src/components/crm/CalendarView.tsx` | Généraliste et artisan : agenda vide = encadré « Aucun événement à afficher », sans calendrier ni bouton pour **créer un rendez-vous** (capture 022). Clic sur un événement = `alert("Événement: …\nType: task")` (type technique en anglais). Le glisser-déposer change l’échéance d’une **facture** sans confirmation. | Impasse : la landing promet « Agenda, rendez-vous et disponibilités ». Modifier l’échéance d’une facture émise par erreur pose un problème de conformité. | Toujours afficher le calendrier ; bouton « Nouveau rendez-vous » et clic sur un créneau → formulaire ; clic sur un événement → panneau latéral avec lien vers la fiche ; glisser-déposer interdit pour les factures émises, confirmation pour le reste. | M |
| P0-6 | `src/components/layout/Sidebar.tsx:113-120` | Les entrées avec sous-menu (Facturation, Agenda, Paramètres, Chantiers) font `preventDefault()` : elles **déplient sans naviguer**. La page `/facturation` n’est accessible par aucun menu. Pas d’`aria-expanded`. Sous-menus et onglets de page reprennent les mêmes 4 liens (double navigation). | « J’ai cliqué sur Facturation, rien ne s’est passé » : clic perdu, impression de lenteur (aggrave O7). | Le libellé navigue, un bouton chevron séparé (`aria-expanded`, `aria-controls`) déplie. Ou supprimer les sous-menus quand la page a déjà des onglets. | S |
| P0-7 | `src/components/landing/Navbar.tsx:36-41` | Sur mobile (< 640 px), **« Se connecter » est masqué** (`hidden sm:block`) ; le logo, centré en absolu, chevauche le bouton « S’inscrire » sur les écrans ≤ 375 px ; aucun menu mobile. | Un client qui revient sur son téléphone ne trouve pas la connexion depuis l’accueil. | Lien « Connexion » toujours visible (icône + texte), logo à gauche sur mobile, menu hamburger pour les ancres. | S |
| P0-8 | Tous les formulaires longs, en particulier `facturation/devis/nouveau/page.tsx` (912 lignes) | **Aucune protection contre la perte de saisie** (`beforeunload` : 0 occurrence) ; le lien « Retour aux devis » abandonne toutes les lignes sans prévenir. | Un devis BTP de 20 lignes perdu sur un clic égaré : abandon définitif. | Hook `useUnsavedChanges` (beforeunload + interception des liens internes) sur devis, facture, fiche client/patient, organisation ; brouillon local pour le devis. | M |
| P0-9 | Fuites de vocabulaire entre univers (plusieurs fichiers) | `facturation/devis/page.tsx:54` : « Chiffrez vos **chantiers**… convertissez en **interventions** » affiché au consultant et au kiné (capture 017) · `growth/PublicProfileEditor.tsx:174` : « Réalisations : vos **chantiers** », exemple « Rénovation complète d’une salle de bain » chez un kiné (capture 079) · `parametres/facturation/page.tsx:14` : « Les factures de vos **patients** se gèrent dans « Factures patients » » affiché au plombier · `ParamedicalPracticeDashboard.tsx:88` : « Compléter les coordonnées du **cabinet** » et « choisir… un **praticien** » chez un coach solo · `FieldServiceDashboard.tsx:93` : « **Nouvelle chantier** » (faute d’accord, capture 034) · tuiles artisan « Chantiers en cours → Voir les **opérations** » · titre `deals/(tabs)/layout.tsx:13` « **Deals** » alors que le menu dit « Opportunités » (généraliste) ou « Commercial » (artisan) ; « Nouveau Deal », « Pipeline », « Rapports ». | Le pro pense que l’outil n’est pas fait pour lui ; les fautes visibles nuisent à la crédibilité. | Centraliser tous les libellés dans `workspace.terminology` (avec genre grammatical : `workSingular`, `workGender`) ; supprimer tout texte de métier en dur ; « Opportunités » partout (« Affaires » en BTP), « Nouvelle opportunité » ; test unitaire qui rend chaque page pour les 4 univers et cherche une liste de mots interdits par univers. | M |

### P1 — Majeurs

| # | Page / fichier | Problème | Impact | Correctif proposé | Effort |
|---|---|---|---|---|---|
| P1-1 | `(auth)/forgot-password`, `reset-password`, `verify-email`, `complete-profile` | Pages sans mise en page (pas d’`AuthLayout`, pas de logo, bouton `blue-600` hors charte), labels non associés, aucun lien « Retour à la connexion ». `reset-password` redirige vers `/login` 2 s après le succès. `complete-profile` : selects bruts, « Chargement… » nu. | Impression de site cassé au moment le plus sensible (compte bloqué). Impasses. | Utiliser `AuthLayout` partout, `PasswordField`, labels liés, lien retour, connexion automatique après réinitialisation. | S |
| P1-2 | `AuthLayout.tsx` (pied) | « En continuant, vous acceptez nos Conditions… » sur la **connexion** et sur l’inscription, en plus de la case à cocher. | Consentement en double et contradictoire (implicite + explicite) ; liens dans le même onglet (voir O5). | Retirer ce pied de page ; garder la case explicite uniquement à l’inscription. | S |
| P1-3 | `src/components/auth/LoginForm.tsx` | Toast « Connecté ! » puis deux server actions en série (`getAccountRecoveryAction`, `getSessionAction`) avant un rechargement complet. Lien « Confirmer mon adresse » collé à « Mot de passe oublié ? ». | Connexion lente ; lien de confirmation déroutant hors contexte. | Une seule action serveur qui renvoie la destination ; n’afficher « Confirmer mon adresse » que si la connexion échoue pour adresse non vérifiée. | S |
| P1-4 | `RegisterForm.tsx`, nombreux formulaires | Erreurs signalées **uniquement par toast** (4 s, en haut à droite), sans lien avec le champ, sans déplacement du focus. | Utilisateur au clavier, lecteur d’écran ou malvoyant : ne sait pas quel champ corriger (WCAG 3.3.1, 3.3.3 ; RGAA 11.10, 11.11). | Message sous le champ (`aria-describedby`, `aria-invalid`), récapitulatif en tête avec liens si plusieurs erreurs, focus sur le premier champ en erreur. Toast réservé aux confirmations. | M |
| P1-5 | ≥ 98 `<label>` sans `htmlFor` ni champ imbriqué : `PracticeStructureManager` (18), `InvoiceForm` (10), `AvailabilityManager` (9), `WaitlistForm` (8), `devis/nouveau` (8), `AppointmentForm` (7), `AppointmentTypeManager` (6), `RegisterForm` (6 : nom, e-mail, entreprise, secteur…), `forgot/reset-password` | Champs sans nom accessible ; clic sur le libellé sans effet. | Échec WCAG 1.3.1 / 4.1.2, RGAA 11.1 et 11.2. Saisie vocale impossible (« cliquer sur Quantité »). | Associer chaque label (`id` via `useId`) ; règle ESLint `jsx-a11y/label-has-associated-control`. | M |
| P1-6 | 24 overlays `fixed inset-0`, un seul `aria-modal` ; tiroir mobile `Sidebar.tsx` | Modales maison sans piège de focus, sans Échap, sans retour du focus ; tiroir mobile hors écran mais **toujours focusable**, sans Échap. | Clavier : on tabule dans des liens invisibles (WCAG 2.4.3, 2.4.11, 2.1.2 ; RGAA 7.1, 12.8). | Composant `Dialog` unique (`<dialog>` natif ou Radix) ; `inert` sur le tiroir fermé. | M |
| P1-7 | 47 `alert()` / `window.confirm()` (`InvoiceDetail`, `factures/page.tsx`, `factures/new`, `templates`, `clients/[id]/contacts/new`, `CalendarView`, `taches`…) | « Facture créée avec succès ! », « Document supprimé », « Contact créé ! » en boîtes natives. | Bloquant, hors charte, peu lisible sur mobile ; « Document supprimé » s’affiche sans gestion d’erreur de l’action. | Toasts `role="status"` pour les succès ; `ConfirmDialog` accessible pour les actions destructrices, avec un libellé précis (« Supprimer le brouillon D-2026-004 »). | M |
| P1-8 | `src/components/crm/InvoiceList.tsx:138, 216` | Bouton « Supprimer » affiché sur **toutes** les factures, y compris émises et payées. | Une facture numérotée ne se supprime pas (elle s’annule par un avoir) : risque légal, ou erreur incomprise si le serveur refuse. | « Supprimer » sur les brouillons seulement ; « Annuler par un avoir » ailleurs ; vérifier le refus côté serveur. | S |
| P1-9 | `facturation/factures/page.tsx:66` (« + Nouveau Document ») et `facturation/factures/new` vs `facturation/devis/nouveau` | **Deux formulaires différents** pour créer un devis. | Confusion, devis aux mises en forme différentes, double maintenance. | Un seul point d’entrée par type : « Nouvelle facture » et « Nouveau devis ». | S |
| P1-10 | `src/components/crm/DashboardStats.tsx` (généraliste) | Arrivée : 5 tuiles à 0, graphique vide, **icône d’alerte rouge** sur « Factures réglées », aucune action proposée (capture 002). L’univers santé a un bloc « Commencer une action », pas le généraliste. | « Et maintenant ? » : aucune piste pour la première action. | Accueil vide = liste « Configurer mon espace » (§3.4) et 3 actions (« Ajouter un client », « Créer un devis », « Importer mes clients ») ; graphiques masqués tant qu’il n’y a pas de données ; icône neutre. | M |
| P1-11 | `src/components/onboarding/ContextualHelp.tsx` | Panneau d’aide ouvert par défaut dans les univers santé et bien-être : il couvre « Commencer une action » et les champs du dossier patient (captures 069, 105, 108, 144). Un écouteur **Échap global** désactive l’aide pour toujours (`localStorage` « off ») dès qu’on ferme n’importe quel menu. | Masque l’interface au premier contact ; l’aide disparaît sans que l’utilisateur l’ait voulu. | Fermé par défaut partout, pastille « Nouveau » sur le bouton ; Échap seulement quand le focus est dans l’aide ; ne jamais couvrir un formulaire (ancrer en panneau latéral). | S |
| P1-12 | Couleurs (`text-gray-400` : 144 occurrences, `text-gray-300` : 13, `disabled:opacity-50`) | #9CA3AF sur blanc = **2,5:1** : libellés du stepper (« Compte », « Terminé » sur la capture), placeholders, icônes d’action (œil et crayon du pipeline), « Appeler » et « WhatsApp » désactivés (fiche client), bouton « Enregistrement… ». | Illisible au soleil sur chantier, pour les malvoyants et les personnes âgées (WCAG 1.4.3, 1.4.11 ; RGAA 3.2, 3.3). | Jeton minimal `gray-500` (4,8:1) pour le texte ; `gray-600` pour les icônes interactives ; contrôle automatique axe-core dans Playwright. | M |
| P1-13 | 266 `focus:outline-none` pour 25 `focus-visible:` ; champs d’inscription `focus:ring-primary-500` sans largeur d’anneau ; cartes secteur et métier `focus:outline-none` sans remplacement | Focus invisible ou réduit à un liseré de 1 px. | Navigation au clavier impossible à suivre (WCAG 2.4.7 ; RGAA 10.7). | Style global `:focus-visible { outline: 2px solid var(--color-primary-600); outline-offset: 2px }` ; supprimer les `outline-none` sans remplacement. | S |
| P1-14 | `RegisterForm.tsx` (stepper et boutons) | Étape courante non annoncée (`aria-current="step"`, « Étape 2 sur 3 » absents), focus laissé sur le bouton au changement d’étape, boutons `type="button"` : **Entrée ne fait rien**. Cartes secteur sans `aria-pressed` (métiers BTP non plus), champ « Rechercher un métier » sans label. | Lecteur d’écran perdu ; au clavier il faut tabuler jusqu’à « Continuer ». | Chaque étape = `<form>` avec bouton `submit` ; focus sur le titre de l’étape (`tabIndex=-1`) ; région `aria-live` ; radiogroup pour secteur et métier. | S |
| P1-15 | `AuthLayout.tsx` + `RegisterForm.tsx` | Le formulaire (`max-w-2xl`, `p-8`) tient dans une colonne `max-w-md` (448 px) : grille des métiers BTP sur 3 colonnes d’environ 110 px, descriptions en `text-[10px]` tronquées ; titre en double dans la version commitée (« Créez votre compte » + « Créer un compte »). | Écran tassé, liste de 40 métiers difficile à parcourir sur mobile. | Pleine largeur sur l’inscription ; métier en **combobox de recherche** (voir §3) au lieu d’une grille. | S |
| P1-16 | `src/components/layout/Header.tsx` | Recherche globale masquée sous `lg` (aucune sur mobile ou tablette), inexistante en santé ; nom d’organisation masqué sous `md` ; notifications sans `aria-expanded`, sans Échap, pastille « non lu » non annoncée ; bouton « Sombre » très en vue alors que le mode sombre repose sur des surcharges CSS globales (`globals.css:80-81`) non auditées en contraste. | Sur le terrain (téléphone), impossible de retrouver un client rapidement. | Icône loupe ouvrant la recherche plein écran sur mobile ; `aria-label="Notifications, 3 non lues"` ; déplacer le thème dans Paramètres → Profil. | M |
| P1-17 | Paramètres : `workspace-navigation.ts` vs `parametres/layout.tsx` | Barre latérale et onglets ne concordent pas : « Profil » / « Mon compte » ; « Organisation » / « Coordonnées du cabinet » / « Coordonnées de l’activité » (bien-être) ; « Mes données (RGPD) » absent des onglets ; en santé, la barre latérale propose Relances et Vitrine, que les onglets n’ont pas. | L’utilisateur ne retrouve pas une page vue par l’autre chemin. | Une seule source de vérité (la fonction de navigation) pour la barre latérale **et** les onglets. | S |
| P1-18 | Facturation : `workspace-navigation.ts`, `facturation/layout.tsx` | Catalogue nommé « Produits » (menu), « Produits et services » (onglet), « Prestations et tarifs » (santé), « Catalogue » (BTP) ; ordre Factures/Devis inversé selon l’univers ; titre « Factures patients » sur les onglets Devis et Trésorerie ; « Avis » vs « Avis clients » ; « Agenda » vs « Planning ». | Pas de repères stables, l’aide et le support s’en trouvent compliqués. | Grille de vocabulaire unique par univers (§2.6), appliquée partout. | S |

### P2 — Importants

| # | Page / fichier | Problème | Impact | Correctif proposé | Effort |
|---|---|---|---|---|---|
| P2-1 | 116 pages, 30 fichiers avec `metadata` ; `app/layout.tsx` | Titre d’onglet « MonService - CRM SaaS » sur la plupart des pages ; description « Plateforme CRM moderne ». | Onglets indiscernables ; lecteur d’écran sans repère (WCAG 2.4.2, RGAA 8.6). | `title.template = "%s · MonService"` et un titre par page (« Devis D-2026-004 · MonService »). | S |
| P2-2 | Coque | Pas de lien d’évitement, `<nav>` sans `aria-label`, pas d’`aria-current="page"` dans la barre latérale, pas de `h1` sur les pages d’authentification (`h2`) ni sur « Abonnement » (`h2`). | RGAA 12.7, 9.1, 12.2. | « Aller au contenu » ; `aria-label="Navigation principale"` ; `aria-current` ; un `h1` par page. | S |
| P2-3 | `OrganizationForm.tsx`, `ClientForm.tsx`, profil | Seulement 12 `autocomplete` dans tout le code ; aucun sur les coordonnées de l’activité. | Saisie plus longue sur mobile ; WCAG 1.3.5 (identification de la finalité des champs). | `organization`, `street-address`, `postal-code`, `address-level2`, `country-name`, `tel`, `email` sur les données propres au pro ; `inputmode="numeric"` pour SIRET/code postal. | S |
| P2-4 | `src/components/ui/Input.tsx:11` | `id` généré par `Math.random()` à chaque rendu. | Écarts d’hydratation ; association label/champ instable. | `useId()`. | S |
| P2-5 | `src/components/crm/DealPipeline.tsx:16` | Étapes dans l’ordre Prospect → Qualification → **Négociation → Proposition** → Gagné → Perdu ; 6 colonnes de 320 px en défilement horizontal sur mobile. | Ordre illogique (la proposition précède la négociation) ; illisible sur téléphone. | Réordonner ; vue liste groupée par étape sur mobile. | S |
| P2-6 | `PublicProfileEditor.tsx:88` | « Vitrine publiée. » affiché alors que le bouton reste « Enregistrement… » désactivé (capture 079). | État contradictoire : l’utilisateur ne sait pas si c’est enregistré. | Remettre `pending=false` avant le message ; message `role="status"` à côté du bouton. | S |
| P2-7 | `src/app/(public)/pro/[slug]/page.tsx:96` | Bouton « Demander un devis » (mailto) même pour un kiné ou un psychologue ; « avis vérifiés » sans explication de la vérification. | Ton inadapté en santé ; l’affichage d’avis impose d’indiquer s’ils sont contrôlés et comment (art. L111-7-2 et D111-17 du Code de la consommation). | CTA selon l’univers (« Prendre rendez-vous », « Contacter ») ; lien « Comment les avis sont vérifiés ». | S |
| P2-8 | `lib/workspaces/paramedical/professions.ts`, `RegisterForm.tsx` | Libellé « Votre profession **paramédicale** » pour un coach, un psychologue ou un praticien bien-être ; « Praticien en **massage** bien-être » : en France, le massage est un acte réservé aux masseurs-kinésithérapeutes (CSP L4321-1), d’où le terme d’usage « modelage ». | Gêne pour les non-paramédicaux ; risque de libellé non conforme. | « Votre métier » ; « Praticien en modelage bien-être ». | S |
| P2-9 | Fiche client (capture 036) | Adresse affichée sans code postal ni ville ; boutons « Appeler » et « WhatsApp » grisés sans explication. | Information incomplète ; contrôle désactivé muet. | Adresse complète ; info-bulle « Ajoutez un téléphone pour appeler ». | S |
| P2-10 | Landing (`Hero`, `Navbar`, `Pricing`, `CTASection`), `RegisterForm` | Cinq libellés pour la même action : « S’inscrire », « Créer mon espace gratuitement », « Créer mon espace », « Créer mon compte », « Créer un compte » ; jargon « CRM » dans le hero et les métadonnées. | Hésitation ; « CRM » ne parle pas à un plombier ou à un kiné. | Un seul libellé : « Créer mon espace gratuit » ; hero orienté métiers (« Devis, factures et rendez-vous pour artisans, praticiens et indépendants »). | S |
| P2-11 | `DashboardShell.tsx:16` | `h-screen overflow-hidden` : sur iOS Safari, `100vh` déborde sous la barre d’outils, le bas des pages est coupé. | Boutons d’enregistrement inaccessibles en bas de formulaire sur iPhone. | `h-dvh`. | S |
| P2-12 | `facturation/devis/nouveau/page.tsx:310, 360-445` | En santé, la recherche de patient apparaît **au-dessus** du titre de page ; libellés en majuscules `text-[10px]` (Qté, Unité, Prix Vente HT) ; erreur générale en haut sans `role="alert"` ni focus ; description vide remplacée en silence par « Ligne de prestation ». | Lecture et correction difficiles ; contenu inventé sur un document légal. | Ordre logique ; libellés ≥ 12 px en casse normale ; erreur liée et focalisée ; description obligatoire. | M |

### P3 — Mineurs (finitions)

| # | Page / fichier | Problème | Correctif | Effort |
|---|---|---|---|---|
| P3-1 | Tout le code | Typographie française : 140 « ... » au lieu de « … » ; environ 65 espaces ordinaires (ou absentes) avant « : ; ! ? » et **aucune espace insécable** dans le code ; 21 « Ex: » ; « 29€ » ; « e-mail » (33) et « email » (298) mélangés ; apostrophes droites `&apos;` (33) à côté des courbes (202) ; majuscules à l’anglaise (« Nouveau Document », « Site Web », « Prix Vente HT », « Taux de Conversion »). | Utilitaire `frTypo()` (espace fine insécable U+202F avant « ; ! ? », U+00A0 avant « : » et « € ») ; choisir « e-mail » ; règle de lint sur les chaînes JSX. | M |
| P3-2 | `src/components/landing/FAQ.tsx` | Accordéon sans `aria-controls`, réponses repliées par `max-h-0`. | `aria-controls` + `hidden` quand replié. | S |
| P3-3 | `components/onboarding/ProductTour.tsx`, `SetupGuidePopover.tsx` | Code mort (jamais monté), seconde mécanique de prise en main concurrente. | Supprimer ou fusionner avec la liste « Configurer mon espace ». | S |
| P3-4 | `Header.tsx` | « Déconnexion » en rouge en permanence ; le rouge évoque une action destructrice. | Menu du profil (« Mon compte », « Se déconnecter »). | S |
| P3-5 | `Sectors.tsx` | `text-indigo-600` codé en dur ; boutons en `blue-600` dans devis et mot de passe oublié, `indigo-600` ailleurs, `primary-600` dans l’authentification. | Jetons `primary-*` partout. | S |

### 2.6 Grille de vocabulaire à adopter (source unique)

| Concept | Généraliste | Artisan / BTP | Santé (kiné, ostéo…) | Bien-être (coach, nutrition, modelage) |
|---|---|---|---|---|
| Personne servie | Client | Client | Patient | Client |
| Travail réalisé | Mission | Chantier / Intervention (genre géré) | Séance | Séance |
| Lieu d’exercice | Activité | Entreprise | Cabinet | Activité |
| Catalogue | Prestations et tarifs | Ouvrages et tarifs | Actes et tarifs | Prestations et tarifs |
| Pipeline | Opportunités | Affaires | — | — |
| Calendrier | Agenda | Planning | Agenda | Agenda |
| Avis | Avis clients | Avis clients | Avis patients | Avis clients |
| CTA vitrine | Demander un devis | Demander un devis | Prendre rendez-vous | Prendre rendez-vous |

---

## 3. Spécification du nouveau parcours d’inscription

### 3.1 Principes

1. **Deux écrans, moins de 90 secondes, 6 champs obligatoires** au total. Le récapitulatif disparaît : les données sont déjà visibles.
2. **Rien ne se perd** : brouillon en `sessionStorage` (tout sauf le mot de passe), étape dans l’URL (`/register?etape=activite`) poussée dans l’historique, Retour du navigateur = étape précédente, rafraîchissement = reprise.
3. **On ne demande que ce qui personnalise l’espace** ; les données légales et bancaires viennent au moment où elles servent (premier devis ou première facture), dans une fenêtre qui ne quitte pas l’écran en cours.
4. **Entrée directe dans l’espace** dans tous les cas, avec ou sans confirmation d’adresse.
5. Chaque étape est un `<form>` avec un bouton `submit` (Entrée fonctionne), erreurs sous les champs, focus sur le titre de l’étape à chaque changement, annonce « Étape 1 sur 2 : votre compte ».

### 3.2 Étape 1 — « Votre compte » (`/register`)

| Champ | Type / attributs | Obligatoire | Règle et texte |
|---|---|---|---|
| Prénom | `text`, `autocomplete="given-name"` | Oui | Sert au « Bonjour Soufiane » et aux documents. |
| Nom | `text`, `autocomplete="family-name"` | Oui | — |
| E-mail professionnel | `email`, `autocomplete="email"`, `inputmode="email"`, `autocapitalize="none"`, `spellcheck="false"` | Oui | Vérifié à la sortie du champ. Aide : « Vous l’utiliserez pour vous connecter ; vos clients voient l’adresse de votre activité, modifiable ensuite. » Compte existant : « Un compte existe déjà avec cette adresse. Se connecter · Mot de passe oublié ». |
| Mot de passe | `password`, `autocomplete="new-password"`, `passwordrules=…`, bouton afficher (`aria-pressed`) | Oui | **Un seul champ, sans confirmation.** Règles affichées une seule fois, sous le champ, cochées en direct ; pas de placeholder. |

Bouton : **« Continuer »**. Lien sous le formulaire : « Déjà un espace ? Se connecter ». Aucun lien légal sur cet écran (donc rien qui fasse quitter la page).

### 3.3 Étape 2 — « Votre activité » (`/register?etape=activite`)

| Champ | Type | Obligatoire | Effet sur l’espace |
|---|---|---|---|
| Votre métier | **Combobox avec recherche** sur une liste unique (« Plombier », « Électricien », « Kinésithérapeute », « Ostéopathe », « Psychologue », « Coach sportif », « Consultant », « Développeur »… et « Autre métier : précisez ») ; `role="combobox"`, recherche sans accents | Oui | Détermine l’univers (secteur déduit, sans écran « secteur » séparé), le vocabulaire, les menus, les prestations proposées, les modèles de documents. |
| Nom de l’activité | `text`, `autocomplete="organization"`, prérempli « Prénom Nom », case « J’exerce sous mon nom » | Oui (prérempli) | En-tête des devis et factures, vitrine. |
| Statut | Boutons radio : « Micro-entreprise », « Société (SARL, SAS…) », « Profession libérale », « Pas encore immatriculé » | Oui | Mentions par défaut : franchise en base de TVA (art. 293 B du CGI) pour la micro-entreprise, TVA sinon ; numérotation ; rappel SIRET au premier document. |
| Ville d’exercice | `text`, `autocomplete="address-level2"`, suggestions de la Base adresse nationale (api-adresse.data.gouv.fr) qui remplissent aussi le code postal | Oui | Vitrine, zone d’intervention, préremplissage de l’adresse. |
| Téléphone professionnel | `tel`, `autocomplete="tel"`, `inputmode="tel"` | Non | Vitrine, en-tête des documents, rappels. |
| Où exercez-vous ? | Puces : BTP « Chez vos clients · Dans votre atelier » ; santé et bien-être « En cabinet · À domicile · En visio » ; généraliste masqué | Non | Active adresses d’intervention, déplacements, téléconsultation dans les types de séance. |
| Consentement | Case : « J’accepte les CGU et la politique de confidentialité » ; liens ouverts dans une **modale accessible** (`<dialog>`, bouton Fermer, focus rendu) ou dans un nouvel onglet signalé par icône et texte | Oui | Horodatage et version des CGU enregistrés. |

Bouton : **« Créer mon espace »**, désactivé seulement pendant l’envoi (pas avant : on affiche l’erreur sur la case si elle n’est pas cochée). Pendant l’envoi : « Création de votre espace… » dans une région `aria-live`.

### 3.4 Étape 3 conditionnelle — confirmation de l’adresse (même page)

- Seulement si le fournisseur exige une vérification. Code à 6 chiffres **envoyé automatiquement**, saisi sur la même page (`autocomplete="one-time-code"`, `inputmode="numeric"`, collage accepté), lien « Renvoyer le code » actif après 30 s, « Modifier l’adresse » ramène à l’étape 1 avec la saisie conservée.
- Après un code valide : **connexion automatique** puis `/dashboard?bienvenue=1`. Jamais de passage par `/login`.

### 3.5 Arrivée : « Bienvenue, Soufiane » + liste « Configurer mon espace »

Carte en haut du tableau de bord, qui se ferme quand elle est terminée, adaptée au métier :

1. **Vos informations légales** (2 min) : saisie du **SIRET** avec préremplissage par l’API Recherche d’entreprises (raison sociale, adresse, code NAF, forme juridique, n° de TVA calculé) ; BTP : assureur et n° de police décennale (mention obligatoire sur les devis et factures, art. L243-2 du Code des assurances) ; santé : n° RPPS/ADELI.
2. **Vos prestations et tarifs** : 3 à 5 lignes proposées selon le métier (plombier : « Déplacement », « Main-d’œuvre (heure) », « Recherche de fuite » ; kiné : « Séance de rééducation » ; coach : « Séance individuelle », « Forfait 10 séances ») à valider ou corriger en ligne.
3. **Votre premier client ou patient** : formulaire court, ou import CSV/Excel.
4. **Votre premier devis ou votre première facture**, avec le parcours guidé.
5. Facultatif : logo, horaires et types de séance (santé, bien-être), zone d’intervention (BTP), vitrine publique, coordonnées bancaires (IBAN/BIC).

### 3.6 Données demandées plus tard (au moment où elles servent)

| Donnée | Quand | Où |
|---|---|---|
| SIRET, forme juridique, adresse complète, TVA intracommunautaire ou franchise | À la **première émission** d’un devis ou d’une facture si elles manquent | Fenêtre « Pour émettre ce document, il manque : … », champs sur place, le document reste ouvert |
| IBAN / BIC, conditions de paiement | Première facture | Même fenêtre, facultatif |
| Assurance décennale (BTP) | Premier devis BTP | Même fenêtre |
| RPPS / ADELI (santé) | Première facture patient | Même fenêtre |
| Logo, couleurs | Liste d’arrivée | Paramètres → Activité |
| Horaires, lieux, types de séance | Premier rendez-vous en santé ou bien-être | Assistant d’agenda |
| Équipe, rôles | Quand on clique « Inviter » | Paramètres → Équipe |
| Préférences de notification, thème | Jamais imposé | Paramètres → Mon compte |

### 3.7 Critères d’acceptation (tests Playwright à ajouter)

- Inscription complète en ≤ 2 écrans (+ code si requis), arrivée sur `/dashboard` connecté, sans retaper le mot de passe.
- Retour navigateur à l’étape 2 → étape 1 **avec la saisie** ; rafraîchissement à l’étape 2 → étape 2 avec la saisie (sauf mot de passe) ; ouverture des CGU puis fermeture → saisie intacte.
- Entrée valide chaque étape ; chaque erreur est sous son champ, `aria-invalid`, focus sur le premier champ en erreur.
- axe-core : 0 violation « serious » ou « critical » sur `/register`, `/login`, `/verify-email`, `/forgot-password`, `/reset-password`.
- Pour chacun des 4 univers : aucun mot interdit sur le tableau de bord d’arrivée (liste du §2.6).

---

## 4. Critères WCAG 2.2 AA / RGAA 4.1 probablement en échec

| Critère WCAG 2.2 | RGAA 4.1 | Constat principal | Réf. |
|---|---|---|---|
| 1.3.1 Information et relations | 11.1, 11.2, 9.1 | Labels non associés (≥ 98), `h2` en guise de `h1` | P1-5, P2-2 |
| 1.3.5 Finalité des champs | 11.13 | Presque aucun `autocomplete` sur les données du pro | P2-3 |
| 1.4.3 Contraste du texte | 3.2 | `gray-400` (2,5:1) sur blanc, 144 occurrences | P1-12 |
| 1.4.11 Contraste des éléments non textuels | 3.3 | Icônes d’action, bordures de champ `gray-200`, boutons désactivés | P1-12 |
| 2.1.2 Pas de piège au clavier / 2.4.3 Ordre du focus | 7.1, 12.8 | Modales sans gestion du focus, tiroir mobile focusable hors écran | P1-6 |
| 2.4.1 Contourner des blocs | 12.7 | Pas de lien d’évitement | P2-2 |
| 2.4.2 Titre de page | 8.6 | Titre unique « MonService - CRM SaaS » | P2-1 |
| 2.4.7 Visibilité du focus / 2.4.11 Focus non masqué | 10.7 | `outline-none` sans remplacement ; panneau d’aide fixe qui recouvre des champs | P1-13, P1-11 |
| 3.2.2 Changement de contexte à la saisie | 7.5 | Changer le statut d’une opportunité dans le select l’enregistre tout de suite | P2-5 |
| 3.3.1 Identification des erreurs / 3.3.3 Suggestion | 11.10, 11.11 | Erreurs en toast uniquement | P1-4 |
| 3.3.7 Saisie redondante (nouveau en 2.2) | — | Saisie perdue au retour ; mot de passe redemandé après vérification | O5, O6 |
| 3.3.8 Authentification accessible (nouveau en 2.2) | — | Collage et gestionnaires de mots de passe à garantir ; confirmation du mot de passe à supprimer | O2 |
| 4.1.2 Nom, rôle et valeur | 7.1 | Menus sans `aria-expanded`, cartes de choix sans `aria-pressed`, recherche de métier sans nom | P0-6, P1-14 |
| 4.1.3 Messages d’état | 7.5 | `alert()` natifs ; état « Enregistrement… » contradictoire | P1-7, P2-6 |

---

## 5. Ordre de traitement recommandé

1. **Cette semaine (S, effet immédiat sur la confiance)** : P0-1, P0-2, P0-6, P0-7, P1-2, P1-8, P1-11, P1-13, la phrase « Nouvelle chantier » et les fuites de vocabulaire les plus visibles (P0-9), puis commit du travail en cours sur l’inscription (O1 à O3) **après test navigateur**.
2. **Sprint suivant** : nouveau parcours d’inscription (§3 : O4, O5, O6, P1-14, P1-15), fiche client Particulier/Professionnel (P0-3), agenda généraliste et artisan (P0-5), protection contre la perte de saisie (P0-8), `loading.tsx` et accueil vide (O7 partie 1, P1-10).
3. **Ensuite** : passage des listes en composants serveur et suppression du double chargement de session (O7 partie 2), composant `Dialog` + `ConfirmDialog` (P1-6, P1-7), labels et erreurs (P1-4, P1-5), contrastes et jetons (P1-12), grille de vocabulaire (§2.6), typographie (P3-1), axe-core dans la CI.
4. **Arbitrage du propriétaire** : formulaire « client » allégé pour le bien-être dans le périmètre paramédical gelé (P0-4).
