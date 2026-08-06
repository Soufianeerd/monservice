# Plan de tests automatiques — `monservice`

État actuel : **3 tests unitaires** (dont 1 factice) et **4 fichiers E2E** jamais exécutés en conditions réelles. Aucun test d'autorisation, aucun test d'isolation multitenant, aucun test de paiement.

Ce plan couvre ce qui doit exister **avant** la mise en production.

---

## 1. Pyramide cible

| Niveau | Volume cible | Durée | Bloquant CI |
|---|---|---|---|
| Unitaires (services, validation, utilitaires) | ~120 | < 30 s | Oui |
| Intégration (actions + base réelle) | ~80 | < 3 min | Oui |
| **Sécurité / isolation** | **~60** | < 2 min | **Oui — priorité absolue** |
| Contrat (webhooks Stripe) | ~15 | < 1 min | Oui |
| E2E (parcours critiques) | ~20 | < 8 min | Oui |
| Accessibilité (axe + clavier) | ~15 | < 2 min | Avertissement puis bloquant |
| Charge | 6 scénarios | hors CI | Non (planifié) |

---

## 2. Suite « isolation multitenant » — la plus importante

**Objectif** : garantir qu'aucune ressource d'une organisation n'est atteignable depuis une autre, par aucun chemin.

**Données de test** : deux organisations `ORG_A` et `ORG_B`, deux utilisateurs par organisation, un jeu complet de ressources dans chacune.

**Générateur** : un test paramétré parcourant l'ensemble `{ressource} × {opération} × {chemin d'accès}`.

| Ressource | Opérations testées |
|---|---|
| clients, contacts, deals, products, invoices, invoice_lines, tasks, messages, message_templates, requests, organizations, users | lire liste · lire par id · créer · modifier · supprimer · exporter/PDF · rechercher · totaux/agrégats |

**Assertions**, pour chaque combinaison, depuis une session `ORG_B` visant une ressource de `ORG_A` :

1. Réponse `403` ou `404` — **jamais** de données.
2. Le corps de réponse ne contient aucun identifiant de `ORG_A`.
3. Aucune écriture n'a eu lieu (vérification en base après coup).
4. Une entrée de journal d'audit est produite.

**Assertions complémentaires** (anti-régression sur les P0 identifiés) :

| Test | Attendu |
|---|---|
| Action appelée sans cookie de session | `401` |
| Action appelée avec `Cookie: session=<userId d'un tiers>` | `401` (le cookie legacy doit être ignoré) |
| `updateUserProfileAction` avec `{ organizationId: '<ORG_A>' }` | `400` — champ rejeté |
| `updateUserProfileAction` avec `{ subscriptionTier: 'business' }` | `400` — champ rejeté |
| Toute réponse d'action utilisateur | ne contient jamais la clé `password` |
| `markAsPaid` invoqué hors webhook | `403`/`404` |
| `GET /dashboard` sans session | redirection vers `/login` |
| Session `client` accédant à `/dashboard` | redirection vers `/client/dashboard` ou `/forbidden` |
| `POST /api/stripe/connect/onboarding` sans session | `401` |
| `GET /api/reminders/check` sans secret de cron | `401` |

**Cette suite doit bloquer la CI et le déploiement.** C'est le seul garde-fou durable contre la réapparition de MS-002 et MS-005.

---

## 3. Tests unitaires prioritaires

| Cible | Scénarios | Priorité |
|---|---|---|
| `requireSession` / `requireOrganization` | session absente, session sans org, session valide, jeton expiré | P0 |
| `password` | hachage, vérification, rejet, politique de complexité | P0 |
| Schémas zod de validation | champ manquant, type incorrect, **champ inconnu rejeté** (`.strict()`), longueurs limites, Unicode, emoji | P0 |
| `invoice.service.generateNumber` | premier numéro, incrémentation, changement d'année, unicité sous concurrence | P1 |
| `invoice.service.calculateTotals` | TVA 0/5,5/10/20 %, arrondis au centime, remises, quantité 0, montant négatif rejeté | P1 |
| `date-utils` | fuseaux horaires, changement d'heure, année bissextile, dates futures et passées | P2 |
| Cascade de suppression | rollback si une étape échoue | P1 |

**À supprimer** : `__tests__/unit/services/user.service.test.ts` dans sa forme actuelle (`expect(true).toBe(true)`).

---

## 4. Tests d'intégration (actions + base PostgreSQL réelle)

Base éphémère (conteneur), migrations appliquées, jeu de données synthétiques, nettoyage entre chaque test.

