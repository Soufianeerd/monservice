# Session 15 — Final Paramedical Hardening, Core API Security Baseline & Paramédical V1 Freeze

## 1. Objectif de la Session
La **Session 15** constitue la session finale et de clôture définitive de la verticale paramédicale du Practice Operating System (**MonSERVICE**). Elle verrouille l'ensemble des surfaces API (`src/app/api/`), colmate les failles d'autorisation et d'IDOR sur les flux transverses, valide les parcours critiques E2E (praticien et portail patient en vues Desktop et Mobile), et procède au gel formel de **Paramédical V1** avant l'ouverture de la verticale BTP.

---

## 2. Matrice d'Audit et Verrouillage des Endpoints API (`src/app/api/`)

| Méthode | Route | Rôle & Cloisonnement | Contrôle d'Accès & Autorisation | Protection Erreurs & Invariants |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/stripe/webhook` | Webhook Stripe | Validation de signature cryptographique (`STRIPE_WEBHOOK_SECRET`) + Idempotence | Pas de session requise, gestion raw body et vérification de montants. |
| `POST` | `/api/stripe/checkout` | Abonnement SaaS | `requireProfessional()` | Métadonnées (`userId`, `organizationId`, `tier`) dérivées côté serveur. Client refusé (403). |
| `POST` | `/api/stripe/connect/onboarding` | Onboarding bancaire Connect | `requireProfessional()` | `organizationId` dérivé de la session serveur. Client refusé (403). |
| `POST` | `/api/stripe/create-payment` | Paiement en ligne de facture | `requireSession()` | Autorisé pour l'émetteur pro exact OU le destinataire client exact (`recipientUserId`). |
| `POST` | `/api/invoices/[id]/send` | Envoi d'une facture | `requireProfessional()` | Émetteur de l'organisation exact uniquement. Compte client interdit (403). |
| `GET` | `/api/invoices/[id]/download` | Téléchargement structuré (XML/ZIP) | `requireSession()` | Émetteur pro exact OU destinataire client exact (`recipientUserId`). Formats autorisés : `xml`, `zip`. `Cache-Control: private, no-store`. |
| `GET` | `/api/invoices/[id]/delivery-status` | Suivi d'acheminement facture | `requireSession()` | Émetteur pro exact OU destinataire client exact. Minimisation des données pour le client (pas d'ID de tracking ou logs internes). |
| `GET` | `/api/reminders/check` | Déclenchement relances factures | Cron ou `requireProfessional()` | Secret `x-cron-secret` valide pour le cron global OU session professionnelle de l'organisation. Client refusé (403). |
| `GET` | `/api/reminders/appointments/check` | Rappels SMS/Email de RDV | Cron ou `requireProfessional()` | Secret `x-cron-secret` valide OU session professionnelle de l'organisation. Client refusé (403). |
| `GET` | `/api/admin/audit` | Consultation logs d'audit | `requireProfessional()` + RBAC | Permission RBAC `audit:view` exigée. Rejet 403 pour membre sans permission ou client. |
| `GET` | `/api/admin/audit/export` | Export CSV/JSON des logs | `requireProfessional()` + RBAC | Permission RBAC `audit:view` exigée. Formats autorisés : `csv`, `json`. `Cache-Control: private, no-store`. |
| `POST` | `/api/privacy/breach` | Déclaration incident / violation | `requireProfessional()` | `organizationId` dérivé de la session serveur. |
| `PUT` | `/api/privacy/breach` | Mise à jour statut incident | `requireProfessional()` | Vérification stricte que l'incident appartient à `ctx.organizationId`. ID cross-tenant rejeté (404). |
| `POST` | `/api/privacy/dsar` | Création demande RGPD | `requireSession()` | `userId` et `organizationId` issus du serveur, validation Zod des champs (`type`, `details`). |
| `PUT` | `/api/privacy/dsar` | Traitement demande RGPD | `requireProfessional()` + RBAC | Permission `privacy:manage` / `admin` exigée + validation tenant ID. |
| `POST` | `/api/privacy/consent` | Enregistrement consentement | `requireSession()` | `organizationId` serveur, métadonnées IP et User-Agent d'audit. |
| `GET` | `/api/privacy/consent` | Historique consentements | `requireSession()` | `userId` issu de la session serveur. |
| `GET` | `/api/retention/check` | Contrôle rétention / anonymisation | `requireProfessional()` | Organisation serveur, exécution sécurisée. |
| `POST` | `/api/retention/export` | Export archive RGPD / rétention | `requireProfessional()` | Validation dates ISO, sanitisation du nom de fichier ZIP. |
| `POST` | `/api/auth/mfa` | Génération secret TOTP | `requireSession()` | `userId` serveur, URL et QR Code chiffrés. |
| `DELETE` | `/api/auth/mfa` | Désactivation TOTP | `requireSession()` | `userId` serveur. |
| `POST` | `/api/auth/mfa/verify` | Validation TOTP | `requireSession()` | Validation Zod stricte regex 6 chiffres, rate-limiting mémoire en défense additionnelle. |
| `POST` | `/api/deals/sign` | Signature électronique deal | `requireOrganization()` | Vérification ownership deal, feature flag `electronicSignature`. |
| `POST` | `/api/quotes/sign` | Signature électronique devis | `requireSession()` | Émetteur pro exact OU destinataire client exact (`recipientUserId`). Immuabilité après signature. |

