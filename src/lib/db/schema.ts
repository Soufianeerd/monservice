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
} from 'drizzle-orm/pg-core';

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
  mfaEnabled: boolean('mfa_enabled').default(false),
  mfaSecret: text('mfa_secret'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (t) => [
  index('users_organization_id_idx').on(t.organizationId)
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
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

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

// RBAC Roles
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

