# 10 — Performance, fiabilité, exploitation

## Ce qui a été mesuré

| Mesure | Valeur | Remarque |
|---|---|---|
| Compilation de production (`next build`) | Compilée en 20,6 s, typage passé | La collecte des pages a ensuite échoué dans mon environnement faute de secret de cookie valide : erreur de ma configuration de test, build **non concluant** |
| JavaScript statique total | 4,9 Mo | — |
| Plus gros lot client | 1,49 Mo (contient `react-pdf`, `pdfkit`) | LR-026 |
| Deuxième lot | 377 Ko | — |
| Durée d'un run CI complet | Environ 1 h 55 pour le dernier vert (plafond du job : 120 min) | Marge quasi nulle |

**Non mesuré** : Core Web Vitals, temps de réponse des actions, plans d'exécution SQL, mémoire, comportement en réseau dégradé. Il faut une instance déployée.

## Seuils proposés pour le pilote

| Indicateur | Seuil | Outil |
|---|---|---|
| LCP sur mobile 4G, tableau de bord | ≤ 2,5 s | Lighthouse, 3 passes |
| INP | ≤ 200 ms | Lighthouse / données de terrain |
| Action serveur « créer un devis », 95ᵉ centile | ≤ 800 ms | Journal applicatif |
| Lot client initial | ≤ 300 Ko compressé | Analyse du build |
| Requêtes SQL par page de liste | ≤ 10 | Journal de requêtes sur la branche de validation |
| Disponibilité mensuelle | ≥ 99,5 % | Sonde externe |

## Résilience

| Scénario | État d'après le code | Testé ? |
|---|---|---|
| Webhook Stripe reçu deux fois | Idempotent par identifiant d'événement | Oui (unitaire) |
| Double acceptation d'un devis | Verrou de ligne + refus si déjà signé | Oui (CI) |
| Double réservation d'un créneau | Contrainte en base | Oui (CI) |
| Expiration de session | Redirection vers la connexion par les gabarits serveur | Oui (CI) |
| Erreur serveur | Page brute, pas de `error.tsx` | Non — LR-010 |
| Coupure réseau pendant une saisie | Pas de brouillon automatique repéré | Non |
| Échec de génération PDF | Non examiné | Non |
| Échec d'envoi d'e-mail | Suivi de livraison présent (`delivery.service`, route `delivery-status`) | Partiel |
| Base indisponible | `connect_timeout` 10 s, une connexion ; pas de message dédié | Non |

## Exploitation

| Sujet | État | ID |
|---|---|---|
| Journaux | JSON sur la console (`src/lib/logger`), pas de centralisation | LR-010 |
| Suivi d'erreurs et alertes | **Aucun** | LR-010 |
| Sonde de disponibilité | Aucune | LR-010 |
| Planificateur (rappels, rétention) | **Aucun** : `netlify.toml` ne déclare aucune tâche | LR-009 |
| Sauvegardes et restauration | Rétention 6 h, restauration jamais exercée | LR-005 |
| Migrations | Outillage solide (registre, anti-dérive, `db:push` bloqué) | — |
| Séparation des environnements | Production, validation, CI ; aperçus Netlify sans base dédiée | LR-033 |
| CI/CD | Rouge depuis le 11 novembre ; fragile à un point d'accès bêta du fournisseur ; durée proche du plafond | LR-034 |
| Retour arrière | Documenté (republier le déploiement précédent) | — |
| Secrets | Hors dépôt ; fichiers `.env.neon-production*.local` sur le poste de développement | LR-035 |
| Console de support | Aucune | LR-036 |
| Procédure d'incident | Non trouvée | LR-036 |

## Peut-il tourner sans surveillance ?

Non, pas encore. Une erreur en production ne déclencherait aucune alerte, les rappels ne partent pas, et une perte de données au-delà de six heures serait définitive. Le minimum avant le pilote :

1. Suivi d'erreurs (par exemple Sentry) côté serveur et navigateur, avec alerte par e-mail.
2. Sonde externe sur `/` et sur une route de santé qui interroge la base.
3. Deux fonctions planifiées Netlify (rappels, rétention) appelant les routes existantes avec le secret.
4. Plan Neon avec restauration à un instant donné, et un exercice de restauration consigné.
5. Une page « incident » d'une demi-feuille : qui prévenir, comment republier, comment restaurer.

## CI

- Séparer le job en deux : contrôles rapides (typage, lint, unitaires : moins de 5 minutes) à chaque push, validation Neon complète sur la PR.
- Remplacer les actions en Node 20.
- Ne plus dépendre du point d'accès bêta de création d'utilisateurs : fait pour les deux tests concernés (`9086307`, `e4c82fc`) ; le script d'import `scripts/neon/import-source.mjs:55` l'utilise encore.