---

## 3. Garde-Fous de Sécurité & Non-Fuite d'Erreurs

1. **Zéro Cast Menteur (`0 lying cast`)** :
   - 0 `as any`, 0 `as unknown as`, 0 `as never`, 0 `: any`, 0 `@ts-ignore` sur toute la surface `src/app/api/`.
2. **Pas de Fuite d'Erreurs Internes** :
   - Remplacement de tous les `catch (error: any)` et `error.message` bruts par `toErrorResponse(error, fallbackMessage)`.
   - Aucune stack trace, aucun nom de table PostgreSQL, ni message d'ORM exposé au client.
3. **Scan des Secrets & Variables d'Environnement** :
   - Test structurel automatisé `secret-scan.test.ts` garantissant l'absence de `NEXT_PUBLIC_*` portant des secrets (`SERVICE_ROLE`, `PRIVATE_KEY`, `WEBHOOK_SECRET`, `PASSWORD`).
   - Aucun secret en clair versionné dans le dépôt Git.
4. **En-têtes de Sécurité & Cache-Control Données de Santé** :
   - Ajout de `Cache-Control: private, no-store, max-age=0` sur `/patients/:path*` et `/api/:path*`.
   - Headers stricts : `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`.

---

## 4. Parcours E2E & Validations Multi-Devices

1. **Parcours Praticien Paramédical (`e2e/paramedical-practitioner-journey.spec.ts`)** :
   - Authentification praticien (`pro_a@monservice.com`).
   - Navigation registre Patients → consultation dossier patient → consultation agenda / créneaux.
   - Validation Desktop (`1440x900`) et Mobile (`390x844`).
2. **Parcours Portail Patient (`e2e/patient-portal-journey.spec.ts`)** :
   - Authentification client (`client_a@monservice.com`).
   - Navigation Suivi Santé, Rendez-vous, Questionnaires, Documents, Factures, Messagerie sécurisée.
   - Validation Desktop et Smoke Mobile (`390x844`).

---

## 5. Limites Connues (Known Limitations & Honest Disclosures)

- **Atténuation Rate-Limiting en Mémoire** : Le rate-limiter applicatif actuel (`src/middleware/rate-limit.ts`) est une atténuation mono-instance pour limiter le brute-force local. Un rate-limiting distribué (ex: Redis/Upstash) sera déployé lors du hardening infrastructure global.
- **Reprise sur Incident des Tâches Asynchrones** : La reprise automatique post-crash des relances en attente n'est pas distribuée ; elle s'appuie sur les crons planifiés.
- **Absence de Certifications Réglementaires Spécifiques** : Le produit intègre des mesures techniques et organisationnelles conformes aux bonnes pratiques de sécurité, mais n'a pas fait l'objet d'un audit de certification Hébergement de Données de Santé (HDS) tiers ni d'un marquage Dispositif Médical (DM).
- **Pas d'Intégration Nationale Connectée** : Les modules INS, DMP et MSSanté ne sont pas connectés à des passerelles d'homologation nationales.

---

## 6. Gel Formel de la Verticale (PARAMEDICAL V1 FROZEN)

La verticale **Paramédical V1** est formellement déclarée **GELÉE** et complète :
- **50 tables PostgreSQL** stabilisées et verrouillées (0 migration 0019 requise).
- **7 Profession Packs** opérationnels (Ostéopathe, Kinésithérapeute, Orthophoniste, Psychomotricien, Diététicien, Ergothérapeute, Podologue).
- **RLS & Storage** cliniques hermétiques et éprouvés.
- **APIs Core** sécurisées contre les attaques IDOR, cross-tenant et élévation de privilèges.

Le projet est prêt pour l'ouverture de la verticale suivante : **BTP & Artisans (Session 16)**.
