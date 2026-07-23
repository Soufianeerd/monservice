import { Client } from '../interfaces';

export const clientsFixture: Client[] = [
  {
    id: 'a642dc5c-bd69-4f7f-8566-6819934fcab1',
    name: 'TechCorp',
    email: 'contact@techcorp.fr',
    phone: '+33 1 23 45 67 89',
    address: '10 Rue de la Paix, 75002 Paris',
    organizationId: 'e2d63493-2780-4ec3-85bb-b302c31e78eb', // Agence Digital
    createdAt: new Date('2026-01-15T10:00:00Z').toISOString(),
    updatedAt: new Date('2026-01-15T10:00:00Z').toISOString(),
  },
  {
    id: '18f7734a-93e1-4af5-b1a1-94576180a3dc',
    name: 'InnoDev Solutions',
    email: 'hello@innodev.fr',
    phone: '+33 1 98 76 54 32',
    address: '25 Avenue des Champs, 75008 Paris',
    organizationId: 'e2d63493-2780-4ec3-85bb-b302c31e78eb', // Agence Digital
    createdAt: new Date('2026-02-10T14:30:00Z').toISOString(),
    updatedAt: new Date('2026-02-10T14:30:00Z').toISOString(),
  },
  {
    id: '20b85a3a-2a91-4573-bf01-eb46ce616611',
    name: 'Bruxelles Finance',
    email: 'info@bruxellesfinance.be',
    phone: '+32 2 123 45 67',
    address: '15 Boulevard Anspach, 1000 Bruxelles',
    organizationId: '2cf1bb68-2a82-4148-af7b-ba52d3aef657', // Cabinet Conseil
    createdAt: new Date('2026-03-05T09:15:00Z').toISOString(),
    updatedAt: new Date('2026-03-05T09:15:00Z').toISOString(),
  },
  {
    id: '4a8f94fa-6e94-4b5f-8c34-eb17a7a3b378',
    name: 'Green Energy Sprl',
    email: 'contact@greenenergy.be',
    phone: '+32 4 987 65 43',
    address: '88 Rue de Namur, 1050 Ixelles',
    organizationId: '2cf1bb68-2a82-4148-af7b-ba52d3aef657', // Cabinet Conseil
    createdAt: new Date('2026-04-12T11:45:00Z').toISOString(),
    updatedAt: new Date('2026-04-12T11:45:00Z').toISOString(),
  },
  {
    id: '538c8266-992a-43cf-a541-b844f23b20e0',
    name: 'StartUp Studio',
    email: 'hello@startupstudio.fr',
    phone: '+33 6 12 34 56 78',
    address: 'Station F, 75013 Paris',
    organizationId: 'e2d63493-2780-4ec3-85bb-b302c31e78eb', // Agence Digital
    createdAt: new Date('2026-05-20T16:20:00Z').toISOString(),
    updatedAt: new Date('2026-05-20T16:20:00Z').toISOString(),
  }
];
