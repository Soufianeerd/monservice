import {
  pgTable,
  text,
  integer,
  real,
  numeric,
  boolean,
  index,
  uniqueIndex,
  timestamp,
  date,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { foreignKey } from 'drizzle-orm/pg-core';

/**
 * Schéma PostgreSQL unique.
 *
 * L'ancienne version basculait dynamiquement entre `sqlite-core` et `pg-core`
 * selon `DATABASE_URL`, avec un `as any` sur chaque helper. Le typage était
 * donc mensonger là où il aurait été le plus utile, et certaines API
 * divergeaient à l'exécution (`result.changes` n'existe pas côté PostgreSQL —
 * anomalies MS-011 et MS-021).
 *
 * PostgreSQL est désormais utilisé dans tous les environnements. Pour le
 * développement local : `docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16`.
 */

import { customType } from 'drizzle-orm/pg-core';

export const moneyNumeric = customType<{ data: number; driverData: string }>({
  dataType() {
    return 'numeric(14,2)';
  },
  fromDriver(value: string): number {
    return Number(value);
  },
  toDriver(value: number): string {
    return value.toString();
  },
});

/** Helper : conserve la signature `integer(name, { mode: 'boolean' })`. */
const sqliteTable = pgTable;

// Users
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password'),
  name: text('name'),
  profileType: text('profile_type').notNull(), // 'client' | 'professional'
  organizationId: text('organization_id'),
  onboardingCompleted: boolean('onboarding_completed').default(false),
  onboardingStep: integer('onboarding_step').default(0),
  subscriptionTier: text('subscription_tier').default('free'),
  subscriptionStatus: text('subscription_status').default('inactive'),
  // Colonne écrite par le webhook Stripe : elle était référencée par le code
  // mais absente du schéma (dérive constatée à l'audit).
  stripeCustomerId: text('stripe_customer_id'),
  legalEntityId: text('legal_entity_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (t) => [
  index('users_organization_id_idx').on(t.organizationId),
  uniqueIndex('users_id_org_unique').on(t.id, t.organizationId)
]);

// Organizations
export const organizations = sqliteTable('organizations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').unique(),
  sector: text('sector'),
  profileType: text('profile_type').default('professional'),
  isPublic: boolean('is_public').default(false),
  description: text('description'),
  logo: text('logo'),
  address: text('address'),
  city: text('city'),
  postalCode: text('postal_code'),
  country: text('country'),
  phone: text('phone'),
  legalNotice: text('legal_notice'),
  paymentTerms: text('payment_terms'),
  bankDetails: text('bank_details'),
  // Colonnes référencées par Stripe Connect et la facturation, jusqu'ici
  // absentes du schéma (dérive constatée à l'audit).
  email: text('email'),
  currency: text('currency').default('EUR'),
  industry: text('industry'),
  secondarySkills: text('secondary_skills'),
  stripeAccountId: text('stripe_account_id'),
  stripeAccountStatus: text('stripe_account_status'),
  profession: text('profession'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (t) => [
  check('organizations_profession_health_check', sql`${t.profession} IS NULL OR (${t.sector} IS NOT NULL AND ${t.sector} = 'health' AND ${t.profession} IN ('physiotherapist', 'osteopath', 'speech_therapist', 'podiatrist', 'occupational_therapist', 'psychomotor_therapist', 'dietitian'))`)
]);

// Clients
export const clients = sqliteTable('clients', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  userId: text('user_id'), // Lien avec l'utilisateur marketplace (facultatif)
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  city: text('city'),
  zipCode: text('zip_code'),
  country: text('country'),
  website: text('website'),
  industry: text('industry'),
  customIndustry: text('custom_industry'),
  contactFirstName: text('contact_first_name'),
  contactLastName: text('contact_last_name'),
  contactEmail: text('contact_email'),
  contactPhone: text('contact_phone'),
  contactPosition: text('contact_position'),
  company: text('company'),
  notes: text('notes'),
  legalEntityId: text('legal_entity_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (t) => [
  index('clients_organization_id_idx').on(t.organizationId),
  index('clients_user_id_idx').on(t.userId)
]);

