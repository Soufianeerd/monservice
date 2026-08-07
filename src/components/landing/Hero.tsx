import Link from 'next/link';
import { ArrowRightIcon } from 'lucide-react';
import ProductPreview from '@/components/marketing/ProductPreview';

export default function Hero() {
  return (
    <div className="relative bg-white overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-y-0 w-full h-full bg-white z-0" />
      <div className="absolute top-0 right-0 -mt-20 -mr-20 w-[40rem] h-[40rem] rounded-full bg-primary-50 blur-3xl opacity-60 z-0" />
      <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-[30rem] h-[30rem] rounded-full bg-blue-50 blur-3xl opacity-60 z-0" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-24 pb-32 lg:pt-32 lg:pb-40 flex flex-col lg:flex-row items-center gap-12">
        <div className="w-full lg:w-1/2 text-center lg:text-left">
          <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl lg:text-5xl xl:text-6xl leading-tight">
            <span className="block mb-2">Gérez vos clients, devis,</span>{' '}
            <span className="block text-primary-600">factures et rendez-vous</span>
          </h1>
          <p className="mt-4 max-w-md mx-auto lg:mx-0 text-base text-gray-600 sm:text-lg md:mt-6 md:text-xl md:max-w-3xl">
            MonService centralise votre activité dans un CRM simple, conçu pour les indépendants et petites entreprises.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row sm:justify-center lg:justify-start gap-4">
            <div className="rounded-xl shadow-lg shadow-primary-200/50">
              <Link href="/register" className="w-full flex items-center justify-center px-8 py-3.5 border border-transparent text-base font-medium rounded-xl text-white bg-primary-600 hover:bg-primary-700 md:text-lg transition-all hover:scale-105">
                Créer mon espace gratuitement
                <ArrowRightIcon className="ml-2 w-5 h-5" />
              </Link>
            </div>
            <div className="rounded-xl shadow-sm border border-gray-200 bg-white">
              <Link href="#how-it-works" className="w-full flex items-center justify-center px-8 py-3.5 text-base font-medium rounded-xl text-gray-700 hover:bg-gray-50 hover:text-primary-600 md:text-lg transition-all hover:scale-105">
                Voir comment ça fonctionne
              </Link>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-center lg:justify-start text-xs text-gray-500 gap-2 font-medium">
            <span>Gratuit pour démarrer</span>
            <span>&middot;</span>
            <span>Sans carte bancaire</span>
            <span>&middot;</span>
            <span>Configuration rapide</span>
          </div>
        </div>
        
        <div className="w-full lg:w-1/2 mt-12 lg:mt-0 relative">
          <div className="relative mx-auto w-full max-w-2xl transform rotate-1 hover:rotate-0 transition-transform duration-500">
            <ProductPreview />
          </div>
        </div>
      </div>
    </div>
  );
}
