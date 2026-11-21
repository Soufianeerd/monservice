# MonService — plan après les audits du 21 novembre 2026

Rapports détaillés dans ce dossier : `veille-ux.md`, `securite-rgpd.md`, `ux-accessibilite.md`, `performance.md`.

## Déjà corrigé et en ligne sur le site de test (21/11)
- Inscription : règles du mot de passe une seule fois, 12 caractères (CNIL 2022-100) vérifiés côté serveur sur toutes les routes (inscription, réinitialisation, changement), plus d'étape « Profil », ville et téléphone demandés, liens CGU dans un nouvel onglet, entrée directe dans l'espace, un seul titre.
- Sécurité : création de compte directe chez le fournisseur refusée ; IP non falsifiable pour la limite de tentatives.
- Page Abonnement : offre de lancement gratuite au lieu de tarifs 29/79/199 €.
- Faux témoignage retiré ; « Se connecter » visible sur mobile ; « Opportunités » au lieu de « Deals » ; police Geist appliquée.
- Performance (lot 1) : squelette instantané au clic, factures sans N+1, organisation lue une fois par requête, connexion base gardée ouverte, cookie de session 300 s, générateur PDF chargé au clic.

## P0 — fluidité (cette semaine)
1. Transaction à 3 allers-retours avec vérification de session incluse (C3) — à valider par `test:rls` et `test:neon-boundaries`.
2. Fusion des requêtes du tableau de bord, du calendrier et des statistiques (C5) ; une transaction de lecture par page (C6).
3. Agenda paramédical : préparation du cabinet hors navigation (C7).
4. Pages Factures, Devis, Clients, Pipeline, Tâches : données chargées côté serveur (C10) ; démarrage sans 3 actions (C11).
5. Décision Soufiane : fonctions à Francfort (Netlify Pro 20 $/mois, réglage sans code) — gain le plus fort.

## P0 — sécurité et conformité
6. Limite de tentatives partagée (en base) et verrouillage par compte ; journal d'audit réellement alimenté.
7. Pages légales complètes : politique de confidentialité, contrat de sous-traitance (art. 28), liste des sous-traitants (Neon, Netlify, Resend) ; mentions légales avec Neon.
8. Décisions Soufiane : secteur santé (HDS ou bien-être seul), double authentification (à construire, Neon Auth n'expose pas de 2FA), durées de conservation.

## P1 — ergonomie (les 44 points de `ux-accessibilite.md`)
9. Fiche client « particulier » sans nom d'entreprise obligatoire ; vocabulaire par univers (chantiers, patients, clients) ; agenda avec création de rendez-vous pour tous ; menus qui ouvrent leur page ; formulaires longs protégés contre la perte ; pas de suppression d'une facture émise.
10. Accessibilité : étiquettes reliées (~98), contrastes, focus visible, remplacement des 47 alert()/confirm() par des dialogues.
11. Décision Soufiane : le coach qui ajoute un client tombe sur un « dossier patient » (partie paramédicale gelée).

## P1 — se démarquer (veille)
12. Nouvelle identité visuelle : couleur par univers (orange terrain, sauge santé, indigo conseil), Geist, zones tactiles 48 px.
13. Mobile artisans : barre d'onglets en bas + bouton « + » ; application installable (PWA) avec brouillons hors ligne.
14. Accueil « Aujourd'hui » et checklist « Configurer mon espace » ; premier devis ou rendez-vous en moins de 2 minutes ; SIRET pré-rempli par l'API Recherche d'entreprises.
15. Devis par la voix ou la photo (norme BTP 2026) ; SMS de rappel (santé) ; facture électronique (réception obligatoire depuis le 1/9/2026, émission PME au 1/9/2027) via une plateforme agréée.

Chaque lot : typecheck, lint, tests unitaires, CI Neon complète (RLS, contraintes, E2E) et recette visuelle des 4 univers avant mise en ligne du site de test.
