export default function Sectors() {
  const sectors = [
    { title: 'Santé & Bien-être', icon: '🩺', desc: 'Médecins, thérapeutes, coachs...' },
    { title: 'Consultants & Freelances', icon: '💻', desc: 'Développeurs, designers, marketeurs...' },
    { title: 'Artisans & Bâtiment', icon: '🔨', desc: 'Plombiers, électriciens, peintres...' },
    { title: 'Et bien d\'autres', icon: '✨', desc: 'Rejoignez-nous quel que soit votre domaine.' },
  ];

  return (
    <div id="sectors" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Pour tous les professionnels</h2>
          <p className="mt-4 max-w-2xl text-xl text-gray-500 mx-auto">
            MonService s&apos;adapte à votre métier.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {sectors.map((sector, index) => (
            <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col items-center text-center">
              <div className="text-4xl mb-3">{sector.icon}</div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">{sector.title}</h3>
              <p className="text-sm text-gray-500">{sector.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
