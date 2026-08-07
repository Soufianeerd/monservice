export default function HowItWorks() {
  const steps = [
    { title: 'Créez votre espace', description: 'Quelques informations suffisent pour commencer.' },
    { title: 'Configurez votre activité', description: 'Renseignez les informations utiles à votre entreprise.' },
    { title: 'Ajoutez vos clients', description: 'Centralisez vos contacts et commencez votre suivi.' },
    { title: 'Gérez votre activité', description: 'Devis, factures, rendez-vous et tâches depuis MonService.' }
  ];

  return (
    <div id="how-it-works" className="py-24 bg-gray-50 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Commencez en quelques minutes</h2>
          <p className="mt-4 max-w-2xl text-xl text-gray-500 mx-auto">
            MonService vous accompagne de la création du compte à la gestion de votre activité.
          </p>
        </div>
        <div className="relative">
          {/* Desktop connecting line */}
          <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-gray-200" aria-hidden="true"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 relative">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="flex flex-col items-center text-center">
                  <div className="flex items-center justify-center w-24 h-24 rounded-full bg-white border-4 border-gray-50 shadow-sm relative z-10 mb-6">
                    <span className="text-3xl font-extrabold text-primary-600">{index + 1}</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">{step.title}</h3>
                  <p className="text-base text-gray-600 leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
