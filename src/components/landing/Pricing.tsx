import Link from 'next/link';

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
      cta: 'Essai gratuit 14 jours',
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
    <div id="pricing" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Des tarifs simples et transparents</h2>
          <p className="mt-4 max-w-2xl text-xl text-gray-500 mx-auto">
            Choisissez le plan qui correspond à vos besoins.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <div key={index} className={`rounded-xl p-8 flex flex-col ${plan.highlighted ? 'border-2 border-indigo-600 shadow-xl relative' : 'border border-gray-200 shadow-sm'}`}>
              {plan.highlighted && (
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-0">
                  <span className="bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full">Le plus populaire</span>
                </div>
              )}
              <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
              <p className="mt-2 text-gray-500">{plan.description}</p>
              <div className="mt-6 my-8">
                <span className="text-5xl font-extrabold text-gray-900">{plan.price}€</span>
                <span className="text-xl font-medium text-gray-500">/mois</span>
              </div>
              <ul className="flex-1 space-y-4 mb-8">
                {plan.features.map((feature, fIndex) => (
                  <li key={fIndex} className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span className="text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className={`block w-full text-center py-3 px-4 rounded-md font-bold transition-colors ${
                  plan.highlighted 
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
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