// Contacts
export const contacts = sqliteTable('contacts', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  clientId: text('client_id').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  position: text('position').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (t) => [
  index('contacts_organization_id_idx').on(t.organizationId),
  index('contacts_client_id_idx').on(t.clientId)
]);

// Deals
export const deals = sqliteTable('deals', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  clientId: text('client_id').notNull(),
  name: text('name').notNull(),
  value: moneyNumeric('value').notNull(),
  status: text('status').notNull(), // 'prospect' | 'qualification' | 'negotiation' | 'proposal' | 'won' | 'lost'
  expectedCloseDate: text('expected_close_date').notNull(),
  description: text('description'),
  signature: text('signature'), 
  signedAt: text('signed_at'),
  signatureToken: text('signature_token'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (t) => [
  index('deals_organization_id_idx').on(t.organizationId),
  index('deals_client_id_idx').on(t.clientId)
]);

// Products
export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  unitPrice: moneyNumeric('unit_price').notNull(),
  taxRate: moneyNumeric('tax_rate').default(20),
  type: text('type').default('service'), // 'product' | 'service'
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (t) => [
  index('products_organization_id_idx').on(t.organizationId)
]);

// Invoices (Quotes & Invoices)
export const invoices = sqliteTable('invoices', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  clientId: text('client_id').notNull(), // Pointers to CRM clients.id
  recipientUserId: text('recipient_user_id'), // Pointers to users.id for marketplace access
  type: text('type').notNull(), // 'invoice' | 'quote'
  number: text('number').notNull(),
  date: text('date').notNull(),
  dueDate: text('due_date'),
  paidAt: text('paid_at'),
  paymentLink: text('payment_link'),
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  paymentIntentId: text('payment_intent_id'),
  requestId: text('request_id'),
  professionalId: text('professional_id'),
  message: text('message'),
  status: text('status').notNull(), // 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled'
  totalHT: moneyNumeric('total_ht').notNull(),
  taxAmount: moneyNumeric('tax_amount').notNull(),
  totalTTC: moneyNumeric('total_ttc').notNull(),
  signature: text('signature'), // serialized
  signatureDate: text('signature_date'),
  signatureIp: text('signature_ip'),
  signedAt: text('signed_at'),
  legalEntityId: text('legal_entity_id'),
  supplierCountry: text('supplier_country'),
  supplierVatId: text('supplier_vat_id'),
  customerCountry: text('customer_country'),
  customerVatId: text('customer_vat_id'),
  customerType: text('customer_type'),
  vatTreatment: text('vat_treatment'),
  vatRate: moneyNumeric('vat_rate'),
  vatExemptionCode: text('vat_exemption_code'),
  reverseCharge: boolean('reverse_charge').default(false),
  einvoiceRequired: boolean('einvoice_required').default(false),
  einvoiceFormat: text('einvoice_format'),
  einvoiceProfile: text('einvoice_profile'),
  einvoiceNetwork: text('einvoice_network'),
  structuredInvoiceHash: text('structured_invoice_hash'),
  structuredInvoicePath: text('structured_invoice_path'),
  pdfHash: text('pdf_hash'),
  pdfPath: text('pdf_path'),
  lockedAt: text('locked_at'),
  lockedBy: text('locked_by'),
  retentionUntil: text('retention_until'),
  deliveryStatus: text('delivery_status'),
  deliveryChannel: text('delivery_channel'),
  deliveryTrackingId: text('delivery_tracking_id'),
  deliveryResponse: text('delivery_response'),
  deliveryAttempts: integer('delivery_attempts').default(0),
  deliverySentAt: timestamp('delivery_sent_at'),
  deliveryLastAttemptAt: timestamp('delivery_last_attempt_at'),
  legalRuleVersion: text('legal_rule_version'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (t) => [
  index('invoices_organization_id_idx').on(t.organizationId),
  index('invoices_client_id_idx').on(t.clientId),
  index('invoices_recipient_user_id_idx').on(t.recipientUserId),
  uniqueIndex('invoices_org_number_unique').on(t.organizationId, t.number)
]);

// Invoice Lines
export const invoiceLines = sqliteTable('invoice_lines', {
  id: text('id').primaryKey(),
  invoiceId: text('invoice_id').notNull(),
  productId: text('product_id'),
  description: text('description').notNull(),
  quantity: moneyNumeric('quantity').notNull(),
  unitPrice: moneyNumeric('unit_price').notNull(),
  taxRate: moneyNumeric('tax_rate').notNull(),
  totalHT: moneyNumeric('total_ht').notNull(),
  totalTTC: moneyNumeric('total_ttc').notNull(),
}, (t) => [
  index('invoice_lines_invoice_id_idx').on(t.invoiceId)
]);

// Tasks
export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  entityType: text('entity_type'),
  entityId: text('entity_id'),
  title: text('title').notNull(),
  description: text('description'),
  dueDate: text('due_date'),
  status: text('status').notNull(), // 'pending' | 'in_progress' | 'completed' | 'cancelled'
  priority: text('priority').default('medium'), // 'low' | 'medium' | 'high'
  assignedTo: text('assigned_to'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (t) => [
  index('tasks_organization_id_idx').on(t.organizationId)
]);

// Requests (Marketplace)
export const requests = sqliteTable('requests', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull(),
  budget: text('budget'),
  deadline: text('deadline'),
  status: text('status').default('open'), // 'open' | 'in_progress' | 'completed' | 'cancelled'
  visibility: text('visibility').default('public'), // 'public' | 'private'
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (t) => [
  index('requests_client_id_idx').on(t.clientId)
]);

// Messages
export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  senderId: text('sender_id').notNull(),
  receiverId: text('receiver_id').notNull(),
  content: text('content').notNull(),
  isRead: boolean('is_read').default(false),
  requestId: text('request_id'),
  organizationId: text('organization_id').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (t) => [
  index('messages_sender_id_idx').on(t.senderId),
  index('messages_receiver_id_idx').on(t.receiverId),
  index('messages_request_id_idx').on(t.requestId)
]);

