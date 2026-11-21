import BillingPlans from '@/components/settings/BillingPlans';
import SubscriptionPortalButton from '@/components/settings/SubscriptionPortalButton';
import { requireProfessional } from '@/lib/auth/session';
import { userService } from '@/lib/services/user.service';
import { isStripeConfigured } from '@/lib/stripe';

export default async function BillingPage() {
  const planLabels: Record<string, string> = { starter: 'Essentiel', pro: 'Professionnel', business: 'Équipe' };
  const context = await requireProfessional();
  const user = await userService.getUserProfile(context.userId);
  const available = isStripeConfigured() && Boolean(process.env.STRIPE_PRICE_STARTER && process.env.STRIPE_PRICE_PRO && process.env.STRIPE_PRICE_BUSINESS);
  const portalAvailable = isStripeConfigured() && Boolean(user?.stripeCustomerId);
  return <div className="max-w-4xl space-y-6">
    <div><h2 className="text-xl font-semibold text-gray-900">Abonnement MonService</h2><p className="mt-2 text-sm text-gray-600">Votre forfait pour utiliser le logiciel MonService. Les factures que vous émettez à vos propres clients se gèrent dans la rubrique Facturation.</p></div>
    {user?.subscriptionTier && user.subscriptionTier !== 'free' && <p className="rounded-lg bg-indigo-50 p-4 text-sm text-indigo-700">Votre forfait actuel : <strong>{planLabels[user.subscriptionTier] || user.subscriptionTier}</strong>.</p>}
    {available ? <div data-tour="subscription-plans"><BillingPlans enabled /></div> : (
      // Lancement : aucune offre payante n'est proposée (aucun tarif affiché).
      <section data-tour="subscription-plans" className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
        <h3 className="text-lg font-semibold text-emerald-900">Offre de lancement : gratuite</h3>
        <p className="mt-2 text-sm text-emerald-800">Toutes les fonctionnalités sont incluses, sans carte bancaire et sans limite de durée annoncée. Si une offre payante est introduite, vous serez prévenu à l’avance et rien ne sera facturé sans votre accord.</p>
      </section>
    )}
    {portalAvailable && <section className="border-t border-gray-200 pt-6"><h3 className="mb-2 text-lg font-semibold text-gray-900">Gérer votre forfait</h3><p className="mb-4 text-sm text-gray-500">Consultez vos factures MonService, modifiez votre moyen de paiement ou gérez votre abonnement dans le portail sécurisé.</p><SubscriptionPortalButton /></section>}
  </div>;
}
