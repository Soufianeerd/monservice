import { Product } from '../interfaces';

export const productsFixture: Product[] = [
  {
    id: 'f78311d4-8d45-42cf-811c-2c974ddc3e1e',
    organizationId: 'e2d63493-2780-4ec3-85bb-b302c31e78eb',
    name: 'Consultation Stratégique',
    description: 'Une heure de consultation avec un de nos experts.',
    unitPrice: 150,
    taxRate: 20,
    createdAt: new Date('2025-11-15T08:00:00Z').toISOString(),
    updatedAt: new Date('2025-11-15T08:00:00Z').toISOString(),
  },
  {
    id: '9c5fbbf3-cf22-4a0b-87cf-9c606e30b6c1',
    organizationId: 'e2d63493-2780-4ec3-85bb-b302c31e78eb',
    name: 'Développement Web - Forfait Jour',
    description: 'Une journée de développement par un développeur Senior.',
    unitPrice: 650,
    taxRate: 20,
    createdAt: new Date('2025-11-15T08:00:00Z').toISOString(),
    updatedAt: new Date('2025-11-15T08:00:00Z').toISOString(),
  },
  {
    id: 'f1ac8e6b-0b2a-4467-8cf1-97b0a7dbcf0b',
    organizationId: 'e2d63493-2780-4ec3-85bb-b302c31e78eb',
    name: 'Design UI/UX - Forfait Jour',
    description: 'Une journée de conception interface utilisateur.',
    unitPrice: 550,
    taxRate: 20,
    createdAt: new Date('2025-11-15T08:00:00Z').toISOString(),
    updatedAt: new Date('2025-11-15T08:00:00Z').toISOString(),
  },
  {
    id: '3a4b08d7-58e1-4545-a74c-bd7c36d2c49b',
    organizationId: 'e2d63493-2780-4ec3-85bb-b302c31e78eb',
    name: 'Formation React/Next.js',
    description: 'Formation de 2 jours sur les technologies modernes React.',
    unitPrice: 1200,
    taxRate: 20,
    createdAt: new Date('2025-12-01T08:00:00Z').toISOString(),
    updatedAt: new Date('2025-12-01T08:00:00Z').toISOString(),
  }
];
