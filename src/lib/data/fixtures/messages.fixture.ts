import { Message } from '../interfaces';

export const messagesFixture: Message[] = [
  {
    id: 'msg-1',
    senderId: 'a642dc5c-bd69-4f7f-8566-6819934fcab1', // Client
    receiverId: '5b169542-f8c5-44cb-ac29-618d79a29e46', // Pro (Admin in TechSolutions)
    content: 'Bonjour, j\'aimerais avoir plus de détails sur le devis que vous m\'avez envoyé pour le site e-commerce.',
    read: true,
    createdAt: new Date('2026-07-21T09:00:00Z').toISOString(),
    requestId: 'req-1',
    organizationId: 'e2d63493-2780-4ec3-85bb-b302c31e78eb'
  },
  {
    id: 'msg-2',
    senderId: '5b169542-f8c5-44cb-ac29-618d79a29e46', // Pro
    receiverId: 'a642dc5c-bd69-4f7f-8566-6819934fcab1', // Client
    content: 'Bonjour, bien sûr ! Le devis inclut la conception du design, le développement sur mesure et l\'intégration du paiement. Y a-t-il un point spécifique que vous souhaitez aborder ?',
    read: false,
    createdAt: new Date('2026-07-21T10:15:00Z').toISOString(),
    requestId: 'req-1',
    organizationId: 'e2d63493-2780-4ec3-85bb-b302c31e78eb'
  }
];
