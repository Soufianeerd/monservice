# Modèle de menaces — `monservice`

Méthode : STRIDE appliqué aux frontières de confiance identifiées, complété par les scénarios d'abus métier propres au SaaS multitenant.

---

## 1. Actifs à protéger

| # | Actif | Sensibilité | Impact en cas de compromission |
|---|---|---|---|
| A1 | Fichier clients et contacts de chaque organisation | Élevée | Fuite du patrimoine commercial d'une entreprise cliente |
| A2 | Opportunités commerciales et montants (`deals`) | Élevée | Renseignement concurrentiel |
| A3 | Devis et factures | Élevée | Fraude, litige, obligation comptable |
| A4 | Signatures manuscrites numérisées | Très élevée | Usurpation, faux en écriture |
| A5 | Identifiants et hachages de mots de passe | Très élevée | Compromission en cascade (réutilisation de mots de passe) |
| A6 | Messages entre utilisateurs | Élevée | Confidentialité des échanges commerciaux |
| A7 | Compte Stripe de la plateforme et comptes Connect | Très élevée | Détournement de fonds, suspension du compte plateforme |
| A8 | Droits d'abonnement (`subscriptionTier`) | Moyenne | Perte de revenu |
| A9 | Disponibilité du service | Élevée | Perte de confiance, résiliations |

---

## 2. Acteurs de menace

| Acteur | Motivation | Capacité | Pertinence ici |
|---|---|---|---|
| **T1 — Curieux non authentifié** | Opportunisme | Requêtes HTTP, lecture du bundle JS | **Très élevée** : MS-001/002/003 lui suffisent |
| **T2 — Client légitime malveillant** | Ne pas payer, nuire | Compte valide, connaissance du produit | **Très élevée** : MS-007 (facture payée sans paiement) |
| **T3 — Concurrent d'un locataire** | Renseignement commercial | Compte d'essai gratuit | **Très élevée** : MS-005 (accès croisé) |
| **T4 — Attaquant automatisé** | Revente de données, cryptominage | Balayage, scripts | Élevée : MS-003 exploitable en masse |
| **T5 — Développeur interne** | Erreur, accès excessif | Accès au dépôt et à la production | Moyenne : aucun cloisonnement ni journal d'audit |
| **T6 — Fournisseur compromis** | Chaîne d'approvisionnement | Paquet npm malveillant | Moyenne : aucun SBOM, aucune provenance |

---

## 3. Frontières de confiance et STRIDE

### FT-1 — Navigateur → Middleware (`proxy.ts`)

| STRIDE | Menace | État | Anomalie |
|---|---|---|---|
| Spoofing | Accès aux routes privées sans session | **RÉALISÉE** | MS-001 |
| Elevation | Accès à l'espace de l'autre `profileType` | **RÉALISÉE** | MS-001 |

### FT-2 — Navigateur → Server Actions

> **Frontière la plus critique et entièrement absente.** Les Server Actions sont des endpoints POST publics ; les layouts et les `redirect()` de page **ne s'appliquent pas** à leur invocation. C'est le point que le développement a manqué.

| STRIDE | Menace | État | Anomalie |
|---|---|---|---|
| Spoofing | Se faire passer pour un utilisateur via le cookie `session` non signé | **RÉALISÉE** | MS-006 |
| Tampering | Modifier n'importe quelle donnée de n'importe quel locataire | **RÉALISÉE** | MS-002, MS-005 |
| Repudiation | Aucune traçabilité des actions | **RÉALISÉE** | MS-025 |
| Info disclosure | Dump de la base utilisateurs avec hachages | **RÉALISÉE** | MS-003 |
| DoS | Aucune limitation de débit, `findAll` sans pagination | **RÉALISÉE** | MS-042 |
| Elevation | Modifier son `subscriptionTier` ou son `organizationId` | **RÉALISÉE** | MS-004 |

### FT-3 — Service → Base de données

| STRIDE | Menace | État | Anomalie |
|---|---|---|---|
| Tampering | Écriture croisée entre locataires | **RÉALISÉE** | MS-005 |
| Info disclosure | Lecture croisée (aucune RLS) | **RÉALISÉE / à confirmer** | MS-005, MS-022 |
| Repudiation | Suppressions dures sans journal | **RÉALISÉE** | MS-020 |
| DoS | Requêtes non indexées sur tables croissantes | Probable | MS-020, MS-042 |

Point positif : Drizzle ORM utilise des requêtes paramétrées. **Aucune injection SQL n'a été identifiée** — c'est réel et mérite d'être noté.

### FT-4 — Application ↔ Stripe

| STRIDE | Menace | État | Anomalie |
|---|---|---|---|
| Spoofing | Faux webhook | **NEUTRALISÉE** ✅ | Signature vérifiée correctement |
| Tampering | Rejeu d'un événement légitime | **RÉALISÉE** | MS-014 (aucune idempotence) |
| Elevation | Obtenir un compte Connect tiers | **RÉALISÉE** | MS-012 |
| Repudiation | Droits conservés après résiliation | **RÉALISÉE** | MS-014 |

