import { User } from '../interfaces';

export const usersFixture: User[] = [
  {
    id: '75a894cd-f268-45b0-9db0-a36cced478d5',
    name: 'Alice Admin',
    email: 'admin@monservice.com',
    password: 'password123',
    role: 'admin',
    profileType: 'professional',
    onboardingCompleted: true,
    onboardingStep: 0,
    organizationId: 'e2d63493-2780-4ec3-85bb-b302c31e78eb', // Agence Digital
    createdAt: new Date('2026-01-10T08:00:00Z').toISOString(),
    updatedAt: new Date('2026-01-10T08:00:00Z').toISOString(),
  },
  {
    id: 'b4c9b360-1d8f-4318-87cf-45e0f76906a6',
    name: 'Bob Dupont',
    email: 'bob.dupont@monservice.com',
    password: 'password123',
    role: 'member',
    profileType: 'professional',
    onboardingCompleted: true,
    onboardingStep: 0,
    organizationId: 'e2d63493-2780-4ec3-85bb-b302c31e78eb', // Agence Digital
    createdAt: new Date('2026-02-15T09:30:00Z').toISOString(),
    updatedAt: new Date('2026-02-15T09:30:00Z').toISOString(),
  },
  {
    id: '82703816-ecbd-4152-bc6d-0bb231f2dc34',
    name: 'Claire Lefèvre',
    email: 'claire.lefevre@monservice.com',
    password: 'password123',
    role: 'admin',
    profileType: 'professional',
    onboardingCompleted: true,
    onboardingStep: 0,
    organizationId: '2cf1bb68-2a82-4148-af7b-ba52d3aef657', // Cabinet Conseil
    createdAt: new Date('2026-03-20T10:15:00Z').toISOString(),
    updatedAt: new Date('2026-03-20T10:15:00Z').toISOString(),
  }
];
