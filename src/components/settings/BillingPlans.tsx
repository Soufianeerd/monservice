'use client';

import { useState } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { Card, CardBody } from '@/components/ui/Card';

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: '29',
    features: ['Jusqu\'à 10 devis/mois', 'Profil public basique', 'Support email'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '79',
    features: ['Devis illimités', 'Profil public premium', 'Support prioritaire', 'Statistiques avancées'],
    popular: true,
  },
  {
    id: 'business',
    name: 'Business',
    price: '199',
    features: ['Tout du plan Pro', 'API Access', 'Gestion multi-comptes', 'Account manager dédié'],
  },
];

export default function BillingPlans() {
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (tier: string) => {
    if (!user) return;
    setLoading(tier);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          organizationId: user.organizationId,
          tier,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Erreur lors de la redirection vers Stripe');
      }
    } catch (error) {
      console.error(error);
      alert('Erreur serveur');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {plans.map((plan) => (
        <Card key={plan.id} className={`relative ${plan.popular ? 'border-indigo-500 shadow-md ring-1 ring-indigo-500' : ''}`}>
          {plan.popular && (
            <span className="absolute top-0 right-0 -translate-y-1/2 translate-x-2 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
              Populaire
            </span>
          )}
          <CardBody className="flex flex-col h-full">
            <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
            <div className="mt-4 flex items-baseline text-gray-900">
              <span className="text-4xl font-extrabold tracking-tight">{plan.price}€</span>
              <span className="ml-1 text-xl font-semibold">/mois</span>
            </div>
            <ul className="mt-6 space-y-4 flex-1">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex">
                  <svg className="flex-shrink-0 w-5 h-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="ml-3 text-gray-500">{feature}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={loading === plan.id || user?.subscriptionTier === plan.id}
                className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  user?.subscriptionTier === plan.id
                    ? 'bg-green-600 hover:bg-green-700 cursor-default'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                } disabled:opacity-50`}
              >
                {loading === plan.id ? 'Chargement...' : user?.subscriptionTier === plan.id ? 'Plan actuel' : 'S\'abonner'}
              </button>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
