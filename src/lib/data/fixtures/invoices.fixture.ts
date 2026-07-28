import { Invoice } from '../interfaces';

export const invoicesFixture: Invoice[] = [
  {
    id: 'c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f',
    organizationId: 'e2d63493-2780-4ec3-85bb-b302c31e78eb',
    type: 'invoice',
    number: 'F-2026-0001',
    date: new Date('2026-05-01T08:00:00Z').toISOString(),
    dueDate: new Date('2026-05-31T08:00:00Z').toISOString(),
    paidAt: new Date('2026-05-15T10:00:00Z').toISOString(),
    clientId: 'a642dc5c-bd69-4f7f-8566-6819934fcab1', // TechCorp
    lines: [
      {
        id: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
        invoiceId: 'c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f',
        productId: 'f78311d4-8d45-42cf-811c-2c974ddc3e1e', // Consultation
        quantity: 10,
        unitPrice: 150,
        taxRate: 20,
        discount: 0,
      },
      {
        id: '2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e',
        invoiceId: 'c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f',
        productId: '9c5fbbf3-cf22-4a0b-87cf-9c606e30b6c1', // Dev
        quantity: 5,
        unitPrice: 650,
        taxRate: 20,
        discount: 10, // 10% discount
      }
    ],
    totalHT: 1500 + 2925, // 10*150 + 5*650*0.9
    taxAmount: 885, // (1500 + 2925) * 0.2
    totalTTC: 5310,
    status: 'paid',
    createdAt: new Date('2026-05-01T08:00:00Z').toISOString(),
    updatedAt: new Date('2026-05-15T10:00:00Z').toISOString(),
  },
  {
    id: 'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b',
    organizationId: 'e2d63493-2780-4ec3-85bb-b302c31e78eb',
    type: 'invoice',
    number: 'F-2026-0002',
    date: new Date('2026-06-15T08:00:00Z').toISOString(),
    dueDate: new Date('2026-07-15T08:00:00Z').toISOString(),
    clientId: '18f7734a-93e1-4af5-b1a1-94576180a3dc', // InnoDev
    lines: [
      {
        id: '3c4d5e6f-7a8b-4c9d-0e1f-2a3b4c5d6e7f',
        invoiceId: 'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b',
        productId: '3a4b08d7-58e1-4545-a74c-bd7c36d2c49b', // Formation
        quantity: 2,
        unitPrice: 1200,
        taxRate: 20,
        discount: 0,
      }
    ],
    totalHT: 2400,
    taxAmount: 480,
    totalTTC: 2880,
    status: 'sent',
    createdAt: new Date('2026-06-15T08:00:00Z').toISOString(),
    updatedAt: new Date('2026-06-15T08:00:00Z').toISOString(),
  },
  {
    id: 'a9b0c1d2-e3f4-4a5b-6c7d-8e9f0a1b2c3d',
    organizationId: 'e2d63493-2780-4ec3-85bb-b302c31e78eb',
    type: 'quote',
    number: 'D-2026-0001',
    date: new Date('2026-07-20T08:00:00Z').toISOString(),
    clientId: 'a642dc5c-bd69-4f7f-8566-6819934fcab1', // TechCorp
    requestId: 'req-1', // Link to the request
    lines: [
      {
        id: '4d5e6f7a-8b9c-4d0e-1f2a-3b4c5d6e7f8a',
        invoiceId: 'a9b0c1d2-e3f4-4a5b-6c7d-8e9f0a1b2c3d',
        productId: 'f1ac8e6b-0b2a-4467-8cf1-97b0a7dbcf0b', // Design
        quantity: 3,
        unitPrice: 550,
        taxRate: 20,
        discount: 0,
      },
      {
        id: '5e6f7a8b-9c0d-1e2f-3a4b-5c6d7e8f9a0b',
        invoiceId: 'a9b0c1d2-e3f4-4a5b-6c7d-8e9f0a1b2c3d',
        description: 'Frais de déplacement', // Ligne libre
        quantity: 1,
        unitPrice: 300,
        taxRate: 20,
        discount: 0,
      }
    ],
    totalHT: 1950,
    taxAmount: 390,
    totalTTC: 2340,
    status: 'sent',
    createdAt: new Date('2026-07-20T08:00:00Z').toISOString(),
    updatedAt: new Date('2026-07-20T08:00:00Z').toISOString(),
  },
  {
    id: 'b8c9d0e1-f2a3-4b5c-6d7e-8f9a0b1c2d3e',
    organizationId: 'e2d63493-2780-4ec3-85bb-b302c31e78eb',
    type: 'invoice',
    number: 'F-2026-0003',
    date: new Date('2026-01-10T08:00:00Z').toISOString(),
    dueDate: new Date('2026-02-10T08:00:00Z').toISOString(),
    clientId: 'a642dc5c-bd69-4f7f-8566-6819934fcab1', // TechCorp
    lines: [
      {
        id: '6f7a8b9c-0d1e-2f3a-4b5c-6d7e8f9a0b1c',
        invoiceId: 'b8c9d0e1-f2a3-4b5c-6d7e-8f9a0b1c2d3e',
        productId: 'f78311d4-8d45-42cf-811c-2c974ddc3e1e', // Consultation
        quantity: 2,
        unitPrice: 150,
        taxRate: 20,
        discount: 0,
      }
    ],
    totalHT: 300,
    taxAmount: 60,
    totalTTC: 360,
    status: 'overdue',
    createdAt: new Date('2026-01-10T08:00:00Z').toISOString(),
    updatedAt: new Date('2026-01-10T08:00:00Z').toISOString(),
  },
  {
    id: 'c9d0e1f2-a3b4-5c6d-7e8f-9a0b1c2d3e4f',
    organizationId: 'e2d63493-2780-4ec3-85bb-b302c31e78eb',
    type: 'invoice',
    number: 'F-2026-0004',
    date: new Date('2026-07-22T08:00:00Z').toISOString(),
    dueDate: new Date('2026-08-22T08:00:00Z').toISOString(),
    clientId: '538c8266-992a-43cf-a541-b844f23b20e0', // StartUp Studio
    lines: [
      {
        id: '7a8b9c0d-1e2f-3a4b-5c6d-7e8f9a0b1c2d',
        invoiceId: 'c9d0e1f2-a3b4-5c6d-7e8f-9a0b1c2d3e4f',
        productId: '9c5fbbf3-cf22-4a0b-87cf-9c606e30b6c1', // Dev
        quantity: 1,
        unitPrice: 650,
        taxRate: 20,
        discount: 0,
      }
    ],
    totalHT: 650,
    taxAmount: 130,
    totalTTC: 780,
    status: 'draft',
    createdAt: new Date('2026-07-22T08:00:00Z').toISOString(),
    updatedAt: new Date('2026-07-22T08:00:00Z').toISOString(),
  }
];
