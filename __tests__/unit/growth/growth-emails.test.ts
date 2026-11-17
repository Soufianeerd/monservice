import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { invoiceReminderTemplate, quoteFollowupTemplate, reviewRequestTemplate } from '@/lib/email/templates';

describe('e-mails d’automatisation', () => {
  it('relance de facture : niveau, coordonnées, aucun lien vers un espace client', () => {
    const t = invoiceReminderTemplate({
      clientName: 'Jean <b>Dupont</b>', organizationName: 'Plomberie A', invoiceNumber: 'F-2',
      amount: 240, dueDate: '2026-10-28', daysOverdue: 20, level: 2, paymentDetails: 'IBAN FR76\nBIC TEST',
    });
    expect(t.subject).toBe('Rappel — facture F-2');
    expect(t.html).toContain('Jean &lt;b&gt;Dupont&lt;/b&gt;');
    expect(t.html).toContain('IBAN FR76<br>BIC TEST');
    expect(t.html).not.toContain('/client/');
    expect(t.html).not.toContain('href=');
    expect(invoiceReminderTemplate({ clientName: 'x', organizationName: 'y', invoiceNumber: 'F', amount: 1, dueDate: '2026-01-01', daysOverdue: 31, level: 3 }).subject).toBe('Dernier rappel — facture F');
  });

  it('relance de devis sans lien', () => {
    const t = quoteFollowupTemplate({ clientName: 'Jean', organizationName: 'Plomberie A', quoteNumber: 'D-1', amount: 360, sentOn: '2026-11-07' });
    expect(t.subject).toBe('Votre devis D-1 — Plomberie A');
    expect(t.html).not.toContain('href=');
  });

  it('demande d’avis avec le lien personnel', () => {
    const t = reviewRequestTemplate({ clientName: 'Jean', organizationName: 'Plomberie A', url: 'https://app.test/laisser-un-avis?token=abc' });
    expect(t.html).toContain('href="https://app.test/laisser-un-avis?token=abc"');
    expect(t.html).toContain('ne sert qu&#39;une fois'.replace('&#39;', "'"));
  });
});
