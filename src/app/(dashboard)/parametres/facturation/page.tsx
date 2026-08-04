'use client';

import { useAuth } from '@/components/auth/AuthContext';
import BillingPlans from '@/components/settings/BillingPlans';

export default function BillingPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-8 max-w-4xl">

      {user?.subscriptionTier && user.subscriptionTier !== 'free' && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Abonnement Actif</h3>
              <div className="mt-2 text-sm text-green-700">
                <p>Vous êtes actuellement sur le plan <strong>{user.subscriptionTier.toUpperCase()}</strong>.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Nos Offres</h3>
        <BillingPlans />
      </div>

      <div className="mt-10 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Portail Client</h3>
        <p className="text-sm text-gray-500 mb-4">
          Accédez au portail sécurisé Stripe pour modifier votre moyen de paiement, télécharger vos factures ou annuler votre abonnement.
        </p>
        <button
          onClick={() => alert("Le portail client Stripe nécessite de créer une session avec le Customer ID en backend. Il sera implémenté plus tard.")}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Gérer mon abonnement sur Stripe
        </button>
      </div>
    </div>
  );
}
