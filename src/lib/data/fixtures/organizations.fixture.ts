import { Organization } from '../interfaces';

export const organizationsFixture: Organization[] = [
  {
    id: 'e2d63493-2780-4ec3-85bb-b302c31e78eb',
    name: 'Agence Digital',
    industry: 'Technologie',
    country: 'France',
    isPublic: true,
    profileType: 'professional',
    slug: 'agence-digital',
    isPublished: true,
    socialLinks: {
      linkedin: 'https://linkedin.com/company/monservice'
    },
    legalNotice: 'SARL MonService au capital de 10 000€ - SIRET : 123 456 789 00012',
    paymentTerms: 'Paiement à réception de facture. Aucun escompte pour paiement anticipé.',
    bankDetails: 'IBAN: FR76 3000 0000 0000 0000 000 | BIC: XXXXFRPP',
    createdAt: new Date('2025-11-01T08:00:00Z').toISOString(),
    updatedAt: new Date('2025-11-01T08:00:00Z').toISOString(),
  },
  {
    id: '2cf1bb68-2a82-4148-af7b-ba52d3aef657',
    name: 'Cabinet Conseil',
    industry: 'Consulting',
    country: 'Belgique',
    isPublic: true,
    profileType: 'professional',
    createdAt: new Date('2025-12-05T08:00:00Z').toISOString(),
    updatedAt: new Date('2025-12-05T08:00:00Z').toISOString(),
  }
];
