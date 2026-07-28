import { Request } from '../interfaces';

export const requestsFixture: Request[] = [
  {
    id: 'req-1',
    title: 'Création d\'un site web e-commerce',
    description: 'Je cherche un développeur pour créer une boutique en ligne pour vendre mes produits artisanaux.',
    category: 'freelance',
    budget: 3000,
    location: 'Paris, France',
    preferredDate: '2026-09-01T00:00:00Z',
    status: 'published',
    clientId: 'a642dc5c-bd69-4f7f-8566-6819934fcab1', // Client existing in fixture
    isPublic: true,
    createdAt: new Date('2026-07-20T10:00:00Z').toISOString(),
    updatedAt: new Date('2026-07-20T10:00:00Z').toISOString(),
    quoteIds: ['a9b0c1d2-e3f4-4a5b-6c7d-8e9f0a1b2c3d']
  },
  {
    id: 'req-2',
    title: 'Rénovation salle de bain',
    description: 'Remplacement de la baignoire par une douche à l\'italienne, pose de carrelage.',
    category: 'artisan',
    budget: 5000,
    location: 'Lyon, France',
    preferredDate: '2026-10-15T00:00:00Z',
    status: 'draft',
    clientId: 'a642dc5c-bd69-4f7f-8566-6819934fcab1',
    isPublic: false,
    createdAt: new Date('2026-07-25T14:30:00Z').toISOString(),
    updatedAt: new Date('2026-07-26T09:15:00Z').toISOString(),
  },
  {
    id: 'req-3',
    title: 'Consultation juridique',
    description: 'Besoin d\'aide pour la rédaction de CGV et politique de confidentialité.',
    category: 'other',
    location: 'En ligne',
    status: 'in_progress',
    clientId: '538c8266-992a-43cf-a541-b844f23b20e0', // StartUp Studio
    organizationId: 'e2d63493-2780-4ec3-85bb-b302c31e78eb', // The pro
    createdAt: new Date('2026-06-10T10:00:00Z').toISOString(),
    updatedAt: new Date('2026-06-12T11:00:00Z').toISOString(),
  }
];
