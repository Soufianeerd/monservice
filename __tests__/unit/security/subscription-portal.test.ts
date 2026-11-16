import { beforeEach, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/stripe/portal/route';
import { requireProfessional } from '@/lib/auth/session';
import { userService } from '@/lib/services/user.service';
import { isStripeConfigured } from '@/lib/stripe';
import { createBillingPortalSession } from '@/lib/stripe/billing';
import { AppError } from '@/lib/errors';

vi.mock('@/lib/auth/session', () => ({ requireProfessional: vi.fn() }));
vi.mock('@/lib/services/user.service', () => ({ userService: { getUserProfile: vi.fn() } }));
vi.mock('@/lib/stripe', () => ({ isStripeConfigured: vi.fn() }));
vi.mock('@/lib/stripe/billing', () => ({ createBillingPortalSession: vi.fn() }));
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://monservice.example');
  vi.mocked(requireProfessional).mockResolvedValue({ userId: 'professional', organizationId: 'own-org', profileType: 'professional' } as never);
  vi.mocked(isStripeConfigured).mockReturnValue(true);
});

it('refuse une session non professionnelle avant tout appel Stripe', async () => {
  vi.mocked(requireProfessional).mockRejectedValue(new AppError('Forbidden', 403, 'FORBIDDEN'));
  expect((await POST()).status).toBe(403); expect(createBillingPortalSession).not.toHaveBeenCalled();
});
it('ne crée pas de portail sans client Stripe attaché au professionnel connecté', async () => {
  vi.mocked(userService.getUserProfile).mockResolvedValue({ id: 'professional', stripeCustomerId: null } as never);
  expect((await POST()).status).toBe(409); expect(createBillingPortalSession).not.toHaveBeenCalled();
});
it('utilise exclusivement le client de la session serveur et l’origine de l’application', async () => {
  vi.mocked(userService.getUserProfile).mockResolvedValue({ id: 'professional', stripeCustomerId: 'cus_own' } as never);
  vi.mocked(createBillingPortalSession).mockResolvedValue('https://billing.stripe.com/temporary');
  expect((await POST()).status).toBe(200);
  expect(userService.getUserProfile).toHaveBeenCalledWith('professional');
  expect(createBillingPortalSession).toHaveBeenCalledWith('cus_own', 'https://monservice.example/parametres/facturation');
});
it('répond clairement lorsque Stripe n’est pas configuré', async () => {
  vi.mocked(isStripeConfigured).mockReturnValue(false);
  expect((await POST()).status).toBe(503); expect(createBillingPortalSession).not.toHaveBeenCalled();
});
