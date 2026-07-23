import { Contact } from '../interfaces';

export const contactsFixture: Contact[] = [
  {
    id: 'b7c251f4-3d96-41fb-94a2-11ef84f3c051',
    firstName: 'Jean',
    lastName: 'Dupont',
    email: 'jean.dupont@techcorp.fr',
    phone: '+33 6 11 22 33 44',
    position: 'CTO',
    clientId: 'a642dc5c-bd69-4f7f-8566-6819934fcab1', // TechCorp
    organizationId: 'e2d63493-2780-4ec3-85bb-b302c31e78eb',
    createdAt: new Date('2026-01-16T10:00:00Z').toISOString(),
    updatedAt: new Date('2026-01-16T10:00:00Z').toISOString(),
  },
  {
    id: 'c9f32e18-d7b1-4c6e-82df-50f92b7cae67',
    firstName: 'Marie',
    lastName: 'Curie',
    email: 'm.curie@techcorp.fr',
    phone: '+33 6 55 66 77 88',
    position: 'CEO',
    clientId: 'a642dc5c-bd69-4f7f-8566-6819934fcab1', // TechCorp
    organizationId: 'e2d63493-2780-4ec3-85bb-b302c31e78eb',
    createdAt: new Date('2026-01-17T11:00:00Z').toISOString(),
    updatedAt: new Date('2026-01-17T11:00:00Z').toISOString(),
  },
  {
    id: '8a14b532-a982-4191-be71-08149e29f3d9',
    firstName: 'Pierre',
    lastName: 'Lambert',
    email: 'pierre.l@innodev.fr',
    phone: '+33 6 99 88 77 66',
    position: 'Lead Developer',
    clientId: '18f7734a-93e1-4af5-b1a1-94576180a3dc', // InnoDev
    organizationId: 'e2d63493-2780-4ec3-85bb-b302c31e78eb',
    createdAt: new Date('2026-02-11T09:00:00Z').toISOString(),
    updatedAt: new Date('2026-02-11T09:00:00Z').toISOString(),
  },
  {
    id: '50e687cf-4a1d-4054-9eb3-97cfcf800ed8',
    firstName: 'Sophie',
    lastName: 'Martin',
    email: 's.martin@innodev.fr',
    phone: '+33 6 44 33 22 11',
    position: 'Product Manager',
    clientId: '18f7734a-93e1-4af5-b1a1-94576180a3dc', // InnoDev
    organizationId: 'e2d63493-2780-4ec3-85bb-b302c31e78eb',
    createdAt: new Date('2026-02-12T14:00:00Z').toISOString(),
    updatedAt: new Date('2026-02-12T14:00:00Z').toISOString(),
  },
  {
    id: 'd3f9b287-c93d-4c12-8bb1-e37d5c7f82b4',
    firstName: 'Luc',
    lastName: 'Peeters',
    email: 'luc.peeters@bruxellesfinance.be',
    phone: '+32 4 11 22 33',
    position: 'Directeur Financier',
    clientId: '20b85a3a-2a91-4573-bf01-eb46ce616611', // Bruxelles Finance
    organizationId: '2cf1bb68-2a82-4148-af7b-ba52d3aef657',
    createdAt: new Date('2026-03-06T10:30:00Z').toISOString(),
    updatedAt: new Date('2026-03-06T10:30:00Z').toISOString(),
  },
  {
    id: 'ef025c8d-692b-42fa-9486-7a13c9a6331a',
    firstName: 'Emma',
    lastName: 'Dubois',
    email: 'emma@greenenergy.be',
    phone: '+32 4 55 66 77',
    position: 'Responsable Achats',
    clientId: '4a8f94fa-6e94-4b5f-8c34-eb17a7a3b378', // Green Energy
    organizationId: '2cf1bb68-2a82-4148-af7b-ba52d3aef657',
    createdAt: new Date('2026-04-13T11:00:00Z').toISOString(),
    updatedAt: new Date('2026-04-13T11:00:00Z').toISOString(),
  },
  {
    id: '9cf63ab7-f72c-497d-aa21-4f9e1d5a7dcb',
    firstName: 'Thomas',
    lastName: 'Roux',
    email: 'thomas@startupstudio.fr',
    phone: '+33 6 77 88 99 00',
    position: 'Fondateur',
    clientId: '538c8266-992a-43cf-a541-b844f23b20e0', // StartUp Studio
    organizationId: 'e2d63493-2780-4ec3-85bb-b302c31e78eb',
    createdAt: new Date('2026-05-21T09:00:00Z').toISOString(),
    updatedAt: new Date('2026-05-21T09:00:00Z').toISOString(),
  },
  {
    id: 'ab2c88f1-39c2-4b2a-89a3-5a02e60241cf',
    firstName: 'Julie',
    lastName: 'Petit',
    email: 'julie@startupstudio.fr',
    phone: '+33 6 11 99 88 77',
    position: 'CMO',
    clientId: '538c8266-992a-43cf-a541-b844f23b20e0', // StartUp Studio
    organizationId: 'e2d63493-2780-4ec3-85bb-b302c31e78eb',
    createdAt: new Date('2026-05-22T14:30:00Z').toISOString(),
    updatedAt: new Date('2026-05-22T14:30:00Z').toISOString(),
  },
  {
    id: 'f9d1a3c6-e4b2-4d7a-8f9c-1a2b3c4d5e6f',
    firstName: 'Paul',
    lastName: 'Richard',
    email: 'paul.r@techcorp.fr',
    phone: '+33 6 88 99 00 11',
    position: 'VP Sales',
    clientId: 'a642dc5c-bd69-4f7f-8566-6819934fcab1', // TechCorp
    organizationId: 'e2d63493-2780-4ec3-85bb-b302c31e78eb',
    createdAt: new Date('2026-06-01T09:00:00Z').toISOString(),
    updatedAt: new Date('2026-06-01T09:00:00Z').toISOString(),
  },
  {
    id: '1a2b3c4d-5e6f-7a8b-9c0d-e1f2a3b4c5d6',
    firstName: 'Céline',
    lastName: 'Boucher',
    email: 'celine.boucher@bruxellesfinance.be',
    phone: '+32 4 99 88 77',
    position: 'Analyste Risques',
    clientId: '20b85a3a-2a91-4573-bf01-eb46ce616611', // Bruxelles Finance
    organizationId: '2cf1bb68-2a82-4148-af7b-ba52d3aef657',
    createdAt: new Date('2026-06-15T11:30:00Z').toISOString(),
    updatedAt: new Date('2026-06-15T11:30:00Z').toISOString(),
  }
];
