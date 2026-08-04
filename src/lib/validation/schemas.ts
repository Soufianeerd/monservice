import { z } from 'zod';

// Client Schema
export const clientSchema = z.object({
  type: z.enum(['individual', 'company']),
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Email invalide"),
  phone: z.string().optional(),
  company: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  siret: z.string().optional(),
  vatNumber: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['lead', 'active', 'inactive']).default('lead'),
  organizationId: z.string().uuid("Organization ID requis")
});

// Contact Schema
export const contactSchema = z.object({
  clientId: z.string().uuid("Client ID requis"),
  firstName: z.string().min(2, "Le prénom est requis"),
  lastName: z.string().min(2, "Le nom est requis"),
  email: z.string().email("Email invalide"),
  phone: z.string().optional(),
  role: z.string().optional(),
  isPrimary: z.boolean().default(false),
  organizationId: z.string().uuid("Organization ID requis")
});

// Deal Schema
export const dealSchema = z.object({
  name: z.string().min(3, "Le nom est requis"),
  value: z.number().min(0, "La valeur doit être positive"),
  status: z.enum(['prospect', 'proposal', 'negotiation', 'won', 'lost', 'qualification']).default('prospect'),
  probability: z.number().min(0).max(100).default(0),
  clientId: z.string().uuid("Client ID requis"),
  expectedCloseDate: z.string().optional(),
  notes: z.string().optional(),
  organizationId: z.string().uuid("Organization ID requis")
});

// Product Schema
export const productSchema = z.object({
  name: z.string().min(2, "Le nom est requis"),
  description: z.string().optional(),
  unitPrice: z.number().min(0, "Le prix doit être positif"),
  taxRate: z.number().min(0).max(100).default(20),
  type: z.enum(['service', 'product']).default('service'),
  organizationId: z.string().uuid("Organization ID requis"),
  isActive: z.boolean().default(true)
});

// Invoice Line Schema
export const invoiceLineSchema = z.object({
  productId: z.string().optional(),
  description: z.string().min(1, "La description est requise"),
  quantity: z.number().min(1, "La quantité doit être d'au moins 1"),
  unitPrice: z.number().min(0, "Le prix unitaire doit être positif"),
  taxRate: z.number().min(0).max(100).default(20),
  discount: z.number().optional()
});

// Invoice Schema
export const invoiceSchema = z.object({
  clientId: z.string().uuid("Client ID requis"),
  type: z.enum(['invoice', 'quote']),
  number: z.string().optional(), // generated usually
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled', 'pending', 'accepted', 'rejected', 'unpaid', 'viewed']).default('draft'),
  date: z.string(),
  dueDate: z.string().optional(),
  message: z.string().optional(),
  organizationId: z.string().uuid("Organization ID requis")
});

// Task Schema
export const taskSchema = z.object({
  title: z.string().min(2, "Le titre est requis"),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled', 'todo']).default('todo'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  assignedTo: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  organizationId: z.string().uuid("Organization ID requis")
});

// Request Schema
export const requestSchema = z.object({
  title: z.string().min(5, "Le titre est requis (min 5)"),
  description: z.string().min(10, "La description est requise (min 10)"),
  category: z.string().min(2, "Catégorie requise"),
  budget: z.number().optional(),
  deadline: z.string().optional(),
  status: z.enum(['open', 'in_progress', 'completed', 'cancelled', 'draft', 'published']).default('draft'),
  visibility: z.enum(['public', 'private']).default('public'),
  clientId: z.string().uuid("Client ID requis")
});

// Message Schema
export const messageSchema = z.object({
  senderId: z.string().uuid("Sender ID requis"),
  receiverId: z.string().uuid("Receiver ID requis"),
  content: z.string().min(1, "Le message ne peut pas être vide"),
  requestId: z.string().optional(),
  organizationId: z.string().uuid("Organization ID requis")
});
