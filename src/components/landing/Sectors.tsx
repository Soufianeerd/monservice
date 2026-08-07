import { StethoscopeIcon, LaptopIcon, HammerIcon, SparklesIcon } from 'lucide-react';

export default function Sectors() {
  const sectors = [
    { title: 'Santé & Bien-être', icon: <StethoscopeIcon className="w-8 h-8 text-indigo-600" />, desc: 'Médecins, thérapeutes, coachs...' },
    { title: 'Consultants & Freelances', icon: <LaptopIcon className="w-8 h-8 text-indigo-600" />, desc: 'Développeurs, designers, marketeurs...' },
    { title: 'Artisans & Bâtiment', icon: <HammerIcon className="w-8 h-8 text-indigo-600" />, desc: 'Plombiers, électriciens, peintres...' },
    { title: 'Et bien d\'autres', icon: <SparklesIcon className="w-8 h-8 text-indigo-600" />, desc: 'Rejoignez-nous quel que soit votre domaine.' },
  ];

  return (
    <div id="sectors" className="py-24 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">Pour tous les professionnels</h2>
          <p className="mt-4 max-w-2xl text-xl text-gray-500 mx-auto">
            MonService s&apos;adapte à votre métier.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {sectors.map((sector, index) => (
            <div key={index} className="group relative bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl border border-gray-100 transition-all duration-300 hover:-translate-y-1 flex flex-col items-center text-center">
              <div className="w-16 h-16 mb-6 rounded-xl bg-indigo-50 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300 shadow-inner">
                {sector.icon}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{sector.title}</h3>
              <p className="text-sm text-gray-500">{sector.desc}</p>
              
              <div className="absolute inset-0 border-2 border-transparent group-hover:border-indigo-100 rounded-2xl transition-colors duration-300 pointer-events-none" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