// Message Templates
export const messageTemplates = sqliteTable('message_templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  type: text('type').notNull(), // 'email' | 'sms'
  organizationId: text('organization_id').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (t) => [
  index('message_templates_organization_id_idx').on(t.organizationId)
]);

// ---------------------------------------------------------------------------
// Registre des événements Stripe traités (idempotence du webhook — MS-014)
// ---------------------------------------------------------------------------
export const stripeEvents = sqliteTable('stripe_events', {
  id: text('id').primaryKey(), // event.id fourni par Stripe
  type: text('type').notNull(),
  processedAt: text('processed_at').notNull(),
});

// Legal Entities
export const legalEntities = sqliteTable('legal_entities', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id),
  name: text('name').notNull(),
  legalForm: text('legal_form'),
  country: text('country').notNull(),
  establishmentCountry: text('establishment_country'),
  registrationNumber: text('registration_number'),
  vatNumber: text('vat_number'),
  vatScheme: text('vat_scheme'),
  address: text('address'),
  city: text('city'),
  postalCode: text('postal_code'),
  phone: text('phone'),
  email: text('email'),
  website: text('website'),
  representative: text('representative'),
  isDefault: boolean('is_default').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Country Compliance Profiles
export const countryComplianceProfiles = sqliteTable('country_compliance_profiles', {
  id: text('id').primaryKey(),
  country: text('country').notNull(),
  version: text('version').notNull(),
  effectiveFrom: timestamp('effective_from').notNull(),
  vatStandard: moneyNumeric('vat_standard').notNull(),
  vatReduced: moneyNumeric('vat_reduced'),
  vatReduced2: moneyNumeric('vat_reduced_2'),
  vatReduced3: moneyNumeric('vat_reduced_3'),
  retentionYears: integer('retention_years').notNull(),
  einvoiceMandatory: boolean('einvoice_mandatory').default(false),
  einvoiceFormat: text('einvoice_format'),
  einvoiceNetwork: text('einvoice_network'),
  legalMentions: text('legal_mentions'),
  marketingRule: text('marketing_rule'),
  privacyAuthority: text('privacy_authority'),
  dpoThreshold: integer('dpo_threshold'),
  archivingRequirements: text('archiving_requirements'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Consent Events
export const consentEvents = sqliteTable('consent_events', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  organizationId: text('organization_id').references(() => organizations.id),
  consentType: text('consent_type').notNull(),
  consentValue: text('consent_value').notNull(),
  legalBasis: text('legal_basis'),
  source: text('source'),
  ip: text('ip'),
  userAgent: text('user_agent'),
  policyVersion: text('policy_version'),
  timestamp: timestamp('timestamp').defaultNow(),
});

// Data Subject Requests
export const dataSubjectRequests = sqliteTable('data_subject_requests', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  organizationId: text('organization_id').references(() => organizations.id),
  requestType: text('request_type').notNull(), // ACCESS, RECTIFICATION, ERASURE, PORTABILITY, OBJECTION
  status: text('status').notNull(), // RECEIVED, PROCESSING, COMPLETED, REJECTED
  requestDetails: text('request_details'),
  response: text('response'),
  deadline: timestamp('deadline'),
  receivedAt: timestamp('received_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  processedBy: text('processed_by').references(() => users.id),
});

// Audit Logs
export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  organizationId: text('organization_id').references(() => organizations.id),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  oldValues: text('old_values'), // Should ideally be JSON but using text for SQLite compat
  newValues: text('new_values'),
  ip: text('ip'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Processing Activities (GDPR Register)
export const processingActivities = sqliteTable('processing_activities', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id),
  name: text('name').notNull(),
  purpose: text('purpose').notNull(),
  dataCategories: text('data_categories'), // JSON array
  legalBasis: text('legal_basis'),
  retentionPeriod: text('retention_period'),
  dataSubjects: text('data_subjects'), // ex: 'clients', 'prospects', 'employees'
  transfers: text('transfers'), // pays tiers
  securityMeasures: text('security_measures'),
  responsible: text('responsible'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Breach Notifications (GDPR)
export const breachNotifications = sqliteTable('breach_notifications', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id),
  title: text('title').notNull(),
  description: text('description').notNull(),
  discoveryDate: timestamp('discovery_date').notNull(),
  startDate: timestamp('start_date'),
  dataCategories: text('data_categories'),
  affectedIndividuals: integer('affected_individuals'),
  riskLevel: text('risk_level'), // 'low', 'medium', 'high'
  correctiveActions: text('corrective_actions'),
  notifiedAuthority: boolean('notified_authority').default(false),
  notificationDate: timestamp('notification_date'),
  notifiedIndividuals: boolean('notified_individuals').default(false),
  status: text('status').default('open'), // 'open', 'investigating', 'resolved'
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Retention Policies
export const retentionPolicies = sqliteTable('retention_policies', {
  id: text('id').primaryKey(),
  country: text('country').notNull(),
  years: integer('years').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Archived Documents
export const archivedDocuments = sqliteTable('archived_documents', {
  id: text('id').primaryKey(),
  documentId: text('document_id').notNull(),
  documentType: text('document_type'), // 'invoice' | 'quote'
  organizationId: text('organization_id').notNull().references(() => organizations.id),
  retentionDate: timestamp('retention_date').notNull(),
  archivedAt: timestamp('archived_at').defaultNow(),
  anonymized: boolean('anonymized').default(false),
  expirationStatus: text('expiration_status'), // 'pending', 'expired', 'anonymized'
  notes: text('notes'),
});

// ---------------------------------------------------------------------------
// PRACTICE STRUCTURE (Paramedical / Clinical)
// ---------------------------------------------------------------------------

// Practice Locations
export const practiceLocations = sqliteTable('practice_locations', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id),
  name: text('name').notNull(),
  address: text('address'),
  city: text('city'),
  postalCode: text('postal_code'),
  country: text('country'),
  timezone: text('timezone').notNull(),
  phone: text('phone'),
  isPrimary: boolean('is_primary').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('practice_locations_organization_id_idx').on(t.organizationId),
  uniqueIndex('practice_locations_org_id_unique').on(t.id, t.organizationId),
  uniqueIndex('practice_locations_primary_active_idx')
    .on(t.organizationId)
    .where(sql`${t.isPrimary} = true AND ${t.isActive} = true`)
]);

// Practice Practitioners
export const practicePractitioners = sqliteTable('practice_practitioners', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id),
  userId: text('user_id'),
  displayName: text('display_name').notNull(),
  profession: text('profession').notNull(),
  email: text('email'),
  phone: text('phone'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('practice_practitioners_organization_id_idx').on(t.organizationId),
  uniqueIndex('practice_practitioners_org_id_unique').on(t.id, t.organizationId),
  uniqueIndex('practice_practitioners_org_user_unique').on(t.organizationId, t.userId),
  check('practice_practitioners_profession_check', sql`${t.profession} IN ('physiotherapist', 'osteopath', 'speech_therapist', 'podiatrist', 'occupational_therapist', 'psychomotor_therapist', 'dietitian')`),
  foreignKey({
    columns: [t.userId, t.organizationId],
    foreignColumns: [users.id, users.organizationId],
    name: 'practice_practitioners_user_fk'
  })
]);

// Practitioner Locations (many-to-many)
export const practitionerLocations = sqliteTable('practitioner_locations', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id),
  practitionerId: text('practitioner_id').notNull(),
  locationId: text('location_id').notNull(),
  isPrimary: boolean('is_primary').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('practitioner_locations_org_practitioner_idx').on(t.organizationId, t.practitionerId),
  index('practitioner_locations_org_location_idx').on(t.organizationId, t.locationId),
  uniqueIndex('practitioner_locations_assignment_unique').on(t.organizationId, t.practitionerId, t.locationId),
  uniqueIndex('practitioner_locations_primary_active_idx')
    .on(t.organizationId, t.practitionerId)
    .where(sql`${t.isPrimary} = true AND ${t.isActive} = true`),
  foreignKey({
    columns: [t.practitionerId, t.organizationId],
    foreignColumns: [practicePractitioners.id, practicePractitioners.organizationId],
    name: 'practitioner_locations_practitioner_fk'
  }),
  foreignKey({
    columns: [t.locationId, t.organizationId],
    foreignColumns: [practiceLocations.id, practiceLocations.organizationId],
    name: 'practitioner_locations_location_fk'
  })
]);

// Practice Rooms
export const practiceRooms = sqliteTable('practice_rooms', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id),
  locationId: text('location_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('practice_rooms_organization_id_idx').on(t.organizationId),
  index('practice_rooms_location_id_idx').on(t.locationId),
  uniqueIndex('practice_rooms_location_name_unique').on(t.locationId, t.name),
  uniqueIndex('practice_rooms_org_location_id_unique').on(t.id, t.locationId, t.organizationId),
  foreignKey({
    columns: [t.locationId, t.organizationId],
    foreignColumns: [practiceLocations.id, practiceLocations.organizationId],
    name: 'practice_rooms_location_fk'
  })
]);

