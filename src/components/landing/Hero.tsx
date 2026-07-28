import Link from 'next/link';

export default function Hero() {
  return (
    <div className="bg-indigo-50 py-20 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
          <span className="block xl:inline">Le CRM simplifié pour</span>{' '}
          <span className="block text-indigo-600 xl:inline">les professionnels</span>
        </h1>
        <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
          Gérez vos clients, vos devis et vos factures en un seul endroit. 
          Trouvez de nouveaux clients et développez votre activité en toute sérénité.
        </p>
        <div className="mt-10 sm:flex sm:justify-center gap-4">
          <div className="rounded-md shadow">
            <Link href="/register" className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10 transition-colors">
              Je suis un professionnel
            </Link>
          </div>
          <div className="mt-3 rounded-md shadow sm:mt-0">
            <Link href="/register" className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10 transition-colors">
              Je cherche un professionnel
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
