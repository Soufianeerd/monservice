export default function Features() {
  const features = [
    {
      title: 'Gestion des clients',
      description: 'Centralisez vos contacts et l\'historique de vos échanges en un seul endroit.',
      icon: '👥',
    },
    {
      title: 'Devis & Factures',
      description: 'Créez des devis et factures professionnels en quelques clics et suivez les paiements.',
      icon: '📄',
    },
    {
      title: 'Agenda & Tâches',
      description: 'Organisez votre emploi du temps et ne manquez plus aucun rendez-vous.',
      icon: '📅',
    },
    {
      title: 'Marketplace',
      description: 'Soyez visible auprès de clients potentiels qui recherchent vos compétences.',
      icon: '🌐',
    },
  ];

  return (
    <div id="features" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Tout ce dont vous avez besoin</h2>
          <p className="mt-4 max-w-2xl text-xl text-gray-500 mx-auto">
            Des outils simples et performants pour gérer votre activité au quotidien.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-8 text-center hover:shadow-md transition-shadow">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
