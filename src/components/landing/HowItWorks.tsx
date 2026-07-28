export default function HowItWorks() {
  const steps = [
    { title: 'Inscription rapide', description: 'Créez votre compte en quelques secondes, que vous soyez client ou professionnel.' },
    { title: 'Configuration du profil', description: 'Renseignez vos informations essentielles via notre onboarding interactif.' },
    { title: 'Mise en relation', description: 'Trouvez les bons partenaires ou recevez vos premières demandes.' },
    { title: 'Gestion simplifiée', description: 'Utilisez le tableau de bord pour suivre vos devis, factures et messages.' }
  ];

  return (
    <div className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Comment ça marche ?</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative z-10">
              <div className="flex flex-col items-center text-center bg-white">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-indigo-600 text-white font-bold text-xl mb-4 relative z-20">
                  {index + 1}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-6 left-1/2 w-full border-t-2 border-gray-200 border-dashed z-0"></div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
