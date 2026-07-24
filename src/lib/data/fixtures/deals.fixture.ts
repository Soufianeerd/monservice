import { Deal } from '../interfaces';

export const dealsFixture: Deal[] = [
  {
    id: '9f5e2283-92b4-45b0-8eb7-bc97e14f2e96',
    name: 'Refonte Site Web',
    value: 15000,
    status: 'proposal',
    clientId: 'a642dc5c-bd69-4f7f-8566-6819934fcab1', // TechCorp
    organizationId: 'e2d63493-2780-4ec3-85bb-b302c31e78eb',
    expectedCloseDate: new Date('2026-08-15T00:00:00Z').toISOString(),
    createdAt: new Date('2026-06-01T10:00:00Z').toISOString(),
    updatedAt: new Date('2026-06-15T10:00:00Z').toISOString(),
  },
  {
    id: '1e4ab917-7db5-4b0d-b8d4-6f90378e9b4d',
    name: 'Développement App Mobile',
    value: 35000,
    status: 'negotiation',
    clientId: '18f7734a-93e1-4af5-b1a1-94576180a3dc', // InnoDev
    organizationId: 'e2d63493-2780-4ec3-85bb-b302c31e78eb',
    expectedCloseDate: new Date('2026-09-01T00:00:00Z').toISOString(),
    createdAt: new Date('2026-05-10T14:30:00Z').toISOString(),
    updatedAt: new Date('2026-07-05T14:30:00Z').toISOString(),
  },
  {
    id: 'c83d6a2f-1e94-43b9-a28a-78f72a4d93e1',
    name: 'Audit Sécurité',
    value: 5000,
    status: 'won',
    clientId: '20b85a3a-2a91-4573-bf01-eb46ce616611', // Bruxelles Finance
    organizationId: '2cf1bb68-2a82-4148-af7b-ba52d3aef657',
    expectedCloseDate: new Date('2026-04-30T00:00:00Z').toISOString(),
    createdAt: new Date('2026-03-15T09:15:00Z').toISOString(),
    updatedAt: new Date('2026-04-20T09:15:00Z').toISOString(),
  },
  {
    id: '6b4a39f1-a1e5-4d2c-88b1-3e4b7b2f6c8d',
    name: 'Consulting Cloud',
    value: 12000,
    status: 'prospect',
    clientId: '4a8f94fa-6e94-4b5f-8c34-eb17a7a3b378', // Green Energy
    organizationId: '2cf1bb68-2a82-4148-af7b-ba52d3aef657',
    expectedCloseDate: new Date('2026-10-15T00:00:00Z').toISOString(),
    createdAt: new Date('2026-07-10T11:45:00Z').toISOString(),
    updatedAt: new Date('2026-07-10T11:45:00Z').toISOString(),
  },
  {
    id: 'f3a7c2d1-b9e8-4a5f-91a2-8c7d6e5f4b3a',
    name: 'Accompagnement MVP',
    value: 20000,
    status: 'lost',
    clientId: '538c8266-992a-43cf-a541-b844f23b20e0', // StartUp Studio
    organizationId: 'e2d63493-2780-4ec3-85bb-b302c31e78eb',
    expectedCloseDate: new Date('2026-06-30T00:00:00Z').toISOString(),
    createdAt: new Date('2026-05-25T16:20:00Z').toISOString(),
    updatedAt: new Date('2026-06-25T16:20:00Z').toISOString(),
  },
  {
    id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    name: 'Création Intranet',
    value: 8000,
    status: 'prospect',
    clientId: '18f7734a-93e1-4af5-b1a1-94576180a3dc', // InnoDev
    organizationId: 'e2d63493-2780-4ec3-85bb-b302c31e78eb',
    expectedCloseDate: new Date('2026-11-01T00:00:00Z').toISOString(),
    createdAt: new Date('2026-08-01T10:00:00Z').toISOString(),
    updatedAt: new Date('2026-08-01T10:00:00Z').toISOString(),
  },
  {
    id: 'd4e5b9f0-a1c2-4b3d-8e7f-6a5b4c3d2e1f',
    name: 'Migration Serveurs',
    value: 45000,
    status: 'won',
    clientId: 'a642dc5c-bd69-4f7f-8566-6819934fcab1', // TechCorp
    organizationId: 'e2d63493-2780-4ec3-85bb-b302c31e78eb',
    expectedCloseDate: new Date('2026-05-15T00:00:00Z').toISOString(),
    createdAt: new Date('2026-02-10T09:00:00Z').toISOString(),
    updatedAt: new Date('2026-05-20T09:00:00Z').toISOString(),
  },
  {
    id: 'f7a8b9c0-d1e2-4f3a-9b8c-7d6e5f4a3b2c',
    name: 'Formation Equipes',
    value: 3000,
    status: 'negotiation',
    clientId: '4a8f94fa-6e94-4b5f-8c34-eb17a7a3b378', // Green Energy
    organizationId: '2cf1bb68-2a82-4148-af7b-ba52d3aef657',
    expectedCloseDate: new Date('2026-09-15T00:00:00Z').toISOString(),
    createdAt: new Date('2026-07-20T14:00:00Z').toISOString(),
    updatedAt: new Date('2026-08-05T14:00:00Z').toISOString(),
  },
  {
    id: 'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b',
    name: 'Licences CRM',
    value: 12000,
    status: 'prospect',
    clientId: '20b85a3a-2a91-4573-bf01-eb46ce616611', // Bruxelles Finance
    organizationId: '2cf1bb68-2a82-4148-af7b-ba52d3aef657',
    expectedCloseDate: new Date('2026-12-01T00:00:00Z').toISOString(),
    createdAt: new Date('2026-08-10T11:00:00Z').toISOString(),
    updatedAt: new Date('2026-08-10T11:00:00Z').toISOString(),
  },
  {
    id: 'c9d0e1f2-a3b4-4c5d-6e7f-8a9b0c1d2e3f',
    name: 'Optimisation SEO',
    value: 4000,
    status: 'won',
    clientId: '538c8266-992a-43cf-a541-b844f23b20e0', // StartUp Studio
    organizationId: 'e2d63493-2780-4ec3-85bb-b302c31e78eb',
    expectedCloseDate: new Date('2026-07-01T00:00:00Z').toISOString(),
    createdAt: new Date('2026-05-01T09:30:00Z').toISOString(),
    updatedAt: new Date('2026-07-05T09:30:00Z').toISOString(),
  }
];
