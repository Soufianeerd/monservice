# Session 14 — Paramedical Patient Experience & Operational Loop

## 1. Objectif & Vue d'Ensemble

La **Session 14** a pour mission de fermer le cycle opérationnel complet entre le praticien paramédical et son patient :
1. **Accès au Portail Patient (`patient_portal_access`)** : rattachement explicite et non-arbitraire par compte utilisateur/invitation pour un patient ou son représentant légal.
2. **Projection Sécurisée des Rendez-vous (`/client/sante/rendez-vous`)** : projection patient stricte masquant les données cliniques internes (pas de notes, diagnostics ou identifiants internes exposés).
3. **Partage Documentaire Contrôlé (`clinical_documents.patient_visible`)** : visibilité explicite par document avec génération de liens de téléchargement signés éphémères (60s).
4. **Questionnaires & Bilans Patients (`patient_questionnaire_assignments`)** : assignation par le praticien, sauvegarde d'ébauches intermédiaires, soumission idempotente et injection automatique dans `clinical_form_responses`.
5. **Passerelle de Facturation Administrative (`patient_billing_links`)** : pont non-polluant entre dossier médical et facturation commerciale, émission de factures avec `recipientUserId`.
6. **Paiement Stripe Patient** : sécurisation stricte de l'autorisation de paiement (`invoice.recipientUserId === ctx.userId`) et webhooks idempotents.
7. **Messagerie Sécurisée Patient/Praticien (`messages.patient_id`)** : échanges bidirectionnels vérifiant la relation de soin active.
8. **Rappels Automatiques par Email (24h & 2h)** : tâche planifiée protégée par `CRON_SECRET` avec idempotence et empreinte de pseudonymisation.

---

## 2. Architecture & Modèle de Données

### Migration `0018_deep_white_tiger.sql`
- Nouvelles tables :
  - `patient_portal_access` : contrôle d'accès patient avec `access_type IN ('patient', 'representative')`, `is_active boolean`, contrainte d'unicité `(organization_id, patient_id, user_id)`.
  - `patient_questionnaire_assignments` : suivi des questionnaires assignés, statuts `('assigned', 'submitted', 'cancelled')`, brouillons JSON et lien vers `clinical_form_responses`.
  - `patient_billing_links` : passerelle patient-client CRM avec unicité `(organization_id, patient_id)`.
  - `appointment_reminder_deliveries` : journal d'envoi des rappels avec unicité `(appointment_id, channel, offset_minutes)`, statut `('pending', 'sent', 'failed')` (mécanisme atomique claim-before-send) et hash pseudonymisé de l'email destinataire.
- Évolutions de schéma :
  - `clinical_documents.patient_visible` (boolean default false).
  - `invoices.recipient_user_id` (foreign key vers `users.id`).
  - `messages.patient_id` (foreign key vers `patient_profiles.id`).

---

## 3. Sécurité & Conformité

1. **Isolation Multi-Tenant & RLS** :
   - `patient_portal_access` : Praticiens actifs de l'organisation (`ALL`), Patients actifs (`SELECT`).
   - `patient_questionnaire_assignments` : Praticiens assigneurs de l'organisation (`ALL`), Patients actifs rattachés (`SELECT`). Mutations via Server Actions avec validation Zod.
   - `patient_billing_links` : Praticiens actifs de l'organisation (`ALL`), 0 accès direct client/staff.
   - `appointment_reminder_deliveries` : Réservé exclusivement au rôle `service_role` (0 accès direct PostgREST authenticated/anon).
   - `messages` : Échanges bidirectionnels filtrés sur l'expéditeur/destinataire avec vérification de relation de soin active si `patient_id` renseigné.
2. **Autorisation Stripe** : Contrôle d'accès strict sur `POST /api/stripe/create-payment` autorisant uniquement l'émetteur professionnel de l'organisation (`ctx.profileType === 'professional' && ctx.organizationId === invoice.organizationId`) ou le destinataire effectif (`ctx.profileType === 'client' && ctx.userId === invoice.recipientUserId`).
3. **Sécurisation Cron Rappels** : Endpoint `GET /api/reminders/appointments/check` protégé par `CRON_SECRET` non-vide, ou praticien professionnel restreint à sa propre organisation.
4. **Politique Zéro Cast Menteur** : 0 `as any`, 0 `as unknown as`, 0 `as never`, 0 `: any`, 0 `@ts-ignore`.
5. **Contrat Schema Drizzle** : 50 tables, 0 dérive (`npm run db:check-drift`).

---

## 4. Tests & Validation

- **Tests d'Intégrité DB** : `tests/integration/patient-portal-billing-communication-db-constraints.integration.test.ts`
- **Tests de Sécurité RLS** : `tests/integration/patient-portal-billing-communication-rls.integration.test.ts`
- **Tests Unitaires Portail & Facturation** :
  - `tests/unit/patient-portal/portal-access-actions.test.ts`
  - `tests/unit/patient-portal/shared-documents-actions.test.ts`
  - `tests/unit/patient-portal/questionnaires-actions.test.ts`
  - `tests/unit/patient-portal/billing-bridge-actions.test.ts`
  - `tests/unit/patient-portal/messaging-actions.test.ts`
  - `tests/unit/scheduling/appointment-reminders.test.ts`
  - `tests/unit/scheduling/cron-reminders-auth.test.ts`
  - `tests/unit/billing/stripe-portal-payment.test.ts`
- **Tests E2E Playwright** : `e2e/patient-portal-journey.spec.ts`
- **Validation Globale** :
  - `npm run typecheck` : 0 erreur
  - `npm run lint` : 0 erreur
  - `npm run build` : 91 routes générées avec succès
  - Toutes les suites unitaires exécutées et au vert
