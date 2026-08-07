import React from 'react';
import Link from 'next/link';
import { Hexagon, CheckCircle2 } from 'lucide-react';

export default function AuthLayout({ children, title, subtitle }: { children: React.ReactNode, title: string, subtitle: string }) {
  return (
    <div className="min-h-screen flex bg-white">
      {/* Left pane: Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24 w-full lg:w-1/2">
        <div className="mx-auto w-full max-w-sm lg:max-w-md">
          {/* Logo */}
          <div className="mb-10">
            <Link href="/" className="flex items-center gap-2 group w-fit">
              <div className="bg-primary-600 p-1.5 rounded-lg group-hover:scale-105 transition-transform">
                <Hexagon className="w-6 h-6 text-white fill-white" />
              </div>
              <span className="text-2xl font-black text-gray-900 tracking-tight">MonService</span>
            </Link>
          </div>

          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">{title}</h2>
          <p className="text-sm text-gray-600 mb-8">{subtitle}</p>

          <div className="w-full">
            {children}
          </div>
          
          <div className="mt-8 text-center text-xs text-gray-500">
            <p>
              En continuant, vous acceptez nos{' '}
              <Link href="/conditions" className="font-medium text-primary-600 hover:text-primary-500 hover:underline">Conditions d'utilisation</Link>
              {' '}et notre{' '}
              <Link href="/confidentialite" className="font-medium text-primary-600 hover:text-primary-500 hover:underline">Politique de confidentialité</Link>.
            </p>
          </div>
        </div>
      </div>

      {/* Right pane: Argumentaire SaaS */}
      <div className="hidden lg:flex lg:flex-1 bg-primary-950 relative overflow-hidden flex-col justify-center px-12 xl:px-24">
        {/* Background glow effects */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-96 h-96 bg-primary-600/40 rounded-full blur-3xl animate-pulse-slow"></div>
          <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-96 h-96 bg-primary-500/30 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative z-10 max-w-lg animate-fade-in-up">
          <h2 className="text-4xl font-extrabold text-white mb-6 leading-tight">
            Gérez votre activité plus sereinement.
          </h2>
          <ul className="space-y-4 mb-10">
            <li className="flex items-center gap-3 text-primary-100 text-lg">
              <CheckCircle2 className="w-6 h-6 text-primary-400" />
              <span>Devis et factures en quelques clics</span>
            </li>
            <li className="flex items-center gap-3 text-primary-100 text-lg">
              <CheckCircle2 className="w-6 h-6 text-primary-400" />
              <span>Suivi centralisé de vos clients</span>
            </li>
            <li className="flex items-center gap-3 text-primary-100 text-lg">
              <CheckCircle2 className="w-6 h-6 text-primary-400" />
              <span>Agenda et rappels automatiques</span>
            </li>
          </ul>

          <div className="glass-dark rounded-2xl p-6 shadow-2xl transform hover:scale-[1.02] transition-transform duration-300">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 text-white font-bold border border-white/20">
                MS
              </div>
              <div>
                <p className="text-white font-medium mb-1">
                  "MonService m'a fait gagner un temps précieux sur l'administratif. Je peux me concentrer sur mon cœur de métier."
                </p>
                <p className="text-primary-300 text-sm">Marie D., Consultante indépendante</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
