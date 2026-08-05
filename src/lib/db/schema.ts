import { sqliteTable as sqliteTableCore, text as sqliteText, integer as sqliteInteger, real as sqliteReal } from 'drizzle-orm/sqlite-core';
import { pgTable, text as pgText, integer as pgInteger, real as pgReal, boolean as pgBoolean } from 'drizzle-orm/pg-core';

const isPg = process.env.DATABASE_URL?.startsWith('postgres');

const sqliteTable: typeof sqliteTableCore = isPg ? (pgTable as any) : sqliteTableCore;
const text: typeof sqliteText = isPg ? (pgText as any) : sqliteText;
const real: typeof sqliteReal = isPg ? (pgReal as any) : sqliteReal;
const integer: typeof sqliteInteger = isPg ? (((name: string, options?: any) => {
  if (options?.mode === 'boolean') {
    return pgBoolean(name);
  }
  return pgInteger(name);
}) as any) : sqliteInteger;

// Users
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password'),
  name: text('name'),
  profileType: text('profile_type').notNull(), // 'client' | 'professional'
  organizationId: text('organization_id'),
  onboardingCompleted: integer('onboarding_completed', { mode: 'boolean' }).default(false),
  onboardingStep: integer('onboarding_step').default(0),
  subscriptionTier: text('subscription_tier').default('free'),
  subscriptionStatus: text('subscription_status').default('inactive'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Organizations
export const organizations = sqliteTable('organizations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').unique(),
  sector: text('sector'),
  profileType: text('profile_type').default('professional'),
  isPublic: integer('is_public', { mode: 'boolean' }).default(false),
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
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Clients
export const clients = sqliteTable('clients', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
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
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

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
});

// Deals
export const deals = sqliteTable('deals', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  clientId: text('client_id').notNull(),
  name: text('name').notNull(),
  value: real('value').notNull(),
  status: text('status').notNull(), // 'prospect' | 'qualification' | 'negotiation' | 'proposal' | 'won' | 'lost'
  expectedCloseDate: text('expected_close_date').notNull(),
  description: text('description'),
  signature: text('signature'), 
  signedAt: text('signed_at'),
  signatureToken: text('signature_token'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Products
export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  unitPrice: real('unit_price').notNull(),
  taxRate: real('tax_rate').default(20),
  type: text('type').default('service'), // 'product' | 'service'
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Invoices (Quotes & Invoices)
export const invoices = sqliteTable('invoices', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull(),
  clientId: text('client_id').notNull(),
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
  totalHT: real('total_ht').notNull(),
  taxAmount: real('tax_amount').notNull(),
  totalTTC: real('total_ttc').notNull(),
  signature: text('signature'), // serialized
  signatureDate: text('signature_date'),
  signatureIp: text('signature_ip'),
  signedAt: text('signed_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Invoice Lines
export const invoiceLines = sqliteTable('invoice_lines', {
  id: text('id').primaryKey(),
  invoiceId: text('invoice_id').notNull(),
  productId: text('product_id'),
  description: text('description').notNull(),
  quantity: real('quantity').notNull(),
  unitPrice: real('unit_price').notNull(),
  taxRate: real('tax_rate').notNull(),
  totalHT: real('total_ht').notNull(),
  totalTTC: real('total_ttc').notNull(),
});

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
});

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
});

// Messages
export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  senderId: text('sender_id').notNull(),
  receiverId: text('receiver_id').notNull(),
  content: text('content').notNull(),
  isRead: integer('is_read', { mode: 'boolean' }).default(false),
  requestId: text('request_id'),
  organizationId: text('organization_id').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

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
});
