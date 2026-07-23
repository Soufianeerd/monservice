import { Organization } from '../interfaces';

export const organizationsFixture: Organization[] = [
  {
    id: 'e2d63493-2780-4ec3-85bb-b302c31e78eb',
    name: 'Agence Digital',
    industry: 'Technologie',
    country: 'France',
    createdAt: new Date('2025-11-01T08:00:00Z').toISOString(),
    updatedAt: new Date('2025-11-01T08:00:00Z').toISOString(),
  },
  {
    id: '2cf1bb68-2a82-4148-af7b-ba52d3aef657',
    name: 'Cabinet Conseil',
    industry: 'Consulting',
    country: 'Belgique',
    createdAt: new Date('2025-12-05T08:00:00Z').toISOString(),
    updatedAt: new Date('2025-12-05T08:00:00Z').toISOString(),
  }
];