### FT-5 — Chaîne d'approvisionnement

| STRIDE | Menace | État | Anomalie |
|---|---|---|---|
| Tampering | Dépendance compromise | Non évaluée (`npm audit` non exécutable) | MS-055 |
| Elevation | Secrets de CI exposés | Non évaluée | MS-028 |

Point positif : aucun secret n'a été trouvé dans l'historique Git.

---

## 4. Scénarios d'attaque de bout en bout

### SC-1 — Vol du fichier clients d'un concurrent (T3) — **faisable sans compte**

1. Ouvrir un compte d'essai (ou pas : MS-002 n'exige aucun compte).
2. Appeler `getAllUsersAction()` → obtenir tous les utilisateurs, leurs `organizationId` et leurs hachages (MS-003).
3. Identifier l'`organizationId` de la cible par son domaine d'e-mail.
4. Appeler `findAllAction(<orgId cible>)` pour `clients`, `contacts`, `deals`, `invoices`, `tasks` (MS-005).
5. Exfiltrer.

**Prérequis** : aucun. **Détection** : nulle (MS-025). **Impact** : A1, A2, A3, A5.

### SC-2 — Fraude à la facturation (T2) — **faisable avec un compte client**

1. Consulter une facture reçue, relever son `id`.
2. Appeler `markAsPaidAction(<id>, 'pi_x')` (MS-007).
3. La facture apparaît comme réglée chez le prestataire.

**Impact** : perte financière directe pour un client du SaaS — donc responsabilité de l'éditeur.

### SC-3 — Prise de contrôle d'un compte administrateur (T1)

1. `getAllUsersAction()` → identifier une cible (MS-003).
2. `updateUserProfileAction(<id cible>, { email: 'attaquant@…' })` (MS-004).
3. Déclencher la réinitialisation… qui n'existe pas (MS-016) — repli : écrire directement un hachage bcrypt choisi via le même appel.
4. Se connecter.

**Impact** : A1 à A6 pour l'organisation ciblée.

### SC-4 — Faux devis signé (T2/T3)

1. Obtenir l'`id` d'un devis (énumération via `getById` sans filtre d'organisation).
2. `updateSignatureAction(<id>, '<image de signature>')` (MS-007).
3. Le devis apparaît signé, sans IP, sans horodatage fiable, sans preuve.

**Impact** : A4 — contentieux potentiel entre un client du SaaS et son propre client.

### SC-5 — Abonnement gratuit permanent (T2)

Variante A : `updateUserProfileAction(<mon id>, { subscriptionTier: 'business', subscriptionStatus: 'active' })` (MS-004).
Variante B : souscrire, puis résilier chez Stripe — `customer.subscription.deleted` n'étant pas traité, les droits restent actifs indéfiniment (MS-014).

**Impact** : A8 — fuite de revenu structurelle.

### SC-6 — Détournement de versements (T1)

Appeler `/api/stripe/connect/onboarding` avec l'`organizationId` d'une cible → obtenir un lien d'onboarding Stripe Connect et accéder au flux de configuration bancaire (MS-012).

**Impact** : A7 — le plus grave financièrement.

---

## 5. Contre-mesures par ordre d'efficacité

| Rang | Contre-mesure | Scénarios neutralisés |
|---|---|---|
| 1 | `requireSession()` imposé sur toutes les actions et routes | SC-1, SC-2, SC-3, SC-4, SC-5A, SC-6 |
| 2 | Suppression de `organizationId`/`userId` des signatures | SC-1, SC-4 |
| 3 | Row-Level Security PostgreSQL | SC-1 (défense en profondeur) |
| 4 | Statut `paid` piloté uniquement par le webhook | SC-2 |
| 5 | Liste blanche de champs sur la mise à jour de profil | SC-3, SC-5A |
| 6 | Traitement de `subscription.deleted` + idempotence | SC-5B |
| 7 | Correction de `proxy.ts` | défense périmétrique |
| 8 | Journalisation et alertes | détection de tous les scénarios |
| 9 | Limitation de débit | SC-1 en masse, bourrage d'identifiants |

**Les deux premières lignes traitent à elles seules cinq des six scénarios.** C'est là que doit porter l'effort initial.

---

## 6. Risques résiduels après remédiation complète

- **Compromission d'un compte légitime** (hameçonnage) : atténuée par la MFA, non prévue à ce jour.
- **Employé interne malveillant** : aucun cloisonnement des accès de production ni journal d'audit administratif.
- **Chaîne d'approvisionnement npm** : atténuée par SBOM, versions épinglées et revue des mises à jour.
- **Fournisseur (Supabase, Netlify, Stripe) indisponible** : aucun plan de continuité, aucune dégradation contrôlée prévue.
