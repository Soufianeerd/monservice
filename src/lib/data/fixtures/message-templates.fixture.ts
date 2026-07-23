import { MessageTemplate } from '../interfaces';

export const messageTemplatesFixture: MessageTemplate[] = [
  {
    id: 'tpl-1',
    organizationId: 'org-1',
    name: 'Relance de paiement',
    type: 'email',
    subject: 'Rappel : Facture en attente de paiement',
    body: 'Bonjour {{clientName}},\n\nSauf erreur de notre part, la facture {{invoiceNumber}} d\'un montant de {{amount}} est arrivée à échéance le {{dueDate}}.\n\nMerci de procéder au règlement dans les plus brefs délais.\n\nCordialement,\nVotre équipe.',
    createdAt: '2026-06-01T10:00:00Z',
    updatedAt: '2026-06-01T10:00:00Z',
  },
  {
    id: 'tpl-2',
    organizationId: 'org-1',
    name: 'Bienvenue',
    type: 'email',
    subject: 'Bienvenue chez MonService',
    body: 'Bonjour {{clientName}},\n\nNous sommes ravis de vous compter parmi nos nouveaux clients !\n\nN\'hésitez pas à nous contacter si vous avez des questions.\n\nCordialement,',
    createdAt: '2026-06-02T10:00:00Z',
    updatedAt: '2026-06-02T10:00:00Z',
  },
  {
    id: 'tpl-3',
    organizationId: 'org-1',
    name: 'Confirmation RDV',
    type: 'sms',
    subject: '', // SMS usually don't have subjects, but required by our interface
    body: 'Bonjour, votre RDV avec notre équipe est confirmé pour le {{date}}. À bientôt !',
    createdAt: '2026-06-05T14:00:00Z',
    updatedAt: '2026-06-05T14:00:00Z',
  }
];
