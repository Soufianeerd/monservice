import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function CTASection() {
  return (
    <div className="bg-primary-900 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3">
        <div className="w-96 h-96 bg-primary-700/50 rounded-full blur-3xl"></div>
      </div>
      <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3">
        <div className="w-96 h-96 bg-primary-600/40 rounded-full blur-3xl"></div>
      </div>
      
      <div className="max-w-4xl mx-auto py-20 px-4 sm:px-6 lg:py-24 lg:px-8 text-center relative z-10">
        <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl mb-6">
          Prêt à simplifier la gestion de votre activité ?
        </h2>
        <p className="text-xl text-primary-100 mb-10 max-w-2xl mx-auto">
          Créez votre espace MonService et centralisez votre activité dès aujourd'hui.
        </p>
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <Link
            href="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 border border-transparent text-lg font-bold rounded-xl text-primary-900 bg-white hover:bg-gray-50 transition-all hover:scale-105 shadow-xl shadow-primary-900/20"
          >
            Créer mon compte
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
          <Link
            href="#features"
            className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 border border-primary-400 text-lg font-bold rounded-xl text-white hover:bg-primary-800 transition-colors"
          >
            Découvrir les fonctionnalités
          </Link>
        </div>
      </div>
    </div>
  );
}