Pour **chaque** action : nominal · non authentifié · autorisé mais mauvais locataire · entrée invalide · entrée à la limite · **double soumission** (idempotence) · concurrence (deux écritures simultanées sur la même ressource).

---

## 5. Tests de contrat — webhook Stripe

| Scénario | Attendu |
|---|---|
| Signature invalide | `400`, aucun effet |
| `checkout.session.completed` (subscription) | droits accordés, un seul enregistrement |
| **Même événement rejoué** | **aucun effet dupliqué** (idempotence) |
| `customer.subscription.deleted` | **droits retirés**, accès aux fonctions payantes refusé ensuite |
| `customer.subscription.updated` (changement de plan) | droits ajustés |
| `invoice.payment_failed` | passage en période de grâce, notification |
| Événements reçus dans le désordre | état final cohérent |
| Métadonnées absentes ou invalides | échec explicite et journalisé, `2xx` renvoyé à Stripe |
| `checkout.session.completed` (payment) | facture marquée payée **une seule fois**, montant vérifié |

Outil : `stripe listen` / `stripe trigger` en local, ou envoi d'événements signés depuis les fixtures.

---

## 6. Tests E2E (Playwright)

Prérequis manquant aujourd'hui : **un script de seed déterministe**. Les tests actuels supposent l'existence de `freelance@monservice.com` / `password123` sans jamais le créer.

| # | Parcours | Assertions clés |
|---|---|---|
| E1 | Inscription professionnelle → onboarding → dashboard | Pas de boucle de redirection ; organisation créée |
| E2 | Inscription client → espace client | Séparation des espaces respectée |
| E3 | Connexion / déconnexion / retour arrière après déconnexion | L'ancienne URL n'est plus accessible |
| E4 | Réinitialisation de mot de passe complète | Jeton à usage unique ; sessions révoquées |
| E5 | Client → devis → signature → facture → paiement (Stripe test) | Statuts cohérents entre interface, base et Stripe |
| E6 | Tentative d'accès croisé entre locataires via l'interface | `/forbidden` |
| E7 | Marketplace : publication → découverte → réponse → messagerie | Demande privée invisible pour un tiers |
| E8 | Atteinte du quota du plan Free | Blocage explicite avec proposition d'upgrade |
| E9 | Navigation clavier uniquement sur les 5 écrans principaux | Focus visible, aucun piège clavier |
| E10 | Double soumission de formulaire (double clic) | Une seule ressource créée |
| E11 | Rafraîchissement pendant une opération longue | Aucune perte de données silencieuse |
| E12 | Utilisation dans deux onglets simultanés | Aucune corruption d'état |

---

## 7. Tests de charge (environnement isolé et autorisé uniquement)

| Scénario | Objectif | Seuil |
|---|---|---|
| Charge nominale (50 utilisateurs simultanés) | p95 < 500 ms | Bloquant |
| Montée progressive jusqu'à saturation | Identifier le point de rupture | Documenté |
| Endurance 2 h | Détecter les fuites mémoire | Mémoire stable |
| Locataire volumineux (10 000 clients) | Vérifier la pagination et les index | p95 < 1 s |
| « Noisy neighbor » : un locataire saturant | Les autres locataires restent servis | Dégradation < 20 % |
| Rafale de webhooks Stripe | Idempotence sous charge | Aucun doublon |

À ne jamais exécuter en production ni contre les API tierces réelles.

---

## 8. Configuration CI cible

```yaml
jobs:
  quality:
    - npm ci
    - npm run lint          # bloquant  (aujourd'hui absent)
    - npx tsc --noEmit      # bloquant  (aujourd'hui absent)
    - npm audit --audit-level=high
  test:
    - services: postgres
    - npm run db:migrate
    - npm run test:unit
    - npm run test:integration
    - npm run test:security   # ← suite isolation, BLOQUANTE
    - npm run test:contract
  build:
    - npm run build         # bloquant  (aujourd'hui absent)
  e2e:
    - npm run db:seed
    - npx playwright test
```

Complément indispensable : **branches protégées**, revue obligatoire, interdiction de pousser directement sur `main`, environnement de production nécessitant une approbation.

---

## 9. Ordre de mise en place recommandé

1. Suite d'isolation multitenant (§2) — **avant même les corrections**, pour disposer d'un test rouge qui passe au vert.
2. Tests unitaires de `requireSession` et des schémas de validation.
3. Tests de contrat du webhook Stripe.
4. Tests d'intégration des actions, au fil de leur réécriture.
5. E2E des parcours critiques une fois l'authentification réparée.
6. Accessibilité et charge.
