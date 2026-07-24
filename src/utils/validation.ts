import { z } from 'zod';

// Formulaire Client
export const clientSchema = z.object({
  name: z.string().trim().min(1, 'Le nom est requis'),
  email: z.union([z.string().email('Email invalide'), z.literal('')]).optional(),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  zipCode: z.string().trim().optional(),
  website: z.string().trim().optional(),
  industry: z.string().trim().optional(),
  customIndustry: z.string().trim().optional(),
  country: z.string().trim().optional(),
  
  // Contact principal
  contactFirstName: z.string().trim().optional(),
  contactLastName: z.string().trim().optional(),
  contactEmail: z.union([z.string().email('Email invalide'), z.literal('')]).optional(),
  contactPhone: z.string().trim().optional(),
  contactPosition: z.string().trim().optional(),
});

// Formulaire Contact
export const contactSchema = z.object({
  firstName: z.string().trim().min(1, 'Le prénom est requis'),
  lastName: z.string().trim().min(1, 'Le nom est requis'),
  email: z.string().email('Email invalide'),
  phone: z.string().trim().optional(),
  position: z.string().trim().optional(),
  clientId: z.string().trim().min(1, 'Veuillez sélectionner un client'),
});

// Formulaire Deal
export const dealSchema = z.object({
  name: z.string().trim().min(1, 'Le nom est requis'),
  value: z.coerce.number().min(0, 'Le montant doit être positif'),
  stage: z.enum(['Prospect', 'Qualification', 'Proposition', 'Négociation', 'Gagné', 'Perdu']),
  expectedCloseDate: z.string().optional(),
  clientId: z.string().trim().min(1, 'Veuillez sélectionner un client'),
});

// Formulaire Tâche
export const taskSchema = z.object({
  title: z.string().trim().min(1, 'Le titre est requis'),
  description: z.string().trim().optional(),
  status: z.enum(['À faire', 'En cours', 'En attente', 'Terminé']),
  priority: z.enum(['Basse', 'Moyenne', 'Haute']),
  dueDate: z.string().min(1, "La date d'échéance est requise"),
  assignedTo: z.string().optional(),
  entityType: z.enum(['client', 'contact', 'deal', 'invoice', 'quote', '']).optional().transform(v => v === '' ? undefined : v),
  entityId: z.string().optional(),
});

// Formulaire Produit
export const productSchema = z.object({
  name: z.string().trim().min(1, 'Le nom est requis'),
  description: z.string().trim().optional(),
  unitPrice: z.coerce.number().min(0, 'Le prix doit être >= 0'),
  taxRate: z.coerce.number().min(0).max(100),
});

// Formulaire Devis / Facture
export const invoiceSchema = z.object({
  clientId: z.string().trim().min(1, 'Veuillez sélectionner un client'),
  type: z.enum(['invoice', 'quote']),
  date: z.string().min(1, 'La date est requise'),
  dueDate: z.string().optional(),
  lines: z.array(z.object({
    id: z.string().optional(),
    productId: z.string().optional(),
    description: z.string().trim().min(1, 'La description est requise'),
    quantity: z.coerce.number().positive('La quantité doit être > 0'),
    unitPrice: z.coerce.number().min(0, 'Le prix doit être >= 0'),
    taxRate: z.coerce.number().min(0).max(100),
    discount: z.coerce.number().min(0).max(100).optional(),
  })).min(1, 'Ajoutez au moins une ligne'),
});

// Formulaire Organisation
export const organizationSchema = z.object({
  name: z.string().trim().min(1, 'Le nom est requis'),
  industry: z.string().trim().optional(),
  customIndustry: z.string().trim().optional(),
  country: z.string().trim().optional(),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  zipCode: z.string().trim().optional(),
  email: z.union([z.string().email('Email invalide'), z.literal('')]).optional(),
  phone: z.string().trim().optional(),
  website: z.string().trim().optional(),
  taxId: z.string().trim().optional(),
  currency: z.string().trim().optional(),
});
