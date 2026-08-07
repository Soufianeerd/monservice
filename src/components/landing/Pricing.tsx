import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';

export default function Pricing() {
  const plans = [
    {
      name: 'Starter',
      price: '0',
      description: 'Idéal pour démarrer',
      features: ['Gestion de 50 clients', '10 devis/mois', 'Support par email'],
      cta: 'Commencer gratuitement',
      highlighted: false,
    },
    {
      name: 'Pro',
      price: '29',
      description: 'Pour les professionnels établis',
      features: ['Clients illimités', 'Devis et factures illimités', 'Visibilité sur la marketplace', 'Support prioritaire'],
      cta: 'Essayer Pro',
      highlighted: true,
    },
    {
      name: 'Business',
      price: '79',
      description: 'Pour les équipes',
      features: ['Toutes les fonctionnalités Pro', 'Multi-utilisateurs (jusqu\'à 5)', 'Statistiques avancées', 'API d\'intégration'],
      cta: 'Nous contacter',
      highlighted: false,
    },
  ];

  return (
    <div id="pricing" className="py-24 bg-white relative">
      <div className="absolute inset-0 bg-gray-50/50 -skew-y-2 z-0 transform origin-top-left"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Des tarifs simples et transparents</h2>
          <p className="mt-4 max-w-2xl text-xl text-gray-500 mx-auto">
            Choisissez le plan qui correspond à vos besoins.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto items-center">
          {plans.map((plan, index) => (
            <div key={index} className={`rounded-2xl p-8 flex flex-col bg-white ${plan.highlighted ? 'border-2 border-primary-600 shadow-xl relative transform md:-translate-y-4' : 'border border-gray-200 shadow-sm'}`}>
              {plan.highlighted && (
                <div className="absolute top-0 right-6 -translate-y-1/2">
                  <span className="bg-primary-600 text-white text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full shadow-sm">
                    Le plus populaire
                  </span>
                </div>
              )}
              <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
              <p className="mt-2 text-sm text-gray-500">{plan.description}</p>
              <div className="mt-6 my-8 flex items-baseline gap-1">
                <span className="text-5xl font-extrabold text-gray-900">{plan.price}€</span>
                <span className="text-lg font-medium text-gray-500">/mois</span>
              </div>
              <ul className="flex-1 space-y-4 mb-8">
                {plan.features.map((feature, fIndex) => (
                  <li key={fIndex} className="flex items-start gap-3">
                    <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${plan.highlighted ? 'text-primary-600' : 'text-gray-400'}`} />
                    <span className="text-gray-600 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className={`block w-full text-center py-3.5 px-4 rounded-xl font-semibold transition-all ${
                  plan.highlighted 
                    ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-md shadow-primary-200 hover:scale-[1.02]' 
                    : 'bg-primary-50 text-primary-700 hover:bg-primary-100 hover:scale-[1.02]'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
