import { Task } from '../interfaces';

export const tasksFixture: Task[] = [
  {
    id: 'b1c3a8d9-e4f5-4a6b-9c7d-8e9f0a1b2c3d',
    title: 'Envoyer devis refonte',
    description: 'Préparer et envoyer le devis pour la refonte du site web de TechCorp.',
    status: 'À faire',
    priority: 'Haute',
    dueDate: new Date('2026-07-25T12:00:00Z').toISOString(),
    assignedTo: '75a894cd-f268-45b0-9db0-a36cced478d5', // Alice Martin
    organizationId: 'e2d63493-2780-4ec3-85bb-b302c31e78eb',
    createdAt: new Date('2026-07-20T08:00:00Z').toISOString(),
    updatedAt: new Date('2026-07-20T08:00:00Z').toISOString(),
  },
  {
    id: 'd4e5b9f0-a1c2-4b3d-8e7f-6a5b4c3d2e1f',
    title: 'Appel de qualification InnoDev',
    description: 'Discuter des besoins techniques pour l\'application mobile.',
    status: 'Terminé',
    priority: 'Moyenne',
    dueDate: new Date('2026-06-15T10:00:00Z').toISOString(),
    assignedTo: 'b4c9b360-1d8f-4318-87cf-45e0f76906a6', // Bob Dupont
    organizationId: 'e2d63493-2780-4ec3-85bb-b302c31e78eb',
    createdAt: new Date('2026-06-10T09:00:00Z').toISOString(),
    updatedAt: new Date('2026-06-15T11:00:00Z').toISOString(),
  },
  {
    id: 'f7a8b9c0-d1e2-4f3a-9b8c-7d6e5f4a3b2c',
    title: 'Rédiger rapport audit Bruxelles Finance',
    description: 'Compiler les résultats de l\'audit de sécurité et proposer des recommandations.',
    status: 'En cours',
    priority: 'Haute',
    dueDate: new Date('2026-07-30T17:00:00Z').toISOString(),
    assignedTo: '82703816-ecbd-4152-bc6d-0bb231f2dc34', // Claire Lefèvre
    organizationId: '2cf1bb68-2a82-4148-af7b-ba52d3aef657',
    createdAt: new Date('2026-07-15T14:00:00Z').toISOString(),
    updatedAt: new Date('2026-07-21T09:30:00Z').toISOString(),
  },
  {
    id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    title: 'Relance StartUp Studio',
    description: 'Relancer StartUp Studio par téléphone suite à notre premier email.',
    status: 'À faire',
    priority: 'Moyenne',
    dueDate: new Date('2026-08-05T14:00:00Z').toISOString(),
    assignedTo: 'b4c9b360-1d8f-4318-87cf-45e0f76906a6', // Bob Dupont
    organizationId: 'e2d63493-2780-4ec3-85bb-b302c31e78eb',
    createdAt: new Date('2026-07-22T10:00:00Z').toISOString(),
    updatedAt: new Date('2026-07-22T10:00:00Z').toISOString(),
  },
  {
    id: 'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b',
    title: 'Réunion d\'équipe',
    description: 'Point hebdomadaire sur l\'avancement des deals.',
    status: 'À faire',
    priority: 'Basse',
    dueDate: new Date('2026-07-28T09:00:00Z').toISOString(),
    organizationId: 'e2d63493-2780-4ec3-85bb-b302c31e78eb',
    createdAt: new Date('2026-07-21T08:00:00Z').toISOString(),
    updatedAt: new Date('2026-07-21T08:00:00Z').toISOString(),
  },
  {
    id: 'c9d0e1f2-a3b4-4c5d-6e7f-8a9b0c1d2e3f',
    title: 'Mise à jour CRM',
    description: 'Mettre à jour les statuts des contacts StartUp Studio.',
    status: 'Terminé',
    priority: 'Basse',
    dueDate: new Date('2026-07-10T18:00:00Z').toISOString(),
    assignedTo: '75a894cd-f268-45b0-9db0-a36cced478d5', // Alice Martin
    organizationId: 'e2d63493-2780-4ec3-85bb-b302c31e78eb',
    createdAt: new Date('2026-07-08T11:00:00Z').toISOString(),
    updatedAt: new Date('2026-07-10T17:45:00Z').toISOString(),
  },
  {
    id: '1a2b3c4d-5e6f-7a8b-9c0d-e1f2a3b4c5d6',
    title: 'Préparer présentation investisseurs',
    description: 'Créer les slides pour le pitch StartUp Studio.',
    status: 'En cours',
    priority: 'Haute',
    dueDate: new Date('2026-08-10T10:00:00Z').toISOString(),
    assignedTo: '82703816-ecbd-4152-bc6d-0bb231f2dc34', // Claire Lefèvre
    organizationId: '2cf1bb68-2a82-4148-af7b-ba52d3aef657',
    createdAt: new Date('2026-08-01T09:00:00Z').toISOString(),
    updatedAt: new Date('2026-08-02T09:00:00Z').toISOString(),
  },
  {
    id: 'f9d1a3c6-e4b2-4d7a-8f9c-1a2b3c4d5e6f',
    title: 'Relance email TechCorp',
    description: 'Envoyer un email de relance pour la signature du contrat.',
    status: 'À faire',
    priority: 'Moyenne',
    dueDate: new Date('2026-08-08T14:00:00Z').toISOString(),
    assignedTo: 'b4c9b360-1d8f-4318-87cf-45e0f76906a6', // Bob Dupont
    organizationId: 'e2d63493-2780-4ec3-85bb-b302c31e78eb',
    createdAt: new Date('2026-08-05T10:00:00Z').toISOString(),
    updatedAt: new Date('2026-08-05T10:00:00Z').toISOString(),
  },
  {
    id: 'b7c251f4-3d96-41fb-94a2-11ef84f3c051',
    title: 'Facturation TechCorp',
    description: 'Générer et envoyer la facture d\'acompte pour TechCorp.',
    status: 'À faire',
    priority: 'Haute',
    dueDate: new Date('2026-08-06T12:00:00Z').toISOString(),
    assignedTo: '75a894cd-f268-45b0-9db0-a36cced478d5', // Alice Martin
    organizationId: 'e2d63493-2780-4ec3-85bb-b302c31e78eb',
    createdAt: new Date('2026-08-05T09:00:00Z').toISOString(),
    updatedAt: new Date('2026-08-05T09:00:00Z').toISOString(),
  },
  {
    id: 'c9f32e18-d7b1-4c6e-82df-50f92b7cae67',
    title: 'Analyse des besoins CRM',
    description: 'Étudier le cahier des charges de Bruxelles Finance.',
    status: 'Terminé',
    priority: 'Moyenne',
    dueDate: new Date('2026-08-01T18:00:00Z').toISOString(),
    assignedTo: '82703816-ecbd-4152-bc6d-0bb231f2dc34', // Claire Lefèvre
    organizationId: '2cf1bb68-2a82-4148-af7b-ba52d3aef657',
    createdAt: new Date('2026-07-25T11:00:00Z').toISOString(),
    updatedAt: new Date('2026-08-01T15:00:00Z').toISOString(),
  }
];