// Practice Resources
export const practiceResources = sqliteTable('practice_resources', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id),
  locationId: text('location_id').notNull(),
  roomId: text('room_id'),
  name: text('name').notNull(),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('practice_resources_organization_id_idx').on(t.organizationId),
  index('practice_resources_location_id_idx').on(t.locationId),
  index('practice_resources_room_id_idx').on(t.roomId),
  foreignKey({
    columns: [t.locationId, t.organizationId],
    foreignColumns: [practiceLocations.id, practiceLocations.organizationId],
    name: 'practice_resources_location_fk'
  }),
  foreignKey({
    columns: [t.roomId, t.locationId, t.organizationId],
    foreignColumns: [practiceRooms.id, practiceRooms.locationId, practiceRooms.organizationId],
    name: 'practice_resources_room_fk'
  })
]);

// ---------------------------------------------------------------------------
// PATIENT REGISTRY (Paramedical / Identity & Representatives)
// ---------------------------------------------------------------------------

// Patient Profiles
export const patientProfiles = sqliteTable('patient_profiles', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id),
  birthName: text('birth_name').notNull(),
  firstBirthName: text('first_birth_name').notNull(),
  birthFirstNames: text('birth_first_names'),
  usedName: text('used_name'),
  usedFirstName: text('used_first_name'),
  birthDate: date('birth_date').notNull(),
  sex: text('sex').notNull(),
  birthPlace: text('birth_place'),
  birthPlaceCode: text('birth_place_code'),
  birthCountry: text('birth_country'),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  city: text('city'),
  postalCode: text('postal_code'),
  country: text('country'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('patient_profiles_organization_id_idx').on(t.organizationId),
  uniqueIndex('patient_profiles_org_id_unique').on(t.id, t.organizationId),
  index('patient_profiles_org_birth_name_idx').on(t.organizationId, t.birthName),
  index('patient_profiles_org_birth_date_idx').on(t.organizationId, t.birthDate),
  check('patient_profiles_sex_check', sql`${t.sex} IN ('female', 'male', 'indeterminate', 'unknown')`),
]);

// Patient Representatives
export const patientRepresentatives = sqliteTable('patient_representatives', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  city: text('city'),
  postalCode: text('postal_code'),
  country: text('country'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('patient_representatives_organization_id_idx').on(t.organizationId),
  uniqueIndex('patient_representatives_org_id_unique').on(t.id, t.organizationId),
]);

// Patient Representative Links (many-to-many with roles/metadata)
export const patientRepresentativeLinks = sqliteTable('patient_representative_links', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organizations.id),
  patientId: text('patient_id').notNull(),
  representativeId: text('representative_id').notNull(),
  relationship: text('relationship').notNull(),
  isLegalRepresentative: boolean('is_legal_representative').notNull().default(false),
  isPrimaryContact: boolean('is_primary_contact').notNull().default(false),
  isEmergencyContact: boolean('is_emergency_contact').notNull().default(false),
  isBillingContact: boolean('is_billing_contact').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('patient_rep_links_org_patient_idx').on(t.organizationId, t.patientId),
  index('patient_rep_links_org_representative_idx').on(t.organizationId, t.representativeId),
  uniqueIndex('patient_rep_links_assignment_unique').on(t.organizationId, t.patientId, t.representativeId),
  uniqueIndex('patient_rep_links_primary_active_idx')
    .on(t.organizationId, t.patientId)
    .where(sql`${t.isPrimaryContact} = true AND ${t.isActive} = true`),
  check('patient_rep_links_relationship_check', sql`${t.relationship} IN ('parent', 'legal_guardian', 'spouse_partner', 'adult_child', 'sibling', 'caregiver', 'other')`),
  foreignKey({
    columns: [t.patientId, t.organizationId],
    foreignColumns: [patientProfiles.id, patientProfiles.organizationId],
    name: 'patient_rep_links_patient_fk'
  }),
  foreignKey({
    columns: [t.representativeId, t.organizationId],
    foreignColumns: [patientRepresentatives.id, patientRepresentatives.organizationId],
    name: 'patient_rep_links_representative_fk'
  })
]);

// ---------------------------------------------------------------------------
// RBAC Roles
// ---------------------------------------------------------------------------

export const roles = sqliteTable('roles', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(), // 'admin', 'manager', 'user', 'viewer'
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const permissions = sqliteTable('permissions', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(), // 'clients:read', 'clients:write', etc.
  description: text('description'),
  resource: text('resource').notNull(), // 'clients', 'invoices', 'deals', etc.
  action: text('action').notNull(), // 'read', 'write', 'delete', 'manage'
});

export const rolePermissions = sqliteTable('role_permissions', {
  id: text('id').primaryKey(),
  roleId: text('role_id').notNull().references(() => roles.id),
  permissionId: text('permission_id').notNull().references(() => permissions.id),
});

export const userRoles = sqliteTable('user_roles', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  roleId: text('role_id').notNull().references(() => roles.id),
  organizationId: text('organization_id').notNull().references(() => organizations.id),
});

